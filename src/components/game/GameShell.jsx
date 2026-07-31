import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { STAGES, getStage } from "../../domain/curriculum.js";
import { ITEMS, getItem } from "../../domain/economy.js";
import { getFingerGuide } from "../../domain/fingers.js";
import { typedKeyFrom } from "../../domain/keyboard.js";
import {
  AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT,
  AQUARIUM_VISIBLE_FISH_LIMIT,
  fishCollectionStats,
  fishCountsBySpecies,
  fishDiscovery,
  FISH_SPECIES,
  fishSpeciesForRegion,
  getFishSpecies,
  selectAquariumFish,
  showcaseFishIndividuals,
} from "../../domain/fish.js";
import { REGIONS, getRegion, getRegionForStage, getUnlockedRegions } from "../../domain/regions.js";
import { loadSave, persistSave } from "../../domain/save.js";
import { preloadImagesWhenIdle, startupImageSources } from "../../game/assets/preload.js";
import { playCatchSound, playTypingSound, primeCatchSound } from "../../game/audio/catchSound.js";
import { createGameState, gameReducer } from "../../game/state/gameReducer.js";
import { UiIcon, UiText } from "./UiPrimitives.jsx";
import "../../styles/index.css";

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "-"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

const AQUARIUM_SLOT_ORDER = [
  7, 16, 3, 20, 11, 12, 23, 0, 18, 5, 14, 9,
  21, 2, 17, 6, 22, 10, 13, 4, 19, 1, 15, 8,
];

const BUBBLE_SPECS = [
  [4, 1, -10], [9, 2, 12], [15, 1, 7], [21, 3, -16], [28, 1, 11], [34, 2, -8],
  [41, 1, 15], [47, 2, -13], [54, 1, 9], [60, 3, 17], [67, 1, -11], [73, 2, 8],
  [79, 1, -15], [85, 2, 13], [92, 1, -7], [12, 1, 17], [38, 2, 10], [70, 1, -16],
];
const TANK_BUBBLE_SPECS = [0, 1, 4, 7, 8, 11, 12, 13, 16].map((index) => BUBBLE_SPECS[index]);

// 新海域の紹介にかける時間。CSS の region-reveal アニメーションと合わせること。
const REGION_REVEAL_MS = 3600;
const REGION_REVEAL_STILL_MS = 2600;

// Vertical swimming bands as % of tank height (slightly overlapping for a natural blend).
// 4層がはっきり分かれるよう、水槽の高さをおおむね四分割して割り当てる。
const DEPTH_BANDS = {
  top: [6, 30],
  mid: [34, 58],
  bottom: [62, 78],
  // 砂に定位する種（チンアナゴなど）は最下段に貼り付け、中層に見えないようにする。
  floor: [80, 90],
};

function aquariumPosition(index, seed = 0, salt = 0) {
  // Rotating the slot assignment by the per-open salt reshuffles who sits where each visit.
  const slot = AQUARIUM_SLOT_ORDER[(index + salt) % AQUARIUM_SLOT_ORDER.length];
  const col = slot % 6;
  const row = Math.floor(slot / 6);
  // Scatter each fish off the grid lines so the tank doesn't look like a spreadsheet.
  const jitterX = (seed % 11) - 5;          // -5%..+5%
  const jitterY = ((seed >> 3) % 13) - 6;   // -6%..+6%
  return {
    left: `${4 + col * 15.8 + jitterX}%`,
    top: `${8 + row * 21 + jitterY}%`,
  };
}

