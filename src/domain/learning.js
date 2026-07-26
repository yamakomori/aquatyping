export function emptySkill(key) {
  return { key, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
}

const CONCEPT_LABELS = {
  vowel: "あいうえお",
  "a-row": "あ行《ぎょう》",
  "consonant-vowel": "子音《しいん》と母音《ぼいん》",
  "k-row": "か行《ぎょう》",
  "s-row": "さ行《ぎょう》",
  "t-row": "た行《ぎょう》",
  "n-row": "な行《ぎょう》",
  "h-row": "は行《ぎょう》",
  "m-row": "ま行《ぎょう》",
  "y-row": "や行《ぎょう》",
  "r-row": "ら行《ぎょう》",
  "w-row": "わ行《ぎょう》",
  "g-row": "が行《ぎょう》",
  "z-row": "ざ行《ぎょう》",
  "d-row": "だ行《ぎょう》",
  "b-row": "ば行《ぎょう》",
  "p-row": "ぱ行《ぎょう》",
  voiced: "にごる音《おと》",
  "semi-voiced": "ぱ行《ぎょう》",
  "variant-shi": "「し」の｜打ち方《うちかた》",
  "variant-chi": "「ち」の｜打ち方《うちかた》",
  "variant-tsu": "「つ」の｜打ち方《うちかた》",
  "variant-fu": "「ふ」の｜打ち方《うちかた》",
  "variant-wo": "「を」の｜打ち方《うちかた》",
  "variant-ji": "「じ」の｜打ち方《うちかた》",
  "di-du": "「ぢ・づ」の｜打ち方《うちかた》",
  hatsuon: "「ん」のことば",
  "n-final": "最後《さいご》の「ん」",
  "n-before-consonant": "子音《しいん》の前《まえ》の「ん」",
  "n-before-vowel": "母音《ぼいん》の前《まえ》の「ん」",
  "n-before-y": "Yの前《まえ》の「ん」",
  sokuon: "｜小さい《ちいさい》「っ」",
  choon: "のばす音《おと》「ー」",
  yoon: "｜小さい《ちいさい》「ゃ・ゅ・ょ」",
  "k-yoon": "きゃ・きゅ・きょ",
  "s-yoon": "しゃ・しゅ・しょ",
  "t-yoon": "ちゃ・ちゅ・ちょ",
  "n-yoon": "にゃ・にゅ・にょ",
  "h-yoon": "ひゃ・ひゅ・ひょ",
  "m-yoon": "みゃ・みゅ・みょ",
  "r-yoon": "りゃ・りゅ・りょ",
  "g-yoon": "ぎゃ・ぎゅ・ぎょ",
  "j-yoon": "じゃ・じゅ・じょ",
  "d-yoon": "ぢゃ・ぢゅ・ぢょ",
  "b-yoon": "びゃ・びゅ・びょ",
  "p-yoon": "ぴゃ・ぴゅ・ぴょ",
  "basic-word": "身近《みぢか》なことば",
  "word-verb": "｜動きを表す《うごきをあらわす》ことば",
  "word-descriptive": "様子《ようす》を｜表す《あらわす》ことば",
  "mixed-kana-word": "特殊《とくしゅ》なかなの混合《こんごう》",
  "phrase-particle": "助詞《じょし》つきフレーズ",
  "coral-challenge": "｜珊瑚の森《さんごのもり》チャレンジ",
  "cave-short-sentence": "みじかい文《ぶん》",
  "sentence-modifier": "ようすを そえる文《ぶん》",
  "sentence-place-time": "どこで・いつの文《ぶん》",
  "sentence-connect": "ふたつの うごきの文《ぶん》",
  "sentence-reason": "わけを つなぐ文《ぶん》",
  "cave-challenge": "海《うみ》の洞窟《どうくつ》チャレンジ",
  "deep-comma": "読点《とうてん》「、」の文《ぶん》",
  "deep-period": "句点《くてん》「。」の文《ぶん》",
  "deep-two-sentences": "ふたつの文《ぶん》",
  "deep-long-sentence": "ながい文《ぶん》",
  "deep-however": "「〜けれど」の文《ぶん》",
  "deep-challenge": "深海《しんかい》チャレンジ",
};

export function learningConceptLabel(tag) {
  return CONCEPT_LABELS[tag] ?? tag;
}

export function updateSkills(skills, attempt) {
  const next = structuredClone(skills ?? {});
  for (const key of attempt.targetKeys) {
    const skill = next[key] ?? emptySkill(key);
    skill.exposures += 1;
    skill.correct += 1;
    skill.reviewWeight = Math.max(0, Number((skill.reviewWeight * 0.72).toFixed(2)));
    next[key] = skill;
  }
  for (const [key, count] of Object.entries(attempt.mistakeKeys)) {
    const skill = next[key] ?? emptySkill(key);
    skill.mistakes += count;
    skill.reviewWeight = Math.min(4, Number((skill.reviewWeight + count).toFixed(2)));
    next[key] = skill;
  }
  return next;
}

export function updateConceptSkills(conceptSkills, attempt) {
  const next = structuredClone(conceptSkills ?? {});
  for (const tag of [...new Set(attempt.learningTags ?? [])]) {
    const skill = next[tag] ?? { tag, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
    skill.exposures += 1;
    if (attempt.mistakes === 0) {
      skill.correct += 1;
      skill.reviewWeight = Math.max(0, Number((skill.reviewWeight * 0.68).toFixed(2)));
    } else {
      skill.mistakes += attempt.mistakes;
      skill.reviewWeight = Math.min(4, Number((skill.reviewWeight + Math.min(1.5, 0.45 + attempt.mistakes * 0.2)).toFixed(2)));
    }
    next[tag] = skill;
  }
  return next;
}

export function reviewKeysForStage(skills = {}, availableKeys = [], max = 2) {
  return [...new Set(availableKeys)]
    .map((key) => ({ key, weight: skills[key]?.reviewWeight ?? 0 }))
    .filter((entry) => entry.weight >= 0.75)
    .sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key))
    .slice(0, max)
    .map((entry) => entry.key);
}

