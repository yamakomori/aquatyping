import test from "node:test";
import assert from "node:assert/strict";
import { purchase } from "../src/domain/economy.js";
import { awardStageMedals, reviewConceptsForStage, reviewKeysForStage, summarizePlay, updateConceptSkills, updateSkills } from "../src/domain/learning.js";
import { chooseProblems, getProblemsForStage } from "../src/domain/problems.js";
import { createSave, loadSave } from "../src/domain/save.js";
import { AQUARIUM_VISIBLE_FISH_LIMIT, FISH_SPECIES, fishCollectionStats, fishCountsBySpecies, fishDiscovery, fishForCatch, getFishSpecies, isRegionCleared, RARE_PITY_THRESHOLD, rareChanceForStage, rareFishForRegion, releaseFish, rollRareCatch, selectAquariumFish } from "../src/domain/fish.js";
import { getRegion } from "../src/domain/regions.js";
import { completedAttempt, startAttempt, submitKey } from "../src/domain/session.js";
import { createGameState, gameReducer } from "../src/game/state/gameReducer.js";

function completeTypingPlay(state) {
  let next = state;
  let now = Date.now();
  let guard = 0;
  while (next.screen === "typing" && guard < 500) {
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
  assert.ok(guard < 500, "typing play should finish");
  return next;
}

test("mistakes raise only the relevant key review weight", () => {
  const skills = updateSkills({}, {
    targetKeys: ["f", "j"],
    mistakeKeys: { d: 2 },
  });
  assert.equal(skills.f.correct, 1);
  assert.equal(skills.d.mistakes, 2);
  assert.equal(skills.d.reviewWeight, 2);
});

test("purchase equips an unowned affordable item", () => {
  const save = {
    coins: 15,
    ownedItemIds: ["body-moss", "head-none", "outfit-cloth"],
    equipped: { bodyColor: "body-moss", head: "head-none", outfit: "outfit-cloth" },
  };
  const outcome = purchase(save, "head-leaf");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.save.coins, 3);
  assert.equal(outcome.save.equipped.head, "head-leaf");
});

test("水槽から出かけると選択中の海域を表示する", () => {
  const state = {
    ...createGameState(createSave()),
    screen: "aquarium",
    selectedTankId: "coral-forest",
    selectedMapRegionId: "tidepool",
  };
  const next = gameReducer(state, { type: "SHOW_MAP", regionId: state.selectedTankId });
  assert.equal(next.screen, "map");
  assert.equal(next.selectedMapRegionId, "coral-forest");
});

test("レッスンをやめると、進行度ではなく今プレイしていた海域へ戻る", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "SH01",
    unlockedStageIds: ["S00", "S08", "SH01"],
  };
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "S00" });
  assert.equal(state.screen, "typing");
  state = gameReducer(state, { type: "SHOW_MAP" });
  assert.equal(state.screen, "map");
  assert.equal(state.selectedMapRegionId, "tidepool");
});

test("新しい海域が解放されたときだけ、その海域を開いて紹介を出す", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "S08",
    unlockedStageIds: ["S08"],
    stagePlayCounts: { S08: 1 },
  };
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "S08" });
  state = completeTypingPlay(state);
  assert.equal(state.result.unlockedRegionId, "shallows");
  assert.equal(state.regionReveal, "shallows");
  state = gameReducer(state, { type: "SHOW_MAP" });
  assert.equal(state.selectedMapRegionId, "shallows");
  state = gameReducer(state, { type: "DISMISS_REGION_REVEAL" });
  assert.equal(state.regionReveal, null);
  assert.deepEqual(state.save.revealedRegionIds, ["tidepool", "shallows"]);
});

test("新海域のレッスンへ直行しても紹介は残り、読み終えてから時間を計り直す", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "S08",
    unlockedStageIds: ["S08"],
    stagePlayCounts: { S08: 1 },
  };
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "S08" });
  state = completeTypingPlay(state);
  assert.equal(state.result.nextStageId, "SH01");

  state = gameReducer(state, { type: "START_STAGE", stageId: state.result.nextStageId });
  assert.equal(state.screen, "typing");
  assert.equal(state.regionReveal, "shallows");

  const startedAt = state.session.attempt.startedAt;
  state = gameReducer(state, { type: "DISMISS_REGION_REVEAL", now: startedAt + 5000 });
  assert.equal(state.regionReveal, null);
  assert.equal(state.session.attempt.startedAt, startedAt + 5000);
});

