import { useSyncExternalStore } from "react";

// Krótkie dźwięki generowane w przeglądarce (Web Audio API) - bez plików audio.

export type SoundName =
  | "click" // zwykłe kliknięcie / następne pytanie
  | "select" // zaznaczenie kafelka
  | "start" // start gry
  | "correct" // dobra odpowiedź
  | "almost" // dobrze, ale bez akcentu
  | "wrong" // zła odpowiedź
  | "match" // para w Match Chaos (wysokość rośnie z combo)
  | "combo" // seria / wyczyszczona plansza
  | "tick" // ostatnie sekundy zegara
  | "key" // naciśnięcie klawisza w Type Race
  | "typo" // literówka
  | "finish" // koniec gry
  | "record" // nowy rekord
  | "streak"; // seria dni przedłużona

type Settings = { volume: number; muted: boolean };

const STORAGE_KEY = "sound";
const DEFAULTS: Settings = { volume: 0.6, muted: false };

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved.volume === "number") {
      return {
        volume: Math.min(1, Math.max(0, saved.volume)),
        muted: Boolean(saved.muted),
      };
    }
  } catch {
    // brak dostępu do localStorage - zostają ustawienia domyślne
  }
  return DEFAULTS;
}

let settings = loadSettings();
const listeners = new Set<() => void>();

function setSettings(next: Settings) {
  settings = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignorujemy - ustawienie działa do końca sesji
  }
  if (master) master.gain.value = effectiveVolume();
  listeners.forEach((l) => l());
}

export function setVolume(volume: number) {
  setSettings({ volume, muted: volume === 0 });
}

export function toggleMute() {
  // odciszenie przy zerowej głośności przywraca rozsądny poziom
  if (settings.muted && settings.volume === 0) {
    setSettings({ volume: DEFAULTS.volume, muted: false });
  } else {
    setSettings({ ...settings, muted: !settings.muted });
  }
}

export function useSoundSettings(): Settings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => settings,
  );
}

// ── AUDIO ──────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// głośność jest „perceptualna" - kwadrat brzmi naturalniej niż wartość liniowa
const effectiveVolume = () =>
  settings.muted ? 0 : settings.volume * settings.volume * 0.5;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;

  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = effectiveVolume();
    master.connect(ctx.destination);
  }
  // przeglądarki wstrzymują audio do pierwszej interakcji użytkownika
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type ToneOptions = {
  freq: number;
  at?: number; // opóźnienie w sekundach
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number; // płynna zmiana wysokości
};

function tone(ac: AudioContext, o: ToneOptions) {
  const start = ac.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.12;
  const peak = o.gain ?? 0.3;

  const osc = ac.createOscillator();
  const env = ac.createGain();

  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.slideTo)
    osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + dur);

  // krótki atak i wykładnicze wybrzmienie - bez trzasków
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(env).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// nuty (Hz)
const C5 = 523.25,
  E5 = 659.25,
  G5 = 783.99,
  A5 = 880,
  C6 = 1046.5,
  D6 = 1174.66,
  E6 = 1318.51,
  G6 = 1567.98;

const SOUNDS: Record<SoundName, (ac: AudioContext, level: number) => void> = {
  click: (ac) =>
    tone(ac, { freq: 900, dur: 0.05, type: "triangle", gain: 0.12 }),

  select: (ac) => tone(ac, { freq: 660, dur: 0.07, type: "sine", gain: 0.18 }),

  start: (ac) => {
    tone(ac, { freq: G5, dur: 0.1, type: "triangle", gain: 0.2 });
    tone(ac, { freq: C6, at: 0.08, dur: 0.18, type: "triangle", gain: 0.22 });
  },

  correct: (ac) => {
    tone(ac, { freq: C6, dur: 0.1, gain: 0.25 });
    tone(ac, { freq: E6, at: 0.07, dur: 0.18, gain: 0.25 });
  },

  almost: (ac) => {
    tone(ac, { freq: A5, dur: 0.1, gain: 0.22 });
    tone(ac, { freq: C6, at: 0.08, dur: 0.16, gain: 0.2 });
  },

  wrong: (ac) => {
    tone(ac, {
      freq: 220,
      dur: 0.22,
      type: "triangle",
      gain: 0.28,
      slideTo: 150,
    });
    tone(ac, {
      freq: 233,
      at: 0.02,
      dur: 0.2,
      type: "sine",
      gain: 0.12,
      slideTo: 160,
    });
  },

  // każda kolejna para w serii brzmi o pół tonu wyżej
  match: (ac, level) => {
    const f = C6 * Math.pow(2, Math.min(level, 12) / 12);
    tone(ac, { freq: f, dur: 0.12, gain: 0.25 });
    tone(ac, { freq: f * 1.5, at: 0.05, dur: 0.12, gain: 0.12 });
  },

  combo: (ac) => {
    [C5, E5, G5, C6].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.06, dur: 0.16, type: "triangle", gain: 0.22 }),
    );
  },

  tick: (ac) => tone(ac, { freq: 1400, dur: 0.04, type: "square", gain: 0.06 }),

  key: (ac) =>
    tone(ac, {
      freq: 1800 + Math.random() * 300,
      dur: 0.025,
      type: "triangle",
      gain: 0.05,
    }),

  typo: (ac) =>
    tone(ac, { freq: 180, dur: 0.08, type: "triangle", gain: 0.18 }),

  finish: (ac) => {
    [C5, E5, G5].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.1, dur: 0.18, type: "triangle", gain: 0.22 }),
    );
    tone(ac, { freq: C6, at: 0.3, dur: 0.5, type: "triangle", gain: 0.25 });
    tone(ac, { freq: E6, at: 0.3, dur: 0.5, gain: 0.1 });
  },

  record: (ac) => {
    [G5, C6, E6].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.09, dur: 0.14, type: "triangle", gain: 0.24 }),
    );
    tone(ac, { freq: G6, at: 0.27, dur: 0.6, type: "triangle", gain: 0.26 });
    // „błysk” na końcu
    [D6 * 2, E6 * 2, G6 * 2].forEach((freq, i) =>
      tone(ac, { freq, at: 0.4 + i * 0.05, dur: 0.12, gain: 0.06 }),
    );
  },

  streak: (ac) => {
    // ciepły akord C-E-G zagrany jak arpeggio
    [C5, E5, G5, C6, E6].forEach((freq, i) =>
      tone(ac, { freq, at: i * 0.05, dur: 0.7 - i * 0.05, gain: 0.12 }),
    );
  },
};

export function play(name: SoundName, level = 0) {
  if (settings.muted || settings.volume === 0) return;

  const ac = audio();
  if (!ac || !master) return;

  try {
    SOUNDS[name](ac, level);
  } catch (err) {
    console.error("Sound failed:", err);
  }
}
