import test from "node:test";
import assert from "node:assert/strict";
import { getNextStage, getStage } from "../src/domain/curriculum.js";
import { FISH_SPECIES, fishForCatch, fishSpeciesForRegion, rareFishForRegion } from "../src/domain/fish.js";
import { learningConceptLabel } from "../src/domain/learning.js";
import { getProblemsForStage } from "../src/domain/problems.js";
import { getRegion } from "../src/domain/regions.js";
import { loadSave } from "../src/domain/save.js";
import { createGameState, gameReducer } from "../src/game/state/gameReducer.js";

const CAVE_STAGE_IDS = ["CA01", "CA02", "CA03", "CA04", "CA05", "CA06"];

function storageWith(saved) {
  return { getItem: () => JSON.stringify(saved) };
}

// ガイドの表示どおりに打ち続けて、1プレイを終わらせる。
function completeTypingPlay(state) {
  let next = state;
  let now = Date.now();
  let guard = 0;
  while (next.screen === "typing" && guard < 4000) {
    guard += 1;
    next = next.session.attempt.completed
      ? gameReducer(next, { type: "AUTO_ADVANCE" })
      : gameReducer(next, { type: "TYPE_KEY", key: next.session.attempt.matcher.display().next, now: (now += 50) });
  }
  assert.ok(guard < 4000, "typing play should finish");
  return next;
}

test("海の洞窟は珊瑚の森の次に、6ステージで並ぶ", () => {
  assert.deepEqual(getRegion("sea-cave").stageIds, CAVE_STAGE_IDS);
  assert.equal(getNextStage("CO06").id, "CA01");
  for (const [index, stageId] of CAVE_STAGE_IDS.entries()) {
    const stage = getStage(stageId);
    assert.equal(stage.regionId, "sea-cave");
    assert.equal(stage.order, 26 + index);
    if (index < CAVE_STAGE_IDS.length - 1) {
      assert.equal(getNextStage(stageId).id, CAVE_STAGE_IDS[index + 1]);
    }
  }
  // 洞窟の次は深海。
  assert.equal(getNextStage("CA06").id, "DS01");
});

// 文が長くなるぶん後半で問題数を減らし、1プレイの所要時間をそろえている。
test("海の洞窟は後半ほど1プレイの問題数が少ない", () => {
  assert.deepEqual(CAVE_STAGE_IDS.map((stageId) => getStage(stageId).problemCount), [6, 6, 5, 5, 4, 4]);
  const keystrokesPerPlay = CAVE_STAGE_IDS.map((stageId) => {
    const problems = getProblemsForStage(stageId);
    const average = problems.reduce((sum, problem) => sum + problem.estimatedKeystrokes, 0) / problems.length;
    return average * getStage(stageId).problemCount;
  });
  for (const [index, keystrokes] of keystrokesPerPlay.entries()) {
    assert.ok(keystrokes <= 130, `${CAVE_STAGE_IDS[index]} の1プレイが長すぎる (${Math.round(keystrokes)}打)`);
  }
});

test("海の洞窟は正確さ優先の設定を引き継ぐ", () => {
  for (const stageId of CAVE_STAGE_IDS) {
    const stage = getStage(stageId);
    assert.ok(stage.minAccuracy >= 0.9);
    assert.ok(stage.medalCriteria.carefulMinAccuracy >= 0.97);
    // 文を読んでから打つため、珊瑚の森より1打あたりの猶予を広げている。
    assert.ok(stage.medalCriteria.speedMaxMsPerKey >= 1650);
  }
});

test("海の洞窟の各ステージで洞窟の魚が釣れる", () => {
  for (const stageId of CAVE_STAGE_IDS) {
    const fish = fishForCatch({ stageId, playCount: 1 });
    assert.equal(fish.stageId, stageId);
    assert.equal(fish.regionId, "sea-cave");
  }
});

test("海の洞窟も通常10種とレア2種で構成される", () => {
  const species = fishSpeciesForRegion("sea-cave");
  const rare = rareFishForRegion("sea-cave");
  assert.equal(species.length, 12);
  assert.equal(rare.length, 2);
  assert.deepEqual(rare.map((fish) => fish.name), ["エスケープウナギ", "オルトオウムガイ"]);
});

// 図鑑で同名の種が並ばないよう、魚種名は全海域を通じて重複させない。
test("魚種名が全海域を通じて重複していない", () => {
  const names = FISH_SPECIES.map((fish) => fish.name);
  assert.equal(new Set(names).size, names.length);
});

test("海の洞窟の学習タグに子ども向けの表示名がある", () => {
  const tags = [
    "cave-short-sentence",
    "sentence-modifier",
    "sentence-place-time",
    "sentence-connect",
    "sentence-reason",
    "cave-challenge",
  ];
  for (const tag of tags) {
    assert.notEqual(learningConceptLabel(tag), tag);
  }
});

test("CO06を終えるとCA01が開く", () => {
  const stage = getStage("CO06");
  const save = loadSave(storageWith({
    schemaVersion: 1,
    curriculumVersion: 2,
    medalRulesVersion: 4,
    hasSeenIntro: true,
    currentStageId: "CO06",
    unlockedStageIds: ["CO06"],
    stagePlayCounts: { CO06: stage.minCompletedPlays - 1 },
  }));
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "CO06" });
  state = completeTypingPlay(state);
  assert.equal(state.screen, "result");
  assert.equal(state.result.unlockedStageId, "CA01");
  assert.equal(state.save.currentStageId, "CA01");
});

test("海の洞窟の全ステージを最後まで遊べる", () => {
  for (const stageId of CAVE_STAGE_IDS) {
    const save = loadSave(storageWith({
      schemaVersion: 1,
      curriculumVersion: 2,
      medalRulesVersion: 4,
      hasSeenIntro: true,
      currentStageId: stageId,
      unlockedStageIds: [stageId],
    }));
    let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId });
    assert.equal(state.session.problems.length, getStage(stageId).problemCount, stageId);
    state = completeTypingPlay(state);
    assert.equal(state.screen, "result", stageId);
    assert.equal(state.result.caughtFish.regionId, "sea-cave", stageId);
  }
});