test("紹介を見る前に再読み込みしても、その海域の紹介は残る", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "SH01",
    unlockedStageIds: ["S08", "SH01"],
  };
  assert.equal(createGameState(save).regionReveal, "shallows");
  const seen = { ...save, revealedRegionIds: ["tidepool", "shallows"] };
  assert.equal(createGameState(seen).regionReveal, null);
});

test("紹介の記録がない古い保存は、たどり着き済みの海域を紹介済みとして読み込む", () => {
  const storage = {
    getItem: () => JSON.stringify({
      ...createSave(),
      revealedRegionIds: undefined,
      currentStageId: "CO01",
      unlockedStageIds: ["S08", "SH01", "CO01"],
    }),
  };
  const loaded = loadSave(storage);
  assert.deepEqual(loaded.revealedRegionIds, ["tidepool", "shallows", "coral-forest"]);
  assert.equal(createGameState(loaded).regionReveal, null);
});

test("同じ海域の中でステージが解放されても紹介は出ない", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "S00",
    unlockedStageIds: ["S00"],
    stagePlayCounts: { S00: 1 },
  };
  let state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "S00" });
  state = completeTypingPlay(state);
  assert.equal(state.result.unlockedStageId, "S01");
  assert.equal(state.result.unlockedRegionId, null);
  assert.equal(state.regionReveal, null);
});

test("typing session records a miss without losing progress", () => {
  const problem = { id: "test", stageId: "S00", input: "fj", inputMode: "direct", targetKeys: ["f", "j"] };
  const started = startAttempt(problem, 0);
  const wrong = submitKey(started, "d", 10);
  assert.equal(wrong.result.accepted, false);
  const first = submitKey(wrong.attempt, "f", 20);
  const last = submitKey(first.attempt, "j", 30);
  const result = completedAttempt(last.attempt, 30);
  assert.equal(result.mistakes, 1);
  assert.equal(result.mistakeKeys.d, 1);
  assert.equal(result.completed, true);
});

test("stage medals are earned independently and remain earned", () => {
  const summary = summarizePlay([
    { acceptedKeystrokes: 18, mistakes: 1, durationMs: 30000 },
    { acceptedKeystrokes: 18, mistakes: 1, durationMs: 30000 },
    { acceptedKeystrokes: 18, mistakes: 0, durationMs: 30000 },
  ]);
  const first = awardStageMedals({}, {
    carefulMinAccuracy: 0.9,
    speedMaxMsPerKey: 2000,
  }, summary);
  assert.equal(first.newlyEarned.careful, true);
  assert.equal(first.newlyEarned.speed, true);
  assert.equal(first.newlyEarned.gold, true);

  const slower = awardStageMedals(first.medals, {
    carefulMinAccuracy: 0.9,
    speedMaxMsPerKey: 100,
  }, summary);
  assert.deepEqual(slower.medals, { careful: true, speed: true, gold: true });
  assert.deepEqual(slower.newlyEarned, { careful: false, speed: false, gold: false });
});

test("a careful but slow play earns only the careful medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.95,
    speedMaxMsPerKey: 1300,
  }, summarizePlay([
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
  ]));
  assert.deepEqual(result.medals, { careful: true, speed: false, gold: false });
});

test("a fast play with small mistakes can earn only the speed medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.97,
    speedMaxMsPerKey: 900,
  }, summarizePlay([
    { acceptedKeystrokes: 30, mistakes: 3, durationMs: 25000 },
    { acceptedKeystrokes: 30, mistakes: 3, durationMs: 25000 },
    { acceptedKeystrokes: 30, mistakes: 2, durationMs: 25000 },
  ]));
  assert.deepEqual(result.medals, { careful: false, speed: true, gold: false });
});

test("a fast play with one mistake per correct key still earns the speed medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.95,
    speedMaxMsPerKey: 1600,
  }, summarizePlay([
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
  ]));
  assert.deepEqual(result.medals, { careful: false, speed: true, gold: false });
});

