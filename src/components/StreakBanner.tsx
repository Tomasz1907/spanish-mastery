import { Link } from "react-router-dom";

import { activeStreak, dayKey, useUserProfile } from "../lib/progress";

// Przypomnienie o serii dni na stronie głównej - zachęca do codziennej nauki
function StreakBanner() {
  const { profile, loading } = useUserProfile();

  if (loading) return null;

  const stats = profile?.stats;
  const streak = activeStreak(stats);
  const playedToday = stats?.lastDay === dayKey();

  let icon = "🌱";
  let title = "Start your streak today";
  let text = "Play one game a day to build a learning habit.";
  let cta: string | null = "Play now";

  if (playedToday) {
    icon = "🔥";
    title = `${streak}-day streak — you're on fire!`;
    text = "Today's practice is done. See you tomorrow!";
    cta = null;
  } else if (streak > 0) {
    icon = "⏳";
    title = `Your ${streak}-day streak is waiting`;
    text = "Play one game today to keep it alive.";
    cta = "Keep my streak";
  }

  return (
    <section
      className={`flex flex-col items-center gap-4 rounded-3xl border p-5 text-left sm:flex-row ${
        playedToday
          ? "border-accent-border bg-accent-soft"
          : "border-line bg-surface"
      }`}
    >
      <span
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-3xl ${
          playedToday ? "animate-float" : ""
        }`}
      >
        {icon}
      </span>

      <div className="flex-1 text-center sm:text-left">
        <p className="font-bold text-heading">{title}</p>
        <p className="text-sm">{text}</p>
      </div>

      {cta && (
        <Link
          to="/quiz"
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 font-semibold text-black shadow-card transition hover:brightness-110 active:scale-95"
        >
          {cta}
        </Link>
      )}

      {stats && (
        <span className="shrink-0 text-xs">
          Best: {stats.longestStreak}{" "}
          {stats.longestStreak === 1 ? "day" : "days"}
        </span>
      )}
    </section>
  );
}

export default StreakBanner;