function stableFishNumber(caughtFish) {
  const value = caughtFish?.id ?? caughtFish?.speciesId ?? "";
  return [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
}

export default function GameShell() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGameState(loadSave()));

  useEffect(() => { persistSave(state.save); }, [state.save]);

  // タイトルを読んでいるあいだに、この先で要る絵を裏で集めておく。
  // 進捗は出さないし、「はじめる」を待たせもしない。
  useEffect(
    () => preloadImagesWhenIdle(startupImageSources(state.save.unlockedStageIds, state.lastPlayedRegionId)),
    [state.save.unlockedStageIds, state.lastPlayedRegionId],
  );

  useEffect(() => {
    if (state.screen !== "typing" || !state.session?.attempt.completed) return undefined;
    const id = window.setTimeout(() => dispatch({ type: "AUTO_ADVANCE" }), 650);
    return () => window.clearTimeout(id);
  }, [state.screen, state.session?.attempt.completed, state.session?.index]);

  // つれた瞬間に一度だけ鳴らす。魚が変わるまで再生しないので、
  // 逃がすなどで result が作り直されても鳴り直さない。
  useEffect(() => {
    if (state.screen !== "result" || !state.result || !state.save.settings.sound) return;
    playCatchSound(state.result.isRareCatch || state.result.firstCatch ? "rare" : "normal");
  }, [state.screen, state.result?.caughtFish.id, state.save.settings.sound]);

  useEffect(() => {
    if (state.screen !== "typing" || !state.session?.inputSeq || !state.save.settings.sound) return;
    playTypingSound(state.session.lastKeyOk);
  }, [state.screen, state.session?.inputSeq, state.save.settings.sound]);

  // はじめての海域は、海図で開いたときと、その海域のレッスンに入ったときに紹介する。
  const revealingRegionId = state.regionReveal && (
    (state.screen === "map" && state.selectedMapRegionId === state.regionReveal)
    || (state.screen === "typing" && state.session?.stage.regionId === state.regionReveal)
  ) ? state.regionReveal : null;
  const dismissRegionReveal = () => dispatch({ type: "DISMISS_REGION_REVEAL", now: Date.now() });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      // 紹介の最中はどのキーも「読み終えた」の合図にする。打ちはじめが問題に取られない。
      if (revealingRegionId) {
        event.preventDefault();
        dismissRegionReveal();
        return;
      }
      // タイトルは Enter か Space でも始められる。preventDefault で「はじめる」の
      // ボタン操作を止めるので、ボタンに焦点があっても二重に始まらない。
      if (state.screen === "title") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          dispatch({ type: "START_ADVENTURE" });
        }
        return;
      }
      // キーの取り出しは物理キー優先の共通処理へ寄せる。端末や入力ソースで key が揺れても同じ結果になる。
      const typedKey = typedKeyFrom(event);
      if (state.screen === "result") {
        if (event.key === "Escape") dispatch({ type: "SHOW_MAP" });
        if (typedKey === "m") dispatch({ type: "SHOW_MAP" });
        if (typedKey === "r") dispatch({ type: "START_STAGE", stageId: state.result?.stage.id ?? state.save.currentStageId });
        if (typedKey === "n" && state.result?.nextStageId) dispatch({ type: "START_STAGE", stageId: state.result.nextStageId });
        return;
      }
      if ((state.screen === "map" || state.screen === "aquarium") && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const regions = getUnlockedRegions(state.save.unlockedStageIds);
        const selectedId = state.screen === "map" ? state.selectedMapRegionId : state.selectedTankId;
        const currentIndex = regions.findIndex((region) => region.id === selectedId);
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const next = regions[currentIndex + direction];
        if (next) {
          event.preventDefault();
          dispatch({
            type: state.screen === "map" ? "SELECT_MAP_REGION" : "SELECT_TANK",
            regionId: next.id,
          });
        }
        return;
      }
      if (state.screen !== "typing" || typedKey === null) return;
      event.preventDefault();
      // ブラウザは操作なしに音を鳴らさない。打鍵のうちに音の準備を済ませておく。
      if (state.save.settings.sound) primeCatchSound();
      dispatch({ type: "TYPE_KEY", key: typedKey, now: Date.now() });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    state.screen,
    state.session,
    state.save.currentStageId,
    state.save.unlockedStageIds,
    state.selectedMapRegionId,
    state.selectedTankId,
    state.save.settings.sound,
    revealingRegionId,
  ]);

  const navigation = (type) => dispatch({ type });
  const content = state.screen === "title" ? <TitleScreen state={state} dispatch={dispatch} />
    : state.screen === "intro" ? <IntroScreen state={state} dispatch={dispatch} />
    : state.screen === "typing" ? <TypingScreen state={state} dispatch={dispatch} />
    : state.screen === "aquarium" ? <AquariumScreen state={state} dispatch={dispatch} />
      : state.screen === "wardrobe" ? <WardrobeScreen state={state} dispatch={dispatch} />
      : state.screen === "settings" ? <SettingsScreen state={state} dispatch={dispatch} />
        : <MapScreen state={state} dispatch={dispatch} isDev={import.meta.env.DEV} />;
  // タイトルは「まだ紹介していない海」を避けた最後の海を敷く。selectedMapRegionId は
  // 到着演出のために未紹介の海を指していることがあり、そこを使うと初対面が先にばれる。
  const backdropRegionId = state.screen === "title" ? state.lastPlayedRegionId
    : state.screen === "typing" ? state.session?.stage.regionId
    : state.screen === "map" ? state.selectedMapRegionId
      : state.screen === "result" ? state.result?.stage.regionId
        : null;

  return <div className={`app-shell screen-${state.screen} ${backdropRegionId ? `region-backdrop-${backdropRegionId}` : ""} ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}>
    <RegionBackdropTransition
      regionId={state.screen === "map" ? state.selectedMapRegionId : null}
      reducedMotion={state.save.settings.reducedMotion}
    />
    {backdropRegionId && <BubbleField variant="world" />}
    {/* タイトルとタイピング中はヘッダーを隠す。タイトルはまだ冒険前で行き先がなく、
        タイピング中は高さを問題に回せるうえ、練習中に誤って別画面へ飛ばない。 */}
    {state.screen !== "title" && state.screen !== "intro" && state.screen !== "typing" && <Header save={state.save} onMap={() => navigation("SHOW_MAP")} onAquarium={() => navigation("SHOW_AQUARIUM")} onWardrobe={() => navigation("SHOW_WARDROBE")} onSettings={() => navigation("SHOW_SETTINGS")} />}
    {content}
    {state.screen === "result" && <RewardOverlay state={state} dispatch={dispatch} />}
    {/* はじめての海域に着いた瞬間だけ、海の絵に名前を重ねて見せてから引く。 */}
    {revealingRegionId && <RegionRevealOverlay
      region={getRegion(revealingRegionId)}
      reducedMotion={state.save.settings.reducedMotion}
      onDone={dismissRegionReveal}
    />}
    {state.releaseCandidateId && <ReleaseConfirmDialog state={state} dispatch={dispatch} />}
  </div>;
}

function RegionRevealOverlay({ region, reducedMotion, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), reducedMotion ? REGION_REVEAL_STILL_MS : REGION_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [region.id, reducedMotion]);

  // 触れたら先へ進める。読み終えた子を待たせない。
  return <div
    className={`region-reveal region-${region.id}`}
    role="status"
    aria-live="polite"
    onPointerDown={() => doneRef.current()}
  >
    <div className="region-reveal-copy">
      <p className="eyebrow"><UiText>あたらしい海《うみ》にたどりついた</UiText></p>
      <h2><UiText>{region.name}</UiText></h2>
      <p><UiText>{region.description}</UiText></p>
    </div>
  </div>;
}

function RegionBackdropTransition({ regionId, reducedMotion }) {
  const previousRegionRef = useRef(regionId);
  const timerRef = useRef(0);
  const [leavingRegionId, setLeavingRegionId] = useState(null);

  useLayoutEffect(() => {
    const previousRegionId = previousRegionRef.current;
    previousRegionRef.current = regionId;
    window.clearTimeout(timerRef.current);
    if (reducedMotion || !previousRegionId || !regionId || previousRegionId === regionId) {
      setLeavingRegionId(null);
      return;
    }
    setLeavingRegionId(previousRegionId);
    timerRef.current = window.setTimeout(() => setLeavingRegionId(null), 340);
  }, [regionId, reducedMotion]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return leavingRegionId
    ? <div key={`${leavingRegionId}-${regionId}`} className={`region-fade-backdrop region-fade-backdrop-${leavingRegionId}`} aria-hidden="true" />
    : null;
}

function BubbleField({ variant }) {
  const visibleSpecs = variant === "tank" ? TANK_BUBBLE_SPECS : BUBBLE_SPECS;
  return <div className={`pixel-bubbles pixel-bubbles-${variant}`} aria-hidden="true">{visibleSpecs.map(([left, scale, drift], index) => {
    const duration = variant === "tank"
      ? 16 - (scale * 2) + (index % 3)
      : 32 - (scale * 4) + (index % 5);
    const delay = -((index * 3.7) % duration);
    const opacity = variant === "tank" ? .2 + (scale * .08) : .08 + (scale * .055);
    return <span
      className="pixel-bubble"
      key={`${variant}-${index}`}
      style={{
        "--bubble-left": `${left}%`,
        "--bubble-scale": scale,
        "--bubble-drift": `${drift}px`,
        "--bubble-duration": `${duration}s`,
        "--bubble-delay": `${delay}s`,
        "--bubble-opacity": opacity,
      }}
    ><span className="pixel-bubble-art" /></span>;
  })}</div>;
}

function Header({ save, onMap, onAquarium, onWardrobe, onSettings }) {
  return <header className="topbar">
    <button className="brand" onClick={onMap}>
      <UiIcon name="map" />
      <span><UiText plain>海をえらぶ</UiText></span>
    </button>
    <div className="topbar-actions">
      <span className="coin" aria-label={`コイン ${save.coins}`}><UiIcon name="coin" size={16} />{save.coins}</span>
      <button className="nav-button" onClick={onAquarium}><UiIcon name="aquarium" /><span><UiText plain>水槽</UiText></span></button>
      <button className="nav-button" onClick={onWardrobe}><UiIcon name="wardrobe" /><span>きせかえ</span></button>
      <button className="nav-button" onClick={onSettings}><UiIcon name="settings" /><span><UiText plain>設定</UiText></span></button>
    </div>
  </header>;
}

// できることの説明。数は中身から数えるので、海域や生き物が増えても書き換え漏れが起きない。
const TITLE_POINTS = [
  {
    icon: "keyboard",
    headingParts: ["ローマ｜字《じ》を", "ひとつずつ"],
    bodyLines: ["キーの｜場所《ばしょ》と｜指《ゆび》づかいを、", "ひとつずつ。"],
  },
  {
    icon: "aquarium",
    headingParts: ["｜生き物《いきもの》を", "あつめよう"],
    bodyLines: [`${FISH_SPECIES.length}｜種類《しゅるい》の｜海《うみ》の｜生き物《いきもの》を、`, "じぶんの｜水槽《すいそう》に。"],
  },
  {
    icon: "map",
    headingParts: [`${REGIONS.length}つの｜海《うみ》を`, "めぐろう"],
    bodyLines: ["｜潮だまり《しおだまり》から｜深海《しんかい》まで、", "｜少し《すこし》ずつ｜長い《ながい》｜文《ぶん》へ。"],
  },
];

function TitlePointPixelIcon({ name }) {
  if (name === "keyboard") return <svg className="title-point-pixel" viewBox="0 0 16 16" shapeRendering="crispEdges">
    <path className="pixel-icon-light" fillRule="evenodd" d="M1 3h14v10H1V3Zm2 2v6h10V5H3Z" />
    <path className="pixel-icon-accent" d="M4 6h2v2H4V6Zm3 0h2v2H7V6Zm3 0h2v2h-2V6ZM4 9h8v1H4V9Z" />
  </svg>;
  if (name === "aquarium") return <svg className="title-point-pixel" viewBox="0 0 16 16" shapeRendering="crispEdges">
    <path className="pixel-icon-light" fillRule="evenodd" d="M2 2h12v12H2V2Zm2 2v8h8V4H4Z" />
    <path className="pixel-icon-water" d="M4 7h8v5H4V7Z" />
    <path className="pixel-icon-light" d="M5 8h4v3H5V8Zm4 1h2v1H9V9ZM4 9h1v1H4V9Zm6-4h1v1h-1V5Z" />
  </svg>;
  return <svg className="title-point-pixel" viewBox="0 0 16 16" shapeRendering="crispEdges">
    <path className="pixel-icon-light" d="M1 3 5 1v12l-4 2V3Zm10 0 4-2v12l-4 2V3Z" />
    <path className="pixel-icon-water" d="m5 1 6 2v12l-6-2V1Z" />
    <path className="pixel-icon-accent" d="M3 5h1v5H3V5Zm4-1h2v1H7V4Zm2 1h1v2H9V5Zm1 2h1v2h-1V7Zm3-2h1v5h-1V5Z" />
  </svg>;
}

// 図鑑に載った生き物だけが、タイトルの海を泳ぐ。画面まるごとを水槽の枠として、
// 水槽と同じ遊泳ループに任せる。生き物データの泳ぎ方（群れる・漂う・砂で定位する）と
// 泳ぐ層がそのまま効くので、クラゲが横切ったりヤドカリが宙を泳いだりしない。
function TitleFishField({ save, regionId }) {
  // 顔ぶれと並びは開いているあいだ固定で、次に起動すると変わる。水槽の並べ替えと同じ手口。
  const saltRef = useRef(null);
  if (saltRef.current === null) saltRef.current = (Math.random() * 0x7fffffff) | 0;
  const salt = saltRef.current;
  const fish = showcaseFishIndividuals({
    discoveredFishSpeciesIds: save.discoveredFishSpeciesIds,
    regionId,
    rotation: salt,
  });
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  // 虫めがねはタイトルにない。遊泳ループは複製先を任意として扱うので、空のまま渡す。
  const magnifierNodesRef = useRef([]);
  const metaRef = useRef([]);
  metaRef.current = roamingMeta(fish, salt);
  useAquariumRoaming(containerRef, nodesRef, magnifierNodesRef, metaRef, roamingSignature(fish, salt));
  if (fish.length === 0) return null;
  return <div ref={containerRef} className="title-fish-field" aria-hidden="true">
    {fish.map((individual, index) => <FishVisual
      key={individual.id}
      caughtFish={individual}
      index={index}
      roaming
      position={metaRef.current[index].base}
      nodeRef={(element) => { nodesRef.current[index] = element; }}
    />)}
  </div>;
}

function TitleScreen({ state, dispatch }) {
  const region = getRegion(state.lastPlayedRegionId);
  return <main className={`title-screen region-${region.id}`}>
    <TitleFishField save={state.save} regionId={region.id} />
    <div className="title-card">
      <h1 className="title-logo">
        <img
          className="title-logo-image"
          src="/logos/aqua-typing.png"
          alt="アクアタイピング"
          width="1895"
          height="590"
          decoding="async"
          fetchPriority="high"
          draggable="false"
        />
      </h1>
      <p className="title-tagline">
        <span className="title-tagline-copy">
          <UiText>タイピングで、</UiText>
          <br className="title-tagline-break" />
          <UiText>｜海《うみ》の｜生き物《いきもの》に｜会い《あい》にいこう。</UiText>
        </span>
      </p>
      <button className="primary-button title-start" onClick={() => dispatch({ type: "START_ADVENTURE" })}>
        <span className="title-start-label">はじめる</span>
        <span className="title-start-key" aria-hidden="true">ENTER</span>
      </button>
      <ul className="title-points">{TITLE_POINTS.map((point) => <li key={point.icon}>
        <span className="title-point-icon" aria-hidden="true"><TitlePointPixelIcon name={point.icon} /></span>
        <span className="title-point-copy">
          <strong>{point.headingParts.map((part, index) => <Fragment key={part}>
            <span className="title-point-heading-part"><UiText>{part}</UiText></span>
            {index < point.headingParts.length - 1 && <wbr />}
          </Fragment>)}</strong>
          <small>{point.bodyLines.map((line) => <span className="title-point-body-line" key={line}><UiText>{line}</UiText></span>)}</small>
        </span>
      </li>)}</ul>
    </div>
  </main>;
}

function IntroScreen({ state, dispatch }) {
  return <main className="intro-screen"><div className="intro-card"><Avatar save={state.save} /><p className="eyebrow"><UiText>ことばの｜小さな《ちいさな》海《うみ》へようこそ</UiText></p><h1>F と J のぽっちを<br />さわってみよう</h1><p><UiText>3つの｜短い《みじかい》問題《もんだい》を打《う》つと、</UiText><br /><UiText>｜最初の魚《さいしょのさかな》に会《あ》えるよ。</UiText></p><button className="primary-button intro-start" onClick={() => dispatch({ type: "BEGIN_INTRO" })}>はじめる</button><button className="text-button intro-skip" onClick={() => dispatch({ type: "SKIP_INTRO" })}><UiText plain>レッスンをえらぶ</UiText></button></div></main>;
}

function Avatar({ save }) {
  const body = getItem(save.equipped.bodyColor);
  const head = getItem(save.equipped.head);
  const outfit = getItem(save.equipped.outfit);
  const headMark = head?.kind === "leaf" ? "◆" : head?.kind === "star" ? "★" : "";
  return <div className="avatar" aria-label="あなたの相棒"><div className="avatar-headmark">{headMark}</div><div className="avatar-head" style={{ background: body?.color ?? "#88a97a" }} /><div className="avatar-body" style={{ background: outfit?.color ?? "#ece3cc" }} /><span className="avatar-eye left" /><span className="avatar-eye right" /></div>;
}

function RegionNavigator({ regions, selectedId, onSelect, label }) {
  const currentIndex = Math.max(0, regions.findIndex((region) => region.id === selectedId));
  const previous = regions[currentIndex - 1];
  const next = regions[currentIndex + 1];

  return <nav className="region-navigation" aria-label={label}>
    <div className="region-arrow-slot">
      {previous && <button className="region-arrow previous" onClick={() => onSelect(previous.id)} aria-label={`前の海、${previous.name}へ`}>
        <UiIcon name="chevronLeft" size={40} />
        <span><strong><UiText plain>{previous.name}</UiText></strong></span>
      </button>}
    </div>
    <div className="region-dots" role="tablist" aria-label={label}>
      {regions.map((region, index) => <button
        key={region.id}
        role="tab"
        aria-label={`${region.name}へ`}
        aria-selected={region.id === selectedId}
        className={`region-dot region-dot-${region.id} ${region.id === selectedId ? "selected" : ""}`}
        onClick={() => onSelect(region.id)}
      >
        <span className="region-thumbnail" aria-hidden="true" />
        <span className="region-dot-copy">
          <span className="region-dot-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="region-dot-name"><UiText plain>{region.name}</UiText></span>
        </span>
      </button>)}
    </div>
    <div className="region-arrow-slot next-slot">
      {next && <button className="region-arrow next" onClick={() => onSelect(next.id)} aria-label={`次の海、${next.name}へ`}>
        <span><small></small><strong><UiText plain>{next.name}</UiText></strong></span>
        <UiIcon name="chevronRight" size={40} />
      </button>}
    </div>
  </nav>;
}

function MapScreen({ state, dispatch, isDev }) {
  const unlockedRegions = getUnlockedRegions(state.save.unlockedStageIds);
  const region = getRegion(state.selectedMapRegionId);
  const tankFish = state.save.caughtFish.filter((fish) => (fish.regionId ?? getFishSpecies(fish.speciesId).regionId) === region.id);
  const regionStages = STAGES.filter((stage) => stage.regionId === region.id);
  const selectRegion = (regionId) => dispatch({ type: "SELECT_MAP_REGION", regionId });
  return <section className={`map-screen region-${region.id}`}>
    <div className="map-hero sea-hero">
      <div className="map-hero-copy">
        <p className="eyebrow"><UiText>海《うみ》をえらぶ</UiText></p>
        <h1><UiText>{region.name}</UiText></h1>
        <p><UiText>{region.description}</UiText></p>
      </div>
      <div className="aquarium-feature">
        <AquariumPreview fish={tankFish} emptyMessage="海《うみ》へ出《で》ると、魚《さかな》に｜出会える《であえる》よ。" compact />
        <button className="aquarium-attached-button" onClick={() => dispatch({ type: "SHOW_AQUARIUM", regionId: region.id })}>
          <UiIcon name="aquarium" />
          <strong><UiText plain>水槽をみる</UiText></strong>
          <small><UiText plain>{tankFish.length} 匹</UiText></small>
        </button>
      </div>
    </div>
    {unlockedRegions.length > 1 && <RegionNavigator regions={unlockedRegions} selectedId={region.id} onSelect={selectRegion} label="海域を選ぶ" />}
    <div className="section-intro">
      <h2><UiText>レッスンをえらぼう</UiText></h2>
    </div>
    <div className="stage-list">{regionStages.map((stage, index) => {
    const unlocked = state.save.unlockedStageIds.includes(stage.id);
    const current = state.save.currentStageId === stage.id;
    const plays = state.save.stagePlayCounts[stage.id] ?? 0;
    const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, [stage.id]);
    return <article key={stage.id} className={`stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}`}>
      {unlocked && <button
        className="stage-card-hitbox"
        aria-label={`${stage.name}をはじめる`}
        onClick={() => dispatch({ type: "START_STAGE", stageId: stage.id })}
      />}
      <span className="stage-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="stage-copy">
        <h3><UiText>{unlocked ? stage.name : "まだ いけない 海《うみ》"}</UiText></h3>
        <p><UiText>{unlocked ? stage.description : "ひとつ｜前の海《まえのうみ》で 魚《さかな》をつると、ひらくよ。"}</UiText></p>
        {unlocked && <div className="stage-progress">
          <small><UiText plain>{plays} 回つりをした</UiText></small>
          <small className="fish-discovery"><UiText plain>出会った魚</UiText> {discovery.discovered}/{discovery.total}</small>
          <StageMedals medals={state.save.stageMedals[stage.id]} />
        </div>}
      </div>
      <span className={`stage-action ${current ? "primary" : ""}`}>
        <span>{current ? "ここから" : "はじめる"}</span><UiIcon name="play" />
      </span>
    </article>;
  })}</div>
    {isDev && <details className="dev-stage-selector"><summary><UiText plain>開発用: 試すステージを選ぶ</UiText></summary><div>{STAGES.map((stage) => <button key={stage.id} className="secondary-button" onClick={() => dispatch({ type: "DEV_START_STAGE", stageId: stage.id })}>{stage.id}</button>)}</div></details>}
  </section>;
}

function FishVisual({ caughtFish, className = "", index = 0, muted = false, position: requestedPosition, roaming = false, nodeRef }) {
  const species = getFishSpecies(caughtFish?.speciesId);
  const position = requestedPosition ?? { left: `${9 + ((index * 19) % 76)}%`, top: `${20 + ((index * 23) % 54)}%` };
  const spriteDuration = species.sprite ? species.sprite.frames * species.sprite.frameMs : 0;
  const spriteStyle = species.sprite ? {
    "--sprite-image": `url("${species.sprite.src}")`,
    "--sprite-duration": `${spriteDuration}ms`,
    // Offset each individual's frame cycle so they don't all blow bubbles in unison.
    "--sprite-delay": `-${stableFishNumber(caughtFish) % spriteDuration}ms`,
  } : {};
  return <span ref={nodeRef} className={`fish-visual ${species.sprite ? "has-sprite" : ""} ${species.shape} ${caughtFish?.size ?? "medium"} ${caughtFish?.variant ?? "common"} movement-${species.movement ?? "cruise"} ${roaming ? "roaming" : ""} ${className} ${muted ? "muted" : ""}`} style={{ "--fish": species.color, "--accent": species.accent, "--fish-scale": species.scale ?? 1, ...spriteStyle, ...position }} aria-label={muted ? "近づいている魚影" : species.name}><span className="fish-art">{species.sprite ? <span className="fish-sprite" aria-hidden="true" /> : <><span className="fish-tail" /><span className="fish-body" /><span className="fish-eye" /></>}</span></span>;
}

// Touch summons the magnifier only after holding still, so a swipe over the tank still scrolls.
const MAGNIFIER_HOLD_MS = 320;
const MAGNIFIER_HOLD_SLOP_PX = 12;
const MAGNIFIER_TOUCH_GAP_PX = 16;

// Deterministic PRNG (mulberry32) so each fish wanders the same way across renders.
function makeFishRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each fish roams to random waypoints inside the tank, clamped to the frame, and
// only turns to face a new target when it lies clearly to its other side (throttled).
function useAquariumRoaming(containerRef, nodesRef, magnifierNodesRef, metaRef, signature) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const meta = metaRef.current;
    const nodes = nodesRef.current;

    const fishes = meta.map((info, i) => {
      const node = nodes[i];
      const random = makeFishRandom(info.seed || i + 1);
      const x = parseFloat(info.base.left) || 10;
      const y = parseFloat(info.base.top) || 20;
      const slow = info.drift ? 0.55 : 1;
      const anchored = info.anchored === true;      // burrow-dwellers (garden eels) hold their spot in the sand
      const school = info.school === true && !anchored;
      return {
        index: i,
        node,
        random,
        sourceFacing: info.sourceFacing,
        speciesId: info.speciesId,
        depth: info.depth,
        scale: info.scale ?? 1,
        salt: info.salt ?? 0,
        anchored,
        school,
        center: null,
        // React keeps the element at this base left/top; the animation only translates from here.
        baseX: x, baseY: y,
        // Cache the node size once so the per-frame loop never reads layout.
        w: node?.offsetWidth ?? 52, h: node?.offsetHeight ?? 34,
        x, y, tx: x, ty: y,
        facing: random() < 0.5 ? 1 : -1,
        // Schooling fish swim a touch faster so they can keep up with the shoal.
        speed: ((school ? 2.6 : 1.6) + random() * (school ? 1.4 : 2.2)) * slow,
        offsetX: school ? (random() * 2 - 1) * 15 : 0,
        offsetY: school ? (random() * 2 - 1) * 9 : 0,
        flipDelay: 120 + random() * 520,          // each member turns a beat after the shoal
        // Anchored dwellers sway a little more so they read as "swaying in place".
        bobAmp: anchored ? 1.2 + random() * 0.5 : (info.drift ? 1.1 : 0.5) + random() * 0.6,
        swayAmp: anchored ? 0.5 + random() * 0.4 : 0,
        bobFreq: (anchored ? 0.5 : 0.4) + random() * 0.5,
        phase: random() * Math.PI * 2,
        nextRetargetAt: 0,
        lastFlipAt: -1e4,
      };
    });

    // Cache the tank size; refreshed at the top of frame() so per-frame writes never force a layout read.
    let cw = container.clientWidth || 1;
    let ch = container.clientHeight || 1;

    const boundsFor = (entity) => {
      const scale = entity.scale ?? 1;   // bigger fish reserve more room so they never clip the frame
      const wPct = (((entity.w ?? 52) * scale) / cw) * 100;
      const hPct = (((entity.h ?? 34) * scale) / ch) * 100;
      const xMin = 1.5;
      const xMax = Math.max(xMin, 98.5 - wPct);
      // Seabed dwellers (anchored burrowers and the "floor" band) may sink into the sand, so they can
      // sit lower than open-water swimmers. Reserving the full sprite height would otherwise push a
      // large floor species (エイやヒラメ) up into the mid-water.
      const seabed = entity.anchored || entity.depth === "floor";
      const frameYMax = seabed ? Math.max(4, 90 - hPct * 0.4) : Math.max(4, 84 - hPct);
      const band = DEPTH_BANDS[entity.depth] ?? DEPTH_BANDS.mid;
      const yMin = Math.min(band[0], frameYMax);
      const yMax = Math.min(Math.max(band[1], yMin + 1), frameYMax);
      return { xMin, xMax, yMin, yMax };
    };

    const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

    // Move with a compositor-only transform (translate + scale) instead of left/top, so many fish
    // never trigger layout. We translate by the delta from the React-owned base position.
    const applyTransform = (fish, xPct, yPct) => {
      const dx = ((xPct - fish.baseX) / 100) * cw;
      const dy = ((yPct - fish.baseY) / 100) * ch;
      const transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${fish.scale})`;
      fish.node.style.transform = transform;
      const magnifierNode = magnifierNodesRef.current[fish.index];
      if (magnifierNode) magnifierNode.style.transform = transform;
    };

    const applyFacing = (fish) => {
      const flipped = (fish.facing === -1 ? "left" : "right") !== fish.sourceFacing;
      fish.node.classList.toggle("is-flipped", flipped);
      magnifierNodesRef.current[fish.index]?.classList.toggle("is-flipped", flipped);
    };

    const place = (fish) => {
      if (fish.node) {
        applyTransform(fish, fish.x, fish.y);
        applyFacing(fish);
      }
    };

    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Clamp the initial scattered position into the frame and the fish's depth band.
    fishes.forEach((fish) => {
      const { xMin, xMax, yMin, yMax } = boundsFor(fish);
      fish.x = clamp(fish.x, xMin, xMax);
      fish.y = clamp(fish.y, yMin, yMax);
      fish.tx = fish.x;
      fish.ty = fish.y;
    });

    if (reduce) {
      fishes.forEach(place);
      return undefined;
    }

    // Same-species schooling fish share a wandering shoal center to cluster around.
    const schools = new Map();
    for (const fish of fishes) {
      if (!fish.school || !fish.node) continue;
      let center = schools.get(fish.speciesId);
      if (!center) {
        const random = makeFishRandom((stableFishNumber({ speciesId: fish.speciesId }) ^ Math.imul(fish.salt, 0x9e3779b1)) >>> 0);
        center = {
          random,
          depth: fish.depth,
          node: undefined,
          x: fish.x, y: fish.y, tx: fish.x, ty: fish.y,
          facing: fish.facing,
          speed: 1.2 + random() * 1,
          lastFlipAt: -1e4,
          nextRetargetAt: 0,
        };
        schools.set(fish.speciesId, center);
      }
      fish.center = center;
    }

    // Start members already gathered around their shoal so it doesn't visibly assemble on open.
    for (const fish of fishes) {
      if (!fish.center) continue;
      const { xMin, xMax, yMin, yMax } = boundsFor(fish);
      fish.x = clamp(fish.center.x + fish.offsetX, xMin, xMax);
      fish.y = clamp(fish.center.y + fish.offsetY, yMin, yMax);
      fish.tx = fish.x;
      fish.ty = fish.y;
      fish.facing = fish.center.facing;
    }

    const retarget = (entity, now) => {
      const { xMin, xMax, yMin, yMax } = boundsFor(entity);
      entity.tx = xMin + entity.random() * (xMax - xMin);
      entity.ty = yMin + entity.random() * (yMax - yMin);
      entity.nextRetargetAt = now + 3200 + entity.random() * 4200;
      const dx = entity.tx - entity.x;
      if (Math.abs(dx) > 9) {
        const desired = dx > 0 ? 1 : -1;
        if (desired !== entity.facing && now - entity.lastFlipAt > 2600) {
          entity.facing = desired;
          entity.lastFlipAt = now;
        }
      }
    };

    const advance = (entity, dt) => {
      const dx = entity.tx - entity.x;
      const dy = entity.ty - entity.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        const move = Math.min(dist, entity.speed * dt);
        entity.x += (dx / dist) * move;
        entity.y += (dy / dist) * move;
      }
      return dist;
    };

    let raf = 0;
    let last = performance.now();
    fishes.forEach((fish) => {
      place(fish);
      fish.nextRetargetAt = last + fish.random() * 1400;
    });

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Refresh the cached tank size once (handles container resize) before any writes.
      cw = container.clientWidth || cw;
      ch = container.clientHeight || ch;

      // Move each shoal center first so its members can follow it this frame.
      for (const center of schools.values()) {
        if (now >= center.nextRetargetAt) retarget(center, now);
        const dist = advance(center, dt);
        if (dist < 0.6) center.nextRetargetAt = Math.min(center.nextRetargetAt, now + 400 + center.random() * 900);
      }

      for (const fish of fishes) {
        if (!fish.node) continue;
        if (fish.anchored) {
          // Hold the spot in the sand and only sway gently, like a garden eel.
          const t = now / 1000;
          const swayY = Math.sin(t * fish.bobFreq + fish.phase) * fish.bobAmp;
          const swayX = Math.sin(t * fish.bobFreq * 0.7 + fish.phase) * fish.swayAmp;
          applyTransform(fish, fish.x + swayX, fish.y + swayY);
          applyFacing(fish);
          continue;
        }
        if (fish.center) {
          const { xMin, xMax, yMin, yMax } = boundsFor(fish);
          fish.tx = clamp(fish.center.x + fish.offsetX, xMin, xMax);
          fish.ty = clamp(fish.center.y + fish.offsetY, yMin, yMax);
          // Follow the shoal's turn, but a beat later than its neighbours so it doesn't snap in unison.
          if (fish.facing !== fish.center.facing && now >= fish.center.lastFlipAt + fish.flipDelay) {
            fish.facing = fish.center.facing;
          }
        } else if (now >= fish.nextRetargetAt) {
          retarget(fish, now);
        }
        const dist = advance(fish, dt);
        if (!fish.center && dist < 0.6) {
          fish.nextRetargetAt = Math.min(fish.nextRetargetAt, now + 200 + fish.random() * 500);
        }
        const bob = Math.sin((now / 1000) * fish.bobFreq + fish.phase) * fish.bobAmp;
        applyTransform(fish, fish.x, fish.y + bob);
        applyFacing(fish);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [signature]);
}

