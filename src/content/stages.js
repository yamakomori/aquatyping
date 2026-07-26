const LETTER_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");
const WORD_KEYS = [...LETTER_KEYS, "-"];
// 深海は句読点「、。」を , . で打つ。どちらも S08 で解禁済み。
const SENTENCE_KEYS = [...WORD_KEYS, ",", "."];
const SIX_PROBLEM_LESSON_PLAN = ["intro", "intro", "practice", "practice", "mixed", "treasure"];
// 文が長い海域では、1プレイの所要時間を保つために問題数を減らす。役割の順序は変えない。
const FIVE_PROBLEM_LESSON_PLAN = ["intro", "practice", "practice", "mixed", "treasure"];
const FOUR_PROBLEM_LESSON_PLAN = ["intro", "practice", "mixed", "treasure"];

const tidepoolStage = (stage, order) => ({
  ...stage,
  order,
  problemCount: 3,
});

const shallowStage = (stage, order) => ({
  ...stage,
  regionId: "shallows",
  order,
  introducedKeys: stage.introducedKeys ?? [],
  availableKeys: WORD_KEYS,
  problemCount: 6,
  lessonPlan: SIX_PROBLEM_LESSON_PLAN,
  minAccuracy: 0.87,
  medalCriteria: {
    carefulMinAccuracy: 0.96,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1350,
  },
});

const coralStage = (stage, order) => ({
  ...stage,
  regionId: "coral-forest",
  order,
  introducedKeys: [],
  availableKeys: WORD_KEYS,
  problemCount: 6,
  lessonPlan: SIX_PROBLEM_LESSON_PLAN,
  minAccuracy: stage.minAccuracy ?? 0.88,
  medalCriteria: {
    carefulMinAccuracy: stage.carefulMinAccuracy ?? 0.96,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1450,
  },
});

// 海の洞窟は文を読んでから打つため、珊瑚の森より1打あたりの猶予を広げる。
// 文が長くなる後半ほど problemCount を減らし、1プレイを30〜60秒に収める。
const THREE_PROBLEM_LESSON_PLAN = ["intro", "mixed", "treasure"];
const GRADED_LESSON_PLANS = { 6: SIX_PROBLEM_LESSON_PLAN, 5: FIVE_PROBLEM_LESSON_PLAN, 4: FOUR_PROBLEM_LESSON_PLAN, 3: THREE_PROBLEM_LESSON_PLAN };
const caveStage = (stage, order) => ({
  ...stage,
  regionId: "sea-cave",
  order,
  introducedKeys: [],
  availableKeys: WORD_KEYS,
  problemCount: stage.problemCount ?? 6,
  lessonPlan: GRADED_LESSON_PLANS[stage.problemCount ?? 6],
  minAccuracy: stage.minAccuracy ?? 0.9,
  medalCriteria: {
    carefulMinAccuracy: stage.carefulMinAccuracy ?? 0.97,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1650,
  },
});

// 深海は最終海域。句読点つきの長い文を読んでから打つため、1打あたりの猶予をさらに広げ、
// 洞窟と同じく文の長さに応じて問題数を減らす。
const deepStage = (stage, order) => ({
  ...stage,
  regionId: "deep-sea",
  order,
  introducedKeys: [],
  availableKeys: SENTENCE_KEYS,
  problemCount: stage.problemCount ?? 5,
  lessonPlan: GRADED_LESSON_PLANS[stage.problemCount ?? 5],
  minAccuracy: stage.minAccuracy ?? 0.91,
  medalCriteria: {
    carefulMinAccuracy: stage.carefulMinAccuracy ?? 0.97,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1750,
  },
});

