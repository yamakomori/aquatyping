// 水をテーマにしたゲーム内効果音。音源ファイルは持たず Web Audio API で合成する。
// 読み込み待ちが無いので演出とズレず、打鍵音も短い波形で重ねて鳴らせる。
// 音作りの試聴・調整は public/catch-sound.html で行える。

let ctx = null;
let dry = null;   // 直の音
let wet = null;   // 残響へ送る量

const MASTER_GAIN = 0.5;
const REVERB_SEND = 0.32;

const rand = (min, max) => min + Math.random() * (max - min);

// 短い残響用のインパルス応答をノイズから作る。水面の広がりを出すためのもの。
function createImpulseResponse(seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function createNoiseBuffer(seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function setup() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return false;

  ctx = new AudioContextClass();

  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);

  dry = ctx.createGain();
  dry.connect(master);

  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulseResponse(1.1, 3.2);
  reverb.connect(master);

  wet = ctx.createGain();
  wet.gain.value = REVERB_SEND;
  wet.connect(reverb);

  return true;
}

// ブラウザは操作なしに音を鳴らさない。打鍵のタイミングで先に起こしておく。
export function primeCatchSound() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx && !setup()) return;
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    ctx = null;   // 音が出せない環境でもゲーム自体は続けられるようにする
  }
}

// 音の出口。dry と wet の両方へ送る
function connectOut(node) {
  node.connect(dry);
  node.connect(wet);
}

// 打鍵音は連続するため、捕獲音より残響を抑えて輪郭を保つ。
function connectTypingOut(node) {
  node.connect(dry);
  const send = ctx.createGain();
  send.gain.value = 0.16;
  node.connect(send);
  send.connect(wet);
}

// 水滴の芯：サイン波が短く上へ滑る（水滴の「ぽ」の正体はこの上昇）
function drop(at, { from, to, duration, gain }, connect = connectOut) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006);   // 立ち上がりは丸く
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration * 2.2);

  osc.connect(env);
  connect(env);
  osc.start(at);
  osc.stop(at + duration * 2.4);
}

// しぶき：帯域を絞ったノイズをごく小さく。「しゃん」の余韻
function splash(at, { freq, duration, gain, q = 1.2 }) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(duration + 0.05);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(freq, at);
  band.frequency.exponentialRampToValueAtTime(freq * 0.45, at + duration);
  band.Q.value = q;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(band).connect(env);
  connectOut(env);
  source.start(at);
  source.stop(at + duration + 0.05);
}

// 着水の炸裂：広い帯域のノイズを鳴らしながらローパスを閉じていく。「バシャ」の本体。
// attack を伸ばすと頭の刺さりが和らぐ。
function crash(at, { from, to, duration, gain, attack }) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(duration + 0.1);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(from, at);
  lowpass.frequency.exponentialRampToValueAtTime(to, at + duration);
  lowpass.Q.value = 0.7;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(gain * 0.25, at + duration * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(lowpass).connect(env);
  connectOut(env);
  source.start(at);
  source.stop(at + duration + 0.1);
}

// バケツの胴鳴り：ノイズを高い Q の帯域で締めて濁った「ーン」を残す
function bucketRing(at, { freq, duration, gain, q }) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(duration + 0.05);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(freq, at);
  band.frequency.exponentialRampToValueAtTime(freq * 0.8, at + duration);
  band.Q.value = q;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(band).connect(env);
  connectOut(env);
  source.start(at);
  source.stop(at + duration + 0.05);
}

// 水のかたまりが落ちる重み。ごく低い音を一瞬だけ。
function thump(at, { from, to, duration, gain, attack }) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(env);
  connectOut(env);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

// 跳ねた水が落ちてくる粒。散らして鳴らす。
function droplets(at, { count, spread, pitch }) {
  for (let i = 0; i < count; i += 1) {
    drop(at + rand(0, spread), {
      from: rand(500, 900) * pitch,
      to: rand(1200, 2100) * pitch,
      duration: rand(0.025, 0.045),
      gain: rand(0.05, 0.11),
    });
  }
}

// 通常の「ぽしゃん」。水滴＋細かいしぶき。
function playPlop(at, pitch) {
  drop(at, { from: 430 * pitch, to: 1180 * pitch, duration: rand(0.06, 0.075), gain: 0.42 });
  splash(at + 0.02, { freq: 2600 * pitch, duration: rand(0.16, 0.2), gain: 0.05 });
}

// レア・初捕獲の「バシャーン」。バケツに飛び込む着水と、濁った胴鳴り。
function playSplashdown(at, pitch) {
  thump(at, { from: 95 * pitch, to: 48 * pitch, duration: rand(0.16, 0.2), gain: 0.142, attack: 0.058 });
  crash(at, { from: 5040 * pitch, to: 520 * pitch, duration: rand(0.34, 0.42), gain: 0.252, attack: 0.054 });
  bucketRing(at + 0.04, { freq: 300 * pitch, duration: rand(0.4, 0.5), gain: 0.16, q: 7 });
  bucketRing(at + 0.055, { freq: 460 * pitch, duration: 0.3, gain: 0.08, q: 9 });
  droplets(at + 0.16, { count: 5, spread: 0.3, pitch });
}

/**
 * タイピングの「ポコッ」という短い水音を鳴らす。
 * 正解は上向きの泡、ミスは低く沈む泡の音にして、画面を見なくても区別できるようにする。
 * @param {boolean} accepted
 */
export function playTypingSound(accepted = true) {
  if (typeof window === "undefined") return;
  primeCatchSound();
  if (!ctx) return;
  try {
    const pitch = rand(0.94, 1.06);
    const at = ctx.currentTime + 0.006;
    if (accepted) {
      drop(at, { from: 330 * pitch, to: 690 * pitch, duration: 0.03, gain: 0.105 }, connectTypingOut);
      drop(at + 0.012, { from: 720 * pitch, to: 1040 * pitch, duration: 0.018, gain: 0.032 }, connectTypingOut);
    } else {
      drop(at, { from: 260 * pitch, to: 175 * pitch, duration: 0.045, gain: 0.082 }, connectTypingOut);
    }
  } catch {
    // 再生に失敗しても入力は止めない
  }
}

/**
 * 魚がつれた音を鳴らす。
 * @param {"normal" | "rare"} kind
 */
export function playCatchSound(kind = "normal") {
  if (typeof window === "undefined") return;
  primeCatchSound();
  if (!ctx) return;
  try {
    // 毎回わずかに音程をゆらす。同じ波形の反復は短時間で耳につくため。
    const pitch = rand(0.97, 1.03);
    const at = ctx.currentTime + 0.01;
    if (kind === "rare") playSplashdown(at, pitch);
    else playPlop(at, pitch);
  } catch {
    // 再生に失敗しても進行は止めない
  }
}
