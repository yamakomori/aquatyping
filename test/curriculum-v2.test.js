import test from "node:test";
import assert from "node:assert/strict";
import { STAGES, getNextStage, getStage } from "../src/domain/curriculum.js";
import { fishForCatch } from "../src/domain/fish.js";
import { chooseProblems } from "../src/domain/problems.js";
import { RomajiMatcher, validateKana } from "../src/domain/romaji.js";
import { loadSave } from "../src/domain/save.js";
import { createGameState, gameReducer } from "../src/game/state/gameReducer.js";

const SHALLOW_STAGE_IDS = Array.from({ length: 11 }, (_, index) => `SH${String(index + 1).padStart(2, "0")}`);
const CORAL_STAGE_IDS = Array.from({ length: 6 }, (_, index) => `CO${String(index + 1).padStart(2, "0")}`);
const CAVE_STAGE_IDS = Array.from({ length: 6 }, (_, index) => `CA${String(index + 1).padStart(2, "0")}`);
const DEEP_STAGE_IDS = Array.from({ length: 6 }, (_, index) => `DS${String(index + 1).padStart(2, "0")}`);
// 浅瀬と珊瑚の森は全ステージが6問。海の洞窟と深海は文が長くなるぶん後半で問題数を減らす。
const SIX_PROBLEM_STAGE_IDS = [...SHALLOW_STAGE_IDS, ...CORAL_STAGE_IDS];
const ACTIVE_STAGE_IDS = [
  ...Array.from({ length: 9 }, (_, index) => `S${String(index).padStart(2, "0")}`),
  ...SIX_PROBLEM_STAGE_IDS,
  ...CAVE_STAGE_IDS,
  ...DEEP_STAGE_IDS,
];
const LESSON_PLAN = ["intro", "intro", "practice", "practice", "mixed", "treasure"];

function storageWith(saved) {
  return { getItem: () => JSON.stringify(saved) };
}

function completeTypingPlay(state) {
  let next = state;
  let now = Date.now();
  let guard = 0;
  while (next.screen === "typing" && guard < 2000) {
    guard += 1;
    if (next.session.attempt.completed) {
      next = gameReducer(next, { type: "AUTO_ADVANCE" });
    } else {
      now += 50;
      next = gameReducer(next, {
        type: "TYPE_KEY",
        key: next.session.attempt.matcher.display().next,
        now,
      });
    }
  }
  assert.ok(guard < 2000, "typing play should finish");
  return next;
}

test("curriculum v2 uses explicit order and region-sized sessions", () => {
  assert.deepEqual(STAGES.map((stage) => stage.id), ACTIVE_STAGE_IDS);
  assert.deepEqual(STAGES.map((stage) => stage.order), ACTIVE_STAGE_IDS.map((_, index) => index));

  for (const stageId of ACTIVE_STAGE_IDS.slice(0, 9)) {
    assert.equal(getStage(stageId).problemCount, 3);
  }
  for (const stageId of SIX_PROBLEM_STAGE_IDS) {
    assert.equal(getStage(stageId).problemCount, 6);
    assert.deepEqual(getStage(stageId).lessonPlan, LESSON_PLAN);
  }
  assert.equal(getNextStage("S08").id, "SH01");
  assert.equal(getNextStage("SH11").id, "CO01");
  assert.equal(getNextStage("CO06").id, "CA01");
  assert.equal(getNextStage("CA06").id, "DS01");
  assert.equal(getNextStage("DS06"), null);
});

// lessonPlan を持つ全ステージが、重複なしで役割の順どおりに1プレイぶんを組めること。
test("lesson plans fill repeated role slots without duplicates", () => {
  const planned = STAGES.filter((stage) => stage.lessonPlan);
  assert.ok(planned.length >= SIX_PROBLEM_STAGE_IDS.length + CAVE_STAGE_IDS.length);
  for (const stage of planned) {
    assert.equal(stage.lessonPlan.length, stage.problemCount, stage.id);
    const selected = chooseProblems({
      stageId: stage.id,
      count: stage.problemCount,
      lessonPlan: stage.lessonPlan,
      random: () => 0,
    });
    assert.equal(selected.length, stage.problemCount, stage.id);
    assert.equal(new Set(selected.map((problem) => problem.id)).size, stage.problemCount, stage.id);
    assert.deepEqual(selected.map((problem) => problem.lessonRole), stage.lessonPlan, stage.id);
  }
});

