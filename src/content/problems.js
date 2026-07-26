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
  ...direct("S01", [["ひだりの みち", "asdf"], ["ひとつずつ もどろう", "fdsa"], ["おうちを あるこう", "asfd"], ["みじかい リズム", "sadf"], ["やわらかい かぜ", "dfas"], ["石《いし》を たどろう", "asds"], ["花《はな》の みち", "fdaf"], ["光《ひかり》を つなぐ", "sdfa"]]),
  ...direct("S02", [["みぎの みち", "jkl"], ["ひとつずつ もどろう", "lkj"], ["おうちを あるこう", "jlk"], ["みじかい リズム", "kjl"], ["ひかりを たどろう", "ljk"], ["石《いし》を たどろう", "jklj"], ["星《ほし》の みち", "kllk"], ["光《ひかり》を つなぐ", "ljkl"]]),
  ...direct("S03", [["ふたつの みち", "asdf jkl"], ["ひだりから みぎへ", "asdjkl"], ["かぜの ステップ", "fjdskl"], ["おうちの ダンス", "safjdl"], ["きらりの みち", "dfjkasl"], ["たからばこ", "asdf jkl asdf"], ["橋《はし》を わたろう", "fjas dk"], ["まんなかの 光《ひかり》", "sdjk af"]]),
  ...direct("S04", [["ひだりの 丘《おか》", "qwer"], ["のぼって もどろう", "trewq"], ["かぜの みち", "qwert"], ["おうちへ かえる", "fdsare"], ["ちいさな ステップ", "wqer"], ["雲《くも》を たどろう", "qwe rt"], ["丘《おか》の ひかり", "trew"], ["葉《は》っぱの みち", "aqwsed"]]),
  ...direct("S05", [["みぎの 丘《おか》", "yuiop"], ["のぼって もどろう", "poiuy"], ["ひかりの みち", "yuipo"], ["おうちへ かえる", "jklui"], ["ちいさな ステップ", "uioy"], ["雲《くも》を たどろう", "yui op"], ["丘《おか》の ひかり", "piuyo"], ["星《ほし》の みち", "juykli"]]),
  ...direct("S06", [["丘《おか》を つなごう", "qwer yuiop"], ["風《かぜ》の リズム", "tyu rew"], ["空《そら》の みち", "qwe yui"], ["両手《りょうて》の ダンス", "asdf jkl qwer"], ["ひかりの 橋《はし》", "tryu ioe"], ["雲《くも》を こえて", "qwr yuo"], ["風《かぜ》を つかまえよう", "rew poi"], ["空《そら》の ステップ", "tyu qwe"]]),
  ...direct("S07", [["ひだりの 小《こ》｜道《みち》", "zxcvb"], ["おりて もどろう", "bvcxz"], ["草《くさ》の リズム", "zxcv"], ["まっすぐ あるこう", "asdf zxcv"], ["ちいさな 石《いし》", "cvbz"], ["葉《は》っぱの 道《みち》", "zxc vb"], ["森《もり》の リズム", "bvcz"], ["土《つち》の みち", "asdzxc"]]),
  ...direct("S08", [["みぎの 小《こ》｜道《みち》", "nm,./"], ["おりて もどろう", "/.,mn"], ["草《くさ》の リズム", "nm,."], ["まっすぐ あるこう", "jkl nm,."], ["ちいさな 石《いし》", "m,n/."], ["葉《は》っぱの 道《みち》", "nm, /."], ["森《もり》の リズム", ".,/mn"], ["土《つち》の みち", "jknm,."]]),
  ...SHALLOW_PROBLEM_CONTENT,
  ...coralWords([
    ["intro", "朝《あさ》の ひかり", "あさ", "asa"],
    ["intro", "｜小さな《ちいさな》 いす", "いす", "isu"],
    ["intro", "かさを ひらく", "かさ", "kasa"],
    ["intro", "ねこが いる", "ねこ", "neko"],
    ["intro", "花《はな》を みつけた", "はな", "hana"],
    ["intro", "さかなの みち", "さかな", "sakana"],
    ["intro", "ふくを えらぶ", "ふく", "fuku"],
    ["intro", "たまごを みつけた", "たまご", "tamago"],
    ["practice", "空《そら》を ｜見る《みる》", "そら", "sora"],
    ["practice", "山《やま》を のぼる", "やま", "yama"],
    ["practice", "川《かわ》の ほとり", "かわ", "kawa"],
    ["practice", "雲《くも》が うかぶ", "くも", "kumo"],
    ["practice", "星《ほし》を ｜見つけた《みつけた》", "ほし", "hoshi"],
    ["practice", "海《うみ》の ひかり", "うみ", "umi"],
    ["practice", "鳥《とり》が とぶ", "とり", "tori"],
    ["practice", "犬《いぬ》と あそぶ", "いぬ", "inu"],
    ["practice", "耳《みみ》を すます", "みみ", "mimi"],
    ["practice", "めがねを かける", "めがね", "megane"],
    ["mixed", "りすが はしる", "りす", "risu"],
    ["mixed", "きつねを 見《み》た", "きつね", "kitsune"],
    ["mixed", "しまうまの もよう", "しまうま", "shimauma"],
    ["mixed", "青《あお》い そら", "あおい", "aoi"],
    ["mixed", "おかしの 時間《じかん》", "おかし", "okashi"],
    ["mixed", "空《そら》の のりもの", "ひこうき", "hikouki"],
    ["mixed", "ふねが すすむ", "ふね", "fune"],
    ["treasure", "まどを あける", "まど", "mado"],
    ["treasure", "たこを あげる", "たこ", "tako"],
    ["treasure", "すいかを ｜食べる《たべる》", "すいか", "suika"],
    ["treasure", "にわの 花《はな》", "にわ", "niwa"],
    ["treasure", "池《いけ》の かえる", "かえる", "kaeru"],
    ["treasure", "水辺《みずべ》の あひる", "あひる", "ahiru"],
    ["treasure", "しおの かおり", "しお", "shio"],
  ]),
  ...CORAL_PROBLEM_CONTENT,
  ...CAVE_PROBLEM_CONTENT,
  ...DEEP_PROBLEM_CONTENT,
];
