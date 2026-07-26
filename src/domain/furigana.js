const KANJI_PATTERN = /^[\p{Script=Han}々〆ヵヶ]+$/u;
const TEXT_SEGMENT_PATTERN = /[\p{Script=Han}々〆ヵヶ]+|[^\p{Script=Han}々〆ヵヶ]+/gu;

// ルビ注釈の記法（青空文庫と同じ発想）:
//   石《いし》        … 《》直前の漢字の連なりを基底にして読みを振る
//   ｜出会った《であった》 … ｜で基底の開始位置を明示する（漢字とかなが混ざる語）
// テキストに読みを併記するので、文字を追加した人がその場で読みを書ける。
// グローバルな読み一覧を保守する必要がなく、登録漏れが構造的に起きない。
const RUBY_BASE_START = "｜";
const RUBY_READING_OPEN = "《";
const RUBY_READING_CLOSE = "》";
const SINGLE_KANJI_PATTERN = /[\p{Script=Han}々〆ヵヶ]/u;

function normalizeKana(text) {
  return [...text].map((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
      return String.fromCodePoint(codePoint - 0x60);
    }
    return character;
  }).join("");
}

export function splitFuriganaSegments(base, reading) {
  const segments = base.match(TEXT_SEGMENT_PATTERN) ?? [base];
  const normalizedReading = normalizeKana(reading);
  let readingIndex = 0;

  return segments.map((text, index) => {
    if (!KANJI_PATTERN.test(text)) {
      const normalizedText = normalizeKana(text);
      const textIndex = normalizedReading.indexOf(normalizedText, readingIndex);
      if (textIndex >= 0) readingIndex = textIndex + normalizedText.length;
      return { text };
    }

    const nextPlainText = segments[index + 1];
    if (!nextPlainText) {
      const segmentReading = reading.slice(readingIndex);
      readingIndex = reading.length;
      return { text, reading: segmentReading };
    }

    const boundary = normalizedReading.indexOf(normalizeKana(nextPlainText), readingIndex);
    if (boundary < 0) return { text };

    const segmentReading = reading.slice(readingIndex, boundary);
    readingIndex = boundary;
    return segmentReading ? { text, reading: segmentReading } : { text };
  });
}

function pushRubyTokens(tokens, base, reading) {
  if (!base) {
    if (reading) tokens.push({ text: reading });
    return;
  }
  if (!reading) {
    tokens.push({ text: base });
    return;
  }
  for (const segment of splitFuriganaSegments(base, reading)) {
    tokens.push(segment.reading ? { text: segment.text, reading: segment.reading } : { text: segment.text });
  }
}

// 文字列を、注釈記法にしたがってトークン列 `[{ text }, { text, reading }, ...]` に分解する。
// 描画側（UiText）は reading があれば <ruby>、なければ素のテキストとして扱う。
export function parseFurigana(text) {
  const tokens = [];
  let plain = "";
  const flushPlain = () => {
    if (!plain) return;
    tokens.push({ text: plain });
    plain = "";
  };

  let index = 0;
  while (index < text.length) {
    const char = text[index];

    if (char === RUBY_BASE_START) {
      flushPlain();
      index += 1;
      let base = "";
      while (index < text.length && text[index] !== RUBY_READING_OPEN) {
        base += text[index];
        index += 1;
      }
      index += 1; // 《 を読み飛ばす
      let reading = "";
      while (index < text.length && text[index] !== RUBY_READING_CLOSE) {
        reading += text[index];
        index += 1;
      }
      index += 1; // 》 を読み飛ばす
      pushRubyTokens(tokens, base, reading);
      continue;
    }

    if (char === RUBY_READING_OPEN) {
      // ｜がない場合は、直前の漢字の連なりを基底とみなす。
      let boundary = plain.length;
      while (boundary > 0 && SINGLE_KANJI_PATTERN.test(plain[boundary - 1])) boundary -= 1;
      const base = plain.slice(boundary);
      plain = plain.slice(0, boundary);
      flushPlain();
      index += 1; // 《 を読み飛ばす
      let reading = "";
      while (index < text.length && text[index] !== RUBY_READING_CLOSE) {
        reading += text[index];
        index += 1;
      }
      index += 1; // 》 を読み飛ばす
      pushRubyTokens(tokens, base, reading);
      continue;
    }

    plain += char;
    index += 1;
  }
  flushPlain();
  return tokens;
}

// ふりがなを取り除き、基底テキストだけを返す（plain 表示・比較用）。
export function stripFurigana(text) {
  return parseFurigana(text).map((token) => token.text).join("");
}