// 遊泳ループへ渡す1匹ぶんの設定。水槽もタイトルも同じ作り方をするので、
// 生き物データの movement / depth / school / scale はどちらでも同じように効く。
function roamingMeta(fishList, seedSalt) {
  return fishList.map((caughtFish, index) => {
    const species = getFishSpecies(caughtFish.speciesId);
    // Mix the per-open salt into each fish's seed so positions and paths vary between visits.
    const seed = (stableFishNumber(caughtFish) ^ Math.imul(seedSalt, 0x9e3779b1)) >>> 0;
    return {
      seed,
      salt: seedSalt,
      speciesId: species.id,
      sourceFacing: species.sprite?.sourceFacing ?? "right",
      drift: (species.movement ?? "cruise") === "drift",
      anchored: species.movement === "anchor",
      school: species.school === true,
      depth: species.depth ?? "mid",
      scale: species.scale ?? 1,
      base: aquariumPosition(index, seed, seedSalt),
    };
  });
}

// 顔ぶれか並べ直しが変わったときだけ遊泳ループを組み直すための鍵。
function roamingSignature(fishList, seedSalt) {
  return `${seedSalt}:${fishList.map((fish) => fish.id).join(",")}`;
}

function AquariumPreview({ fish = [], emptyMessage, compact = false, seedSalt = 0 }) {
  const limit = compact ? AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT : AQUARIUM_VISIBLE_FISH_LIMIT;
  const visibleFish = selectAquariumFish(fish, limit);
  const ariaLabel = visibleFish.length < fish.length
    ? `水槽。${fish.length} 匹のうち ${visibleFish.length} 匹を表示`
    : `水槽。つかまえた魚 ${fish.length} 匹`;
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  const magnifierNodesRef = useRef([]);
  const magnifierRef = useRef(null);
  const magnifierContentRef = useRef(null);
  const pressedPointerRef = useRef(null);
  const holdRef = useRef({ timer: null, active: false, x: 0, y: 0 });
  const metaRef = useRef([]);
  metaRef.current = roamingMeta(visibleFish, seedSalt);
  useAquariumRoaming(containerRef, nodesRef, magnifierNodesRef, metaRef, roamingSignature(visibleFish, seedSalt));

  // Scrolling is only blocked once the lens is up, and only through a non-passive listener:
  // touch-action stays untouched so swipe and pinch keep working on the tank.
  useEffect(() => {
    const container = containerRef.current;
    const hold = holdRef.current;
    if (!container) return undefined;
    const blockScroll = (event) => {
      if (hold.active) event.preventDefault();
    };
    container.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      container.removeEventListener("touchmove", blockScroll);
      if (hold.timer !== null) clearTimeout(hold.timer);
      hold.timer = null;
      hold.active = false;
    };
  }, []);

  const setMagnifierVisible = (visible) => {
    containerRef.current?.classList.toggle("is-magnifying", visible);
  };

  // Sit the lens above the fingertip so the hand does not cover what it magnifies.
  const magnifierLift = () => (magnifierRef.current ? magnifierRef.current.offsetWidth / 2 + MAGNIFIER_TOUCH_GAP_PX : 0);

  const moveMagnifier = (point, lift = 0) => {
    const container = containerRef.current;
    const magnifier = magnifierRef.current;
    const content = magnifierContentRef.current;
    if (!container || !magnifier || !content) return;
    const bounds = container.getBoundingClientRect();
    const x = Math.min(bounds.width, Math.max(0, point.clientX - bounds.left));
    const y = Math.min(bounds.height, Math.max(0, point.clientY - bounds.top));
    const lensSize = magnifier.offsetWidth;
    const radius = lensSize / 2;
    // The lens keeps the touched point at its centre, so lifting it clear of the fingertip
    // changes where the lens sits without changing what it shows.
    const lensX = Math.min(Math.max(radius, x), Math.max(radius, bounds.width - radius));
    const lensY = Math.min(Math.max(radius, y - lift), Math.max(radius, bounds.height - radius));
    const zoom = Number.parseFloat(getComputedStyle(magnifier).getPropertyValue("--magnifier-zoom")) || 2;
    magnifier.style.left = `${lensX - radius}px`;
    magnifier.style.top = `${lensY - radius}px`;
    content.style.width = `${bounds.width}px`;
    content.style.height = `${bounds.height}px`;
    content.style.left = `${radius - (x * zoom)}px`;
    content.style.top = `${radius - (y * zoom)}px`;
  };

  const cancelHold = () => {
    const hold = holdRef.current;
    if (hold.timer !== null) clearTimeout(hold.timer);
    hold.timer = null;
    hold.active = false;
  };

  const onPointerEnter = (event) => {
    if (event.pointerType !== "mouse") return;
    moveMagnifier(event);
    setMagnifierVisible(true);
  };
  const onPointerMove = (event) => {
    const hold = holdRef.current;
    if (hold.timer !== null) {
      // Still deciding: a finger that travels is scrolling, not asking for the lens.
      const moved = Math.abs(event.clientX - hold.x) > MAGNIFIER_HOLD_SLOP_PX || Math.abs(event.clientY - hold.y) > MAGNIFIER_HOLD_SLOP_PX;
      if (moved) cancelHold();
      return;
    }
    if (event.pointerType !== "mouse" && pressedPointerRef.current !== event.pointerId) return;
    moveMagnifier(event, hold.active ? magnifierLift() : 0);
  };
  const onPointerDown = (event) => {
    if (!event.isPrimary) return;
    cancelHold();
    if (event.pointerType !== "mouse") {
      // Touch keeps native scrolling and pinch-zoom; only a deliberate hold summons the lens.
      const hold = holdRef.current;
      const { pointerId, clientX, clientY } = event;
      hold.x = clientX;
      hold.y = clientY;
      hold.timer = setTimeout(() => {
        hold.timer = null;
        hold.active = true;
        pressedPointerRef.current = pointerId;
        try {
          containerRef.current?.setPointerCapture?.(pointerId);
        } catch {
          // The finger may have left between the press and the timer; the lens still tracks it.
        }
        moveMagnifier({ clientX, clientY }, magnifierLift());
        setMagnifierVisible(true);
      }, MAGNIFIER_HOLD_MS);
      return;
    }
    pressedPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveMagnifier(event);
    setMagnifierVisible(true);
  };
  const onPointerEnd = (event) => {
    cancelHold();
    if (pressedPointerRef.current !== event.pointerId) return;
    pressedPointerRef.current = null;
    if (event.pointerType !== "mouse") {
      setMagnifierVisible(false);
      return;
    }
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      setMagnifierVisible(false);
    }
  };
  const onPointerLeave = (event) => {
    if (event.pointerType === "mouse" && pressedPointerRef.current === null) setMagnifierVisible(false);
  };

  return <div
    ref={containerRef}
    className="aquarium-preview"
    aria-label={ariaLabel}
    onPointerEnter={onPointerEnter}
    onPointerMove={onPointerMove}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd}
    onPointerLeave={onPointerLeave}
  >
    <div className="water-shine" />
    <BubbleField variant="tank" />
    {visibleFish.length > 0 ? visibleFish.map((caughtFish, index) => <FishVisual key={caughtFish.id} caughtFish={caughtFish} index={index} roaming position={metaRef.current[index].base} nodeRef={(el) => { nodesRef.current[index] = el; }} />) : <p><span><UiText>{emptyMessage}</UiText></span></p>}
    <span className="aquarium-sand" />
    <span ref={magnifierRef} className="aquarium-magnifier" aria-hidden="true">
      <span ref={magnifierContentRef} className="aquarium-magnifier-content aquarium-preview">
        <div className="water-shine" />
        <BubbleField variant="tank" />
        {visibleFish.length > 0 ? visibleFish.map((caughtFish, index) => <FishVisual key={`magnifier-${caughtFish.id}`} caughtFish={caughtFish} index={index} roaming position={metaRef.current[index].base} nodeRef={(el) => { magnifierNodesRef.current[index] = el; }} />) : <p><span><UiText>{emptyMessage}</UiText></span></p>}
        <span className="aquarium-sand" />
      </span>
    </span>
  </div>;
}

