import { getNextStage, getStage } from "./curriculum.js";
import { getRegion, getRegionForStage } from "./regions.js";

// 水槽での泳ぎ方・見え方の指定:
//   school: true  … 同種で群れる（小さくおとなしい魚向け）。大型やアンコウなどは指定しない。
//   depth: "top" | "mid"(既定) | "bottom" | "floor" … 泳ぐ層。底生の魚は "bottom"、浮遊する魚は "top"。
//          "floor" は砂に定位して漂う種（チンアナゴなど）専用で、最下段に貼り付く。
//   scale: 数値(既定 1) … 水槽での大きさ倍率。1 を最小として、大型の魚だけ大きくする。
//   movement: "cruise"(既定) | "drift" | "anchor" … 泳ぎ方。"drift" はふわふわ漂う（クラゲ等）。
//          "anchor" は横に泳がず砂際で定位して揺れる（チンアナゴ等）。通常は指定しない。
//   rarity: "rare" … レア魚。通常の捕獲サイクルには出ず、その海域の全ステージをクリアした後の
//                    再プレイでのみ抽選で出現する（出現ロジックは fishForCatch を参照）。
//                    各海域は「通常10種＋レア2種＝12種」で構成する。通常魚は実在の一般名、
//                    レア魚だけがタイピング由来の架空名を持つ。
export const FISH_SPECIES = [
  // ── 潮だまり（通常10種）──
  {
    id: "tide-goby",
    name: "マハゼ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S00"],
    color: "#c79a5a",
    accent: "#f2e4c2",
    shape: "round",
    depth: "floor",
    sprite: {
      src: "/sprites/mahaze-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "tide-shrimp",
    name: "イソスジエビ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S00"],
    color: "#e0a58f",
    accent: "#ffe8d6",
    shape: "long",
    depth: "bottom",
    sprite: {
      src: "/sprites/iso-suji-shrimp-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "left-damselfish",
    name: "ソラスズメダイ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S01", "S02", "S03"],
    color: "#3f7fd6",
    accent: "#d7e8ff",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/neon-damselfish-strip.png",
      frames: 4,
      frameMs: 260,
      sourceFacing: "right",
    },
  },
  {
    id: "shellfish",
    name: "キュウセン",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S01", "S02", "S03"],
    color: "#e8b84d",
    accent: "#6d8b84",
    shape: "long",
    scale: 1.1,
    sprite: {
      src: "/sprites/striped-wrasse-strip.png",
      frames: 4,
      frameMs: 270,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-fish",
    name: "オヤビッチャ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S04", "S05", "S06"],
    color: "#d8c48c",
    accent: "#4f6f6a",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/oyabiccha-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },
  {
    id: "sea-glassfish",
    name: "キビナゴ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S04", "S05", "S06"],
    color: "#8fb8cf",
    accent: "#eef6fb",
    shape: "long",
    school: true,
    depth: "top",
    scale: 1.15,
    sprite: {
      src: "/sprites/kibinago-strip.png",
      frames: 4,
      frameMs: 240,
      sourceFacing: "right",
    },
  },
  {
    id: "grass-seahorse",
    name: "タツノオトシゴ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S07", "S08"],
    color: "#91ae70",
    accent: "#f3e6a1",
    shape: "tall",
    movement: "drift",
    depth: "bottom",
    sprite: {
      src: "/sprites/crowned-seahorse-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "moon-squid",
    name: "コウイカ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S07", "S08"],
    color: "#b6a2ca",
    accent: "#e9e6f5",
    shape: "tall",
    movement: "drift",
    depth: "top",
    scale: 1.3,
    sprite: {
      src: "/sprites/golden-cuttlefish-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-jelly",
    name: "ミズクラゲ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S08"],
    color: "#a9c2d6",
    accent: "#e6f4f3",
    shape: "tall",
    movement: "drift",
    depth: "top",
    sprite: {
      src: "/sprites/moon-jelly-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "tide-hermit",
    name: "ヤドカリ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S07", "S08"],
    color: "#d08a5a",
    accent: "#ffe6c8",
    shape: "round",
    movement: "anchor",
    depth: "floor",
    sprite: {
      src: "/sprites/hermit-crab-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  // ── 潮だまり（レア2種：タイピング由来の架空名）──
  {
    id: "tide-keycap-barnacle",
    name: "キャップフジツボ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S08"],
    color: "#e7d7ad",
    accent: "#d4aa55",
    shape: "tall",
    rarity: "rare",
    movement: "anchor",
    depth: "floor",
    scale: 1.2,
    sprite: {
      src: "/sprites/keycap-barnacle-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "tide-mantis",
    name: "デリートシャコ",
    habitat: "潮だまり",
    regionId: "tidepool",
    stages: ["S08"],
    color: "#3fae86",
    accent: "#ffd27a",
    shape: "long",
    rarity: "rare",
    depth: "floor",
    scale: 1.3,
    sprite: {
      src: "/sprites/delete-mantis-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },

  // ── 浅瀬（通常10種）──
  {
    id: "shallow-puffer",
    name: "ミナミハコフグ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH01", "SH02"],
    color: "#e7b955",
    accent: "#fff0ac",
    shape: "round",
    sprite: {
      src: "/sprites/minami-hakofugu-strip.png",
      frames: 4,
      frameMs: 250,
      sourceFacing: "right",
    },
  },
  {
    id: "clownfish",
    name: "カクレクマノミ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH01", "SH02"],
    color: "#ee7f36",
    accent: "#f7efe0",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/clownfish-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },
  {
    id: "sand-ray",
    name: "アカエイ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH03", "SH04"],
    color: "#b98a6a",
    accent: "#ecdcc4",
    shape: "long",
    depth: "floor",
    scale: 1.6,
    sprite: {
      src: "/sprites/sand-ray-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "ribbon-eel",
    name: "ハナヒゲウツボ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH05", "SH06"],
    color: "#4f7fd6",
    accent: "#ffd24a",
    shape: "long",
    depth: "bottom",
    scale: 1.35,
    sprite: {
      src: "/sprites/ribbon-eel-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "bubble-jelly",
    name: "タコクラゲ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH07"],
    color: "#ef8fa5",
    accent: "#ffe4eb",
    shape: "tall",
    movement: "drift",
    depth: "top",
    sprite: {
      src: "/sprites/spotted-jelly-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "shell-octopus",
    name: "マダコ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH08", "SH09"],
    color: "#d67b68",
    accent: "#ffe0c7",
    shape: "round",
    depth: "bottom",
    scale: 1.5,
    sprite: {
      src: "/sprites/madako-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "sun-threadfish",
    name: "イトヒキアジ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH10", "SH11"],
    color: "#cdd8e2",
    accent: "#f4f9fd",
    shape: "long",
    school: true,
    scale: 1.1,
    sprite: {
      src: "/sprites/threadfin-jack-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "shallow-garden-eel",
    name: "チンアナゴ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH03", "SH04", "SH05"],
    color: "#e6dcc4",
    accent: "#8a7a5a",
    shape: "tall",
    movement: "anchor",
    depth: "floor",
    sprite: {
      src: "/sprites/spotted-garden-eel-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "shallow-flounder",
    name: "ヒラメ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH06", "SH07"],
    color: "#8a836e",
    accent: "#d8cfb8",
    shape: "long",
    depth: "floor",
    scale: 1.3,
    sprite: {
      src: "/sprites/olive-flounder-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "shallow-sardine",
    name: "マイワシ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH08", "SH09", "SH10", "SH11"],
    color: "#8fb8cf",
    accent: "#eef6fb",
    shape: "long",
    school: true,
    depth: "top",
    sprite: {
      src: "/sprites/japanese-sardine-strip.png",
      frames: 4,
      frameMs: 240,
      sourceFacing: "right",
    },
  },
  // ── 浅瀬（レア2種）──
  {
    id: "shallow-tenkey-crab",
    name: "テンキーガニ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH11"],
    color: "#d0655a",
    accent: "#ffe0c0",
    shape: "round",
    rarity: "rare",
    depth: "bottom",
    scale: 1.4,
    sprite: {
      src: "/sprites/tenkey-crab-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "shallow-space-puffer",
    name: "スペースフグ",
    habitat: "浅瀬",
    regionId: "shallows",
    stages: ["SH11"],
    color: "#7ea6c2",
    accent: "#eef6fb",
    shape: "round",
    rarity: "rare",
    scale: 1.2,
    sprite: {
      src: "/sprites/space-puffer-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },

  // ── 珊瑚の森（通常10種）──
  {
    id: "coral-butterfly",
    name: "チョウチョウウオ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO01", "CO02"],
    color: "#f19a5b",
    accent: "#fff0b8",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/coral-butterfly-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-cardinal",
    name: "ネンブツダイ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO01", "CO03"],
    color: "#e86f75",
    accent: "#ffe5cb",
    shape: "long",
    school: true,
    sprite: {
      src: "/sprites/coral-cardinal-strip.png",
      frames: 4,
      frameMs: 260,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-parrotfish",
    name: "アオブダイ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO04"],
    color: "#55b79f",
    accent: "#f2d479",
    shape: "round",
    scale: 1.3,
    sprite: {
      src: "/sprites/coral-parrotfish-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-anthias",
    name: "キンギョハナダイ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO01", "CO02"],
    color: "#ff8a6a",
    accent: "#ffd9c0",
    shape: "round",
    school: true,
    depth: "top",
    sprite: {
      src: "/sprites/coral-anthias-strip.png",
      frames: 4,
      frameMs: 260,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-tang",
    name: "ナンヨウハギ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO02", "CO03"],
    color: "#2f6fd0",
    accent: "#ffd23a",
    shape: "round",
    scale: 1.2,
    sprite: {
      src: "/sprites/coral-tang-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-bannerfish",
    name: "ハタタテダイ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO03", "CO04"],
    color: "#f0ead2",
    accent: "#f2c14a",
    shape: "tall",
    sprite: {
      src: "/sprites/coral-bannerfish-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-trigger",
    name: "モンガラカワハギ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO04", "CO05"],
    color: "#464b57",
    accent: "#f0e6c0",
    shape: "round",
    scale: 1.2,
    sprite: {
      src: "/sprites/coral-trigger-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-starfish",
    name: "アオヒトデ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO05"],
    color: "#3f7fd0",
    accent: "#7fb0e6",
    shape: "round",
    movement: "drift",
    depth: "floor",
    sprite: {
      src: "/sprites/coral-starfish-strip.png",
      frames: 4,
      frameMs: 380,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-lionfish",
    name: "ハナミノカサゴ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO05", "CO06"],
    color: "#c0524a",
    accent: "#f6e2c0",
    shape: "tall",
    depth: "bottom",
    scale: 1.2,
    sprite: {
      src: "/sprites/coral-lionfish-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-mandarinfish",
    name: "ニシキテグリ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO06"],
    color: "#168f8e",
    accent: "#f3983f",
    shape: "long",
    scale: 1.15,
    depth: "bottom",
    sprite: {
      src: "/sprites/coral-mandarinfish-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  // ── 珊瑚の森（レア2種）──
  {
    id: "coral-cleaner-shrimp",
    name: "エンターエビ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO06"],
    color: "#ef8275",
    accent: "#fff0db",
    shape: "long",
    rarity: "rare",
    depth: "bottom",
    scale: 1.4,
    sprite: {
      src: "/sprites/enter-shrimp-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "coral-key-slug",
    name: "タイプウミウシ",
    habitat: "珊瑚の森",
    regionId: "coral-forest",
    stages: ["CO06"],
    color: "#d05aa0",
    accent: "#ffe27a",
    shape: "tall",
    rarity: "rare",
    movement: "drift",
    depth: "bottom",
    scale: 1.2,
    sprite: {
      src: "/sprites/type-slug-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },

  // ── 海の洞窟（通常10種）──
  // 岩陰や海食洞に実際にいる生きものを選んでいる。暗い海なので、色は赤・銀・黄を軸にする。
  {
    id: "cave-soldierfish",
    name: "アカマツカサ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA01", "CA02"],
    color: "#c8443f",
    accent: "#ffd9c0",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/cave-soldierfish-strip.png",
      frames: 4,
      frameMs: 280,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-sweeper",
    name: "リュウキュウハタンポ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA01", "CA03"],
    color: "#b9c4cf",
    accent: "#f0f5fa",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/cave-sweeper-strip.png",
      frames: 4,
      frameMs: 260,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-pineconefish",
    name: "マツカサウオ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA02", "CA03"],
    color: "#e0b34a",
    accent: "#4a3f2a",
    shape: "round",
    sprite: {
      src: "/sprites/cave-pineconefish-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-boxer-shrimp",
    name: "オトヒメエビ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA02", "CA04"],
    color: "#d9584f",
    accent: "#f6efe4",
    shape: "long",
    depth: "bottom",
    sprite: {
      src: "/sprites/cave-boxer-shrimp-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-moray",
    name: "トラウツボ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA03", "CA04"],
    color: "#8a4a2c",
    accent: "#f2d9a0",
    shape: "long",
    depth: "bottom",
    scale: 1.35,
    sprite: {
      src: "/sprites/cave-moray-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-featherstar",
    name: "ウミシダ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA03", "CA05"],
    color: "#6f4f7a",
    accent: "#e6c8f0",
    shape: "tall",
    movement: "anchor",
    depth: "floor",
    sprite: {
      src: "/sprites/cave-featherstar-strip.png",
      frames: 4,
      frameMs: 380,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-spiny-lobster",
    name: "イセエビ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA04", "CA05"],
    color: "#a8402f",
    accent: "#f0c88a",
    shape: "long",
    depth: "bottom",
    scale: 1.4,
    sprite: {
      src: "/sprites/cave-spiny-lobster-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-triton",
    name: "ホラガイ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA04", "CA06"],
    color: "#d8c49a",
    accent: "#7a5f3f",
    shape: "tall",
    movement: "anchor",
    depth: "floor",
    scale: 1.2,
    sprite: {
      src: "/sprites/cave-triton-strip.png",
      frames: 4,
      frameMs: 400,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-flashlight-fish",
    name: "ヒカリキンメダイ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA05", "CA06"],
    color: "#2f3f52",
    accent: "#9ff0c8",
    shape: "round",
    school: true,
    sprite: {
      src: "/sprites/cave-flashlight-fish-strip.png",
      frames: 4,
      frameMs: 300,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-bullhead-shark",
    name: "ネコザメ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA06"],
    color: "#8a7a62",
    accent: "#e0d4bc",
    shape: "long",
    depth: "bottom",
    scale: 1.8,
    sprite: {
      src: "/sprites/cave-bullhead-shark-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  // ── 海の洞窟（レア2種）──
  {
    id: "cave-escape-eel",
    name: "エスケープウナギ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA06"],
    color: "#4f6f8a",
    accent: "#ffe08a",
    shape: "long",
    rarity: "rare",
    depth: "bottom",
    scale: 1.4,
    sprite: {
      src: "/sprites/cave-escape-eel-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "cave-alt-nautilus",
    name: "オルトオウムガイ",
    habitat: "海の洞窟",
    regionId: "sea-cave",
    stages: ["CA06"],
    color: "#e8ddc4",
    accent: "#b0503f",
    shape: "round",
    rarity: "rare",
    movement: "drift",
    scale: 1.4,
    sprite: {
      src: "/sprites/cave-alt-nautilus-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },

  // ── 深海（通常10種）──
  // 光の届かない海。発光する種や、ゆっくり漂う種が多い。色は暗い青・紫・赤褐色を軸にする。
  {
    id: "deep-dumbo",
    name: "メンダコ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS01", "DS02"],
    color: "#8a5a7a",
    accent: "#f0d0e0",
    shape: "round",
    movement: "drift",
    depth: "mid",
    sprite: {
      src: "/sprites/deep-dumbo-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-oarfish",
    name: "リュウグウノツカイ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS01", "DS03"],
    color: "#c0c8d4",
    accent: "#e86f75",
    shape: "tall",
    movement: "drift",
    depth: "top",
    scale: 1.8,
    sprite: {
      src: "/sprites/deep-oarfish-strip.png",
      frames: 4,
      frameMs: 320,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-anglerfish",
    name: "チョウチンアンコウ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS02", "DS04"],
    color: "#2f3542",
    accent: "#ffe08a",
    shape: "round",
    depth: "bottom",
    scale: 1.4,
    sprite: {
      src: "/sprites/deep-anglerfish-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-isopod",
    name: "ダイオウグソクムシ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS02", "DS03"],
    color: "#7a7266",
    accent: "#d8ccb0",
    shape: "long",
    depth: "floor",
    scale: 1.2,
    sprite: {
      src: "/sprites/deep-isopod-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-barreleye",
    name: "デメニギス",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS03", "DS05"],
    color: "#4a6a6a",
    accent: "#a8f0d8",
    shape: "round",
    depth: "mid",
    sprite: {
      src: "/sprites/deep-barreleye-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-frilled-shark",
    name: "ラブカ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS04", "DS05"],
    color: "#5a4a44",
    accent: "#c8b0a0",
    shape: "long",
    depth: "bottom",
    scale: 1.5,
    sprite: {
      src: "/sprites/deep-frilled-shark-strip.png",
      frames: 4,
      frameMs: 340,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-coelacanth",
    name: "シーラカンス",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS04", "DS06"],
    color: "#3a5570",
    accent: "#8fb0c8",
    shape: "long",
    depth: "mid",
    scale: 1.6,
    sprite: {
      src: "/sprites/deep-coelacanth-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-sea-pig",
    name: "センジュナマコ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS05", "DS06"],
    color: "#d99794",
    accent: "#ffe0dc",
    shape: "long",
    depth: "floor",
    sprite: {
      src: "/sprites/deep-sea-pig-strip.png",
      frames: 4,
      frameMs: 380,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-basket-star",
    name: "テヅルモヅル",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS03", "DS04"],
    color: "#9a7a5a",
    accent: "#e6d0a8",
    shape: "tall",
    movement: "anchor",
    depth: "floor",
    sprite: {
      src: "/sprites/deep-basket-star-strip.png",
      frames: 4,
      frameMs: 400,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-vampire-squid",
    name: "コウモリダコ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS05", "DS06"],
    color: "#6a3a4a",
    accent: "#e08a9a",
    shape: "round",
    movement: "drift",
    depth: "mid",
    sprite: {
      src: "/sprites/deep-vampire-squid-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
  // ── 深海（レア2種）──
  {
    id: "deep-lantern",
    name: "カーソルアンコウ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS06"],
    color: "#7187a9",
    accent: "#f5cb6d",
    shape: "round",
    rarity: "rare",
    depth: "bottom",
    scale: 2,
    sprite: {
      src: "/sprites/key-angler-strip.png",
      frames: 4,
      frameMs: 350,
      sourceFacing: "right",
    },
  },
  {
    id: "deep-tab-jelly",
    name: "タブクラゲ",
    habitat: "深海",
    regionId: "deep-sea",
    stages: ["DS06"],
    color: "#4a7a8a",
    accent: "#a8f0f0",
    shape: "tall",
    rarity: "rare",
    movement: "drift",
    depth: "top",
    sprite: {
      src: "/sprites/deep-tab-jelly-strip.png",
      frames: 4,
      frameMs: 360,
      sourceFacing: "right",
    },
  },
];

export const AQUARIUM_VISIBLE_FISH_LIMIT = 80;
export const AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT = 12;

export function getFishSpecies(speciesId) {
  return FISH_SPECIES.find((fish) => fish.id === speciesId) ?? FISH_SPECIES[0];
}

export function fishSpeciesForStages(stageIds = []) {
  return FISH_SPECIES.filter((fish) =>
    fish.stages.some((stageId) => stageIds.includes(stageId)),
  );
}

export function fishSpeciesForRegion(regionId) {
  return FISH_SPECIES.filter((fish) => fish.regionId === regionId);
}

export const TITLE_SHOWCASE_LIMIT = 6;
// 群れる種は水槽と同じく複数匹で泳がせる。1匹だけのキビナゴは群れの魚に見えない。
export const TITLE_SCHOOL_SIZE = 5;
// 発見した種が少ないうちも海が寂しくならないよう、ここまでは匹数を足す。
export const TITLE_MIN_FISH = 8;

// タイトル画面に泳がせる生き物。図鑑に載った種だけを候補にするので、まだ会っていない
// 生き物をタイトルで先に見せてしまうことがない（レアも「発見済みなら出る」で成立する）。
// まず今いる海の生き物から並べ、足りない分だけ他の海の発見済みで補う。タイトルにはその海の
// 水を敷いているので、まずは水と生き物を揃えたい。
// `rotation` をずらすと顔ぶれが変わる。起動のたびに違う生き物が出迎える。
export function showcaseFishSpecies({
  discoveredFishSpeciesIds = [],
  regionId,
  limit = TITLE_SHOWCASE_LIMIT,
  rotation = 0,
} = {}) {
  const discovered = FISH_SPECIES.filter((fish) => discoveredFishSpeciesIds.includes(fish.id));
  // まだ1匹も釣っていない人には、最初のレッスンで必ず出会う2種を見せる。
  // 「これから会える」の約束であって、まだ見ぬ海のネタバレにはならない。
  const pool = discovered.length > 0
    ? [
      ...discovered.filter((fish) => fish.regionId === regionId),
      ...discovered.filter((fish) => fish.regionId !== regionId),
    ]
    : fishSpeciesForStages(["S00"]);
  if (pool.length <= limit) return pool;
  const start = ((rotation % pool.length) + pool.length) % pool.length;
  return Array.from({ length: limit }, (_, index) => pool[(start + index) % pool.length]);
}

// タイトルに泳がせる個体。種の選び方は showcaseFishSpecies に任せ、ここでは匹数だけ決める。
// 水槽と同じ形（{ id, speciesId }）で返すので、水槽の遊泳ロジックにそのまま渡せる。
export function showcaseFishIndividuals(options = {}) {
  const species = showcaseFishSpecies(options);
  if (species.length === 0) return [];
  const counts = species.map((fish) => (fish.school ? TITLE_SCHOOL_SIZE : 1));
  const total = () => counts.reduce((sum, count) => sum + count, 0);
  // 群れを足しても足りなければ、いる種を順に1匹ずつ増やして下限まで届かせる。
  for (let index = 0; total() < TITLE_MIN_FISH; index += 1) counts[index % counts.length] += 1;
  return species.flatMap((fish, index) => Array.from(
    { length: counts[index] },
    (_, member) => ({ id: `showcase-${fish.id}-${member}`, speciesId: fish.id }),
  ));
}

// レア出現の調整値。難易度が高いステージほど基礎確率が上がり、
// メダル獲得で倍率が乗り、一定回数外れると救済で必ず出す。
export const RARE_MIN_CHANCE = 0.08;
export const RARE_MAX_CHANCE = 0.22;
export const RARE_MEDAL_MULTIPLIER = 1.5;
export const RARE_PITY_THRESHOLD = 12;

export function rareFishForRegion(regionId) {
  return FISH_SPECIES.filter(
    (fish) => fish.regionId === regionId && fish.rarity === "rare",
  );
}

export function regionHasRareFish(regionId) {
  return rareFishForRegion(regionId).length > 0;
}

// その海域を「全ステージクリア済み」とみなせるか。
// 「クリア」はプレイヤーの体感どおり「各ステージを1回以上クリアした」こと。
// minCompletedPlays は次ステージの解禁に必要な回数であって、そのステージのクリア可否ではない。
// 判定はどちらかを満たせばよい:
//   1) 次の海域が解放済み（そこへ進むには、この海域を最後まで進めている必要がある）。
//      開発中のジャンプや古い/移行セーブで stagePlayCounts が疎でも取りこぼさない。
//   2) この海域の全ステージを1回以上プレイ済み（＝各ステージを一度はクリアした）。
export function isRegionCleared(
  regionId,
  { stagePlayCounts = {}, unlockedStageIds = [] } = {},
) {
  const stageIds = getRegion(regionId).stageIds;
  if (stageIds.length === 0) return false;
  const nextStage = getNextStage(stageIds[stageIds.length - 1]);
  if (nextStage && unlockedStageIds.includes(nextStage.id)) return true;
  return stageIds.every((stageId) => (stagePlayCounts[stageId] ?? 0) >= 1);
}

// 海域内でのステージ難易度（出題順）を 0〜1 に正規化し、レアの基礎確率へ写す。
export function rareChanceForStage(stageId) {
  const stage = getStage(stageId);
  const orders = getRegion(stage.regionId).stageIds.map(
    (id) => getStage(id).order,
  );
  const min = Math.min(...orders);
  const max = Math.max(...orders);
  const rank = max > min ? (stage.order - min) / (max - min) : 1;
  return RARE_MIN_CHANCE + (RARE_MAX_CHANCE - RARE_MIN_CHANCE) * rank;
}

function pickRareSpecies(regionId, discoveredIds, rng) {
  const rares = rareFishForRegion(regionId);
  if (rares.length === 0) return null;
  const discovered = new Set(discoveredIds);
  const undiscovered = rares.filter((fish) => !discovered.has(fish.id));
  const pool = undiscovered.length > 0 ? undiscovered : rares;
  return pool[Math.floor(rng() * pool.length)] ?? pool[0];
}

// レア魚を抽選すべきなら、その魚種を返す（そうでなければ null）。
// stagePlayCounts / unlockedStageIds はこのプレイ「以前」の記録を渡す（クリア済み海域の再プレイでのみ抽選する）。
export function rollRareCatch({
  stageId,
  medals = {},
  stagePlayCounts,
  unlockedStageIds = [],
  discoveredFishSpeciesIds = [],
  rareDrySpell = 0,
  rng = Math.random,
}) {
  const regionId = getRegionForStage(stageId).id;
  if (!regionHasRareFish(regionId)) return null;
  if (!isRegionCleared(regionId, { stagePlayCounts, unlockedStageIds }))
    return null;
  const forced = rareDrySpell >= RARE_PITY_THRESHOLD;
  const hasMedal = Boolean(medals.gold || medals.speed || medals.careful);
  const chance =
    rareChanceForStage(stageId) * (hasMedal ? RARE_MEDAL_MULTIPLIER : 1);
  if (!forced && rng() >= chance) return null;
  return pickRareSpecies(regionId, discoveredFishSpeciesIds, rng);
}

export function fishForCatch({
  stageId,
  playCount,
  medals = {},
  stagePlayCounts,
  unlockedStageIds = [],
  discoveredFishSpeciesIds = [],
  rareDrySpell = 0,
  rng = Math.random,
}) {
  const rareSpecies = rollRareCatch({
    stageId,
    medals,
    stagePlayCounts,
    unlockedStageIds,
    discoveredFishSpeciesIds,
    rareDrySpell,
    rng,
  });
  const normalCandidates = FISH_SPECIES.filter(
    (fish) => fish.stages.includes(stageId) && fish.rarity !== "rare",
  );
  const species =
    rareSpecies ??
    normalCandidates[(Math.max(playCount, 1) - 1) % normalCandidates.length] ??
    FISH_SPECIES[0];
  const variant = medals.gold
    ? "gold"
    : medals.speed
      ? "swift"
      : medals.careful
        ? "calm"
        : "common";
  const size = ["small", "medium", "large"][(Math.max(playCount, 1) - 1) % 3];
  return {
    id: `${stageId}-catch-${playCount}`,
    speciesId: species.id,
    stageId,
    regionId: species.regionId,
    variant,
    size,
  };
}

export function fishCollectionStats(caughtFish = []) {
  return {
    total: caughtFish.length,
    species: new Set(caughtFish.map((fish) => fish.speciesId)).size,
  };
}

export function fishDiscovery(discoveredSpeciesIds = [], stageIds = []) {
  const species = fishSpeciesForStages(stageIds);
  const discoveredIds = new Set(discoveredSpeciesIds);
  return {
    total: species.length,
    discovered: species.filter((fish) => discoveredIds.has(fish.id)).length,
    species,
  };
}

export function fishCountsBySpecies(caughtFish = []) {
  return caughtFish.reduce(
    (counts, fish) => ({
      ...counts,
      [fish.speciesId]: (counts[fish.speciesId] ?? 0) + 1,
    }),
    {},
  );
}

export function selectAquariumFish(
  caughtFish = [],
  limit = AQUARIUM_VISIBLE_FISH_LIMIT,
) {
  const visibleLimit = Math.max(0, Math.floor(limit));
  if (visibleLimit === 0 || caughtFish.length === 0) return [];

  const selectedIndices = [];
  const selectedIndexSet = new Set();
  const selectedSpeciesIds = new Set();

  // First keep the newest individual of as many different species as possible.
  for (
    let index = caughtFish.length - 1;
    index >= 0 && selectedIndices.length < visibleLimit;
    index -= 1
  ) {
    const speciesId = caughtFish[index].speciesId;
    if (selectedSpeciesIds.has(speciesId)) continue;
    selectedSpeciesIds.add(speciesId);
    selectedIndices.push(index);
    selectedIndexSet.add(index);
  }

  // Use the remaining room for the newest duplicate individuals.
  for (
    let index = caughtFish.length - 1;
    index >= 0 && selectedIndices.length < visibleLimit;
    index -= 1
  ) {
    if (selectedIndexSet.has(index)) continue;
    selectedIndices.push(index);
  }

  return selectedIndices
    .sort((left, right) => left - right)
    .map((index) => caughtFish[index]);
}

export function releaseFish(save, fishId) {
  const fish = save.caughtFish.find((caught) => caught.id === fishId);
  if (!fish) return save;
  const regionId = fish.regionId ?? getFishSpecies(fish.speciesId).regionId;
  return {
    ...save,
    caughtFish: save.caughtFish.filter((caught) => caught.id !== fishId),
    releasedFishCounts: {
      ...save.releasedFishCounts,
      [regionId]: (save.releasedFishCounts?.[regionId] ?? 0) + 1,
    },
  };
}
