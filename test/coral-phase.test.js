import test from "node:test";
import assert from "node:assert/strict";
import { getNextStage, getStage } from "../src/domain/curriculum.js";
import { fishForCatch } from "../src/domain/fish.js";
import { learningConceptLabel } from "../src/domain/learning.js";
import { chooseProblems, getProblemsForStage } from "../src/domain/problems.js";
import { getRegion } from "../src/domain/regions.js";
import { stripFurigana } from "../src/domain/furigana.js";

const CORAL_STAGE_IDS = ["CO01", "CO02", "CO03", "CO04", "CO05", "CO06"];
const PHASE_TWO_IDS = CORAL_STAGE_IDS.slice(1);
const LESSON_PLAN = ["intro", "intro", "practice", "practice", "mixed", "treasure"];

test("coral forest phase two follows CO01 in explicit order", () => {
  assert.deepEqual(getRegion("coral-forest").stageIds, CORAL_STAGE_IDS);
  for (const [index, stageId] of CORAL_STAGE_IDS.entries()) {
    const stage = getStage(stageId);
    assert.equal(stage.regionId, "coral-forest");
    assert.equal(stage.order, 20 + index);
    assert.equal(stage.problemCount, 6);
    assert.deepEqual(stage.lessonPlan, LESSON_PLAN);
    if (index < CORAL_STAGE_IDS.length - 1) {
      assert.equal(getNextStage(stageId).id, CORAL_STAGE_IDS[index + 1]);
    }
  }
});

test("coral forest phase two uses accuracy-first completion settings", () => {
  assert.deepEqual(
    PHASE_TWO_IDS.map((stageId) => getStage(stageId).minCompletedPlays),
    [3, 3, 4, 4, 5],
  );
  for (const stageId of PHASE_TWO_IDS) {
    const stage = getStage(stageId);
    assert.ok(stage.minAccuracy >= 0.88);
    assert.ok(stage.medalCriteria.carefulMinAccuracy >= 0.96);
    assert.ok(stage.medalCriteria.speedMaxMsPerKey >= 1450);
  }
});

test("each coral forest phase two stage catches a coral fish", () => {
  for (const stageId of PHASE_TWO_IDS) {
    const fish = fishForCatch({ stageId, playCount: 1 });
    assert.equal(fish.stageId, stageId);
    assert.equal(fish.regionId, "coral-forest");
  }
});

test("coral forest learning tags have child-friendly labels", () => {
  const tags = [
    "word-verb",
    "word-descriptive",
    "mixed-kana-word",
    "phrase-particle",
    "coral-challenge",
  ];
  for (const tag of tags) {
    assert.notEqual(learningConceptLabel(tag), tag);
  }
});

test("aquarium cleaning uses the correct suisou reading", () => {
  const problem = getProblemsForStage("CO06").find((item) => stripFurigana(item.title) === "水槽を おそうじ");
  assert.ok(problem);
  assert.equal(problem.input, "すいそうをきれいにする");
  assert.equal(problem.preferredInput, "suisouwokireinisuru");
});

test("a displayed review key overrides recent avoidance when only one problem covers it", () => {
  const stage = getStage("CO06");
  const problems = getProblemsForStage("CO06");
  const longVowelProblem = problems.find((problem) => problem.targetKeys.includes("-"));
  const otherRecentProblems = ["intro", "practice", "mixed"].map(
    (role) => problems.find((problem) => problem.lessonRole === role),
  );
  assert.ok(longVowelProblem);
  assert.equal(otherRecentProblems.every(Boolean), true);

  const selected = chooseProblems({
    stageId: "CO06",
    count: stage.problemCount,
    lessonPlan: stage.lessonPlan,
    recentIds: [...otherRecentProblems, longVowelProblem].map((problem) => problem.id),
    focusKeys: ["-"],
    random: () => 0,
  });

  assert.equal(selected.length, 6);
  assert.equal(new Set(selected.map((problem) => problem.id)).size, 6);
  assert.equal(selected.some((problem) => problem.id === longVowelProblem.id), true);
  assert.equal(selected.some((problem) => otherRecentProblems.includes(problem)), false);
});
