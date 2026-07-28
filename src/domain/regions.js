import { REGION_CONTENT } from "../content/regions.js";

export const REGIONS = REGION_CONTENT;

export function getRegion(regionId) {
  return REGIONS.find((region) => region.id === regionId) ?? REGIONS[0];
}

export function getRegionForStage(stageId) {
  return REGIONS.find((region) => region.stageIds.includes(stageId)) ?? REGIONS[0];
}

export function getUnlockedRegions(unlockedStageIds = []) {
  return REGIONS.filter((region) => region.stageIds.some((stageId) => unlockedStageIds.includes(stageId)));
}

// たどり着いたのに到着の演出をまだ見せていない海域。再読み込みしても演出が消えないよう保存から引き直す。
export function getUnrevealedRegion(unlockedStageIds = [], revealedRegionIds = []) {
  return getUnlockedRegions(unlockedStageIds).find((region) => !revealedRegionIds.includes(region.id)) ?? null;
}