test("legacy curriculum progress migrates without deleting historical records", () => {
  const legacyFish = { id: "legacy-fish", speciesId: "deep-lantern", stageId: "S09", regionId: "tidepool" };
  const saved = {
    schemaVersion: 1,
    medalRulesVersion: 4,
    currentStageId: "S09",
    unlockedStageIds: ["S00", "S09"],
    completedProblemIds: ["s09-01"],
    attempts: [{ problemId: "s09-01", stageId: "S09", completed: true }],
    stagePlayCounts: { S09: 2 },
    stageMedals: { S09: { careful: true, speed: false, gold: false } },
    caughtFish: [legacyFish],
  };
  const migrated = loadSave(storageWith(saved));

  assert.equal(migrated.curriculumVersion, 2);
  assert.equal(migrated.currentStageId, "SH07");
  assert.deepEqual(migrated.unlockedStageIds.filter((id) => id.startsWith("SH")), SHALLOW_STAGE_IDS.slice(0, 7));
  assert.equal(migrated.stagePlayCounts.S09, 2);
  assert.deepEqual(migrated.stageMedals.S09, saved.stageMedals.S09);
  assert.deepEqual(migrated.completedProblemIds, saved.completedProblemIds);
  assert.deepEqual(migrated.attempts, saved.attempts);
  assert.deepEqual(migrated.caughtFish, saved.caughtFish);
});

test("legacy S10 and S11 progress maps to equivalent curriculum boundaries", () => {
  const oldS10 = loadSave(storageWith({
    schemaVersion: 1,
    medalRulesVersion: 4,
    currentStageId: "S10",
    unlockedStageIds: ["S10"],
    stagePlayCounts: { S10: 1 },
  }));
  assert.equal(oldS10.currentStageId, "SH10");
  assert.deepEqual(oldS10.unlockedStageIds.filter((id) => id.startsWith("SH")), SHALLOW_STAGE_IDS.slice(0, 10));

  const oldS11 = loadSave(storageWith({
    schemaVersion: 1,
    medalRulesVersion: 4,
    currentStageId: "S11",
    unlockedStageIds: ["S11"],
    stagePlayCounts: { S11: 1 },
  }));
  assert.equal(oldS11.currentStageId, "CO01");
  assert.deepEqual(oldS11.unlockedStageIds.filter((id) => id.startsWith("SH")), SHALLOW_STAGE_IDS);
  assert.ok(oldS11.unlockedStageIds.includes("CO01"));
});

test("finishing SH11 unlocks CO01 after a six-problem play", () => {
  const stage = getStage("SH11");
  const save = loadSave(storageWith({
    schemaVersion: 1,
    curriculumVersion: 2,
    medalRulesVersion: 4,
    hasSeenIntro: true,
    currentStageId: "SH11",
    unlockedStageIds: ["SH11"],
    stagePlayCounts: { SH11: stage.minCompletedPlays - 1 },
  }));
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "SH11" });
  assert.equal(state.session.problems.length, 6);
  state = completeTypingPlay(state);
  assert.equal(state.screen, "result");
  assert.equal(state.result.unlockedStageId, "CO01");
  assert.equal(state.save.currentStageId, "CO01");
  assert.equal(state.result.caughtFish.regionId, "shallows");
});

test("every new stage catches a fish from its own region", () => {
  for (const stageId of [...SHALLOW_STAGE_IDS, "CO01"]) {
    const fish = fishForCatch({ stageId, playCount: 1 });
    assert.equal(fish.stageId, stageId);
    assert.equal(fish.regionId, getStage(stageId).regionId);
  }
});

test("romaji matcher supports di, du and voiced yoon spellings", () => {
  const cases = [
    ["ぢ", "di"],
    ["ぢ", "dji"],
    ["づ", "du"],
    ["づ", "dzu"],
    ["ぢゃ", "dya"],
    ["ぢゅ", "dyu"],
    ["ぢょ", "dyo"],
  ];
  for (const [kana, spelling] of cases) {
    assert.equal(validateKana(kana).valid, true, kana);
    const matcher = new RomajiMatcher();
    matcher.load(kana);
    const results = [...spelling].map((key) => matcher.handleChar(key));
    assert.equal(results.every((result) => result.accepted), true, spelling);
    assert.equal(results.at(-1).completed, true, spelling);
  }
});
