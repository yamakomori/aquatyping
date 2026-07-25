// 海域ごとの問題コンテンツ規約。
//
// 海域を追加するときは、ここへエントリを1つ足す。検証本体 (validate-content.js) は
// 海域を名指しせず、この表だけを読んで機械的にチェックする。
//
// 構造:
//   problemRules  … その海域の全問題に適用する規約
//   stageDefaults … stages に登録したステージへ既定値として配る規約
//   stages        … ステージ個別の規約。stageDefaults を上書きする
//
// stages に載っていないステージは、problemRules と共通規約（問題数8問以上、
// lessonPlan の役割充足、focusTags の網羅など）だけを受ける。
export const REGION_CONTENT_RULES = {
  // 潮だまりは英字キーの直接入力だけを扱うため、かな・語彙の固有規約を持たない。
  tidepool: {},

  shallows: {
    problemRules: {
      requireLessonRole: true,
      exerciseKinds: ["pattern", "word"],
      // 段階学習なので、海域内で同じ入力を二度出さない。
      uniqueInputWithinRegion: true,
      // ステージを足したら allowedKana の宣言を必須にする。
      requireAllowedKana: true,
    },
    stages: {
      // allowedKana はそのステージまでに学習済みのかな。累積で書く。
      SH01: { problemCount: 18, allowedKana: "あいうえお" },
      SH02: { problemCount: 20, allowedKana: "あいうえおかきくけこ" },
      SH03: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてと" },
      SH04: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめも" },
      SH05: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわを" },
      SH06: { problemCount: 30, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ" },
      SH07: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽん" },
      SH08: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっ" },
      SH09: { problemCount: 24, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっー" },
      SH10: {
        problemCount: 30,
        allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっーゃゅょ",
        forbiddenPattern: { pattern: /[ぎじぢびぴ][ゃゅょ]/, message: "SH11で学ぶ濁音・半濁音の拗音がSH10に含まれている" },
      },
      SH11: { problemCount: 30, allowedKana: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっーゃゅょ" },
    },
  },

  "coral-forest": {
    problemRules: {
      requireLessonRole: true,
      exerciseKinds: ["word", "phrase"],
      inputPattern: { pattern: /^[ぁ-んー]+$/, message: "入力にはひらがなと長音だけを使用する" },
    },
    stageDefaults: {
      roleMinimums: { intro: 4, practice: 12, mixed: 6, treasure: 4 },
      // 新しく書き下ろす語なので、他ステージと入力が重複しないこと。
      uniqueInputAcrossAllStages: true,
    },
    // CO01 はここに載せていない。浅瀬で学んだ語をそのまま復習する導入ステージで、
    // 32問中19問の入力が意図的に浅瀬と重複している（あさ・ねこ・そら など）。
    // そのため uniqueInputAcrossAllStages と roleMinimums を当てられない。
    // 役割内訳も practice が10問で、CO02以降の基準（12問）に届いていない。
    // 揃えるには問題の追加が必要なので、コンテンツ側の宿題として残している。
    stages: {
      CO02: { problemCount: 30, inputLength: [2, 5], mainTag: "word-verb", exerciseKinds: ["word"] },
      CO03: { problemCount: 30, inputLength: [2, 6], mainTag: "word-descriptive", exerciseKinds: ["word"] },
      CO04: {
        problemCount: 30,
        inputLength: [3, 8],
        mainTag: "mixed-kana-word",
        exerciseKinds: ["word"],
        requiredPattern: { pattern: /[んっーゃゅょ]/, message: "CO04の特殊かなが不足" },
      },
      CO05: { problemCount: 30, inputLength: [5, 10], mainTag: "phrase-particle", exerciseKinds: ["phrase"] },
      CO06: { problemCount: 30, inputLength: [7, 12], mainTag: "coral-challenge", exerciseKinds: ["word", "phrase"] },
    },
    // 検証メッセージ中の見出し。既存の文言（「Phase 2の入力が既存問題と重複」
    // 「… 問題がPhase 2基準未満」）をそのまま保つために明示している。
    // 未指定の海域は海域名を使う。洞窟・深海を足すときに、ここも海域名へ寄せたい。
    messageLabel: "Phase 2",
  },

  "sea-cave": {
    problemRules: {
      requireLessonRole: true,
      exerciseKinds: ["sentence"],
      // 句読点はまだ使わない。深海で読点・句点を導入する。
      inputPattern: { pattern: /^[ぁ-んー]+$/, message: "入力にはひらがなと長音だけを使用する" },
    },
    stageDefaults: {
      roleMinimums: { intro: 4, practice: 12, mixed: 6, treasure: 4 },
      uniqueInputAcrossAllStages: true,
    },
    stages: {
      CA01: { problemCount: 30, inputLength: [8, 11], mainTag: "cave-short-sentence" },
      CA02: { problemCount: 30, inputLength: [9, 13], mainTag: "sentence-modifier" },
      CA03: { problemCount: 30, inputLength: [10, 14], mainTag: "sentence-place-time" },
      CA04: { problemCount: 30, inputLength: [11, 16], mainTag: "sentence-connect" },
      CA05: { problemCount: 30, inputLength: [12, 16], mainTag: "sentence-reason" },
      CA06: { problemCount: 30, inputLength: [12, 16], mainTag: "cave-challenge" },
    },
  },

  "deep-sea": {
    problemRules: {
      requireLessonRole: true,
      exerciseKinds: ["sentence"],
      // 深海だけが句読点「、。」を許す。かぎかっこや他の記号は使わない。
      inputPattern: { pattern: /^[ぁ-んー、。]+$/, message: "入力にはひらがな・長音・句読点だけを使用する" },
    },
    stageDefaults: {
      roleMinimums: { intro: 4, practice: 12, mixed: 6, treasure: 4 },
      uniqueInputAcrossAllStages: true,
    },
    // 入力長は句読点も1文字として数える。文が長くなる後半ほど、stages.js で問題数を減らす。
    stages: {
      DS01: { problemCount: 30, inputLength: [10, 16], mainTag: "deep-comma" },
      DS02: { problemCount: 30, inputLength: [10, 15], mainTag: "deep-period" },
      DS03: { problemCount: 30, inputLength: [12, 18], mainTag: "deep-two-sentences" },
      DS04: { problemCount: 30, inputLength: [19, 25], mainTag: "deep-long-sentence" },
      DS05: { problemCount: 30, inputLength: [13, 20], mainTag: "deep-however" },
      DS06: { problemCount: 30, inputLength: [18, 24], mainTag: "deep-challenge" },
    },
  },
};

// 全海域に共通する規約。
export const COMMON_CONTENT_RULES = {
  lessonRoles: ["intro", "practice", "mixed", "treasure"],
  minProblemsPerStage: 8,
  // 学習タグと入力の整合。タグを付けたら、その表記が入力に現れていること。
  learningTagPatterns: {
    hatsuon: /ん/,
    sokuon: /っ/,
    choon: /ー/,
    yoon: /[ゃゅょ]/,
    "dakuon-yoon": /[ぎじぢびぴ][ゃゅょ]/,
  },
  // 各海域の魚種構成。
  fishPerRegion: 12,
  rareFishPerRegion: 2,
  spriteFrames: 4,
  minSpriteFrameMs: 100,
};