function UnknownFishVisual({ rare = false }) {
  return <span className={`unknown-fish-visual ${rare ? "rare" : ""}`} role="img" aria-label={rare ? "未発見のレアな生き物" : "未発見の生き物"}><img src="/sprites/unknown-fish.png" alt="" />{rare && <span className="unknown-rare-mark" aria-hidden="true">?</span>}</span>;
}

function StageMedals({ medals = {}, onlyEarned = false }) {
  const definitions = [
    { key: "careful", title: "ていねいさメダル", hint: "ミスを すくなく うつ" },
    { key: "speed", title: "スピードメダル", hint: "すばやく うつ" },
    { key: "gold", title: "ゴールドメダル", hint: "ふたつとも できる" },
  ];
  const visible = onlyEarned ? definitions.filter((medal) => medals[medal.key]) : definitions;
  return <div className="stage-medals" aria-label={`ていねいさ: ${medals.careful ? "獲得" : "未獲得"}、スピード: ${medals.speed ? "獲得" : "未獲得"}、ゴールド: ${medals.gold ? "獲得" : "未獲得"}`}>{visible.map((medal) => {
    const status = medals[medal.key] ? "獲得済み" : "未獲得";
    return <span
      key={medal.key}
      className="medal-tooltip"
      data-tooltip={`${medal.title}：${medal.hint}（${status}）`}
      aria-label={`${medal.title}、${medal.hint}、${status}`}
      role="img"
      tabIndex={0}
    >
      <span className={`medal ${medal.key} ${medals[medal.key] ? "earned" : ""}`}><MedalPattern type={medal.key} /></span>
    </span>;
  })}</div>;
}

