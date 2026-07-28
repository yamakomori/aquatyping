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

// タイトル画面の背景に敷く「最後に遊んだ海」。記録のない古い保存では今いる海で代用する。
// どちらの場合も、到着の演出をまだ見せていない海域は選ばない。初対面はタイトルではなく、
// たどり着いた瞬間の演出で見せたい。
export function getLastPlayedRegionId(save) {
  const revealed = (regionId) => (save.revealedRegionIds ?? []).includes(regionId);
  const remembered = REGIONS.find((region) => region.id === save.lastPlayedRegionId);
  if (remembered && revealed(remembered.id)) return remembered.id;
  const current = getRegionForStage(save.currentStageId);
  if (revealed(current.id)) return current.id;
  const seen = getUnlockedRegions(save.unlockedStageIds).filter((region) => revealed(region.id));
  return seen.at(-1)?.id ?? REGIONS[0].id;
}
