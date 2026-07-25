import { CAVE_PROBLEM_CONTENT } from "./caveProblems.js";
import { CORAL_PROBLEM_CONTENT } from "./coralProblems.js";
import { DEEP_PROBLEM_CONTENT } from "./deepProblems.js";
import { SHALLOW_PROBLEM_CONTENT } from "./shallowProblems.js";

function direct(stageId, entries) {
  return entries.map(([title, input], index) => ({
    id: `${stageId.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    stageId,
    title,
    text: input.toUpperCase(),
    input,
    inputMode: "direct",
    targetKeys: [...new Set([...input.replace(/\s/g, "")])],
    tags: ["practice"],
    estimatedKeystrokes: input.replace(/\s/g, "").length,
  }));
}

function coralWords(entries) {
  return entries.map(([lessonRole, title, input, preferredInput], index) => ({
    id: `co01-${String(index + 1).padStart(2, "0")}`,
    stageId: "CO01",
    title,
    text: input,
    input,
    inputMode: "ja-romaji",
    preferredInput,
    targetKeys: [...new Set([...preferredInput])],
    tags: ["word", "kana", "basic-word"],
    learningTags: ["basic-word"],
    lessonRole,
    exerciseKind: "word",
    estimatedKeystrokes: preferredInput.length,
  }));
}

export const PROBLEM_CONTENT = [
  ...direct("S00", [["ぽっちを みつけよう", "fj"], ["ゆっくり いったりきたり", "fjfj"], ["みぎから かえろう", "jffj"], ["ふたつの ひかり", "ffjj"], ["ちいさな みち", "fjfjfj"], ["ひかりを つなぐ", "fjjf"], ["おうちへ かえる", "jfjf"], ["きらりの リズム", "ffjfj"]]),
  ...direct("S01", [["ひだりの みち", "asdf"], ["ひとつずつ もどろう", "fdsa"], ["おうちを あるこう", "asfd"], ["みじかい リズム", "sadf"], ["やわらかい かぜ", "dfas"], ["石を たどろう", "asds"], ["花の みち", "fdaf"], ["光を つなぐ", "sdfa"]]),
  ...direct("S02", [["みぎの みち", "jkl"], ["ひとつずつ もどろう", "lkj"], ["おうちを あるこう", "jlk"], ["みじかい リズム", "kjl"], ["ひかりを たどろう", "ljk"], ["石を たどろう", "jklj"], ["星の みち", "kllk"], ["光を つなぐ", "ljkl"]]),
  ...direct("S03", [["ふたつの みち", "asdf jkl"], ["ひだりから みぎへ", "asdjkl"], ["かぜの ステップ", "fjdskl"], ["おうちの ダンス", "safjdl"], ["きらりの みち", "dfjkasl"], ["たからばこ", "asdf jkl asdf"], ["橋を わたろう", "fjas dk"], ["まんなかの 光", "sdjk af"]]),
  ...direct("S04", [["ひだりの 丘", "qwer"], ["のぼって もどろう", "trewq"], ["かぜの みち", "qwert"], ["おうちへ かえる", "fdsare"], ["ちいさな ステップ", "wqer"], ["雲を たどろう", "qwe rt"], ["丘の ひかり", "trew"], ["葉っぱの みち", "aqwsed"]]),
  ...direct("S05", [["みぎの 丘", "yuiop"], ["のぼって もどろう", "poiuy"], ["ひかりの みち", "yuipo"], ["おうちへ かえる", "jklui"], ["ちいさな ステップ", "uioy"], ["雲を たどろう", "yui op"], ["丘の ひかり", "piuyo"], ["星の みち", "juykli"]]),
  ...direct("S06", [["丘を つなごう", "qwer yuiop"], ["風の リズム", "tyu rew"], ["空の みち", "qwe yui"], ["両手の ダンス", "asdf jkl qwer"], ["ひかりの 橋", "tryu ioe"], ["雲を こえて", "qwr yuo"], ["風を つかまえよう", "rew poi"], ["空の ステップ", "tyu qwe"]]),
  ...direct("S07", [["ひだりの 小道", "zxcvb"], ["おりて もどろう", "bvcxz"], ["草の リズム", "zxcv"], ["まっすぐ あるこう", "asdf zxcv"], ["ちいさな 石", "cvbz"], ["葉っぱの 道", "zxc vb"], ["森の リズム", "bvcz"], ["土の みち", "asdzxc"]]),
  ...direct("S08", [["みぎの 小道", "nm,./"], ["おりて もどろう", "/.,mn"], ["草の リズム", "nm,."], ["まっすぐ あるこう", "jkl nm,."], ["ちいさな 石", "m,n/."], ["葉っぱの 道", "nm, /."], ["森の リズム", ".,/mn"], ["土の みち", "jknm,."]]),
  ...SHALLOW_PROBLEM_CONTENT,
  ...coralWords([
    ["intro", "朝の ひかり", "あさ", "asa"],
    ["intro", "小さな いす", "いす", "isu"],
    ["intro", "かさを ひらく", "かさ", "kasa"],
    ["intro", "ねこが いる", "ねこ", "neko"],
    ["intro", "花を みつけた", "はな", "hana"],
    ["intro", "さかなの みち", "さかな", "sakana"],
    ["intro", "ふくを えらぶ", "ふく", "fuku"],
    ["intro", "たまごを みつけた", "たまご", "tamago"],
    ["practice", "空を 見る", "そら", "sora"],
    ["practice", "山を のぼる", "やま", "yama"],
    ["practice", "川の ほとり", "かわ", "kawa"],
    ["practice", "雲が うかぶ", "くも", "kumo"],
    ["practice", "星を 見つけた", "ほし", "hoshi"],
    ["practice", "海の ひかり", "うみ", "umi"],
    ["practice", "鳥が とぶ", "とり", "tori"],
    ["practice", "犬と あそぶ", "いぬ", "inu"],
    ["practice", "耳を すます", "みみ", "mimi"],
    ["practice", "めがねを かける", "めがね", "megane"],
    ["mixed", "りすが はしる", "りす", "risu"],
    ["mixed", "きつねを 見た", "きつね", "kitsune"],
    ["mixed", "しまうまの もよう", "しまうま", "shimauma"],
    ["mixed", "青い そら", "あおい", "aoi"],
    ["mixed", "おかしの 時間", "おかし", "okashi"],
    ["mixed", "空の のりもの", "ひこうき", "hikouki"],
    ["mixed", "ふねが すすむ", "ふね", "fune"],
    ["treasure", "まどを あける", "まど", "mado"],
    ["treasure", "たこを あげる", "たこ", "tako"],
    ["treasure", "すいかを 食べる", "すいか", "suika"],
    ["treasure", "にわの 花", "にわ", "niwa"],
    ["treasure", "池の かえる", "かえる", "kaeru"],
    ["treasure", "水辺の あひる", "あひる", "ahiru"],
    ["treasure", "しおの かおり", "しお", "shio"],
  ]),
  ...CORAL_PROBLEM_CONTENT,
  ...CAVE_PROBLEM_CONTENT,
  ...DEEP_PROBLEM_CONTENT,
];
