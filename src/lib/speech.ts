import { useSyncExternalStore } from "react";

// Czytanie na głos przez Web Speech API (Chrome, Edge, Safari, Firefox).
// Wybieramy najbardziej naturalny głos dostępny w danej przeglądarce/systemie.

export type SpeechLang = "es" | "pl" | "en";

// preferowane warianty języka - kolejność ma znaczenie (hiszpański z Hiszpanii)
const LOCALES: Record<SpeechLang, string[]> = {
  es: ["es-ES", "es-MX", "es-US", "es"],
  pl: ["pl-PL", "pl"],
  en: ["en-GB", "en-US", "en"],
};

// spokojniejsze tempo dla języka, którego się uczymy
const RATE: Record<SpeechLang, number> = { es: 0.9, pl: 1, en: 0.95 };

export const speechSupported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

if (speechSupported) {
  loadVoices();
  // Chrome ładuje głosy asynchronicznie
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function voiceScore(voice: SpeechSynthesisVoice, lang: SpeechLang): number {
  const locales = LOCALES[lang];
  const vLang = voice.lang.replace("_", "-");
  const localeIndex = locales.findIndex(
    (l) => vLang.toLowerCase() === l.toLowerCase(),
  );
  const prefixMatch = vLang.toLowerCase().startsWith(lang);

  if (localeIndex === -1 && !prefixMatch) return -Infinity;

  let score = localeIndex === -1 ? 10 : 40 - localeIndex * 5;
  const name = voice.name.toLowerCase();

  // głosy neuronowe / sieciowe brzmią najbardziej naturalnie
  if (/natural|neural|online/.test(name)) score += 60; // Edge
  if (/premium|enhanced|siri/.test(name)) score += 55; // Safari / macOS / iOS
  if (name.includes("google")) score += 45; // Chrome
  if (!voice.localService) score += 10;
  // syntezatory „robotyczne” na końcu kolejki
  if (/espeak|festival|pico/.test(name)) score -= 50;

  return score;
}

export function bestVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  for (const v of voices) {
    const s = voiceScore(v, lang);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

// ── STAN „CO TERAZ CZYTAMY” (do animacji przycisku) ─────────────────────

let speakingId: string | null = null;
const listeners = new Set<() => void>();

function setSpeaking(id: string | null) {
  speakingId = id;
  listeners.forEach((l) => l());
}

export function useSpeakingId(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => speakingId,
  );
}

export function stopSpeaking() {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  setSpeaking(null);
}

// myślniki dialogowe i nawiasy z notatkami czytają się źle - usuwamy je
function cleanForSpeech(text: string): string {
  return text
    .replace(/\([^)]*\)/g, "")
    .replace(/[—–]/g, " ")
    .replace(/\s*\/\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, lang: SpeechLang, id = `${lang}:${text}`) {
  if (!speechSupported || !text) return;

  const synth = window.speechSynthesis;

  // drugie kliknięcie w ten sam tekst zatrzymuje czytanie
  if (speakingId === id) {
    stopSpeaking();
    return;
  }

  synth.cancel();
  if (voices.length === 0) loadVoices();

  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
  const voice = bestVoice(lang);

  utterance.lang = voice?.lang ?? LOCALES[lang][0];
  if (voice) utterance.voice = voice;
  utterance.rate = RATE[lang];

  utterance.onstart = () => setSpeaking(id);
  utterance.onend = () => {
    if (speakingId === id) setSpeaking(null);
  };
  utterance.onerror = () => {
    if (speakingId === id) setSpeaking(null);
  };

  // podświetlenie dopiero w onstart - bez dostępnego głosu przycisk nie „zawiśnie”
  synth.speak(utterance);
}