export const STAGE_CONTENT = [
  tidepoolStage({ id: "S00", regionId: "tidepool", name: "｜潮だまり《しおだまり》のぽっち", description: "F と J のぽっちに、指《ゆび》をかえそう。", introducedKeys: ["f", "j"], availableKeys: ["f", "j"], minCompletedPlays: 1, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1300 } }, 0),
  tidepoolStage({ id: "S01", regionId: "tidepool", name: "｜潮だまり《しおだまり》の左手《ひだりて》", description: "左手《ひだりて》のおうちを、ゆっくりたどろう。", introducedKeys: ["a", "s", "d"], availableKeys: ["a", "s", "d", "f"], minCompletedPlays: 2, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1200 } }, 1),
  tidepoolStage({ id: "S02", regionId: "tidepool", name: "｜潮だまり《しおだまり》の右手《みぎて》", description: "右手《みぎて》も、おうちに｜帰って《かえって》こられるかな。", introducedKeys: ["k", "l"], availableKeys: ["j", "k", "l"], minCompletedPlays: 2, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1200 } }, 2),
  tidepoolStage({ id: "S03", regionId: "tidepool", name: "｜潮だまり《しおだまり》のリズム", description: "｜左右の手《さゆうのて》で、｜小さな《ちいさな》波《なみ》をつなごう。", introducedKeys: ["a", "s", "d", "f", "j", "k", "l"], availableKeys: ["a", "s", "d", "f", "j", "k", "l"], minCompletedPlays: 3, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 3),
  tidepoolStage({ id: "S04", regionId: "tidepool", name: "｜潮だまり《しおだまり》の上《うえ》の波《なみ》", description: "左手《ひだりて》をのばして、上《うえ》の波《なみ》をたどろう。", introducedKeys: ["q", "w", "e", "r", "t"], availableKeys: ["a", "s", "d", "f", "q", "w", "e", "r", "t"], minCompletedPlays: 2, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 4),
  tidepoolStage({ id: "S05", regionId: "tidepool", name: "｜潮だまり《しおだまり》の右《みぎ》の波《なみ》", description: "右手《みぎて》をのばして、上《うえ》の波《なみ》をたどろう。", introducedKeys: ["y", "u", "i", "o", "p"], availableKeys: ["j", "k", "l", "y", "u", "i", "o", "p"], minCompletedPlays: 2, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 5),
  tidepoolStage({ id: "S06", regionId: "tidepool", name: "｜潮だまり《しおだまり》の｜大きな《おおきな》波《なみ》", description: "｜上の段《うえのだん》を、両手《りょうて》でつないでみよう。", introducedKeys: [], availableKeys: ["a", "s", "d", "f", "j", "k", "l", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], minCompletedPlays: 3, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 6),
  tidepoolStage({ id: "S07", regionId: "tidepool", name: "｜潮だまり《しおだまり》の左《ひだり》の砂《すな》", description: "左手《ひだりて》で、｜下の段《したのだん》へもぐってみよう。", introducedKeys: ["z", "x", "c", "v", "b"], availableKeys: ["a", "s", "d", "f", "q", "w", "e", "r", "t", "z", "x", "c", "v", "b"], minCompletedPlays: 2, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 7),
  tidepoolStage({ id: "S08", regionId: "tidepool", name: "｜潮だまり《しおだまり》の右《みぎ》の砂《すな》", description: "右手《みぎて》で、｜下の段《したのだん》へもぐってみよう。", introducedKeys: ["n", "m", ",", ".", "/"], availableKeys: ["j", "k", "l", "y", "u", "i", "o", "p", "n", "m", ",", ".", "/"], minCompletedPlays: 2, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 8),

  shallowStage({ id: "SH01", name: "浅瀬《あさせ》の母音《ぼいん》", description: "A・I・U・E・Oで「あいうえお」をつくろう。", focusTags: ["vowel", "a-row"], minCompletedPlays: 2 }, 9),
  shallowStage({ id: "SH02", name: "浅瀬《あさせ》のか行《ぎょう》", description: "Kと母音《ぼいん》をつないで、か行《ぎょう》をつくろう。", focusTags: ["consonant-vowel", "k-row"], minCompletedPlays: 2 }, 10),
  shallowStage({ id: "SH03", name: "浅瀬《あさせ》のさ・た行《ぎょう》", description: "さ行《ぎょう》・た行《ぎょう》と「し・ち・つ」を練習《れんしゅう》しよう。", focusTags: ["s-row", "t-row", "variant-shi", "variant-chi", "variant-tsu"], minCompletedPlays: 2 }, 11),
  shallowStage({ id: "SH04", name: "浅瀬《あさせ》のな・は・ま行《ぎょう》", description: "な行《ぎょう》・は行《ぎょう》・ま行《ぎょう》を、ゆっくりつなごう。", focusTags: ["n-row", "h-row", "m-row", "variant-fu"], minCompletedPlays: 2 }, 12),
  shallowStage({ id: "SH05", name: "浅瀬《あさせ》のや・ら・わ行《ぎょう》", description: "や行《ぎょう》・ら行《ぎょう》・わ行《ぎょう》の波《なみ》をたどろう。", focusTags: ["y-row", "r-row", "w-row", "variant-wo"], minCompletedPlays: 2 }, 13),
  shallowStage({ id: "SH06", name: "浅瀬《あさせ》のにごる音《おと》", description: "が・ざ・だ・ば・ぱ行《ぎょう》を練習《れんしゅう》しよう。", focusTags: ["voiced", "semi-voiced", "g-row", "z-row", "d-row", "b-row", "p-row", "variant-ji", "di-du"], minCompletedPlays: 3 }, 14),
  shallowStage({ id: "SH07", name: "浅瀬《あさせ》の「ん」", description: "ことばの中《なか》の「ん」をたどろう。", focusTags: ["hatsuon", "n-final", "n-before-consonant", "n-before-vowel", "n-before-y"], minCompletedPlays: 3 }, 15),
  shallowStage({ id: "SH08", name: "浅瀬《あさせ》の｜小さい《ちいさい》「っ」", description: "｜小さい《ちいさい》「っ」で、音《おと》をはずませよう。", focusTags: ["sokuon"], minCompletedPlays: 3 }, 16),
  shallowStage({ id: "SH09", name: "浅瀬《あさせ》ののばす音《おと》", description: "「ー」で、ことばの音《おと》をのばそう。", focusTags: ["choon"], introducedKeys: ["-"], minCompletedPlays: 3 }, 17),
  shallowStage({ id: "SH10", name: "浅瀬《あさせ》の｜小さい文字《ちいさいもじ》", description: "｜小さい《ちいさい》「ゃ・ゅ・ょ」が｜入る《はいる》ことばを｜打とう《うとう》。", focusTags: ["yoon", "k-yoon", "s-yoon", "t-yoon", "n-yoon", "h-yoon", "m-yoon", "r-yoon"], minCompletedPlays: 3, speedMaxMsPerKey: 1400 }, 18),
  shallowStage({ id: "SH11", name: "浅瀬《あさせ》のにごる｜小さい文字《ちいさいもじ》", description: "ぎゃ・じゃ・びょなどの音《おと》を練習《れんしゅう》しよう。", focusTags: ["yoon", "voiced", "semi-voiced", "g-yoon", "j-yoon", "d-yoon", "b-yoon", "p-yoon"], minCompletedPlays: 4, speedMaxMsPerKey: 1400 }, 19),

  coralStage({ id: "CO01", name: "｜珊瑚の森《さんごのもり》のことば", description: "身近《みぢか》なものや自然《しぜん》のことばを、ていねいに｜打とう《うとう》。", focusTags: ["basic-word"], minCompletedPlays: 4, speedMaxMsPerKey: 1400 }, 20),
  coralStage({ id: "CO02", name: "｜珊瑚の森《さんごのもり》のうごき", description: "｜歩く《あるく》・｜見る《みる》など、｜動きを表す《うごきをあらわす》ことばを｜打とう《うとう》。", focusTags: ["word-verb"], minCompletedPlays: 3 }, 21),
  coralStage({ id: "CO03", name: "｜珊瑚の森《さんごのもり》のようす", description: "｜明るい《あかるい》・｜静か《しずか》など、様子《ようす》を｜表す《あらわす》ことばを｜打とう《うとう》。", focusTags: ["word-descriptive"], minCompletedPlays: 3 }, 22),
  coralStage({ id: "CO04", name: "｜珊瑚の森《さんごのもり》のまざる音《おと》", description: "「ん・っ・ー・ゃゅょ」が｜入る《はいる》ことばを復習《ふくしゅう》しよう。", focusTags: ["mixed-kana-word"], minCompletedPlays: 4, minAccuracy: 0.89, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1500 }, 23),
  coralStage({ id: "CO05", name: "｜珊瑚の森《さんごのもり》のつながり", description: "「を・に・で」などで、｜短い《みじかい》ことばをつなごう。", focusTags: ["phrase-particle"], minCompletedPlays: 4, minAccuracy: 0.89, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1500 }, 24),
  coralStage({ id: "CO06", name: "｜珊瑚の森《さんごのもり》チャレンジ", description: "森《もり》で｜集めた《あつめた》ことばを、6つ｜続けて《つづけて》たどろう。", focusTags: ["coral-challenge"], minCompletedPlays: 5, minAccuracy: 0.9, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1550 }, 25),

  caveStage({ id: "CA01", name: "洞窟《どうくつ》のみじかい文《ぶん》", description: "「だれが どうする」だけの文《ぶん》を｜打とう《うとう》。", focusTags: ["cave-short-sentence"], minCompletedPlays: 4 }, 26),
  caveStage({ id: "CA02", name: "洞窟《どうくつ》のようす", description: "「赤《あか》い さかな」のように、ようすを そえよう。", focusTags: ["sentence-modifier"], minCompletedPlays: 4 }, 27),
  caveStage({ id: "CA03", problemCount: 5, name: "洞窟《どうくつ》のどこで・いつ", description: "どこで、いつのことかを 文《ぶん》に 足《あし》そう。", focusTags: ["sentence-place-time"], minCompletedPlays: 4, speedMaxMsPerKey: 1700 }, 28),
  caveStage({ id: "CA04", problemCount: 5, name: "洞窟《どうくつ》のふたつのうごき", description: "「〜て」で、ふたつの うごきを つなごう。", focusTags: ["sentence-connect"], minCompletedPlays: 4, speedMaxMsPerKey: 1700 }, 29),
  caveStage({ id: "CA05", problemCount: 4, name: "洞窟《どうくつ》のわけ", description: "「〜から」で、わけを つたえよう。", focusTags: ["sentence-reason"], minCompletedPlays: 4, minAccuracy: 0.91, speedMaxMsPerKey: 1700 }, 30),
  caveStage({ id: "CA06", problemCount: 4, name: "海《うみ》の洞窟《どうくつ》チャレンジ", description: "洞窟《どうくつ》でおぼえた文《ぶん》を、4つ｜続けて《つづけて》たどろう。", focusTags: ["cave-challenge"], minCompletedPlays: 5, minAccuracy: 0.91, speedMaxMsPerKey: 1750 }, 31),

  deepStage({ id: "DS01", problemCount: 6, name: "深海《しんかい》の句点《くてん》", description: "「。」で、文《ぶん》をしめくくろう。", focusTags: ["deep-period"], minCompletedPlays: 4 }, 32),
  deepStage({ id: "DS02", problemCount: 5, name: "深海《しんかい》の読点《とうてん》", description: "「、」で、文《ぶん》にひと呼吸《こきゅう》おこう。", focusTags: ["deep-comma"], minCompletedPlays: 4 }, 33),
  deepStage({ id: "DS03", problemCount: 4, name: "深海《しんかい》のふたつの文《ぶん》", description: "「。」で、ふたつの文《ぶん》をつづけよう。", focusTags: ["deep-two-sentences"], minCompletedPlays: 4 }, 34),
  deepStage({ id: "DS04", problemCount: 3, name: "深海《しんかい》のながい文《ぶん》", description: "読点《とうてん》をふくむ｜長い《ながい》文《ぶん》を、ゆっくりたどろう。", focusTags: ["deep-long-sentence"], minCompletedPlays: 4, speedMaxMsPerKey: 1800 }, 35),
  deepStage({ id: "DS05", problemCount: 4, name: "深海《しんかい》のけれど", description: "「〜けれど」で、ぎゃくのことをつなごう。", focusTags: ["deep-however"], minCompletedPlays: 4 }, 36),
  deepStage({ id: "DS06", problemCount: 3, name: "深海《しんかい》チャレンジ", description: "深海《しんかい》でおぼえた文《ぶん》を、3つ｜続けて《つづけて》たどろう。", focusTags: ["deep-challenge"], minCompletedPlays: 5, minAccuracy: 0.92, speedMaxMsPerKey: 1800 }, 37),
];
