const KANA_TO_ROMAJI = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  さ: ["sa"], し: ["shi", "si", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"], ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"], わ: ["wa"], を: ["wo"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"], ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  だ: ["da"], ぢ: ["di", "dji"], づ: ["du", "dzu"], で: ["de"], ど: ["do"], ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"], ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  きゃ: ["kya"], きゅ: ["kyu"], きょ: ["kyo"], しゃ: ["sha", "sya"], しゅ: ["shu", "syu"], しょ: ["sho", "syo"],
  ちゃ: ["cha", "tya", "cya"], ちゅ: ["chu", "tyu", "cyu"], ちょ: ["cho", "tyo", "cyo"],
  にゃ: ["nya"], にゅ: ["nyu"], にょ: ["nyo"], ひゃ: ["hya"], ひゅ: ["hyu"], ひょ: ["hyo"],
  みゃ: ["mya"], みゅ: ["myu"], みょ: ["myo"], りゃ: ["rya"], りゅ: ["ryu"], りょ: ["ryo"],
  ぎゃ: ["gya"], ぎゅ: ["gyu"], ぎょ: ["gyo"], じゃ: ["ja", "zya", "jya"], じゅ: ["ju", "zyu", "jyu"], じょ: ["jo", "zyo", "jyo"],
  ぢゃ: ["dya", "dja"], ぢゅ: ["dyu", "dju"], ぢょ: ["dyo", "djo"],
  びゃ: ["bya"], びゅ: ["byu"], びょ: ["byo"], ぴゃ: ["pya"], ぴゅ: ["pyu"], ぴょ: ["pyo"],
};

const N_BLOCKERS = "aiueony";
const SOKUON_SPELLINGS = ["ltu", "xtu", "ltsu", "xtsu"];

function unitsAt(kana, pos) {
  const char = kana[pos];
  if (!char) return [];
  if (char === "ー") return [{ spelling: "-", kanaLen: 1 }];
  // 句読点は S08 で解禁済みの , . をそのまま打つ（深海の文で使う）。
  if (char === "、") return [{ spelling: ",", kanaLen: 1 }];
  if (char === "。") return [{ spelling: ".", kanaLen: 1 }];
  if (char === "っ") {
    const following = unitsAt(kana, pos + 1);
    const doubled = following
      .filter((unit) => /^[a-z]/.test(unit.spelling) && !N_BLOCKERS.includes(unit.spelling[0]))
      .map((unit) => ({ spelling: unit.spelling[0] + unit.spelling, kanaLen: unit.kanaLen + 1 }));
    return [...doubled, ...SOKUON_SPELLINGS.map((spelling) => ({ spelling, kanaLen: 1 }))];
  }
  if (char === "ん") {
    const following = unitsAt(kana, pos + 1);
    const allowBareN = following.length > 0 && following.every((unit) => !N_BLOCKERS.includes(unit.spelling[0]));
    return [
      ...(allowBareN ? [{ spelling: "n", kanaLen: 1 }] : []),
      { spelling: "nn", kanaLen: 1 },
      { spelling: "xn", kanaLen: 1 },
      { spelling: "n'", kanaLen: 1 },
    ];
  }
  const pair = kana.slice(pos, pos + 2);
  const units = [];
  if (KANA_TO_ROMAJI[pair]) units.push(...KANA_TO_ROMAJI[pair].map((spelling) => ({ spelling, kanaLen: 2 })));
  if (KANA_TO_ROMAJI[char]) units.push(...KANA_TO_ROMAJI[char].map((spelling) => ({ spelling, kanaLen: 1 })));
  return units;
}

export function validateKana(kana) {
  let pos = 0;
  while (pos < kana.length) {
    const unit = unitsAt(kana, pos)[0];
    if (!unit) return { valid: false, pos, char: kana[pos] };
    pos += unit.kanaLen;
  }
  return { valid: true };
}

export class RomajiMatcher {
  load(kana) {
    this.kana = kana;
    this.typed = "";
    this.done = kana.length === 0;
    this.branches = this.done ? [] : [{
      pos: 0,
      candidates: unitsAt(kana, 0)
        .filter((unit) => this.preferredFrom(unit.kanaLen) !== null)
        .map((unit) => ({ ...unit, typed: 0 })),
    }];
  }

  handleChar(char) {
    if (this.done) return { accepted: false, completed: true, progress: this.kana.length };
    const byPos = new Map();
    let completed = false;
    const add = (pos, candidates) => {
      const existing = byPos.get(pos) ?? [];
      for (const candidate of candidates) {
        if (!existing.some((item) => item.spelling === candidate.spelling && item.kanaLen === candidate.kanaLen && item.typed === candidate.typed)) existing.push(candidate);
      }
      byPos.set(pos, existing);
    };
    for (const branch of this.branches) {
      const unfinished = [];
      for (const candidate of branch.candidates) {
        if (candidate.spelling[candidate.typed] !== char) continue;
        const typed = candidate.typed + 1;
        if (typed === candidate.spelling.length) {
          const nextPos = branch.pos + candidate.kanaLen;
          if (nextPos >= this.kana.length) completed = true;
          else {
            const nextCandidates = unitsAt(this.kana, nextPos)
              .filter((unit) => this.preferredFrom(nextPos + unit.kanaLen) !== null)
              .map((unit) => ({ ...unit, typed: 0 }));
            if (nextCandidates.length > 0) add(nextPos, nextCandidates);
          }
        } else unfinished.push({ ...candidate, typed });
      }
      if (unfinished.length) add(branch.pos, unfinished);
    }
    if (!completed && byPos.size === 0) return { accepted: false, completed: false, progress: this.progress() };
    this.typed += char;
    this.done = completed;
    this.branches = completed ? [] : [...byPos.entries()].map(([pos, candidates]) => ({ pos, candidates }));
    return { accepted: true, completed, progress: this.progress() };
  }

  progress() {
    return this.done ? this.kana.length : Math.min(...this.branches.map((branch) => branch.pos));
  }

  display() {
    if (this.done) return { typed: this.typed, next: "", rest: "" };
    const remaining = this.branches.flatMap((branch) => branch.candidates.flatMap((candidate) => {
      const suffix = this.preferredFrom(branch.pos + candidate.kanaLen);
      return suffix === null ? [] : [candidate.spelling.slice(candidate.typed) + suffix];
    }))[0] ?? "";
    return { typed: this.typed, next: remaining[0] ?? "", rest: remaining.slice(1) };
  }

  preferredFrom(pos, memo = new Map()) {
    if (pos >= this.kana.length) return "";
    if (memo.has(pos)) return memo.get(pos);
    memo.set(pos, null);
    for (const unit of unitsAt(this.kana, pos)) {
      const suffix = this.preferredFrom(pos + unit.kanaLen, memo);
      if (suffix === null) continue;
      const preferred = unit.spelling + suffix;
      memo.set(pos, preferred);
      return preferred;
    }
    return null;
  }
}

export class DirectMatcher {
  load(text) { this.text = text.toLowerCase(); this.pos = 0; }
  handleChar(char) {
    const accepted = this.text[this.pos] === char;
    if (accepted) this.pos += 1;
    return { accepted, completed: this.pos === this.text.length, progress: this.pos };
  }
  progress() { return this.pos; }
  display() { return { typed: this.text.slice(0, this.pos), next: this.text[this.pos] ?? "", rest: this.text.slice(this.pos + 1) }; }
}

export function createMatcher(mode) {
  return mode === "ja-romaji" ? new RomajiMatcher() : new DirectMatcher();
}
