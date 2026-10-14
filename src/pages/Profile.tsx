import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import { Panel, ProgressBar } from "../components/GameUI";
import { useAuth } from "../context/AuthContext";
import {
  activeStreak,
  dayKey,
  formatMode,
  GAMES,
  lastDays,
  levelInfo,
  timeAgo,
  useRecentResults,
  useUserProfile,
  useWordProgress,
  wordStatus,
  type GameId,
  type GameResult,
  type UserProfile,
  type WordProgress,
} from "../lib/progress";
import SpeakButton from "../components/SpeakButton";
import {
  splitArticle,
  useVocabulary,
  withArticle,
  type Word,
} from "../lib/vocab";

const ACTIVITY_DAYS = 30;

function Profile() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();
  const { results, error } = useRecentResults(200);
  const progress = useWordProgress();
  const { categories, words } = useVocabulary();

  if (!user) return null;

  const stats = profile?.stats;
  const xp = stats?.xp ?? 0;
  const level = levelInfo(xp);
  const name = user.displayName || user.email || "Learner";

  const mastered = words.filter(
    (w) => wordStatus(progress[w.id]) === "mastered",
  ).length;

  const accuracy =
    stats && stats.answered > 0
      ? Math.round((stats.correct / stats.answered) * 100)
      : null;

  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* NAGŁÓWEK */}
      <Panel className="flex flex-col items-center gap-6 sm:flex-row">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-24 w-24 rounded-full border-4 border-accent"
          />
        ) : (
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-linear-to-br from-amber-400 to-red-500 text-4xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl">{name}</h1>
          <p className="mt-1 text-sm">
            {user.email}
            {memberSince && <> · Member since {memberSince}</>}
          </p>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-heading">
                Level {level.level}
              </span>
              <span className="tabular-nums">
                {xp - level.start} / {level.next - level.start} XP
              </span>
            </div>
            <ProgressBar value={level.progress} />
          </div>
        </div>
      </Panel>

      {/* KAFELKI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          icon="🎮"
          label="Games played"
          value={loading ? "…" : (stats?.games ?? 0)}
        />
        <Tile
          icon="🎯"
          label="Accuracy"
          value={accuracy === null ? "—" : `${accuracy}%`}
          hint={stats ? `${stats.correct} / ${stats.answered} answers` : ""}
        />
        <Tile
          icon="🔥"
          label="Day streak"
          value={activeStreak(stats)}
          hint={stats ? `Longest: ${stats.longestStreak}` : ""}
        />
        <Tile
          icon="📚"
          label="Words mastered"
          value={mastered}
          hint={`of ${words.length}`}
        />
      </div>

      {!loading && !stats && <EmptyState />}

      {error && (
        <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          Couldn't load your results: {error}
        </p>
      )}

      {stats && (
        <>
          <ActivityChart results={results} />

          <div className="grid gap-6 lg:grid-cols-2">
            <GameBreakdown profile={profile} />
            <RecentGames results={results.slice(0, 8)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryMastery
              categories={categories.map((c) => ({
                name: c.category,
                ids: c.items.map((i) => i.id),
              }))}
              progress={progress}
            />
            <WordsToReview words={words} progress={progress} />
          </div>
        </>
      )}
    </div>
  );
}

// KAFELEK

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-3xl font-bold text-heading tabular-nums">
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide">
        {label}
      </div>
      {hint && <div className="mt-1 text-xs opacity-80">{hint}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-xl">{children}</h2>;
}

function EmptyState() {
  return (
    <Panel className="text-center">
      <div className="text-5xl">🌱</div>
      <h2 className="mt-3 text-2xl">No games yet</h2>
      <p className="mt-2">
        Play any game and your results, records and word progress will show up
        here.
      </p>
      <Link
        to="/quiz"
        className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-black shadow-card transition hover:brightness-110"
      >
        Play your first quiz
      </Link>
    </Panel>
  );
}

// AKTYWNOŚĆ - gry dziennie, ostatnie 30 dni

function ActivityChart({ results }: { results: GameResult[] }) {
  const days = lastDays(ACTIVITY_DAYS);

  const perDay: Record<string, { games: number; xp: number }> = {};
  for (const r of results) {
    if (!r.createdAt) continue;
    const key = dayKey(r.createdAt);
    perDay[key] ??= { games: 0, xp: 0 };
    perDay[key].games += 1;
    perDay[key].xp += r.xp;
  }

  const data = days.map((d) => ({
    ...d,
    ...(perDay[d.key] ?? { games: 0, xp: 0 }),
  }));
  const max = Math.max(1, ...data.map((d) => d.games));
  const total = data.reduce((s, d) => s + d.games, 0);
  const activeDays = data.filter((d) => d.games > 0).length;

  const label = (date: Date) =>
    date.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <Panel>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl">Games per day</h2>
          <p className="text-sm">
            Last {ACTIVITY_DAYS} days · {total} games on {activeDays} days
          </p>
        </div>
      </div>

      <div className="relative">
        {/* linia maksimum */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line">
          <span className="absolute -top-2.5 right-0 bg-surface pl-1 text-xs tabular-nums">
            {max}
          </span>
        </div>

        <div
          className="flex h-40 items-end gap-[2px] border-b border-line pr-6"
          role="img"
          aria-label={`Bar chart of games played per day over the last ${ACTIVITY_DAYS} days`}
        >
          {data.map((d) => (
            <div
              key={d.key}
              tabIndex={0}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <div
                className="w-full rounded-t-[4px] bg-chart-learning transition group-hover:brightness-110"
                style={{ height: d.games ? `${(d.games / max) * 100}%` : 0 }}
              />

              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card group-hover:block group-focus:block">
                <div className="font-semibold text-heading">
                  {label(d.date)}
                </div>
                <div>
                  {d.games} {d.games === 1 ? "game" : "games"} · {d.xp} XP
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex justify-between pr-6 text-xs">
          <span>{label(data[0].date)}</span>
          <span>{label(data[Math.floor(data.length / 2)].date)}</span>
          <span>Today</span>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-heading">
          Show as table
        </summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="border-b border-line">
                <th className="py-1 font-semibold">Day</th>
                <th className="py-1 font-semibold">Games</th>
                <th className="py-1 font-semibold">XP</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.key} className="border-b border-line/50">
                  <td className="py-1">{label(d.date)}</td>
                  <td className="py-1">{d.games}</td>
                  <td className="py-1">{d.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Panel>
  );
}

// GRY - rozegrane, skuteczność, rekord

function GameBreakdown({ profile }: { profile: UserProfile | null }) {
  // Tag Sort został zastąpiony mapą tagów - jego wyniki zostają tylko w historii
  const ids = (Object.keys(GAMES) as GameId[]).filter(
    (id) => id !== "tag-sort",
  );

  return (
    <Panel>
      <SectionTitle>Games</SectionTitle>

      <ul className="flex flex-col gap-3">
        {ids.map((id) => {
          const game = GAMES[id];
          const counter = profile?.perGame?.[id];

          // najlepszy wynik spośród wszystkich trybów tej gry
          const best = Object.entries(profile?.best ?? {})
            .filter(([key]) => key.startsWith(`${id}:`))
            .sort((a, b) => b[1] - a[1])[0];

          const acc =
            counter && counter.answered > 0 && id !== "type-race"
              ? Math.round((counter.correct / counter.answered) * 100)
              : null;

          return (
            <li key={id}>
              <Link
                to={game.path}
                className="flex items-center gap-4 rounded-2xl bg-surface-2 p-3 transition hover:ring-2 hover:ring-accent"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-2xl">
                  {game.icon}
                </span>

                <span className="flex-1">
                  <span className="block font-semibold text-heading">
                    {game.name}
                  </span>
                  <span className="block text-xs">
                    {counter?.games ?? 0} played
                    {acc !== null && <> · {acc}% correct</>}
                  </span>
                </span>

                {id === "learn" ? (
                  // Learn nie ma rekordów - pokazujemy liczbę wyuczonych słów
                  <span className="text-right">
                    <span className="block font-bold text-heading tabular-nums">
                      {counter?.correct ?? 0}
                    </span>
                    <span className="block text-xs">words learned</span>
                  </span>
                ) : (
                  <span className="text-right">
                    <span className="block font-bold text-heading tabular-nums">
                      {best ? `${best[1]}${game.bestUnit}` : "—"}
                    </span>
                    <span className="block text-xs">
                      {best
                        ? `🏆 ${formatMode(id, best[0].slice(id.length + 1))}`
                        : "no record"}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// OSTATNIE GRY

function RecentGames({ results }: { results: GameResult[] }) {
  const scoreOf = (r: GameResult) => {
    if (r.game === "type-race") return `${r.wpm ?? 0} WPM`;
    if (r.game === "match-chaos") return `${r.correct} pairs`;
    return `${r.correct}/${r.total}`;
  };

  return (
    <Panel>
      <SectionTitle>Recent games</SectionTitle>

      {results.length === 0 ? (
        <p className="text-sm">No games yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl">{GAMES[r.game]?.icon ?? "🎮"}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-heading">
                  {GAMES[r.game]?.name ?? r.game}
                  {r.record && " 🏆"}
                </span>
                <span className="block text-xs">
                  {formatMode(r.game, r.mode)} · {timeAgo(r.createdAt)}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-bold text-heading tabular-nums">
                  {scoreOf(r)}
                </span>
                <span className="block text-xs text-accent-strong">
                  +{r.xp} XP
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// OPANOWANIE KATEGORII - poziomy pasek skumulowany

function CategoryMastery({
  categories,
  progress,
}: {
  categories: { name: string; ids: string[] }[];
  progress: WordProgress;
}) {
  const rows = categories
    .map((c) => {
      let m = 0;
      let l = 0;
      for (const id of c.ids) {
        const s = wordStatus(progress[id]);
        if (s === "mastered") m++;
        else if (s === "learning") l++;
      }
      return { ...c, mastered: m, learning: l, total: c.ids.length };
    })
    // najpierw kategorie z postępem
    .sort(
      (a, b) =>
        b.mastered + b.learning - (a.mastered + a.learning) ||
        a.name.localeCompare(b.name),
    );

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">Categories</h2>

        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-mastered" />
            Mastered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-learning" />
            Learning
          </span>
        </div>
      </div>

      <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
        {rows.map((r) => (
          <li
            key={r.name}
            title={`${r.mastered} mastered · ${r.learning} learning · ${r.total - r.mastered - r.learning} new`}
          >
            <div className="mb-1 flex justify-between gap-2 text-sm">
              <span className="truncate text-heading">{r.name}</span>
              <span className="shrink-0 tabular-nums">
                {r.mastered}
                {r.learning > 0 && (
                  <span className="opacity-70"> +{r.learning}</span>
                )}{" "}
                / {r.total}
              </span>
            </div>

            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-surface-2">
              {r.mastered > 0 && (
                <div
                  className="bg-chart-mastered"
                  style={{ width: `${(r.mastered / r.total) * 100}%` }}
                />
              )}
              {r.learning > 0 && (
                <div
                  className="bg-chart-learning"
                  style={{ width: `${(r.learning / r.total) * 100}%` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// SŁOWA DO POWTÓRKI - najczęściej mylone

function WordsToReview({
  words,
  progress,
}: {
  words: Word[];
  progress: WordProgress;
}) {
  const hardest = words
    .map((w) => ({
      word: w,
      c: progress[w.id]?.c ?? 0,
      w: progress[w.id]?.w ?? 0,
    }))
    .filter((x) => x.w > 0 && x.w >= x.c)
    .sort((a, b) => b.w - b.c - (a.w - a.c) || b.w - a.w)
    .slice(0, 8);

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">Words to review</h2>
        {hardest.length > 0 && (
          <Link
            to={`/learn?words=${hardest.map((h) => h.word.id).join(",")}`}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-black shadow-card transition hover:-translate-y-0.5 hover:brightness-110"
          >
            📖 Review all ({hardest.length})
          </Link>
        )}
      </div>

      {hardest.length === 0 ? (
        <p className="text-sm">
          Nothing here yet — words you get wrong more often than right will
          appear in this list.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {hardest.map(({ word, c, w }, i) => (
            <li
              key={word.id}
              style={{ "--i": i } as CSSProperties}
              className="flex items-center gap-2 rounded-xl bg-surface-2 py-2 pl-3 pr-2 animate-rise sm:gap-3 sm:pl-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-heading">
                  {splitArticle(word).article && (
                    <span className="font-normal opacity-60">
                      {splitArticle(word).article}{" "}
                    </span>
                  )}
                  {splitArticle(word).base}
                </span>
                <span className="block text-xs">
                  🇵🇱 {word.translation_pl} · 🇬🇧 {word.translation_en}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                <span className="text-good">✓ {c}</span>{" "}
                <span className="text-bad">✗ {w}</span>
              </span>
              <SpeakButton text={withArticle(word)} size="sm" />
              <Link
                to={`/learn?words=${word.id}`}
                aria-label={`Learn ${withArticle(word)}`}
                title="Learn this word"
                className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-heading transition hover:border-accent hover:bg-accent-soft"
              >
                Learn
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default Profile;
