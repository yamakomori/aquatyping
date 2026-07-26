import test from "node:test";
import assert from "node:assert/strict";
import { getFingerGuide } from "../src/domain/fingers.js";
import { stripFurigana } from "../src/domain/furigana.js";

// label はふりがな注釈（｜・《》）を含むため、基底テキストで検証する。
function guideText(key) {
  const guide = getFingerGuide(key);
  return { ...guide, label: stripFurigana(guide.label) };
}

test("home-position keys map to the correct hand and finger", () => {
  assert.deepEqual(guideText("f"), { key: "f", side: "left", finger: "index", label: "左手の人さし指" });
  assert.deepEqual(guideText("a"), { key: "a", side: "left", finger: "pinky", label: "左手の小指" });
  assert.deepEqual(guideText("j"), { key: "j", side: "right", finger: "index", label: "右手の人さし指" });
  assert.deepEqual(guideText("l"), { key: "l", side: "right", finger: "ring", label: "右手の薬指" });
});

test("space uses a thumb guide", () => {
  assert.deepEqual(guideText(" "), { key: " ", side: "both", finger: "thumb", label: "親指" });
});

test("the long vowel key uses the right pinky guide", () => {
  assert.deepEqual(guideText("-"), { key: "-", side: "right", finger: "pinky", label: "右手の小指" });
});
