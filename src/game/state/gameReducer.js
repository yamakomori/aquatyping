import { getNextStage, getStage } from "../../domain/curriculum.js";
import { chooseProblems, getPracticeKeysForStage } from "../../domain/problems.js";
import { equip, getItem, purchase, rewardForPlay, rewardForProblem } from "../../domain/economy.js";
import { awardStageMedals, reviewConceptsForStage, reviewKeysForStage, stageAccuracy, summarizePlay, updateConceptSkills, updateSkills } from "../../domain/learning.js";
import { createSave } from "../../domain/save.js";
import { fishForCatch, getFishSpecies, isRegionCleared, releaseFish } from "../../domain/fish.js";
import { getRegionForStage } from "../../domain/regions.js";
import { completedAttempt, startAttempt, submitKey } from "../../domain/session.js";

export function createGameState(save) {
  const isNewAdventure = save.completedProblemIds.length === 0 && save.caughtFish.length === 0;
  const currentRegionId = getRegionForStage(save.currentStageId).id;
  return { screen: !save.hasSeenIntro && isNewAdventure ? "intro" : "map", save, session: null, result: null, selectedMapRegionId: currentRegionId, selectedTankId: currentRegionId, releaseCandidateId: null, message: "" };
}

function startStage(state, stageId, allowLocked = false) {
  if (!allowLocked && !state.save.unlockedStageIds.includes(stageId)) return state;
  const stage = getStage(stageId);
  const reviewKeys = reviewKeysForStage(
    state.save.skills,
    getPracticeKeysForStage(stageId),
    stage.focusTags?.length ? 1 : 2,
  );
  const reviewConcepts = reviewConceptsForStage(state.save.conceptSkills, stage.focusTags);
  const problems = chooseProblems({
    stageId,
    skills: state.save.skills,
    conceptSkills: state.save.conceptSkills,
    recentIds: state.save.recentProblemIds,
    count: stage.problemCount ?? 3,
    lessonPlan: stage.lessonPlan,
    focusKeys: reviewKeys,
    focusTags: reviewConcepts,
  });
  if (problems.length === 0) return { ...state, message: "この道《みち》の問題《もんだい》を準備中《じゅんびちゅう》です。" };
  return {
    ...state,
    screen: "typing",
    message: "",
    session: {
      stage,
      problems,
      index: 0,
      attempt: startAttempt(problems[0]),
      earned: { coins: 0, xp: 0 },
      completedAttempts: [],
      feedback: "",
      lastKey: null,
      inputSeq: 0,
      reviewKeys,
      reviewConcepts,
    },
  };
}

function completeProblem(state, nextAttempt, durationMs, lastPress = {}) {
  const finished = completedAttempt(nextAttempt, durationMs);
  const reward = rewardForProblem();
  const save = {
    ...state.save,
    coins: state.save.coins + reward.coins,
    xp: state.save.xp + reward.xp,
    skills: updateSkills(state.save.skills, finished),
    conceptSkills: updateConceptSkills(state.save.conceptSkills, finished),
    completedProblemIds: [...new Set([...state.save.completedProblemIds, finished.problemId])],
    recentProblemIds: [...state.save.recentProblemIds, finished.problemId].slice(-10),
  };
  return {
    ...state,
    save,
    session: {
      ...state.session,
      attempt: nextAttempt,
      ...lastPress,
      completedAttempts: [...state.session.completedAttempts, finished],
      earned: {
        coins: state.session.earned.coins + reward.coins,
        xp: state.session.earned.xp + reward.xp,
      },
      feedback: "みつけた！ ｜小さな《ちいさな》ひかりが ふえたよ。",
    },
  };
}

