import { ITEMS } from "../../domain/economy.js";
import { fishSpeciesForRegion } from "../../domain/fish.js";
import { getUnlockedRegions } from "../../domain/regions.js";

// きせかえアセット（相棒のからだ・ふく・あたま・もちもの）。どれも数KBの小さな透過PNG。
const AVATAR_IMAGES = ITEMS.map((item) => item.asset).filter(Boolean);

// 海域の背景画は海域IDと同じ名前で public/backgrounds に置いてある。
function regionBackdrop(regionId) {
  return `/backgrounds/${regionId}.png`;
}

// 画面がどれになっても要る絵。水槽の部屋、ウミガメ先生、図鑑の未発見枠。
const SHARED_IMAGES = [
  "/backgrounds/aquarium-room.png",
  "/sprites/turtle-guide.png",
  "/sprites/unknown-fish.png",
];

function spriteSources(regionId) {
  return fishSpeciesForRegion(regionId).map((species) => species.sprite?.src);
}

// タイトルから先へ進んだとき、待たずに見えてほしい順に並べる。
// まだ解放していない海域は入れない。背景画は1枚1.5MB前後あり、
// 遊べない海まで先読みすると回線を無駄に使う。
export function startupImageSources(unlockedStageIds, lastPlayedRegionId) {
  const unlockedRegions = getUnlockedRegions(unlockedStageIds ?? []);
  const otherRegionIds = unlockedRegions
    .map((region) => region.id)
    .filter((regionId) => regionId !== lastPlayedRegionId);
  return [
    // タイトルに敷いている絵。CSS も読むが、ここで要求しておくと画面遷移で描き直しても待たない。
    regionBackdrop(lastPlayedRegionId),
    ...spriteSources(lastPlayedRegionId),
    ...SHARED_IMAGES,
    ...AVATAR_IMAGES,
    ...otherRegionIds.map(regionBackdrop),
    ...otherRegionIds.flatMap(spriteSources),
  ].filter(Boolean);
}

const requested = new Set();

function request(src) {
  if (requested.has(src)) return;
  requested.add(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

// ブラウザが暇なときに少しずつ読む。まとめて投げると回線を占有して、
// 「はじめる」を押した直後の画面がかえって遅くなる。
// 戻り値は先読みを打ち切る関数（読み込み済みの分はそのまま残る）。
export function preloadImagesWhenIdle(sources) {
  if (typeof window === "undefined" || typeof Image === "undefined") return () => {};
  const queue = sources.filter((src) => !requested.has(src));
  let cancelled = false;
  const schedule = typeof window.requestIdleCallback === "function"
    ? (run) => window.requestIdleCallback(run, { timeout: 1500 })
    : (run) => window.setTimeout(run, 150);
  const step = () => {
    if (cancelled) return;
    for (let count = 0; count < 3 && queue.length > 0; count += 1) request(queue.shift());
    if (queue.length > 0) schedule(step);
  };
  schedule(step);
  return () => { cancelled = true; };
}
