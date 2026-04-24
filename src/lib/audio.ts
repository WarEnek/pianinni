import {SplendidGrandPiano} from 'smplr';

let audioCtx: AudioContext | null = null;
let muted = localStorage.getItem('pianinni_muted') === 'true';

let bgm: HTMLAudioElement | null = null;
let bgmFadeTimer: ReturnType<typeof setInterval> | null = null;

// SplendidGrandPiano instance — loaded once, reused for all notes
let piano: SplendidGrandPiano | null = null;
let pianoLoading = false;

export function startBgm(): void {
  if (muted) return;
  if (bgm) {
    if (bgm.paused) fadeBgmIn();
    return;
  }
  bgm = new Audio('/audio/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0;
  bgm
    .play()
    .then(() => fadeBgmIn())
    .catch(() => {});
}

export function stopBgm(): void {
  if (!bgm || bgm.paused) return;
  fadeBgmOut(() => {
    bgm?.pause();
  });
}

function fadeBgmIn(): void {
  if (!bgm) return;
  clearBgmFade();
  const target = 0.35;
  bgmFadeTimer = setInterval(() => {
    if (!bgm) return;
    bgm.volume = Math.min(bgm.volume + 0.02, target);
    if (bgm.volume >= target) clearBgmFade();
  }, 30);
}

function fadeBgmOut(onDone?: () => void): void {
  if (!bgm) return;
  clearBgmFade();
  bgmFadeTimer = setInterval(() => {
    if (!bgm) return;
    bgm.volume = Math.max(bgm.volume - 0.02, 0);
    if (bgm.volume <= 0) {
      clearBgmFade();
      onDone?.();
    }
  }, 30);
}

function clearBgmFade(): void {
  if (bgmFadeTimer !== null) {
    clearInterval(bgmFadeTimer);
    bgmFadeTimer = null;
  }
}

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(val: boolean): void {
  muted = val;
  localStorage.setItem('pianinni_muted', String(val));
  if (bgm) {
    if (muted) {
      fadeBgmOut(() => {
        bgm?.pause();
      });
    } else if (bgm.paused) {
      bgm
        .play()
        .then(() => fadeBgmIn())
        .catch(() => {});
    }
  }
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

/**
 * Eagerly load the Splendid Grand Piano samples (Steinway, 4 velocity layers).
 * Call this as soon as the user enters the game screen — samples load in the
 * background while they read the UI.
 */
export function warmUpPiano(): void {
  if (piano || pianoLoading) return;
  pianoLoading = true;

  const ctx = getContext();
  piano = new SplendidGrandPiano(ctx, {
    // Steinway samples from SplendidGrandPiano project (hosted on CDN)
    detune: 0,
    volume: 90,
    decayTime: 2.0,
  });

  piano.load.catch(() => {
    // If CDN fails, clear so synthesis fallback is used
    piano = null;
    pianoLoading = false;
  });
}

// ---- Synthesis fallback (plays while soundfont is still loading) ----

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const PIANO_PARTIALS: [number, number, number][] = [
  [1, 0.7, 2.0],
  [2, 0.18, 1.4],
  [3, 0.09, 0.9],
  [4, 0.04, 0.6],
];

function playNoteSynthesis(midi: number): void {
  const ctx = getContext();
  const freq = midiToFrequency(midi);
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.4, now);
  masterGain.connect(ctx.destination);

  // Hammer click
  const noiseBuffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * 0.04),
    ctx.sampleRate,
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(freq * 6, now);
  noiseFilter.Q.setValueAtTime(0.8, now);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start(now);
  noiseSource.stop(now + 0.05);

  for (const [mult, relGain, decayTime] of PIANO_PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const inharmonicFreq =
      mult === 1 ? freq : freq * mult * (1 + 0.0003 * mult * mult);
    osc.frequency.setValueAtTime(inharmonicFreq, now);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(relGain, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(relGain * 0.55, now + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + decayTime + 0.05);
  }
}

// ---- Public note player ----

export function playNote(midi: number): void {
  if (muted) return;

  // Kick off sample loading on first call if not started yet
  if (!piano && !pianoLoading) warmUpPiano();

  if (piano) {
    // Real Steinway sample — velocity 80 gives a natural, mid-weight touch
    piano.start({note: midi, velocity: 80});
  } else {
    playNoteSynthesis(midi);
  }
}
