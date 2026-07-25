export function emptySkill(key) {
  return { key, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
}

const CONCEPT_LABELS = {
  vowel: "あいうえお",
  "a-row": "あ行",
  "consonant-vowel": "子音と母音",
  "k-row": "か行",
  "s-row": "さ行",
  "t-row": "た行",
  "n-row": "な行",
  "h-row": "は行",
  "m-row": "ま行",
  "y-row": "や行",
  "r-row": "ら行",
  "w-row": "わ行",
  "g-row": "が行",
  "z-row": "ざ行",
  "d-row": "だ行",
  "b-row": "ば行",
  "p-row": "ぱ行",
  voiced: "にごる音",
  "semi-voiced": "ぱ行",
  "variant-shi": "「し」の打ち方",
  "variant-chi": "「ち」の打ち方",
  "variant-tsu": "「つ」の打ち方",
  "variant-fu": "「ふ」の打ち方",
  "variant-wo": "「を」の打ち方",
  "variant-ji": "「じ」の打ち方",
  "di-du": "「ぢ・づ」の打ち方",
  hatsuon: "「ん」のことば",
  "n-final": "最後の「ん」",
  "n-before-consonant": "子音の前の「ん」",
  "n-before-vowel": "母音の前の「ん」",
  "n-before-y": "Yの前の「ん」",
  sokuon: "小さい「っ」",
  choon: "のばす音「ー」",
  yoon: "小さい「ゃ・ゅ・ょ」",
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
  "basic-word": "身近なことば",
  "word-verb": "動きを表すことば",
  "word-descriptive": "様子を表すことば",
  "mixed-kana-word": "特殊なかなの混合",
  "phrase-particle": "助詞つきフレーズ",
  "coral-challenge": "珊瑚の森チャレンジ",
  "cave-short-sentence": "みじかい文",
  "sentence-modifier": "ようすを そえる文",
  "sentence-place-time": "どこで・いつの文",
  "sentence-connect": "ふたつの うごきの文",
  "sentence-reason": "わけを つなぐ文",
  "cave-challenge": "海の洞窟チャレンジ",
  "deep-comma": "読点「、」の文",
  "deep-period": "句点「。」の文",
  "deep-two-sentences": "ふたつの文",
  "deep-long-sentence": "ながい文",
  "deep-however": "「〜けれど」の文",
  "deep-challenge": "深海チャレンジ",
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
