import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

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
      className={`rounded-xl px-6 py-3 font-semibold transition active:scale-95 disabled:opacity-50 ${styles} ${className}`}
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
      className={`rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-card ${className}`}
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
    <header className="mb-8">
      <div className="text-5xl mb-3">{icon}</div>
      <h1 className="mb-3">{title}</h1>
      <p className="max-w-xl mx-auto">{description}</p>
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
    <div className="rounded-2xl bg-surface-2 px-4 py-3 min-w-24">
      <div className="text-2xl font-bold text-heading tabular-nums">
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
        onClick={onStart}
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
  mistakes = [],
  onRestart,
  onSetup,
}: {
  title: string;
  stats: { label: string; value: ReactNode }[];
  record?: boolean;
  mistakes?: Mistake[];
  onRestart: () => void;
  onSetup: () => void;
}) {
  return (
    <Panel className="max-w-2xl mx-auto animate-pop">
      <h2 className="text-3xl mb-2">{title}</h2>

      {record && (
        <p className="mb-4 font-semibold text-accent-strong">
          🏆 New personal best!
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3 my-6">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} />
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
                <span className="text-bad line-through">
                  {m.given || "—"}
                </span>
                <span className="text-good">{m.correct}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Button onClick={onRestart}>Play again</Button>
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
