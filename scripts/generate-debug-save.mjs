#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { STAGES } from "../src/domain/curriculum.js";
import { FISH_SPECIES, fishForCatch } from "../src/domain/fish.js";
import { REGIONS } from "../src/domain/regions.js";
import { createSave, persistSave } from "../src/domain/save.js";

const FORMATS = new Set(["console", "json"]);
const DEBUG_COINS = 99_999;
const DEBUG_XP = 99_999;

function usage() {
  return [
    "使い方: npm run debug:save -- [--region <regionId>[,<regionId>...]] [--complete] [--format console|json]",
    "",
    `海域ID: ${REGIONS.map((region) => region.id).join(", ")}`,
    "--region は繰り返しやカンマ区切りで複数指定でき、いちばん先の海域まで解放します。",
    "指定した海域は到着の演出が未再生の状態になります。",
    "--complete は解放済みステージのメダル3種をすべて獲得済みにします。",
    "全海域制覇は npm run debug:save:complete でも生成できます。",
    "既定の形式は console です。",
  ].join("\n");
}

export function parseArgs(argv) {
  const options = { format: "console", regionIds: [], complete: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--complete") {
      options.complete = true;
      continue;
    }

    if (argument === "--region" || argument.startsWith("--region=")) {
      const value = argument === "--region" ? argv[++index] : argument.slice("--region=".length);
      if (!value || value.startsWith("--")) {
        throw new Error("--region には海域IDを指定してください。");
      }
      const ids = value.split(",").map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        throw new Error("--region には海域IDを指定してください。");
      }
      options.regionIds = [...new Set([...options.regionIds, ...ids])];
      continue;
    }

    if (argument === "--format" || argument.startsWith("--format=")) {
      const value = argument === "--format" ? argv[++index] : argument.slice("--format=".length);
      if (!value || value.startsWith("--")) {
        throw new Error("--format には console または json を指定してください。");
      }
      if (!FORMATS.has(value)) {
        throw new Error(`未対応の出力形式です: ${value}`);
      }
      options.format = value;
      continue;
    }

    throw new Error(`不明な引数です: ${argument}`);
  }

  for (const regionId of options.regionIds) {
    if (!REGIONS.some((region) => region.id === regionId)) {
      throw new Error(`存在しない海域IDです: ${regionId}`);
    }
  }

  return options;
}

function getProgressStages(regionId) {
  if (!regionId) return STAGES;

  const regionIndex = REGIONS.findIndex((region) => region.id === regionId);
  const unlockedRegionIds = new Set(REGIONS.slice(0, regionIndex + 1).map((region) => region.id));
  return STAGES.filter((stage) => unlockedRegionIds.has(stage.regionId));
}

// 魚は解放済みの海域ぶんすべて入れる。手前の海域の水槽が空のままだと、遊んだ跡と食い違う。
function getActiveSpecies(unlockedRegionIds) {
  return FISH_SPECIES.filter((species) => (
    species.active !== false
    && unlockedRegionIds.has(species.regionId)
  ));
}

function createDebugCatch(species) {
  const stageId = species.stages.find((id) => STAGES.some((stage) => stage.id === id))
    ?? REGIONS.find((region) => region.id === species.regionId)?.stageIds[0]
    ?? STAGES[0].id;
  return {
    ...fishForCatch({ stageId, playCount: 2 }),
    id: `debug-${species.id}`,
    speciesId: species.id,
    stageId,
    regionId: species.regionId,
  };
}

const ALL_MEDALS = { careful: true, speed: true, gold: true };

export function generateDebugSave({ regionIds = [], complete = false } = {}) {
  for (const regionId of regionIds) {
    if (!REGIONS.some((region) => region.id === regionId)) {
      throw new Error(`存在しない海域IDです: ${regionId}`);
    }
  }

  // 複数指定のときは、いちばん先の海域までを解放する。手前の指定は演出の確認用。
  const selectedRegions = REGIONS.filter((region) => regionIds.includes(region.id));
  const farthestRegion = selectedRegions.at(-1) ?? null;
  const progressStages = getProgressStages(farthestRegion?.id ?? null);
  const unlockedRegionIds = new Set(progressStages.map((stage) => stage.regionId));
  const species = getActiveSpecies(unlockedRegionIds);
  const currentStageId = farthestRegion
    ? farthestRegion.stageIds.at(-1)
    : STAGES.at(-1).id;

  return {
    ...createSave(),
    currentStageId,
    unlockedStageIds: progressStages.map((stage) => stage.id),
    stagePlayCounts: Object.fromEntries(
      progressStages.map((stage) => [stage.id, Math.max(stage.minCompletedPlays ?? 1, 1)]),
    ),
    // 制覇の証はメダル。解放したステージぶんだけ、ていねいさ・スピード・ゴールドを立てる。
    stageMedals: complete
      ? Object.fromEntries(progressStages.map((stage) => [stage.id, { ...ALL_MEDALS }]))
      : {},
    caughtFish: species.map(createDebugCatch),
    discoveredFishSpeciesIds: species.map((item) => item.id),
    // 選んだ海域だけ到着演出を残す。デバッグ保存を読み込めばその海域の登場から確認できる。
    revealedRegionIds: REGIONS.filter((region) => !regionIds.includes(region.id)).map((region) => region.id),
    hasSeenIntro: true,
    coins: DEBUG_COINS,
    xp: DEBUG_XP,
  };
}

function getSaveKey(save) {
  let saveKey = "";
  persistSave(save, {
    setItem(key) {
      saveKey = key;
    },
  });
  return saveKey;
}

export function formatDebugSave(save, format = "console") {
  if (!FORMATS.has(format)) {
    throw new Error(`未対応の出力形式です: ${format}`);
  }

  const json = JSON.stringify(save, null, format === "json" ? 2 : 0);
  if (format === "json") return json;

  return `localStorage.setItem(${JSON.stringify(getSaveKey(save))}, ${JSON.stringify(json)}); location.reload();`;
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const save = generateDebugSave({ regionIds: options.regionIds, complete: options.complete });
  process.stdout.write(`${formatDebugSave(save, options.format)}\n`);
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`エラー: ${error.message}\n\n${usage()}\n`);
    process.exitCode = 1;
  }
}
