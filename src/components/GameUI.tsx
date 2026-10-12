import {
  useEffect,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";

import { play } from "../lib/sound";
import Confetti from "./Confetti";

// BUTTON

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-accent text-black hover:brightness-110 shadow-card"
      : "border border-line bg-surface text-heading hover:border-accent";

  return (
    <button
      className={`rounded-xl px-5 py-3 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:px-6 ${styles} ${className}`}
      {...props}
    />
  );
}

// LAYOUT

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="mb-2 inline-block text-4xl animate-float sm:mb-3 sm:text-5xl">
        {icon}
      </div>
      <h1 className="mb-2 sm:mb-3">{title}</h1>
      <p className="mx-auto max-w-xl px-2 text-sm sm:text-base">
        {description}
      </p>
    </header>
  );
}

export function Loading({ error }: { error?: string | null }) {
  return (
    <p className="py-20 text-center">
      {error ? `Could not load words: ${error}` : "Loading words..."}
    </p>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-20 rounded-2xl bg-surface-2 px-3 py-2 sm:min-w-24 sm:px-4 sm:py-3">
      <div className="text-xl font-bold text-heading tabular-nums sm:text-2xl">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
      <div
        className="h-full bg-accent transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

// SETUP

const selectClass =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-heading focus:outline-none focus:ring-4 focus:ring-accent-soft focus:border-accent";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-left">
      <span className="text-sm font-semibold uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Field label={label}>
      <select
        className={selectClass}
        value={String(value)}
        onChange={(e) => {
          const picked = options.find(
            (o) => String(o.value) === e.target.value,
          );
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SetupPanel({
  children,
  onStart,
  canStart = true,
  hint,
}: {
  children: ReactNode;
  onStart: () => void;
  canStart?: boolean;
  hint?: ReactNode;
}) {
  return (
    <Panel className="max-w-2xl mx-auto animate-pop">
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>

      {hint && <p className="mt-5 text-sm">{hint}</p>}

      <Button
        className="mt-8 w-full text-lg"
        onClick={() => {
          play("start");
          onStart();
        }}
        disabled={!canStart}
      >
        Start ▶
      </Button>
    </Panel>
  );
}

// RESULTS

export type Mistake = {
  prompt: string;
  given: string;
  correct: string;
};

export function ResultScreen({
  title,
  stats,
  record,
  celebrate = false,
  save,
  mistakes = [],
  onRestart,
  onSetup,
}: {
  title: string;
  stats: { label: string; value: ReactNode }[];
  record?: boolean;
  // konfetti także bez rekordu, np. przy bezbłędnym wyniku
  celebrate?: boolean;
  save?: {
    status: "idle" | "saving" | "saved" | "error";
    xp: number;
    streak?: number;
    newDay?: boolean;
  };
  mistakes?: Mistake[];
  onRestart: () => void;
  onSetup: () => void;
}) {
  const saved = save?.status === "saved";
  const streakUp = saved && save?.newDay && (save.streak ?? 0) > 0;

  // po zapisie: fanfara za rekord, ciepły akord za przedłużoną serię dni
  useEffect(() => {
    if (!saved) return;
    if (record) play("record");
    else if (streakUp) play("streak");
  }, [saved, record, streakUp]);

  return (
    <Panel className="max-w-2xl mx-auto animate-pop">
      {(record || celebrate) && <Confetti />}
      <h2 className="mb-2 text-2xl sm:text-3xl">{title}</h2>

      {record && (
        <p className="mb-4 font-semibold text-accent-strong">
          🏆 New personal best!
        </p>
      )}

      {save && save.status !== "idle" && (
        <p
          role="status"
          className={`mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
            save.status === "error"
              ? "bg-bad-soft text-bad"
              : "bg-surface-2 text-heading"
          }`}
        >
          {save.status === "saving" && "☁️ Saving to your profile..."}
          {save.status === "saved" && (
            <>
              ✅ Saved to your profile
              <span className="font-bold text-accent-strong">
                +{save.xp} XP
              </span>
            </>
          )}
          {save.status === "error" && "⚠️ Couldn't save this result"}
        </p>
      )}

      {streakUp && (
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-2xl border border-accent-border bg-accent-soft px-4 py-3 text-left animate-pop">
          <span className="text-3xl animate-float">🔥</span>
          <span>
            <span className="block font-bold text-heading">
              {save!.streak === 1
                ? "Streak started!"
                : `${save!.streak}-day streak!`}
            </span>
            <span className="block text-sm">
              Come back tomorrow to keep it going.
            </span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 my-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="animate-rise"
            style={{ "--i": i + 2 } as CSSProperties}
          >
            <Stat label={s.label} value={s.value} />
          </div>
        ))}
      </div>

      {mistakes.length > 0 && (
        <div className="text-left mt-6">
          <h3 className="text-lg mb-3">To review ({mistakes.length})</h3>

          <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {mistakes.map((m, i) => (
              <li
                key={i}
                className="rounded-xl bg-surface-2 px-4 py-2 flex flex-wrap gap-x-3"
              >
                <span className="font-semibold text-heading">{m.prompt}</span>
                <span className="text-bad line-through">{m.given || "—"}</span>
                <span className="text-good">{m.correct}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button
          onClick={() => {
            play("start");
            onRestart();
          }}
        >
          Play again
        </Button>
        <Button variant="ghost" onClick={onSetup}>
          Settings
        </Button>
        <Link
          to="/"
          className="rounded-xl px-6 py-3 font-semibold border border-line bg-surface text-heading hover:border-accent transition"
        >
          Home
        </Link>
      </div>
    </Panel>
  );
}