test("old medal rules reset prototype medals once", () => {
  const storage = {
    getItem: () => JSON.stringify({ schemaVersion: 1, medalRulesVersion: 3, stageMedals: { S00: { careful: true, speed: true, gold: true } } }),
  };
  assert.deepEqual(loadSave(storage).stageMedals, {});
});

test("old saves derive species discoveries from fish already in a tank", () => {
  const fish = fishForCatch({ stageId: "S00", playCount: 1 });
  const storage = {
    getItem: () => JSON.stringify({ schemaVersion: 1, medalRulesVersion: 4, caughtFish: [fish] }),
  };
  assert.deepEqual(loadSave(storage).discoveredFishSpeciesIds, [fish.speciesId]);
});

test("old saves receive an empty concept learning profile", () => {
  const storage = {
    getItem: () => JSON.stringify({ schemaVersion: 1, medalRulesVersion: 4, skills: { f: { reviewWeight: 1 } } }),
  };
  assert.deepEqual(loadSave(storage).conceptSkills, {});
});

test("saves from before the sound toggle start with the catch sound on", () => {
  const storage = {
    getItem: () => JSON.stringify({
      schemaVersion: 1,
      medalRulesVersion: 4,
      settings: { keyboardGuide: false, sound: false, reducedMotion: true },
    }),
  };
  const save = loadSave(storage);
  assert.equal(save.settings.sound, true);
  // 遊ぶ人が選んでいた設定はそのまま引き継ぐ
  assert.equal(save.settings.keyboardGuide, false);
  assert.equal(save.settings.reducedMotion, true);
});

test("a chosen sound setting survives reloading", () => {
  const storage = {
    getItem: () => JSON.stringify({ ...createSave(), settings: { ...createSave().settings, sound: false } }),
  };
  assert.equal(loadSave(storage).settings.sound, false);
});

test("the settings screen can switch the catch sound off and on", () => {
  const state = createGameState(createSave());
  const muted = gameReducer(state, { type: "TOGGLE_SOUND" });
  assert.equal(muted.save.settings.sound, false);
  assert.equal(gameReducer(muted, { type: "TOGGLE_SOUND" }).save.settings.sound, true);
});

test("a new adventure begins with the optional first typing guide only once", () => {
  const fresh = createSave();
  assert.equal(createGameState(fresh).screen, "intro");
  const existing = { ...fresh, hasSeenIntro: true };
  assert.equal(createGameState(existing).screen, "map");
});

test("every completed play produces one deterministic fish, with medals changing only its variant", () => {
  const common = fishForCatch({ stageId: "S00", playCount: 1 });
  const gold = fishForCatch({ stageId: "S00", playCount: 1, medals: { gold: true } });
  assert.equal(common.speciesId, "tide-goby");
  assert.equal(common.variant, "common");
  assert.equal(gold.speciesId, "tide-goby");
  assert.equal(gold.variant, "gold");
  assert.deepEqual(fishCollectionStats([common, gold]), { total: 2, species: 1 });
});

test("sprite metadata belongs to the species and is not copied into saved catches", () => {
  const species = getFishSpecies("shallow-puffer");
  assert.deepEqual(species.sprite, {
    src: "/sprites/minami-hakofugu-strip.png",
    frames: 4,
    frameMs: 250,
    sourceFacing: "right",
  });
  const caught = fishForCatch({ stageId: "SH01", playCount: 1 });
  assert.equal("sprite" in caught, false);
});

