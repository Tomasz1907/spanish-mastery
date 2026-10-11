import { useState, type InputHTMLAttributes, type ReactNode } from "react";

// słowa unoszące się w tle panelu z marką
const FLOATING_WORDS = [
  { text: "¡Hola!", className: "top-[5%] right-[7%] text-5xl", delay: "0s" },
  {
    text: "gracias",
    className: "top-[28%] right-[7%] text-3xl",
    delay: "1.5s",
  },
  { text: "amigo", className: "bottom-[27%] right-[8%] text-2xl", delay: "3s" },
];

const FEATURES = [
  { icon: "📚", text: "1,800 words with Polish & English translations" },
  { icon: "🎮", text: "5 games: quiz, typing test, matching & more" },
  { icon: "🏆", text: "Beat your personal records every day" },
];

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-4xl border border-line bg-surface shadow-card animate-pop lg:grid-cols-[1.05fr_1fr]">
        {/* PANEL Z MARKĄ (desktop) */}
        <aside className="relative hidden overflow-hidden bg-linear-to-br from-amber-400 via-orange-500 to-red-600 p-10 text-left text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none"
          >
            {FLOATING_WORDS.map((w) => (
              <span
                key={w.text}
                style={{ animationDelay: w.delay }}
                className={`absolute font-bold text-white/15 animate-float ${w.className}`}
              >
                {w.text}
              </span>
            ))}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-red-900/20 blur-3xl" />
          </div>

          <div className="relative flex items-center gap-2 text-lg font-bold">
            <span className="text-2xl">🇪🇸</span>
            Spanish Mastery
          </div>

          <div className="relative">
            <h2 className="mb-4 text-5xl leading-tight text-white">
              Aprende español
              <br />
              jugando.
            </h2>
            <p className="max-w-sm text-white/85">
              Learn Spanish through play — short, fun sessions that actually
              stick.
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
                    {f.icon}
                  </span>
                  <span className="text-sm font-medium">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
              Word of the moment
            </p>
            <p className="mt-1 text-2xl font-bold">viajar</p>
            <p className="text-sm text-white/85">
              🇵🇱 podróżować · 🇬🇧 to travel
            </p>
          </figure>
        </aside>

        {/* FORMULARZ */}
        <div className="flex flex-col justify-center p-6 text-left sm:p-12">
          <div className="mb-8 flex items-center gap-2 text-lg font-bold text-heading lg:hidden">
            <span className="text-2xl">🇪🇸</span>
            Spanish Mastery
          </div>

          <h1 className="mb-2 text-3xl sm:text-4xl">{title}</h1>
          <p className="mb-8">{subtitle}</p>

          {children}

          <p className="mt-8 text-center text-sm">{footer}</p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-heading outline-none transition placeholder:text-body/60 focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function TextField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-heading">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export function PasswordField({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-heading">{label}</span>
      <span className="relative">
        <input
          type={visible ? "text" : "password"}
          className={`${inputClass} pr-12`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-body transition hover:text-heading"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </span>
    </label>
  );
}

export function Alert({
  type,
  children,
}: {
  type: "error" | "success";
  children: ReactNode;
}) {
  const style =
    type === "error"
      ? "border-bad bg-bad-soft text-bad"
      : "border-good bg-good-soft text-good";

  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm font-medium animate-pop ${style}`}
    >
      {children}
    </p>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function GoogleButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-6 py-3 font-semibold text-heading transition hover:border-accent hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
    >
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