function MedalPattern({ type }) {
  return <svg className="medal-pattern" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    {type === "speed" && <>
      <path d="M1 2h10v3H1zM5 7h10v3H5zM1 12h10v2H1z" />
      <path className="medal-pattern-detail" d="M12 2h3v3h-3zM1 7h2v3H1zM12 12h3v2h-3z" />
    </>}
    {type === "careful" && <>
      <path d="M3 1h7v2H3v2H1V3h2zM10 3h2v2h2v5h-2V5h-2zM1 5h2v7H1zM3 12h5v2H3zM5 5h5v5H5z" />
      <path className="medal-pattern-detail" d="M6 9h2v2h2v2h2v-2h2V9h2v4h-2v2h-4v-2H8v-2H6z" />
    </>}
    {type === "gold" && <>
      <path d="M1 3h3v3h2V1h4v5h2V3h3v10H1z" />
      <path className="medal-pattern-detail" d="M3 9h10v2H3zM5 5h2v2H5zM9 5h2v2H9z" />
    </>}
  </svg>;
}

// お題1行ぶんの見た目の幅を、全角文字を1として数える。
function problemDisplayWidth(text) {
  return [...text].reduce((width, char) => width + (/[\x20-\x7e]/.test(char) ? 0.5 : 1), 0);
}

