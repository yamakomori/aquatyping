import test from "node:test";
import assert from "node:assert/strict";
import { splitFuriganaSegments, parseFurigana, stripFurigana } from "../src/domain/furigana.js";

test("送り仮名を除き、漢字だけにルビを割り当てる", () => {
  assert.deepEqual(splitFuriganaSegments("潮だまり", "しおだまり"), [
    { text: "潮", reading: "しお" },
    { text: "だまり" },
  ]);
});

test("一つの語句にある複数の漢字部分を分ける", () => {
  assert.deepEqual(splitFuriganaSegments("海へ出かける", "うみへでかける"), [
    { text: "海", reading: "うみ" },
    { text: "へ" },
    { text: "出", reading: "で" },
    { text: "かける" },
  ]);
});

test("語句の先頭がひらがなでも読みを対応させる", () => {
  assert.deepEqual(splitFuriganaSegments("まだ会っていない魚", "まだあっていないさかな"), [
    { text: "まだ" },
    { text: "会", reading: "あ" },
    { text: "っていない" },
    { text: "魚", reading: "さかな" },
  ]);
});

test("漢字を含まない語句にはルビを付けない", () => {
  assert.deepEqual(splitFuriganaSegments("キーボードガイド", "きーぼーどがいど"), [
    { text: "キーボードガイド" },
  ]);
});

test("《》の直前の漢字を基底にして読みを割り当てる", () => {
  assert.deepEqual(parseFurigana("石《いし》を たどろう"), [
    { text: "石", reading: "いし" },
    { text: "を たどろう" },
  ]);
});

test("｜で基底の開始位置を明示し、送り仮名を除いてルビを割り当てる", () => {
  assert.deepEqual(parseFurigana("｜出会った魚《であったさかな》"), [
    { text: "出会", reading: "であ" },
    { text: "った" },
    { text: "魚", reading: "さかな" },
  ]);
});

test("注釈のない漢字はルビなしでそのまま残す", () => {
  assert.deepEqual(parseFurigana("を準備｜中《なか》です。"), [
    { text: "を準備" },
    { text: "中", reading: "なか" },
    { text: "です。" },
  ]);
});

test("stripFurigana は読みと記法を取り除き基底だけを返す", () => {
  assert.equal(stripFurigana("｜出会った魚《であったさかな》に会えるよ。"), "出会った魚に会えるよ。");
  assert.equal(stripFurigana("ふりがなのない文字列"), "ふりがなのない文字列");
});