test("all sprite species keep valid four-frame metadata", () => {
  const spriteSpecies = FISH_SPECIES.filter((species) => species.sprite);
  assert.deepEqual(
    spriteSpecies.map((species) => species.id).sort(),
    [
      "bubble-jelly",
      "cave-alt-nautilus",
      "cave-boxer-shrimp",
      "cave-bullhead-shark",
      "cave-escape-eel",
      "cave-featherstar",
      "cave-flashlight-fish",
      "cave-moray",
      "cave-pineconefish",
      "cave-soldierfish",
      "cave-spiny-lobster",
      "cave-sweeper",
      "cave-triton",
      "clownfish",
      "coral-anthias",
      "coral-bannerfish",
      "coral-butterfly",
      "coral-cardinal",
      "coral-cleaner-shrimp",
      "coral-fish",
      "coral-key-slug",
      "coral-lionfish",
      "coral-mandarinfish",
      "coral-parrotfish",
      "coral-starfish",
      "coral-tang",
      "coral-trigger",
      "deep-anglerfish",
      "deep-barreleye",
      "deep-basket-star",
      "deep-coelacanth",
      "deep-dumbo",
      "deep-frilled-shark",
      "deep-isopod",
      "deep-jelly",
      "deep-lantern",
      "deep-oarfish",
      "deep-sea-pig",
      "deep-tab-jelly",
      "deep-vampire-squid",
      "grass-seahorse",
      "left-damselfish",
      "moon-squid",
      "ribbon-eel",
      "sand-ray",
      "sea-glassfish",
      "shallow-flounder",
      "shallow-garden-eel",
      "shallow-puffer",
      "shallow-sardine",
      "shallow-space-puffer",
      "shallow-tenkey-crab",
      "shell-octopus",
      "shellfish",
      "sun-threadfish",
      "tide-goby",
      "tide-hermit",
      "tide-keycap-barnacle",
      "tide-mantis",
      "tide-shrimp",
    ],
  );
  for (const species of spriteSpecies) {
    assert.equal(species.sprite.frames, 4);
    assert.equal(species.sprite.sourceFacing, "right");
    assert.ok(species.sprite.frameMs >= 100);
  }
});

test("fish discovery counts only species found in the selected sea", () => {
  const first = fishForCatch({ stageId: "S00", playCount: 1 });
  const discovery = fishDiscovery([first.speciesId], ["S00"]);
  assert.equal(discovery.total, 2);
  assert.equal(discovery.discovered, 1);
  assert.deepEqual(fishCountsBySpecies([first]), { "tide-goby": 1 });
});

test("the aquarium caps visible fish at its limit and prioritizes species variety over recency", () => {
  const caughtFish = [
    ...Array.from({ length: 25 }, (_, index) => ({ id: `goby-${index}`, speciesId: "tide-goby" })),
    { id: "shrimp-old", speciesId: "tide-shrimp" },
    ...Array.from({ length: 5 }, (_, index) => ({ id: `goby-new-${index}`, speciesId: "tide-goby" })),
  ];
  const visible = selectAquariumFish(caughtFish, 24);
  assert.equal(AQUARIUM_VISIBLE_FISH_LIMIT, 80);
  assert.equal(visible.length, 24);
  assert.equal(visible.some((fish) => fish.id === "shrimp-old"), true);
  assert.equal(visible.at(-1).id, "goby-new-4");
});

test("aquarium selection keeps the newest individual when species exceed the limit", () => {
  const caughtFish = Array.from({ length: 26 }, (_, index) => ({
    id: `fish-${index}`,
    speciesId: `species-${index}`,
  }));
  assert.deepEqual(
    selectAquariumFish(caughtFish, 3).map((fish) => fish.id),
    ["fish-23", "fish-24", "fish-25"],
  );
});

test("releasing a fish removes only its tank instance and keeps its species discovery", () => {
  const fish = fishForCatch({ stageId: "S00", playCount: 1 });
  const save = {
    ...createSave(),
    caughtFish: [fish],
    discoveredFishSpeciesIds: [fish.speciesId],
  };
  const released = releaseFish(save, fish.id);
  assert.deepEqual(released.caughtFish, []);
  assert.deepEqual(released.discoveredFishSpeciesIds, [fish.speciesId]);
  assert.equal(released.releasedFishCounts.tidepool, 1);
});

test("every displayed review key is included in one of the selected problems", () => {
  const skills = {
    f: { reviewWeight: 1.5 },
    j: { reviewWeight: 1 },
    q: { reviewWeight: 3 },
  };
  const reviewKeys = reviewKeysForStage(skills, ["f", "j"]);
  assert.deepEqual(reviewKeys, ["f", "j"]);
  const selected = chooseProblems({
    stageId: "S00",
    count: 3,
    focusKeys: reviewKeys,
    random: () => 0,
  });
  assert.equal(selected.length, 3);
  assert.equal(selected.some((problem) => problem.targetKeys.includes("f")), true);
  assert.equal(selected.some((problem) => problem.targetKeys.includes("j")), true);
});

