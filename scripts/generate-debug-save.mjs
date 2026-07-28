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
    "使い方: npm run debug:save -- [--region <regionId>] [--format console|json]",
    "",
    `海域ID: ${REGIONS.map((region) => region.id).join(", ")}`,
    "既定の形式は console です。",
  ].join("\n");
}

export function parseArgs(argv) {
  const options = { format: "console", regionId: null, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--region" || argument.startsWith("--region=")) {
      const value = argument === "--region" ? argv[++index] : argument.slice("--region=".length);
      if (!value || value.startsWith("--")) {
        throw new Error("--region には海域IDを指定してください。");
      }
      options.regionId = value;
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

  if (options.regionId && !REGIONS.some((region) => region.id === options.regionId)) {
    throw new Error(`存在しない海域IDです: ${options.regionId}`);
  }

  return options;
}

function getProgressStages(regionId) {
  if (!regionId) return STAGES;

  const regionIndex = REGIONS.findIndex((region) => region.id === regionId);
  const unlockedRegionIds = new Set(REGIONS.slice(0, regionIndex + 1).map((region) => region.id));
  return STAGES.filter((stage) => unlockedRegionIds.has(stage.regionId));
}

function getActiveSpecies(regionId) {
  return FISH_SPECIES.filter((species) => (
    species.active !== false
    && (!regionId || species.regionId === regionId)
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

export function generateDebugSave({ regionId = null } = {}) {
  if (regionId && !REGIONS.some((region) => region.id === regionId)) {
    throw new Error(`存在しない海域IDです: ${regionId}`);
  }

  const progressStages = getProgressStages(regionId);
  const species = getActiveSpecies(regionId);
  const selectedRegion = regionId
    ? REGIONS.find((region) => region.id === regionId)
    : null;
  const currentStageId = selectedRegion
    ? selectedRegion.stageIds.at(-1)
    : STAGES.at(-1).id;

  return {
    ...createSave(),
    currentStageId,
    unlockedStageIds: progressStages.map((stage) => stage.id),
    stagePlayCounts: Object.fromEntries(
      progressStages.map((stage) => [stage.id, Math.max(stage.minCompletedPlays ?? 1, 1)]),
    ),
    caughtFish: species.map(createDebugCatch),
    discoveredFishSpeciesIds: species.map((item) => item.id),
    // 選んだ海域だけ到着演出を残す。デバッグ保存を読み込めばその海域の登場から確認できる。
    revealedRegionIds: REGIONS.filter((region) => region.id !== selectedRegion?.id).map((region) => region.id),
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

  const save = generateDebugSave({ regionId: options.regionId });
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
