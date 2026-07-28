import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { STAGES } from "../src/domain/curriculum.js";
import { FISH_SPECIES } from "../src/domain/fish.js";
import { REGIONS } from "../src/domain/regions.js";
import { createSave } from "../src/domain/save.js";
import {
  formatDebugSave,
  generateDebugSave,
  parseArgs,
} from "../scripts/generate-debug-save.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const scriptPath = fileURLToPath(new URL("../scripts/generate-debug-save.mjs", import.meta.url));

test("default debug save follows the current schema and unlocks all content", () => {
  const save = generateDebugSave();
  const activeSpecies = FISH_SPECIES.filter((species) => species.active !== false);

  assert.deepEqual(Object.keys(save).sort(), Object.keys(createSave()).sort());
  assert.deepEqual(save.unlockedStageIds, STAGES.map((stage) => stage.id));
  assert.deepEqual(save.discoveredFishSpeciesIds, activeSpecies.map((species) => species.id));
  assert.equal(save.caughtFish.length, activeSpecies.length);
  assert.equal(save.coins, 99_999);
  assert.equal(save.xp, 99_999);
  assert.equal(save.hasSeenIntro, true);
  assert.equal(new Set(save.caughtFish.map((fish) => fish.id)).size, activeSpecies.length);
});

test("generated catches use deterministic IDs", () => {
  const first = generateDebugSave();
  const second = generateDebugSave();

  assert.deepEqual(first, second);
  assert.ok(first.caughtFish.every((fish) => fish.id === `debug-${fish.speciesId}`));
});

test("region mode stops progress at the selected region and stocks every tank behind it", () => {
  const region = REGIONS.find((item) => item.id === "shallows");
  const save = generateDebugSave({ regionIds: [region.id] });
  const expectedUnlockedRegionIds = new Set(
    REGIONS.slice(0, REGIONS.indexOf(region) + 1).map((item) => item.id),
  );

  assert.equal(save.currentStageId, region.stageIds.at(-1));
  assert.ok(save.caughtFish.length > 0);
  // 解放済みの海域はどれも水槽が埋まっている。手前の海域が魚0のままにならない。
  assert.deepEqual(
    new Set(save.caughtFish.map((fish) => fish.regionId)),
    expectedUnlockedRegionIds,
  );
  assert.ok(
    save.unlockedStageIds.every((stageId) => (
      expectedUnlockedRegionIds.has(STAGES.find((stage) => stage.id === stageId).regionId)
    )),
  );
  assert.ok(region.stageIds.every((stageId) => save.stagePlayCounts[stageId] >= 1));
});

test("複数の海域を指定すると、いちばん先まで解放して指定分を未紹介にする", () => {
  const save = generateDebugSave({ regionIds: ["coral-forest", "deep-sea"] });

  assert.equal(save.currentStageId, REGIONS.at(-1).stageIds.at(-1));
  assert.deepEqual(save.revealedRegionIds, ["tidepool", "shallows", "sea-cave"]);
  assert.deepEqual(save.unlockedStageIds, STAGES.map((stage) => stage.id));
  // 指定の順番は問わない。海域の並び順で解釈する。
  assert.deepEqual(generateDebugSave({ regionIds: ["deep-sea", "coral-forest"] }), save);
});

test("全海域制覇の保存は、全ステージのメダルを3種とも獲得済みにする", () => {
  const save = generateDebugSave({ complete: true });

  assert.deepEqual(Object.keys(save.stageMedals).sort(), STAGES.map((stage) => stage.id).sort());
  assert.ok(Object.values(save.stageMedals).every((medals) => medals.careful && medals.speed && medals.gold));
  assert.deepEqual(save.revealedRegionIds, REGIONS.map((region) => region.id));
  assert.deepEqual(save.unlockedStageIds, STAGES.map((stage) => stage.id));
  // 既定の保存はメダル未獲得のまま。メダル獲得の演出を確かめる余地を残す。
  assert.deepEqual(generateDebugSave().stageMedals, {});
});

test("海域を指定した制覇は、その海域までのメダルだけを立てる", () => {
  const save = generateDebugSave({ regionIds: ["shallows"], complete: true });
  const expectedStageIds = REGIONS.slice(0, 2).flatMap((region) => region.stageIds);

  assert.deepEqual(Object.keys(save.stageMedals).sort(), expectedStageIds.sort());
});

test("console format is a pasteable localStorage command", () => {
  const save = generateDebugSave({ regionIds: ["tidepool"] });
  const output = formatDebugSave(save, "console");

  assert.match(output, /^localStorage\.setItem\("type-rogue-mvp-save-v1", /);
  assert.match(output, /\); location\.reload\(\);$/);
  assert.ok(output.includes('\\"currentStageId\\":\\"S08\\"'));
});

test("json format emits the generated save as JSON", () => {
  const save = generateDebugSave({ regionIds: ["tidepool"] });
  assert.deepEqual(JSON.parse(formatDebugSave(save, "json")), save);
});

test("argument parser rejects unknown regions, formats, and flags", () => {
  assert.deepEqual(
    parseArgs(["--region", "shallows", "--format=json"]),
    { format: "json", regionIds: ["shallows"], complete: false, help: false },
  );
  assert.equal(parseArgs(["--complete"]).complete, true);
  assert.deepEqual(
    parseArgs(["--region", "coral-forest,deep-sea"]).regionIds,
    ["coral-forest", "deep-sea"],
  );
  assert.deepEqual(
    parseArgs(["--region", "coral-forest", "--region=deep-sea", "--region", "coral-forest"]).regionIds,
    ["coral-forest", "deep-sea"],
  );
  assert.throws(() => parseArgs(["--region", "missing"]), /存在しない海域ID/);
  assert.throws(() => parseArgs(["--region", "shallows,missing"]), /存在しない海域ID/);
  assert.throws(() => parseArgs(["--format", "yaml"]), /未対応の出力形式/);
  assert.throws(() => parseArgs(["--unknown"]), /不明な引数/);
});

test("CLI writes JSON only to stdout and rejects invalid arguments", () => {
  const valid = spawnSync(process.execPath, [scriptPath, "--region", "shallows", "--format", "json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(valid.status, 0);
  assert.equal(valid.stderr, "");
  assert.equal(JSON.parse(valid.stdout).currentStageId, "SH11");

  const invalid = spawnSync(process.execPath, [scriptPath, "--region", "missing"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /存在しない海域ID/);
});
