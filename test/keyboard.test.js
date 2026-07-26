import test from "node:test";
import assert from "node:assert/strict";
import { typedKeyFrom } from "../src/domain/keyboard.js";

const keydown = (key, code) => ({ key, code });

test("通常のキーボードは key をそのまま使う", () => {
  assert.equal(typedKeyFrom(keydown(" ", "Space")), " ");
  assert.equal(typedKeyFrom(keydown("a", "KeyA")), "a");
  assert.equal(typedKeyFrom(keydown("A", "KeyA")), "a");
  assert.equal(typedKeyFrom(keydown("/", "Slash")), "/");
  assert.equal(typedKeyFrom(keydown("-", "Minus")), "-");
  assert.equal(typedKeyFrom(keydown("'", "Quote")), "'");
});

test("スペースバーが全角スペースで届いても半角スペースとして扱う", () => {
  assert.equal(typedKeyFrom(keydown("　", "Space")), " ");
  assert.equal(typedKeyFrom(keydown(" ", "Space")), " ");
});

test("key が 1 文字でなくても code から復元する", () => {
  assert.equal(typedKeyFrom(keydown("Spacebar", "Space")), " ");
  assert.equal(typedKeyFrom(keydown("Unidentified", "Space")), " ");
  assert.equal(typedKeyFrom(keydown("Process", "KeyK")), "k");
});

test("非 QWERTY 配列では key を優先し、物理位置で上書きしない", () => {
  // AZERTY の Q の位置は "a" を打つ。code に引きずられて "q" にしない。
  assert.equal(typedKeyFrom(keydown("a", "KeyQ")), "a");
});

test("打鍵として扱えないキーは null を返す", () => {
  assert.equal(typedKeyFrom(keydown("Shift", "ShiftLeft")), null);
  assert.equal(typedKeyFrom(keydown("Enter", "Enter")), null);
  assert.equal(typedKeyFrom(keydown("ArrowLeft", "ArrowLeft")), null);
});

test("お題にない 1 文字は今までどおりミス判定へ渡す", () => {
  assert.equal(typedKeyFrom(keydown("5", "Digit5")), "5");
  assert.equal(typedKeyFrom(keydown("あ", "KeyA")), "a");
});