export function reviewConceptsForStage(conceptSkills = {}, focusTags = [], max = 2) {
  return [...new Set(focusTags)]
    .map((tag) => ({ tag, weight: conceptSkills[tag]?.reviewWeight ?? 0 }))
    .filter((entry) => entry.weight >= 0.6)
    .sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag))
    .slice(0, max)
    .map((entry) => entry.tag);
}

export function attemptAccuracy(attempt) {
  const total = attempt.acceptedKeystrokes + attempt.mistakes;
  return total === 0 ? 0 : attempt.acceptedKeystrokes / total;
}

export function stageAccuracy(attempts, stageId) {
  const relevant = attempts.filter((attempt) => attempt.stageId === stageId && attempt.completed);
  const accepted = relevant.reduce((sum, attempt) => sum + attempt.acceptedKeystrokes, 0);
  const mistakes = relevant.reduce((sum, attempt) => sum + attempt.mistakes, 0);
  return accepted + mistakes === 0 ? 0 : accepted / (accepted + mistakes);
}

export function summarizePlay(attempts) {
  const acceptedKeystrokes = attempts.reduce((sum, attempt) => sum + attempt.acceptedKeystrokes, 0);
  const mistakes = attempts.reduce((sum, attempt) => sum + attempt.mistakes, 0);
  const durationMs = attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0);
  const expectedKeystrokes = attempts.reduce((sum, attempt) => sum + (attempt.estimatedKeystrokes ?? attempt.acceptedKeystrokes), 0);
  const accuracy = acceptedKeystrokes + mistakes === 0 ? 0 : acceptedKeystrokes / (acceptedKeystrokes + mistakes);
  const totalKeystrokes = acceptedKeystrokes + mistakes;
  const kpm = durationMs === 0 ? 0 : Math.round((totalKeystrokes / durationMs) * 60000);
  return { acceptedKeystrokes, mistakes, totalKeystrokes, expectedKeystrokes, durationMs, accuracy, kpm };
}

export function awardStageMedals(existing = {}, criteria, summary) {
  const qualifiesCareful = summary.accuracy >= criteria.carefulMinAccuracy;
  const speedTargetMs = summary.expectedKeystrokes * criteria.speedMaxMsPerKey;
  const qualifiesSpeed = summary.durationMs <= speedTargetMs;
  const qualifiesGold = qualifiesCareful && qualifiesSpeed;
  const next = {
    careful: existing.careful || qualifiesCareful,
    speed: existing.speed || qualifiesSpeed,
    gold: existing.gold || qualifiesGold,
  };
  return {
    medals: next,
    newlyEarned: {
      careful: !existing.careful && qualifiesCareful,
      speed: !existing.speed && qualifiesSpeed,
      gold: !existing.gold && qualifiesGold,
    },
  };
}
