export const ITEMS = [
  { id: "body-moss", slot: "bodyColor", name: "もりいろ", price: 0, color: "#88a97a", asset: "/avatar/body-moss.png" },
  { id: "body-sky", slot: "bodyColor", name: "そらいろ", price: 10, color: "#8eb9cf", asset: "/avatar/body-sky.png" },
  { id: "body-peach", slot: "bodyColor", name: "ももいろ", price: 12, color: "#d99794", asset: "/avatar/body-peach.png" },
  { id: "body-night", slot: "bodyColor", name: "よぞらいろ", price: 15, color: "#6f7fa6", asset: "/avatar/body-night.png" },
  { id: "head-none", slot: "head", name: "なにも つけない", price: 0, kind: "none" },
  { id: "head-leaf", slot: "head", name: "はっぱの ぼうし", price: 12, kind: "leaf", asset: "/avatar/head-leaf.png" },
  { id: "head-star", slot: "head", name: "ほしの ぼうし", price: 18, kind: "star", asset: "/avatar/head-star.png" },
  { id: "head-shell", slot: "head", name: "かいがらの ぼうし", price: 14, asset: "/avatar/head-shell.png" },
  { id: "head-diver", slot: "head", name: "ダイバーマスク", price: 20, asset: "/avatar/head-diver.png" },
  { id: "head-lantern", slot: "head", name: "ちょうちんライト", price: 28, asset: "/avatar/head-lantern.png" },
  { id: "outfit-cloth", slot: "outfit", name: "たびの ふく", price: 0, color: "#ece3cc", asset: "/avatar/outfit-cloth.png" },
  { id: "outfit-rain", slot: "outfit", name: "あめの ケープ", price: 16, color: "#7c9ac7", asset: "/avatar/outfit-rain.png" },
  { id: "outfit-sun", slot: "outfit", name: "ひだまりの ふく", price: 20, color: "#d2a34d", asset: "/avatar/outfit-sun.png" },
  { id: "outfit-scale", slot: "outfit", name: "うろこの ポンチョ", price: 22, asset: "/avatar/outfit-scale.png" },
  { id: "outfit-stripe", slot: "outfit", name: "しましま シャツ", price: 18, asset: "/avatar/outfit-stripe.png" },
  { id: "outfit-deep", slot: "outfit", name: "しんかいスーツ", price: 40, asset: "/avatar/outfit-deep.png" },
  { id: "hand-none", slot: "hand", name: "なにも もたない", price: 0, kind: "none" },
  { id: "hand-net", slot: "hand", name: "ちいさな あみ", price: 12, asset: "/avatar/hand-net.png" },
  { id: "hand-bag", slot: "hand", name: "かいがらバッグ", price: 16, asset: "/avatar/hand-bag.png" },
  { id: "hand-lantern", slot: "hand", name: "ふしぎな ランタン", price: 24, asset: "/avatar/hand-lantern.png" },
  { id: "hand-pen", slot: "hand", name: "タイピングの ペン", price: 18, asset: "/avatar/hand-pen.png" },
];

export const STARTER_EQUIPPED = {
  bodyColor: "body-moss",
  head: "head-none",
  outfit: "outfit-cloth",
  hand: "hand-none",
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