// お題やローマ字ガイドを最大2行の窓に収め、それを超える長い文は行単位で
// 上へスクロールさせる。毎打鍵ではなく、入力位置が次の表示行へ移ったときだけ動かす。
// 高さ計算の丸め誤差も吸収し、窓に収まる文がわずかに動かないようにする。
function ScrollingLine({ className, ariaLabel, style, progress, children }) {
  const innerRef = useRef(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const viewportHeight = inner.parentElement.clientHeight;
    const contentHeight = inner.scrollHeight;
    const lineHeight = Number.parseFloat(window.getComputedStyle(inner).lineHeight);
    if (!Number.isFinite(lineHeight) || contentHeight <= viewportHeight + 2) {
      setShift(0);
      return;
    }

    const totalLines = Math.max(1, Math.round(contentHeight / lineHeight));
    const visibleLines = Math.max(1, Math.round(viewportHeight / lineHeight));
    const hiddenLines = Math.max(0, totalLines - visibleLines);
    const normalizedProgress = Math.min(1, Math.max(0, progress || 0));
    const activeLine = Math.min(totalLines - 1, Math.floor(normalizedProgress * totalLines));
    const firstVisibleLine = Math.min(hiddenLines, Math.max(0, activeLine - visibleLines + 1));
    setShift(firstVisibleLine * lineHeight);
  }, [children, progress]);
  return <p className={className} aria-label={ariaLabel} style={style}>
    <span ref={innerRef} className="scroll-inner" style={{ transform: `translateY(${-shift}px)` }}>{children}</span>
  </p>;
}

