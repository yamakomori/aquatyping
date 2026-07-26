// 物理キー（KeyboardEvent.code）から、お題の判定に使う文字を復元する。
//
// iPad などで日本語キーボードが選ばれていると、スペースバーの KeyboardEvent.key が
// 半角スペース(U+0020)ではなく全角スペース(U+3000)や "Spacebar" / "Unidentified" で
// 届くことがある。key だけを見ていると、前者はミス判定、後者は無反応になってしまう。
// お題が要求しうるキーは配列上の位置が決まっているので、code から引き直せば救える。
const CODE_TO_KEY = {
  Space: " ",
  Minus: "-",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Quote: "'",
  Semicolon: ";",
};
for (const letter of "abcdefghijklmnopqrstuvwxyz") CODE_TO_KEY[`Key${letter.toUpperCase()}`] = letter;

// お題（直接入力・ローマ字入力の両方）が要求しうる文字。"'" は「ん」の n' 綴りで使う。
const TYPABLE_KEY = /^[a-z\-,./';: ]$/;

/**
 * keydown から打鍵文字を取り出す。打鍵として扱えない場合は null。
 *
 * key が意図どおりの文字ならそれを使い（AZERTY などの配列を壊さない）、
 * そうでないときだけ code から復元する。どちらでも決まらない 1 文字は、
 * これまでどおりミスとして通し、キーボードガイドの赤い反応を残す。
 */
export function typedKeyFrom(event) {
  const fromKey = event.key.length === 1 ? event.key.toLowerCase() : null;
  if (fromKey !== null && TYPABLE_KEY.test(fromKey)) return fromKey;
  return CODE_TO_KEY[event.code] ?? fromKey;
}
