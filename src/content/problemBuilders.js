// かな問題を組み立てる共通処理。珊瑚の森と海の洞窟が使う。
const PREFERRED_ROMAJI = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "di", づ: "du", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ぢゃ: "dya", ぢゅ: "dyu", ぢょ: "dyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
};

const N_BLOCKERS = "aiueony";

function preferredUnitAt(kana, pos) {
  const char = kana[pos];
  if (!char) return null;
  if (char === "ー") return { spelling: "-", kanaLength: 1 };
  if (char === "、") return { spelling: ",", kanaLength: 1 };
  if (char === "。") return { spelling: ".", kanaLength: 1 };
  if (char === "っ") {
    const next = preferredUnitAt(kana, pos + 1);
    if (!next) throw new Error(`「っ」の後ろに文字がありません: ${kana}`);
    return { spelling: next.spelling[0] + next.spelling, kanaLength: next.kanaLength + 1 };
  }
  if (char === "ん") {
    const next = preferredUnitAt(kana, pos + 1);
    const canUseSingleN = next && !N_BLOCKERS.includes(next.spelling[0]);
    return { spelling: canUseSingleN ? "n" : "nn", kanaLength: 1 };
  }
  const pair = kana.slice(pos, pos + 2);
  if (PREFERRED_ROMAJI[pair]) return { spelling: PREFERRED_ROMAJI[pair], kanaLength: 2 };
  if (PREFERRED_ROMAJI[char]) return { spelling: PREFERRED_ROMAJI[char], kanaLength: 1 };
  throw new Error(`ローマ字に変換できない文字です: ${char} (${kana})`);
}

export function preferredInputFor(kana) {
  let pos = 0;
  let result = "";
  while (pos < kana.length) {
    const unit = preferredUnitAt(kana, pos);
    result += unit.spelling;
    pos += unit.kanaLength;
  }
  return result;
}

// 30問を 導入4 / 練習14 / 混合8 / 宝箱4 に割り当てる。
export function lessonRoleFor(index) {
  if (index < 4) return "intro";
  if (index < 18) return "practice";
  if (index < 26) return "mixed";
  return "treasure";
}

// entries は [表示タイトル, 入力かな, 追加の学習タグ] の配列。
export function kanaStageProblems(stageId, mainTag, exerciseKind, entries) {
  return entries.map(([title, input, extraTags = []], index) => {
    const preferredInput = preferredInputFor(input);
    const learningTags = [mainTag, ...extraTags];
    return {
      id: `${stageId.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
      stageId,
      title,
      text: input,
      input,
      inputMode: "ja-romaji",
      preferredInput,
      targetKeys: [...new Set(preferredInput)],
      tags: [exerciseKind, "kana", ...learningTags],
      learningTags,
      lessonRole: lessonRoleFor(index),
      exerciseKind,
      estimatedKeystrokes: preferredInput.length,
    };
  });
}