function TypingScreen({ state, dispatch }) {
  const { stage, index, problems, attempt, feedback, lastKey, lastKeyOk, inputSeq } = state.session;
  const display = attempt.matcher.display();
  const finger = getFingerGuide(display.next);
  // 直接入力もかな入力も progress() は「お題の何文字目まで進んだか」を返すので、そこで打ち終わりを切る。
  const typedCount = attempt.matcher.progress();
  const companionText = attempt.completed ? "その調子！" : feedback || (finger.label ? `${finger.label}で\n${display.next === " " ? "Space" : display.next.toUpperCase()}をおそう。` : "つぎのキーを、ゆっくりさがそう。");
  // 海図のステージカードと同じ、海域内の通し番号。
  const stageNumber = STAGES.filter((item) => item.regionId === stage.regionId).findIndex((item) => item.id === stage.id) + 1;
  return <section className={`typing-screen region-${stage.regionId} ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}>
    {/* ステージ名は枠の外、「やめる」と同じ行へ。行をひとつ増やさずに見出しを立てられる。 */}
    <div className="typing-top">
      <button className="text-button exit-lesson-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span>やめる</span></button>
      <p className="eyebrow typing-stage-name"><span className="typing-stage-number">{String(stageNumber).padStart(2, "0")}</span><span className="typing-stage-label"><UiText>{stage.name}</UiText></span></p>
    </div>
    <div className="typing-stage sea-typing-stage">
      <p className="problem-title"><UiText>{attempt.problem.title}</UiText></p>
      {/* お題の見た目の幅をCSSへ渡す。長い文ほど自動で小さくなり、2行の窓に収める。
          潮だまりの直接入力は半角なので、全角の半分として数える。 */}
      <ScrollingLine className="problem-text" ariaLabel="入力する文字" progress={typedCount / Math.max([...attempt.problem.text].length, 1)} style={{ "--problem-length": problemDisplayWidth(attempt.problem.text) }}><span className="problem-text-typed">{attempt.problem.text.slice(0, typedCount)}</span><span className="problem-text-rest">{attempt.problem.text.slice(typedCount)}</span></ScrollingLine>
      {/* ガイドも推奨ローマ字の長さで縮める。打っている途中で綴りが変わっても長さは動かさない。 */}
      <ScrollingLine className="input-guide" ariaLabel="ローマ字入力" progress={display.typed.length / Math.max(attempt.problem.estimatedKeystrokes, 1)} style={{ "--guide-length": attempt.problem.estimatedKeystrokes }}><span className="input-guide-typed">{display.typed}</span><span className="input-guide-next">{display.next}</span><span className="input-guide-rest">{display.rest}</span></ScrollingLine>
    </div>
    {/* 罫線ラベルの位置は進捗表示に譲る。キーボードガイドを隠していても進捗は出したいので、
        ラベル自体はガイドの表示設定によらず常に描く。 */}
    <div className="keyboard-section">
      <div className="keyboard-section-label">
        <span className="section-rule" />
        <span className="typing-count"><UiText plain>つり</UiText> <strong>{index + 1}</strong> / {problems.length}</span>
        <span className="section-rule" />
      </div>
      {state.save.settings.keyboardGuide && <KeyboardGuide expected={display.next} finger={finger} companionText={companionText} lastKey={lastKey} lastKeyOk={lastKeyOk} inputSeq={inputSeq} />}
    </div>
  </section>;
}

function GuideTurtle() {
  return <img className="guide-turtle" src="/sprites/turtle-guide.png" alt="" aria-hidden="true" draggable="false" />;
}

function KeyboardGuide({ expected, finger, companionText, lastKey, lastKeyOk, inputSeq }) {
  const keycapClass = (key) => `keycap ${expected === key ? "expected" : ""} ${key === lastKey ? (lastKeyOk ? "pressed" : "wrong") : ""}`;
  // 押されたキーだけ React key に inputSeq を混ぜて付け替え、同じキーの連打でも演出を再生し直す。
  const keycapKey = (key) => key === lastKey ? `${key}-${inputSeq}` : key;
  return <div className="keyboard-area"><aside className="guide-companion" aria-label="ウミガメ先生からのアドバイス" aria-live="polite"><GuideTurtle /><p className="speech-bubble"><UiText>{companionText}</UiText></p></aside><div className="keyboard-guide" aria-label="キーボードガイド">{KEY_ROWS.map((row) => <div className="key-row" key={row.join("")}>{row.map((key) => <span key={keycapKey(key)} className={keycapClass(key)}>{key.toUpperCase()}</span>)}</div>)}<div className="key-row"><span key={keycapKey(" ")} className={`${keycapClass(" ")} space`}>SPACE</span></div><div className="finger-guide" aria-label="使う指のガイド"><Hand side="left" active={finger} /><Hand side="right" active={finger} /></div></div></div>;
}

function Hand({ side, active }) {
  const name = side === "left" ? "左手" : "右手";
  return <div className="hand-group"><span className="hand-label"><UiText plain>{name}</UiText></span><div className={`hand ${side}`} aria-label={`${name}の指`}><span className="palm" />{["pinky", "ring", "middle", "index", "thumb"].map((finger) => <span key={finger} className={`finger ${finger} ${active.finger === finger && (active.side === side || active.side === "both") ? "active" : ""}`} />)}</div></div>;
}

function WardrobeScreen({ state, dispatch }) {
  return <section className="wardrobe-screen">
    <div className="screen-heading">
      <div><p className="eyebrow"><UiText>相棒《あいぼう》のもちもの</UiText></p><h1><UiText>今日《きょう》は、なにを身《み》につける？</UiText></h1><p><UiText>{state.message || "海《うみ》で｜見つけた《みつけた》コインで、身《み》じたくできるよ。"}</UiText></p></div>
      <Avatar save={state.save} />
    </div>
    <div className="item-grid">{ITEMS.map((item) => {
      const owned = state.save.ownedItemIds.includes(item.id);
      const equipped = state.save.equipped[item.slot] === item.id;
      const visual = item.kind === "leaf" ? "◆" : item.kind === "star" ? "★" : "●";
      return <article key={item.id} className={`item-card ${equipped ? "equipped" : ""}`}>
        <div className="item-preview" style={item.color ? { "--item-color": item.color } : undefined}>{visual}</div>
        <h2><UiText>{item.name}</UiText></h2>
        <p><UiText>{item.slot === "bodyColor" ? "からだの色《いろ》" : item.slot === "head" ? "あたま" : "ふく"}</UiText></p>
        <button className="secondary-button" disabled={equipped} onClick={() => dispatch({ type: "PURCHASE_OR_EQUIP", itemId: item.id })}><UiText plain>{equipped ? "つけている" : owned ? "つける" : `${item.price} コインで みつける`}</UiText></button>
      </article>;
    })}</div>
    <button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span><UiText plain>レッスンをえらぶ</UiText></span></button>
  </section>;
}

function AquariumScreen({ state, dispatch }) {
  const collection = fishCollectionStats(state.save.caughtFish);
  const unlockedRegions = getUnlockedRegions(state.save.unlockedStageIds);
  const region = getRegion(state.selectedTankId);
  const tankFish = state.save.caughtFish.filter((fish) => (fish.regionId ?? getFishSpecies(fish.speciesId).regionId) === region.id);
  const species = fishSpeciesForRegion(region.id);
  const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, region.stageIds);
  const counts = fishCountsBySpecies(tankFish);
  // Fresh random arrangement each time a tank is opened or switched, but stable while it stays open.
  const tankSaltRef = useRef({ id: null, salt: 0 });
  if (tankSaltRef.current.id !== region.id) {
    tankSaltRef.current = { id: region.id, salt: (Math.random() * 0x7fffffff) | 0 };
  }
  const selectTank = (regionId) => dispatch({ type: "SELECT_TANK", regionId });
  return <section className={`aquarium-screen region-${region.id}`}>
    <div className="screen-heading aquarium-heading">
      <div><p className="eyebrow"><UiText>あなたの水槽《すいそう》</UiText></p><h1><UiText>{region.tankName}</UiText></h1><p><UiText>{collection.total === 0 ? "海《うみ》へ出《で》ると、｜最初の魚《さいしょのさかな》に｜出会える《であえる》よ。" : `${tankFish.length} 匹《ひき》が、この水槽《すいそう》を｜泳いで《およいで》いるよ。`}</UiText></p></div>
      <Avatar save={state.save} />
    </div>
    {unlockedRegions.length > 1 && <RegionNavigator regions={unlockedRegions} selectedId={region.id} onSelect={selectTank} label="水槽を選ぶ" />}
    <div className="aquarium-main">
      <AquariumPreview fish={tankFish} emptyMessage="まだ魚《さかな》はいないよ。最初《さいしょ》の海《うみ》へ出《で》かけよう。" seedSalt={tankSaltRef.current.salt} />
      <button className="aquarium-depart-button primary-button" onClick={() => dispatch({ type: "SHOW_MAP", regionId: region.id })}><strong><UiText plain>{region.name}へ出かける</UiText></strong><UiIcon name="play" /></button>
    </div>
    <div className="collection-heading fish-book-heading"><div><h2><UiText>｜出会った生き物《であったいきもの》</UiText> {discovery.discovered} / {discovery.total}</h2></div></div>
    <div className="fish-collection">{species.map((item) => {
      const count = counts[item.id] ?? 0;
      const discovered = state.save.discoveredFishSpeciesIds.includes(item.id);
      const rare = item.rarity === "rare";
      const releaseTarget = tankFish.find((fish) => fish.speciesId === item.id);
      return <article className={`fish-card ${discovered ? "" : "undiscovered"} ${rare ? "rare" : ""}`} key={item.id}>{rare && <span className="rare-ribbon"><UiText>レア</UiText></span>}{discovered ? <FishVisual caughtFish={{ speciesId: item.id }} /> : <UnknownFishVisual rare={rare} />}<div><h3><UiText>{discovered ? item.name : rare ? "レアな生《い》き物《もの》" : "｜未発見の生き物《みはっけんのいきもの》"}</UiText></h3><p><UiText>{discovered ? (count > 0 ? `水槽《すいそう》に ${count} 匹《ひき》` : "図鑑《ずかん》に記録《きろく》されている") : rare ? "この海《うみ》をきわめると ｜出会える《であえる》かも" : "この海《うみ》で待《ま》っているみたい"}</UiText></p>{count > 0 && releaseTarget && <button className="release-button" onClick={() => dispatch({ type: "REQUEST_RELEASE", fishId: releaseTarget.id })}><UiText plain>{count > 1 ? "1匹を海へ逃がす" : "海へ逃がす"}</UiText></button>}</div></article>;
    })}</div>
  </section>;
}

function SettingsScreen({ state, dispatch }) {
  return <section className="settings-screen">
    <p className="eyebrow"><UiText>設定《せってい》</UiText></p>
    <h1><UiText>｜遊び《あそび》やすくする</UiText></h1>
    <div className="settings-list">
      <button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_GUIDE" })}><span><UiText plain>キーボードガイド</UiText></span><strong><UiText plain>{state.save.settings.keyboardGuide ? "表示中" : "非表示"}</UiText></strong></button>
      <button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_SOUND" })}><span><UiText plain>ゲームの効果音</UiText></span><strong>{state.save.settings.sound ? "オン" : "オフ"}</strong></button>
      <button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_MOTION" })}><span><UiText plain>動きをひかえめにする</UiText></span><strong>{state.save.settings.reducedMotion ? "オン" : "オフ"}</strong></button>
    </div>
    <button className="danger-button" onClick={() => window.confirm("冒険のきろくを最初からにしますか？") && dispatch({ type: "RESET" })}><UiText plain>冒険のきろくを最初からにする</UiText></button>
    <button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span><UiText plain>レッスンをえらぶ</UiText></span></button>
  </section>;
}

function RewardOverlay({ state, dispatch }) {
  const nextName = state.result.nextStageId ? getStage(state.result.nextStageId).name : null;
  const nextStageWasJustUnlocked = state.result.unlockedStageId === state.result.nextStageId;
  const nextRegionWasJustUnlocked = nextStageWasJustUnlocked
    && getRegionForStage(state.result.nextStageId).id !== state.result.stage.regionId;
  const earned = state.result.newlyEarnedMedals;
  const fish = getFishSpecies(state.result.caughtFish.speciesId);
  if (state.result.firstCatch) {
    return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="最初につれた魚">
      <div className="reward-card first-catch-card">
        <button className="dialog-close" onClick={() => dispatch({ type: "SHOW_MAP" })} aria-label="レッスン一覧にもどる"><UiIcon name="close" size={20} /></button>
        <p className="eyebrow"><UiText>｜最初の魚《さいしょのさかな》</UiText></p>
        <div className="reward-fish-slot"><FishVisual caughtFish={state.result.caughtFish} className="reward-fish" /><span className="new-fish-badge">NEW</span></div>
        <h1><UiText>{fish.name}</UiText>が<br />つれた！</h1>
        <p><UiText>水槽《すいそう》につれてかえろう。</UiText></p>
        <button className="primary-button first-aquarium-button" onClick={() => dispatch({ type: "SHOW_AQUARIUM", regionId: state.result.caughtFish.regionId })}><UiIcon name="aquarium" /><UiText plain>水槽をみる</UiText></button>
        {nextName && <button className="secondary-button first-next-stage-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}><UiText plain>次の海へ進む</UiText> <small><UiText plain>{nextName}</UiText> <kbd>N</kbd></small></button>}
      </div>
    </section>;
  }
  return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label={state.result.isRareCatch ? "レアな生き物がつれた" : "つれた魚"}>
    <div className={`reward-card fish-reward ${state.result.isRareCatch ? "rare" : ""}`}>
      {state.result.isRareCatch && <p className="eyebrow rare-eyebrow"><UiText>レアな生《い》き物《もの》！</UiText></p>}
      <div className="reward-fish-slot"><FishVisual caughtFish={state.result.caughtFish} className="reward-fish" />{state.result.isNewSpecies && <span className="new-fish-badge">NEW</span>}</div>
      <h1><UiText>{fish.name}</UiText>が<br />つれた！</h1>
      <p className="result-message"><UiText>{state.result.isRareCatch ? "きらめく、めずらしい生《い》き物《もの》だ！" : state.result.accuracy >= 0.85 ? "ていねいに糸をたぐれたね。" : "最後《さいご》までつれたね。すてき！"}</UiText></p>
      {(earned.careful || earned.speed || earned.gold) && <div className="new-medals"><span>あたらしいメダル</span><StageMedals medals={earned} onlyEarned /></div>}
      {nextName && <div className="next-route-group"><div><span><UiText>{nextRegionWasJustUnlocked ? "あたらしい海《うみ》が ひらいた！" : nextStageWasJustUnlocked ? "あたらしい道《みち》が ひらいた！" : "｜次の海《つぎのうみ》へ｜進める《すすめる》よ"}</UiText></span><strong><UiText>{nextName}</UiText></strong></div><button className="primary-button route-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}>すすむ <kbd>N</kbd></button></div>}
      <div className="result-actions">
        <button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><strong><UiText plain>レッスン一覧へ</UiText></strong><small><kbd>M</kbd></small></button>
        <button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.stage.id })}><strong><UiText plain>もう1回</UiText></strong><small><kbd>R</kbd></small></button>
      </div>
    </div>
  </section>;
}

function ReleaseConfirmDialog({ state, dispatch }) {
  const fish = state.save.caughtFish.find((item) => item.id === state.releaseCandidateId);
  if (!fish) return null;
  const species = getFishSpecies(fish.speciesId);
  const sameSpeciesCount = state.save.caughtFish.filter((item) => item.speciesId === fish.speciesId).length;
  const multiple = sameSpeciesCount > 1;
  return <section className="release-confirm-overlay" role="alertdialog" aria-modal="true" aria-label="魚を海へ逃がす"><div className="release-confirm-card"><FishVisual caughtFish={fish} /><p className="eyebrow"><UiText>｜海へ逃がす《うみへにがす》</UiText></p><h2><UiText>{species.name}</UiText>を<br /><UiText>{multiple ? "1匹《ひき》だけ｜海へ逃がす《うみへにがす》？" : "｜海へ逃がす《うみへにがす》？"}</UiText></h2><p><UiText>{multiple ? `水槽《すいそう》にいる ${sameSpeciesCount} 匹《ひき》のうち、1匹《ひき》だけ海《うみ》へ帰《かえ》すよ。` : "水槽《すいそう》からはいなくなるよ。"}</UiText><br /><UiText>図鑑《ずかん》の記録《きろく》は｜残る《のこる》よ。</UiText></p><div className="release-confirm-actions"><button className="secondary-button" onClick={() => dispatch({ type: "CANCEL_RELEASE" })}>キャンセル</button><button className="primary-button" onClick={() => dispatch({ type: "CONFIRM_RELEASE" })}><UiText plain>{multiple ? "1匹逃がす" : "海へ逃がす"}</UiText></button></div></div></section>;
}