test("word-pattern mistakes are prioritized for a later play", () => {
  const conceptSkills = updateConceptSkills({}, {
    learningTags: ["sokuon"],
    mistakes: 2,
  });
  assert.deepEqual(reviewConceptsForStage(conceptSkills, ["hatsuon", "sokuon", "choon"]), ["sokuon"]);

  const selected = chooseProblems({
    stageId: "SH08",
    conceptSkills,
    focusTags: ["sokuon"],
    count: 6,
    lessonPlan: ["intro", "intro", "practice", "practice", "mixed", "treasure"],
    random: () => 0,
  });
  assert.deepEqual(selected.map((problem) => problem.lessonRole), ["intro", "intro", "practice", "practice", "mixed", "treasure"]);
  assert.equal(selected.some((problem) => problem.learningTags.includes("sokuon")), true);
});

test("structured lessons cover a review key and two review concepts together", () => {
  let seed = 2;
  const random = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const selected = chooseProblems({
    stageId: "SH07",
    count: 6,
    lessonPlan: ["intro", "intro", "practice", "practice", "mixed", "treasure"],
    focusKeys: ["s"],
    focusTags: ["n-before-vowel", "n-before-y"],
    random,
  });

  assert.equal(selected.some((problem) => problem.targetKeys.includes("s")), true);
  assert.equal(selected.some((problem) => problem.learningTags.includes("n-before-vowel")), true);
  assert.equal(selected.some((problem) => problem.learningTags.includes("n-before-y")), true);
});

test("a structured word stage advertises only one review key and schedules it", () => {
  const save = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "SH11",
    unlockedStageIds: ["SH11"],
    skills: {
      b: { reviewWeight: 3 },
      z: { reviewWeight: 2 },
    },
  };
  const state = gameReducer(createGameState(save), { type: "START_STAGE", stageId: "SH11" });
  assert.deepEqual(state.session.reviewKeys, ["b"]);
  assert.equal(state.session.problems.some((problem) => problem.targetKeys.includes("b")), true);
});

test("shallows lessons contain the specified six-part problem pools", () => {
  const expectedCounts = [18, 20, 24, 24, 24, 30, 24, 24, 24, 30, 30];
  for (const [index, expectedCount] of expectedCounts.entries()) {
    const stageId = `SH${String(index + 1).padStart(2, "0")}`;
    const problems = getProblemsForStage(stageId);
    assert.equal(problems.length, expectedCount, stageId);
    assert.deepEqual(new Set(problems.map((problem) => problem.lessonRole)), new Set(["intro", "practice", "mixed", "treasure"]));
  }
});

test("the shallows has its own fish for every stage", () => {
  for (let index = 1; index <= 11; index += 1) {
    const stageId = `SH${String(index).padStart(2, "0")}`;
    const fish = fishForCatch({ stageId, playCount: 1 });
    assert.equal(fish.regionId, "shallows");
    assert.equal(fish.stageId, stageId);
  }
});

test("finishing S08 unlocks a six-problem shallows lesson and catches a shallows fish", () => {
  const beforeUnlock = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "S08",
    unlockedStageIds: ["S08"],
    stagePlayCounts: { S08: 1 },
  };
  let state = gameReducer(createGameState(beforeUnlock), { type: "START_STAGE", stageId: "S08" });
  state = completeTypingPlay(state);
  assert.equal(state.screen, "result");
  assert.equal(state.result.unlockedStageId, "SH01");
  assert.equal(state.save.currentStageId, "SH01");

  state = gameReducer(state, { type: "START_STAGE", stageId: "SH01" });
  assert.equal(state.session.problems.length, 6);
  state = completeTypingPlay(state);
  assert.equal(state.result.caughtFish.regionId, "shallows");
  assert.ok(Object.values(state.save.conceptSkills).some((skill) => skill.exposures > 0));
});

const CLEARED_TIDEPOOL = { S00: 1, S01: 2, S02: 2, S03: 3, S04: 2, S05: 2, S06: 3, S07: 2, S08: 2 };

test("each region has twelve species: ten common and two rare", () => {
  for (const regionId of ["tidepool", "shallows", "coral-forest"]) {
    const regionFish = FISH_SPECIES.filter((fish) => fish.regionId === regionId);
    assert.equal(regionFish.length, 12, regionId);
    assert.equal(rareFishForRegion(regionId).length, 2, regionId);
  }
});

