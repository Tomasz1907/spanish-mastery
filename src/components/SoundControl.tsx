import { useEffect, useRef, useState } from "react";

import { play, setVolume, toggleMute, useSoundSettings } from "../lib/sound";

function SpeakerIcon({ level }: { level: 0 | 1 | 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
      {level === 0 && (
        <>
          <path d="m23 9-6 6" />
          <path d="m17 9 6 6" />
        </>
      )}
      {level >= 1 && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
      {level === 2 && <path d="M19 5a10 10 0 0 1 0 14" />}
    </svg>
  );
}

// Zawartość ustawień dźwięku - w okienku na komputerze i w menu na telefonie
export function SoundSettings() {
  const { volume, muted } = useSoundSettings();

  const silent = muted || volume === 0;
  const percent = Math.round(volume * 100);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-heading">
          Sound effects
        </span>
        <button
          onClick={() => {
            const wasSilent = silent;
            toggleMute();
            if (wasSilent) play("correct");
          }}
          role="switch"
          aria-checked={!silent}
          aria-label="Sound effects on"
          className={`relative h-6 w-11 rounded-full transition ${
            silent ? "bg-surface-2 ring-1 ring-line" : "bg-accent"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              silent ? "left-0.5" : "left-[22px]"
            }`}
          />
        </button>
      </div>

      <label className="flex items-center gap-3">
        <span className="text-body">
          <SpeakerIcon level={1} />
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={silent ? 0 : percent}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          // podgląd głośności po puszczeniu suwaka
          onPointerUp={() => play("correct")}
          onKeyUp={() => play("click")}
          aria-label="Volume"
          className="h-2 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <span className="w-9 text-right text-xs tabular-nums">
          {silent ? 0 : percent}%
        </span>
      </label>

      <p className="mt-3 text-xs">
        Short sounds for answers, combos and records. Saved on this device.
      </p>
    </div>
  );
}

// Przycisk głośnika w nawigacji z panelem: suwak głośności + wyciszenie
export default function SoundControl() {
  const { volume, muted } = useSoundSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const silent = muted || volume === 0;
  const level: 0 | 1 | 2 = silent ? 0 : volume < 0.5 ? 1 : 2;

  // zamknij po kliknięciu poza panelem albo Escape
  useEffect(() => {
    if (!open) return;

    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={
          silent ? "Sound off – open sound settings" : "Sound settings"
        }
        aria-expanded={open}
        title="Sound"
        className={`grid h-9 w-9 place-items-center rounded-full border transition hover:border-accent active:scale-95 ${
          silent
            ? "border-line bg-surface text-body"
            : "border-line bg-surface text-heading"
        }`}
      >
        <SpeakerIcon level={level} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Sound settings"
          className="absolute right-0 top-full z-20 mt-2 w-[320px] rounded-2xl border border-line bg-surface p-4 text-left shadow-card animate-pop"
        >
          <SoundSettings />
        </div>
      )}
    </div>
  );
}
