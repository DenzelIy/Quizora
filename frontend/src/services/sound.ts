/**
 * Game sounds, synthesised with the Web Audio API so they work offline with no audio files.
 * Original Kahoot-style cues: lobby music, 3-2-1 beeps, question music, last-seconds ticks,
 * a reveal gong, a scoreboard drumroll and a podium fanfare.
 */

const MUTE_KEY = 'quizora-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
let music: { stop: () => void } | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  // Browsers start audio suspended until the page has had a click or tap.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return { ctx, out: master! };
}

// Resume audio on the first interaction, for pages opened directly (e.g. after a refresh).
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  /** Glide to this frequency over the note's length. */
  slideTo?: number;
}

function tone(freq: number, when: number, duration: number, opts: ToneOptions = {}) {
  const a = audio();
  if (!a) return;
  const { type = 'square', volume = 0.15, attack = 0.005, slideTo } = opts;
  const osc = a.ctx.createOscillator();
  const gain = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, when + duration);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(a.out);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function noise(when: number, duration: number, volume = 0.1, highpass = 6000) {
  const a = audio();
  if (!a) return;
  const length = Math.max(1, Math.floor(a.ctx.sampleRate * duration));
  const buffer = a.ctx.createBuffer(1, length, a.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter).connect(gain).connect(a.out);
  src.start(when);
}

function kick(when: number, volume = 0.5) {
  tone(150, when, 0.18, { type: 'sine', volume, slideTo: 45 });
}

const note = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

/** Plays `step(index, time)` on every 16th note at `bpm` until stopped, scheduling slightly ahead. */
function startLoop(bpm: number, step: (i: number, when: number) => void) {
  stopMusic();
  const a = audio();
  if (!a) return;
  const stepSec = 60 / bpm / 4;
  let next = a.ctx.currentTime + 0.1;
  let i = 0;
  const id = window.setInterval(() => {
    while (next < a.ctx.currentTime + 0.2) {
      step(i++, next);
      next += stepSec;
    }
  }, 25);
  music = { stop: () => window.clearInterval(id) };
}

export function stopMusic() {
  music?.stop();
  music = null;
}

/** Relaxed looping tune while players join. */
export function playLobbyMusic() {
  // I–vi–IV–V in C, arpeggiated.
  const chords = [[-9, -5, -2, 3], [-12, -9, -5, 0], [-16, -12, -9, -4], [-14, -10, -7, -2]];
  startLoop(104, (i, when) => {
    const chord = chords[Math.floor(i / 16) % chords.length];
    if (i % 2 === 0) tone(note(chord[(i / 2) % 4]), when, 0.25, { type: 'triangle', volume: 0.08 });
    if (i % 16 === 0) tone(note(chord[0] - 12), when, 0.9, { type: 'sine', volume: 0.12 });
    if (i % 8 === 4) noise(when, 0.05, 0.03);
  });
}

/** Driving loop while a question is open. */
export function playQuestionMusic() {
  const bass = [0, 0, 12, 0, 3, 3, 15, 3, 5, 5, 17, 5, 3, 3, 15, 2];
  startLoop(132, (i, when) => {
    if (i % 2 === 0) tone(note(-24 + bass[(i / 2) % bass.length]), when, 0.16, { type: 'square', volume: 0.07 });
    if (i % 4 === 0) kick(when, 0.35);
    noise(when, 0.03, i % 2 ? 0.015 : 0.03);
    if (i % 32 === 28) tone(note(12), when, 0.12, { type: 'triangle', volume: 0.05 });
  });
}

/** 3-2-1 beep; pass 0 for the "go" chord. */
export function playCountdownBeep(n: number) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  if (n > 0) {
    tone(note(3), t, 0.25, { type: 'square', volume: 0.12 });
  } else {
    [3, 7, 10, 15].forEach((s) => tone(note(s), t, 0.6, { type: 'square', volume: 0.08 }));
  }
}

/** Woodblock tick for the last seconds of a question. */
export function playTick(urgent = false) {
  const a = audio();
  if (!a) return;
  tone(urgent ? 1600 : 1200, a.ctx.currentTime, 0.06, { type: 'sine', volume: 0.25 });
}

/** Whoosh as a new question appears. */
export function playQuestionIntro() {
  const a = audio();
  if (!a) return;
  tone(200, a.ctx.currentTime, 0.4, { type: 'sawtooth', volume: 0.06, slideTo: 900 });
}

/** Gong when the correct answer is revealed. */
export function playReveal() {
  stopMusic();
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  [-12, -5, 0, 4].forEach((s, i) => tone(note(s), t + i * 0.02, 1.4, { type: 'triangle', volume: 0.12 }));
  kick(t, 0.6);
}

/** Drumroll into a crash, for the scoreboard reshuffle. */
export function playScoreboard() {
  stopMusic();
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  for (let k = 0; k < 16; k++) noise(t + k * 0.05, 0.05, 0.03 + k * 0.004, 2000);
  noise(t + 0.85, 0.8, 0.12, 3000);
  kick(t + 0.85, 0.6);
  [0, 4, 7, 12].forEach((s) => tone(note(s), t + 0.85, 0.5, { type: 'square', volume: 0.06 }));
}

/** Fanfare for the final podium. */
export function playPodium() {
  stopMusic();
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const melody: [number, number, number][] = [
    [3, 0, 0.15], [3, 0.15, 0.15], [3, 0.3, 0.15], [10, 0.45, 0.6], [8, 1.05, 0.2], [10, 1.25, 0.2], [15, 1.45, 1.2],
  ];
  for (const [s, at, dur] of melody) tone(note(s), t + at, dur, { type: 'square', volume: 0.1 });
  [3, 7, 10].forEach((s) => tone(note(s - 12), t + 1.45, 1.4, { type: 'triangle', volume: 0.1 }));
  for (let k = 0; k < 4; k++) kick(t + 1.45 + k * 0.3, 0.4);
}

/** Short pling when a player's answer comes in (host screen). */
export function playAnswerIn() {
  const a = audio();
  if (!a) return;
  tone(note(15), a.ctx.currentTime, 0.08, { type: 'sine', volume: 0.08 });
}

/** Player's phone: answered correctly. */
export function playCorrect() {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime;
  tone(note(7), t, 0.12, { type: 'square', volume: 0.1 });
  tone(note(14), t + 0.1, 0.3, { type: 'square', volume: 0.1 });
}

/** Player's phone: wrong or no answer. */
export function playWrong() {
  const a = audio();
  if (!a) return;
  tone(note(-10), a.ctx.currentTime, 0.45, { type: 'sawtooth', volume: 0.08, slideTo: note(-17) });
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage may be unavailable; muting still applies for this page.
  }
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.6, ctx.currentTime, 0.05);
}
