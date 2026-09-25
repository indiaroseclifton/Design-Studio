/*
 * Storybook audio: a generative piano over a soft pad, plus page-turn swishes and pop-up blips, all made with
 * the Web Audio API (ported from the prototype). Nothing plays until the reader presses Begin, and the choice
 * of sound on/off persists in localStorage (vs2_sbsound).
 */

const KEY = 'vs2_sbsound';
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
    [50, 57, 62, 66, 69],
    [45, 52, 57, 61, 64],
    [47, 54, 59, 62, 66],
    [43, 50, 55, 59, 62],
  ],
  ARP = [1, 2, 3, 4, 3, 2, 3, 2];

interface AU {
  ctx: AudioContext | null;
  on: boolean;
  playing: boolean;
  timer: number;
  next: number;
  step: number;
  master?: GainNode;
  rev?: ConvolverNode;
  dry?: GainNode;
}

const readOn = () => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};

const A: AU = { ctx: null, on: readOn(), playing: false, timer: 0, next: 0, step: 0 };

function init() {
  if (A.ctx) return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const C = new Ctor();
  A.ctx = C;
  A.master = C.createGain();
  A.master.gain.value = 0;
  const comp = C.createDynamicsCompressor();
  A.master.connect(comp);
  comp.connect(C.destination);
  const len = (C.sampleRate * 3.4) | 0,
    buf = C.createBuffer(2, len, C.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
  }
  A.rev = C.createConvolver();
  A.rev.buffer = buf;
  const wet = C.createGain();
  wet.gain.value = 0.6;
  A.rev.connect(wet);
  wet.connect(A.master);
  A.dry = C.createGain();
  A.dry.gain.value = 0.65;
  A.dry.connect(A.master);
}

function voice(f: number, t: number, dur: number, vel: number, pad = false) {
  const C = A.ctx!,
    g = C.createGain(),
    lp = C.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = pad ? 850 : 2400 + vel * 9000;
  g.connect(lp);
  lp.connect(A.dry!);
  lp.connect(A.rev!);
  if (pad) {
    for (const dt of [-7, 7]) {
      const o = C.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = dt;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 1.6);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 1.3);
    g.gain.setValueAtTime(vel, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
  } else {
    for (const [m, a] of [
      [1, 1],
      [2, 0.32],
      [3, 0.1],
      [4.02, 0.05],
    ]) {
      const o = C.createOscillator();
      o.frequency.value = f * m;
      const og = C.createGain();
      og.gain.value = a;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
}

function schedule() {
  const C = A.ctx!;
  while (A.next < C.currentTime + 0.4) {
    const st = A.step,
      t = A.next,
      bar = Math.floor(st / 8),
      ch = CHORDS[bar % 4],
      e = st % 8;
    if (e === 0) {
      voice(mtof(ch[0] - 12), t, 3.4, 0.15);
      ch.slice(0, 4).forEach((m) => voice(mtof(m), t, 3.1, 0.016, true));
      if (bar % 2 === 1) {
        voice(mtof(ch[2 + ((Math.random() * 3) | 0)] + 12), t + 0.02, 2.6, 0.07);
        if (Math.random() < 0.65) voice(mtof(ch[1 + ((Math.random() * 3) | 0)] + 24), t + 1.6, 1.8, 0.045);
      }
    }
    voice(mtof(ch[ARP[e]] + 12), t + Math.random() * 0.014, 1.9, 0.045 + Math.random() * 0.03);
    A.step++;
    A.next += 0.4;
  }
}

export const soundOn = () => A.on;
export function setSoundOn(on: boolean) {
  A.on = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

export function musicStart() {
  if (!A.on) return;
  init();
  const C = A.ctx!;
  void C.resume();
  if (A.playing) return;
  A.playing = true;
  A.next = C.currentTime + 0.15;
  A.step = 0;
  clearInterval(A.timer);
  A.timer = window.setInterval(schedule, 50);
  A.master!.gain.cancelScheduledValues(C.currentTime);
  A.master!.gain.setValueAtTime(A.master!.gain.value, C.currentTime);
  A.master!.gain.linearRampToValueAtTime(0.5, C.currentTime + 3);
}

export function musicStop() {
  if (!A.ctx || !A.playing) return;
  A.playing = false;
  const C = A.ctx;
  A.master!.gain.cancelScheduledValues(C.currentTime);
  A.master!.gain.setValueAtTime(A.master!.gain.value, C.currentTime);
  A.master!.gain.linearRampToValueAtTime(0, C.currentTime + 1.2);
  setTimeout(() => {
    if (!A.playing) {
      clearInterval(A.timer);
      void A.ctx?.suspend();
    }
  }, 1400);
}

export function swish() {
  if (!A.playing) return;
  const C = A.ctx!,
    t = C.currentTime,
    len = (C.sampleRate * 0.55) | 0,
    b = C.createBuffer(1, len, C.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = C.createBufferSource();
  s.buffer = b;
  const f = C.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(500, t);
  f.frequency.exponentialRampToValueAtTime(3400, t + 0.26);
  f.frequency.exponentialRampToValueAtTime(800, t + 0.55);
  const g = C.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.07);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  s.connect(f);
  f.connect(g);
  g.connect(A.master!);
  s.start(t);
}

export function blip() {
  if (!A.playing) return;
  voice(mtof([81, 83, 86, 88][(Math.random() * 4) | 0]), A.ctx!.currentTime + 0.01, 0.7, 0.03);
}