function finishPlay(state) {
  if (!state.session) return state;
  const stageId = state.session.stage.id;
  const bonus = rewardForPlay();
  const playCount = (state.save.stagePlayCounts[stageId] ?? 0) + 1;
  const nextStage = getNextStage(stageId);
  const unlockedStageId = nextStage
    && playCount >= state.session.stage.minCompletedPlays
    && !state.save.unlockedStageIds.includes(nextStage.id)
    ? nextStage.id : null;
  const attempts = [...state.save.attempts, ...state.session.completedAttempts].slice(-300);
  const playSummary = summarizePlay(state.session.completedAttempts);
  const medalAward = awardStageMedals(
    state.save.stageMedals[stageId],
    state.session.stage.medalCriteria,
    playSummary,
  );
  // レア抽選は「このプレイ以前」の記録で海域クリアを判定する（クリア済み海域の再プレイでのみ出現）。
  const regionId = getRegionForStage(stageId).id;
  const regionAlreadyCleared = isRegionCleared(regionId, {
    stagePlayCounts: state.save.stagePlayCounts,
    unlockedStageIds: state.save.unlockedStageIds,
  });
  const rareDrySpell = state.save.rareDrySpells?.[regionId] ?? 0;
  const caughtFish = fishForCatch({
    stageId,
    playCount,
    medals: medalAward.medals,
    stagePlayCounts: state.save.stagePlayCounts,
    unlockedStageIds: state.save.unlockedStageIds,
    discoveredFishSpeciesIds: state.save.discoveredFishSpeciesIds,
    rareDrySpell,
  });
  const caughtRare = getFishSpecies(caughtFish.speciesId).rarity === "rare";
  // 救済カウンタ: クリア済み海域でレアが出なければ加算、出たら0に戻す。
  const nextRareDrySpell = caughtRare ? 0 : regionAlreadyCleared ? rareDrySpell + 1 : rareDrySpell;
  const save = {
    ...state.save,
    coins: state.save.coins + bonus.coins,
    xp: state.save.xp + bonus.xp,
    attempts,
    stagePlayCounts: { ...state.save.stagePlayCounts, [stageId]: playCount },
    stageMedals: { ...state.save.stageMedals, [stageId]: medalAward.medals },
    caughtFish: [...state.save.caughtFish, caughtFish],
    rareDrySpells: { ...state.save.rareDrySpells, [regionId]: nextRareDrySpell },
    discoveredFishSpeciesIds: [...new Set([...state.save.discoveredFishSpeciesIds, caughtFish.speciesId])],
    unlockedStageIds: unlockedStageId
      ? [...state.save.unlockedStageIds, unlockedStageId]
      : state.save.unlockedStageIds,
    currentStageId: unlockedStageId ?? stageId,
  };
  const nextStageId = nextStage && save.unlockedStageIds.includes(nextStage.id)
    ? nextStage.id
    : null;
  return {
    ...state,
    save,
    screen: "result",
    session: null,
    result: {
      stage: state.session.stage,
      earned: {
        coins: state.session.earned.coins + bonus.coins,
        xp: state.session.earned.xp + bonus.xp,
      },
      unlockedStageId,
      nextStageId,
      accuracy: stageAccuracy(attempts, stageId),
      playSummary,
      newlyEarnedMedals: medalAward.newlyEarned,
      caughtFish,
      firstCatch: state.save.caughtFish.length === 0,
      isNewSpecies: !state.save.discoveredFishSpeciesIds.includes(caughtFish.speciesId),
      isRareCatch: caughtRare,
    },
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "BEGIN_INTRO":
      return startStage({ ...state, save: { ...state.save, hasSeenIntro: true } }, "S00");
    case "SKIP_INTRO":
      return { ...state, screen: "map", save: { ...state.save, hasSeenIntro: true } };
    case "START_STAGE":
      return startStage(state, action.stageId);
    case "DEV_START_STAGE":
      return startStage(state, action.stageId, true);
    case "TYPE_KEY": {
      if (state.screen !== "typing" || !state.session || state.session.attempt.completed) return state;
      const { attempt, result } = submitKey(state.session.attempt, action.key, action.now);
      // 打鍵ごとに増える inputSeq で、同じキーを連打してもキーボードの演出を再生し直せる。
      const lastPress = { lastKey: action.key, lastKeyOk: result.accepted, inputSeq: (state.session.inputSeq ?? 0) + 1 };
      if (result.completed) return completeProblem(state, attempt, result.durationMs, lastPress);
      return {
        ...state,
        session: {
          ...state.session,
          attempt,
          ...lastPress,
          feedback: result.accepted ? "" : "だいじょうぶ。\n吹《ふ》き出《で》しの指《ゆび》を、\nゆっくり見《み》よう。",
        },
      };
    }
    case "AUTO_ADVANCE": {
      if (!state.session?.attempt.completed) return state;
      if (state.session.index + 1 >= state.session.problems.length) return finishPlay(state);
      const index = state.session.index + 1;
      return {
        ...state,
        session: {
          ...state.session,
          index,
          attempt: startAttempt(state.session.problems[index]),
          feedback: "",
          lastKey: null,
        },
      };
    }
    case "SHOW_MAP":
      return {
        ...state,
        screen: "map",
        session: null,
        result: null,
        releaseCandidateId: null,
        selectedMapRegionId: action.regionId ?? getRegionForStage(state.save.currentStageId).id,
        message: "",
      };
    case "SELECT_MAP_REGION":
      return { ...state, selectedMapRegionId: action.regionId };
    case "SHOW_WARDROBE":
      return { ...state, screen: "wardrobe", session: null, message: "" };
    case "SHOW_AQUARIUM":
      return { ...state, screen: "aquarium", session: null, result: null, releaseCandidateId: null, selectedTankId: action.regionId ?? state.selectedTankId ?? getRegionForStage(state.save.currentStageId).id, message: "" };
    case "SELECT_TANK":
      return { ...state, selectedTankId: action.regionId };
    case "SHOW_SETTINGS":
      return { ...state, screen: "settings", session: null, message: "" };
    case "TOGGLE_GUIDE":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, keyboardGuide: !state.save.settings.keyboardGuide } } };
    case "TOGGLE_SOUND":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, sound: !state.save.settings.sound } } };
    case "TOGGLE_MOTION":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, reducedMotion: !state.save.settings.reducedMotion } } };
    case "PURCHASE_OR_EQUIP": {
      const item = getItem(action.itemId);
      if (!item) return state;
      if (state.save.ownedItemIds.includes(item.id)) {
        return { ...state, save: equip(state.save, item.id), message: `${item.name}を つけたよ。` };
      }
      const outcome = purchase(state.save, item.id);
      return outcome.ok
        ? { ...state, save: outcome.save, message: `${item.name}を みつけたよ。` }
        : { ...state, message: outcome.reason };
    }
    case "REQUEST_RELEASE":
      return state.save.caughtFish.some((fish) => fish.id === action.fishId)
        ? { ...state, releaseCandidateId: action.fishId }
        : state;
    case "CANCEL_RELEASE":
      return { ...state, releaseCandidateId: null };
    case "CONFIRM_RELEASE": {
      const fishId = state.releaseCandidateId;
      if (!fishId) return state;
      const fish = state.save.caughtFish.find((item) => item.id === fishId);
      const sameSpeciesCount = fish
        ? state.save.caughtFish.filter((item) => item.speciesId === fish.speciesId).length
        : 0;
      return {
        ...state,
        save: releaseFish(state.save, fishId),
        result: state.result?.caughtFish.id === fishId
          ? { ...state.result, fishReleased: true }
          : state.result,
        releaseCandidateId: null,
        message: `${sameSpeciesCount > 1 ? "1匹《ひき》を" : ""}海《うみ》へ逃《に》がしたよ。図鑑《ずかん》には｜残る《のこる》よ。`,
      };
    }
    case "RESET":
      return createGameState(createSave());
    default:
      return state;
  }
}
