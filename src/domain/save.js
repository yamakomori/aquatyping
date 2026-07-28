import { STARTER_EQUIPPED, STARTER_ITEMS } from "./economy.js";
import { REGIONS, getUnlockedRegions } from "./regions.js";

const SAVE_KEY = "type-rogue-mvp-save-v1";
const CURRICULUM_VERSION = 2;
const SHALLOW_STAGE_IDS = Array.from({ length: 11 }, (_, index) => `SH${String(index + 1).padStart(2, "0")}`);

function hasStageExperience(save, stageId) {
  const problemPrefix = `${stageId.toLowerCase()}-`;
  return (save.stagePlayCounts?.[stageId] ?? 0) > 0
    || (save.attempts ?? []).some((attempt) => attempt.stageId === stageId)
    || (save.caughtFish ?? []).some((fish) => fish.stageId === stageId)
    || (save.completedProblemIds ?? []).some((problemId) => problemId.startsWith(problemPrefix));
}

function migrateCurriculum(save) {
  if ((save.curriculumVersion ?? 1) >= CURRICULUM_VERSION) return save;

  const unlocked = new Set(save.unlockedStageIds ?? ["S00"]);
  const unlockShallowsThrough = (count) => {
    for (const stageId of SHALLOW_STAGE_IDS.slice(0, count)) unlocked.add(stageId);
  };

  // An unlocked legacy stage means its preceding lesson had already been cleared.
  if (unlocked.has("S09")) unlocked.add("SH01");
  if (unlocked.has("S10")) unlockShallowsThrough(7);
  if (unlocked.has("S11")) unlockShallowsThrough(10);

  if (hasStageExperience(save, "S09")) unlockShallowsThrough(7);
  if (hasStageExperience(save, "S10")) unlockShallowsThrough(10);
  if (hasStageExperience(save, "S11")) {
    unlockShallowsThrough(11);
    unlocked.add("CO01");
  }

  const currentStageMap = {
    S09: "SH07",
    S10: "SH10",
    S11: "CO01",
  };
  const currentStageId = currentStageMap[save.currentStageId] ?? save.currentStageId ?? "S00";
  if (currentStageId === "SH07") unlockShallowsThrough(7);
  if (currentStageId === "SH10") unlockShallowsThrough(10);
  if (currentStageId === "CO01") {
    unlockShallowsThrough(11);
    unlocked.add("CO01");
  }

  return {
    ...save,
    curriculumVersion: CURRICULUM_VERSION,
    currentStageId,
    unlockedStageIds: [...unlocked],
  };
}

export function createSave() {
  return {
    schemaVersion: 1,
    curriculumVersion: CURRICULUM_VERSION,
    medalRulesVersion: 4,
    currentStageId: "S00",
    unlockedStageIds: ["S00"],
    // 最後にレッスンを始めた海域。タイトル画面の背景と、戻り先の初期値に使う。
    lastPlayedRegionId: null,
    completedProblemIds: [],
    attempts: [],
    recentProblemIds: [],
    stagePlayCounts: {},
    stageMedals: {},
    caughtFish: [],
    discoveredFishSpeciesIds: [],
    releasedFishCounts: {},
    rareDrySpells: {},
    hasSeenIntro: false,
    // 到着の演出を見せ終えた海域。最初の海域は冒険の出発点なので、はじめから見せた扱いにする。
    revealedRegionIds: [REGIONS[0].id],
    skills: {},
    conceptSkills: {},
    coins: 0,
    xp: 0,
    ownedItemIds: STARTER_ITEMS,
    equipped: STARTER_EQUIPPED,
    settingsVersion: 1,
    settings: { keyboardGuide: true, sound: true, reducedMotion: false },
  };
}

export function loadSave(storage = localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return createSave();
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1) return createSave();
    const migrated = migrateCurriculum(saved);
    const defaults = createSave();
    const merged = {
      ...defaults,
      ...migrated,
      discoveredFishSpeciesIds: migrated.discoveredFishSpeciesIds ?? [...new Set((migrated.caughtFish ?? []).map((fish) => fish.speciesId))],
      // 記録のない古い保存では、たどり着き済みの海域を演出済みとみなす。今さら初対面の演出は出さない。
      revealedRegionIds: migrated.revealedRegionIds ?? getUnlockedRegions(migrated.unlockedStageIds ?? []).map((region) => region.id),
      releasedFishCounts: { ...defaults.releasedFishCounts, ...migrated.releasedFishCounts },
      rareDrySpells: { ...defaults.rareDrySpells, ...migrated.rareDrySpells },
      conceptSkills: { ...defaults.conceptSkills, ...migrated.conceptSkills },
      // settingsVersion より前の保存には、UI から切り替えられなかった頃の設定値が残っている。
      // 使われていなかった値を引き継ぐと機能が無効なままになるので、その世代だけ既定へ戻す。
      settings: migrated.settingsVersion === defaults.settingsVersion
        ? { ...defaults.settings, ...migrated.settings }
        : { ...defaults.settings, ...migrated.settings, sound: defaults.settings.sound },
      settingsVersion: defaults.settingsVersion,
    };
    return migrated.medalRulesVersion === defaults.medalRulesVersion
      ? merged
      : { ...merged, medalRulesVersion: defaults.medalRulesVersion, stageMedals: {} };
  } catch {
    return createSave();
  }
}

export function persistSave(save, storage = localStorage) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function resetSave(storage = localStorage) {
  const save = createSave();
  persistSave(save, storage);
  return save;
}
