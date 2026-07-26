export const ITEMS = [
  { id: "body-moss", slot: "bodyColor", name: "もりいろ", price: 0, color: "#88a97a" },
  { id: "body-sky", slot: "bodyColor", name: "そらいろ", price: 10, color: "#8eb9cf" },
  { id: "body-peach", slot: "bodyColor", name: "ももいろ", price: 12, color: "#d99794" },
  { id: "head-none", slot: "head", name: "なにも つけない", price: 0, kind: "none" },
  { id: "head-leaf", slot: "head", name: "はっぱの ぼうし", price: 12, kind: "leaf" },
  { id: "head-star", slot: "head", name: "ほしの ぼうし", price: 18, kind: "star" },
  { id: "outfit-cloth", slot: "outfit", name: "たびの ふく", price: 0, color: "#ece3cc" },
  { id: "outfit-rain", slot: "outfit", name: "あめの ケープ", price: 16, color: "#7c9ac7" },
  { id: "outfit-sun", slot: "outfit", name: "ひだまりの ふく", price: 20, color: "#d2a34d" },
];

export const STARTER_EQUIPPED = {
  bodyColor: "body-moss",
  head: "head-none",
  outfit: "outfit-cloth",
};

export const STARTER_ITEMS = Object.values(STARTER_EQUIPPED);

export function getItem(itemId) {
  return ITEMS.find((item) => item.id === itemId) ?? null;
}

export function rewardForProblem() {
  return { coins: 3, xp: 1 };
}

export function rewardForPlay() {
  return { coins: 8, xp: 3 };
}

export function purchase(save, itemId) {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: "そのアイテムは見《み》つかりません。" };
  if (save.ownedItemIds.includes(itemId)) return { ok: false, reason: "もう｜持って《もって》いるよ。" };
  if (save.coins < item.price) return { ok: false, reason: "コインが もう少《すこ》し必要《ひつよう》だよ。" };
  return {
    ok: true,
    save: {
      ...save,
      coins: save.coins - item.price,
      ownedItemIds: [...save.ownedItemIds, itemId],
      equipped: { ...save.equipped, [item.slot]: itemId },
    },
  };
}

export function equip(save, itemId) {
  const item = getItem(itemId);
  if (!item || !save.ownedItemIds.includes(itemId)) return save;
  return { ...save, equipped: { ...save.equipped, [item.slot]: itemId } };
}