test("tidepool, shallows, and deep-sea keep their current rare rosters", () => {
  assert.deepEqual(
    rareFishForRegion("tidepool").map((fish) => fish.id),
    ["tide-keycap-barnacle", "tide-mantis"],
  );
  assert.deepEqual(
    rareFishForRegion("shallows").map((fish) => fish.id),
    ["shallow-tenkey-crab", "shallow-space-puffer"],
  );
  assert.deepEqual(
    rareFishForRegion("deep-sea").map((fish) => fish.id),
    ["deep-lantern", "deep-tab-jelly"],
  );
});

test("a region counts as cleared once every stage has been cleared at least once", () => {
  const playedOnce = Object.fromEntries(getRegion("tidepool").stageIds.map((id) => [id, 1]));
  assert.equal(isRegionCleared("tidepool", { stagePlayCounts: playedOnce }), true);
  // A single unplayed stage keeps the region uncleared.
  assert.equal(isRegionCleared("tidepool", { stagePlayCounts: { ...playedOnce, S08: 0 } }), false);
  assert.equal(isRegionCleared("tidepool", {}), false);
});

test("a region also counts as cleared when the next region is unlocked", () => {
  // Sparse play counts (e.g. a dev jump or migrated save) but the next region is open.
  assert.equal(isRegionCleared("tidepool", { stagePlayCounts: {}, unlockedStageIds: ["SH01"] }), true);
  assert.equal(isRegionCleared("shallows", { stagePlayCounts: {}, unlockedStageIds: ["CO01"] }), true);
  // The final region has no next region, so it still needs its thresholds met.
  assert.equal(isRegionCleared("coral-forest", { stagePlayCounts: {}, unlockedStageIds: ["CO06"] }), false);
});

test("rare fish never appear before a region is cleared", () => {
  const catches = Array.from({ length: 50 }, (_, index) =>
    fishForCatch({ stageId: "S08", playCount: index + 1, rng: () => 0 }));
  assert.ok(catches.every((fish) => getFishSpecies(fish.speciesId).rarity !== "rare"));
});

test("rare chance rises with stage difficulty inside a region", () => {
  assert.ok(rareChanceForStage("S08") > rareChanceForStage("S00"));
  assert.ok(rareChanceForStage("CO06") > rareChanceForStage("CO01"));
});

test("a cleared region can yield a rare when the roll succeeds", () => {
  const rare = rollRareCatch({ stageId: "S08", stagePlayCounts: CLEARED_TIDEPOOL, rng: () => 0 });
  assert.ok(rare && rare.rarity === "rare" && rare.regionId === "tidepool");
  const missed = rollRareCatch({ stageId: "S08", stagePlayCounts: CLEARED_TIDEPOOL, rng: () => 0.999 });
  assert.equal(missed, null);
});

test("the pity threshold guarantees a rare even when the roll fails", () => {
  const forced = rollRareCatch({
    stageId: "S00",
    stagePlayCounts: CLEARED_TIDEPOOL,
    rareDrySpell: RARE_PITY_THRESHOLD,
    rng: () => 0.999,
  });
  assert.ok(forced && forced.rarity === "rare");
});

test("rare rolls prefer an undiscovered rare species", () => {
  const [firstRare, secondRare] = rareFishForRegion("tidepool");
  const rare = rollRareCatch({
    stageId: "S08",
    stagePlayCounts: CLEARED_TIDEPOOL,
    discoveredFishSpeciesIds: [firstRare.id],
    rng: () => 0,
  });
  assert.equal(rare.id, secondRare.id);
});

test("replaying a cleared region tracks the rare dry spell and resets on a rare", () => {
  const base = {
    ...createSave(),
    hasSeenIntro: true,
    currentStageId: "S08",
    unlockedStageIds: ["S08"],
    stagePlayCounts: CLEARED_TIDEPOOL,
  };
  let state = gameReducer(createGameState(base), { type: "START_STAGE", stageId: "S08" });
  state = completeTypingPlay(state);
  // A common catch on a cleared region advances the pity counter.
  if (!state.result.isRareCatch) assert.equal(state.save.rareDrySpells.tidepool, 1);
  else assert.equal(state.save.rareDrySpells.tidepool, 0);
});
