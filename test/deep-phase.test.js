import test from "node:test";
import assert from "node:assert/strict";
import { getNextStage, getStage } from "../src/domain/curriculum.js";
import { FISH_SPECIES, fishForCatch, fishSpeciesForRegion, rareFishForRegion } from "../src/domain/fish.js";
import { learningConceptLabel } from "../src/domain/learning.js";
import { getProblemsForStage } from "../src/domain/problems.js";
import { getRegion } from "../src/domain/regions.js";
import { RomajiMatcher, validateKana } from "../src/domain/romaji.js";
import { loadSave } from "../src/domain/save.js";
import { createGameState, gameReducer } from "../src/game/state/gameReducer.js";

const DEEP_STAGE_IDS = ["DS01", "DS02", "DS03", "DS04", "DS05", "DS06"];

function storageWith(saved) {
  return { getItem: () => JSON.stringify(saved) };
}

function completeTypingPlay(state) {
  let next = state;
  let now = Date.now();
  let guard = 0;
  while (next.screen === "typing" && guard < 6000) {
    guard += 1;
    next = next.session.attempt.completed
      ? gameReducer(next, { type: "AUTO_ADVANCE" })
      : gameReducer(next, { type: "TYPE_KEY", key: next.session.attempt.matcher.display().next, now: (now += 50) });
  }
  assert.ok(guard < 6000, "typing play should finish");
  return next;
}

test("深海は海の洞窟の次に、6ステージで並ぶ", () => {
  assert.deepEqual(getRegion("deep-sea").stageIds, DEEP_STAGE_IDS);
  assert.equal(getNextStage("CA06").id, "DS01");
  for (const [index, stageId] of DEEP_STAGE_IDS.entries()) {
    const stage = getStage(stageId);
    assert.equal(stage.regionId, "deep-sea");
    assert.equal(stage.order, 32 + index);
    if (index < DEEP_STAGE_IDS.length - 1) {
      assert.equal(getNextStage(stageId).id, DEEP_STAGE_IDS[index + 1]);
    }
  }
  // 深海が最後の海域。この先はまだない。
  assert.equal(getNextStage("DS06"), null);
});

test("深海は句読点を , . で打てる", () => {
  for (const stageId of DEEP_STAGE_IDS) {
    const stage = getStage(stageId);
    assert.ok(stage.availableKeys.includes(","));
    assert.ok(stage.availableKeys.includes("."));
  }
  const matcher = new RomajiMatcher();
  const sentence = "うみのそこは、しずかだ。";
  assert.equal(validateKana(sentence).valid, true);
  matcher.load(sentence);
  let typed = "";
  let guard = 0;
  while (!matcher.done && guard < 200) {
    guard += 1;
    const next = matcher.display().next;
    if (!next || !matcher.handleChar(next).accepted) break;
    typed += next;
  }
  assert.equal(matcher.done, true);
  assert.equal(typed, "uminosokoha,shizukada.");
});

// 文が長くなるぶん後半で問題数を減らし、1プレイの所要時間をそろえている。
test("深海は後半ほど1プレイの問題数が少ない", () => {
  assert.deepEqual(DEEP_STAGE_IDS.map((stageId) => getStage(stageId).problemCount), [6, 5, 4, 3, 4, 3]);
  for (const stageId of DEEP_STAGE_IDS) {
    const problems = getProblemsForStage(stageId);
    const average = problems.reduce((sum, problem) => sum + problem.estimatedKeystrokes, 0) / problems.length;
    const perPlay = average * getStage(stageId).problemCount;
    assert.ok(perPlay <= 135, `${stageId} の1プレイが長すぎる (${Math.round(perPlay)}打)`);
  }
});

test("深海は正確さ優先で、1打あたりの猶予が最も広い", () => {
  for (const stageId of DEEP_STAGE_IDS) {
    const stage = getStage(stageId);
    assert.ok(stage.minAccuracy >= 0.91);
    assert.ok(stage.medalCriteria.carefulMinAccuracy >= 0.97);
    assert.ok(stage.medalCriteria.speedMaxMsPerKey >= 1750);
  }
});

test("深海の各ステージで深海の魚が釣れる", () => {
  for (const stageId of DEEP_STAGE_IDS) {
    const fish = fishForCatch({ stageId, playCount: 1 });
    assert.equal(fish.stageId, stageId);
    assert.equal(fish.regionId, "deep-sea");
  }
});

test("深海も通常10種とレア2種で構成される", () => {
  const species = fishSpeciesForRegion("deep-sea");
  const rare = rareFishForRegion("deep-sea");
  assert.equal(species.length, 12);
  assert.equal(rare.length, 2);
  assert.deepEqual(rare.map((fish) => fish.name), ["カーソルアンコウ", "タブクラゲ"]);
});

test("魚種名が全海域を通じて重複していない", () => {
  const names = FISH_SPECIES.map((fish) => fish.name);
  assert.equal(new Set(names).size, names.length);
});

test("深海の学習タグに子ども向けの表示名がある", () => {
  const tags = ["deep-comma", "deep-period", "deep-two-sentences", "deep-long-sentence", "deep-however", "deep-challenge"];
  for (const tag of tags) {
    assert.notEqual(learningConceptLabel(tag), tag);
  }
});

test("CA06を終えるとDS01が開く", () => {
  const stage = getStage("CA06");
  const save = loadSave(storageWith({
    schemaVersion: 1,
    curriculumVersion: 2,
    medalRulesVersion: 4,
    hasSeenIntro: true,
    currentStageId: "CA06",
    unlockedStageIds: ["CA06"],
    stagePlayCounts: { CA06: stage.minCompletedPlays - 1 },
  }));
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "CA06" });
  state = completeTypingPlay(state);
  assert.equal(state.screen, "result");
  assert.equal(state.result.unlockedStageId, "DS01");
  assert.equal(state.save.currentStageId, "DS01");
});

test("深海の全ステージを句読点つきで最後まで遊べる", () => {
  for (const stageId of DEEP_STAGE_IDS) {
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
    assert.equal(state.result.caughtFish.regionId, "deep-sea", stageId);
  }
});
