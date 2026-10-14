import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import Dictionary from "../components/Dictionary";
import SpeakButton from "../components/SpeakButton";
import StreakBanner from "../components/StreakBanner";
import { useVocabulary } from "../lib/vocab";

// zmienia się raz dziennie
const DAY_NUMBER = Math.floor(Date.now() / 86_400_000);

const games = [
  {
    path: "/quiz",
    icon: "🎯",
    name: "Quiz",
    description: "Four options, one correct translation.",
  },
  {
    path: "/test",
    icon: "✍️",
    name: "Test",
    description: "Type translations from memory.",
  },
  {
    path: "/match-chaos",
    icon: "⚡",
    name: "Match Chaos",
    description: "Match pairs against the clock.",
  },
  {
    path: "/tags",
    icon: "🕸️",
    name: "Tag Map",
    description: "Explore how topics and words connect.",
  },
  {
    path: "/type-race",
    icon: "🏎️",
    name: "Type Race",
    description: "Type Spanish sentences at full speed.",
  },
];

function Home() {
  const { categories: data, words, loading, error } = useVocabulary();

  const categories = data.map((category) => category.category);
  const totalItems = words.length;

  const tagCount = new Set(words.flatMap((w) => w.tags)).size;
  const wordOfDay = words.length > 0 ? words[DAY_NUMBER % words.length] : null;

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* HERO */}
      <section className="pt-4 sm:pt-12">
        <span className="inline-block rounded-full border border-accent-border bg-accent-soft px-4 py-1 text-sm font-medium text-accent-strong animate-rise">
          ¡Hola! Learn Spanish through play
        </span>

        <h1
          className="mt-5 mb-4 animate-rise sm:mt-6"
          style={{ "--i": 1 } as CSSProperties}
        >
          Master Spanish,{" "}
          <span className="bg-linear-to-r from-amber-500 via-red-500 to-amber-500 bg-clip-text text-transparent animate-shimmer">
            one word at a time
          </span>
        </h1>

        <p
          className="mx-auto max-w-2xl text-base animate-rise sm:text-lg"
          style={{ "--i": 2 } as CSSProperties}
        >
          Learn new words step by step, then put your memory to the test in
          quick games and explore how words connect on the tag map.
        </p>

        <div
          className="mt-7 flex flex-wrap justify-center gap-3 animate-rise sm:mt-8"
          style={{ "--i": 3 } as CSSProperties}
        >
          <Link
            to="/learn"
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-black shadow-card transition hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
          >
            📖 Start learning
          </Link>
          <a
            href="#dictionary"
            className="rounded-xl border border-line bg-surface px-6 py-3 font-semibold text-heading transition hover:-translate-y-0.5 hover:border-accent"
          >
            Browse words
          </a>
        </div>

        <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:mt-10 sm:gap-3">
          {[
            { label: "Words", value: totalItems },
            { label: "Categories", value: categories.length },
            { label: "Topics", value: tagCount },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{ "--i": i + 4 } as CSSProperties}
              className="rounded-2xl border border-line bg-surface p-3 animate-rise sm:p-4"
            >
              <div className="text-2xl font-bold text-heading tabular-nums sm:text-3xl">
                {loading ? "…" : s.value}
              </div>
              <div className="text-xs uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <StreakBanner />

      {/* LEARN - główny tryb */}
      <Link
        to="/learn"
        className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-400 via-orange-500 to-red-600 p-6 text-left text-white shadow-card transition hover:-translate-y-1 sm:p-8"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-8 select-none text-[9rem] font-bold leading-none text-white/10 transition duration-500 group-hover:scale-110 group-hover:rotate-6"
        >
          ¡Aprende!
        </span>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm transition group-hover:scale-110">
            📖
          </span>
          <span className="flex-1">
            <span className="block text-2xl font-bold">Learn new words</span>
            <span className="mt-1 block text-white/90">
              Discover → recognize → recall → spell. Short lessons with
              pronunciation and example sentences.
            </span>
          </span>
          <span className="self-start rounded-xl bg-white px-5 py-2.5 font-semibold text-orange-600 transition group-hover:translate-x-1 sm:self-center">
            Start a lesson →
          </span>
        </div>
      </Link>

      {/* GAMES */}
      <section>
        <h2 className="mb-5 sm:mb-6">Practice with games</h2>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {games.map((game, i) => (
            <Link
              key={game.path}
              to={game.path}
              style={{ "--i": i } as CSSProperties}
              className="group rounded-3xl border border-line bg-surface p-5 text-left transition animate-rise hover:-translate-y-1 hover:border-accent hover:shadow-card sm:p-6"
            >
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl transition group-hover:scale-110">
                {game.icon}
              </div>
              <h3 className="text-xl">{game.name}</h3>
              <p className="mt-1">{game.description}</p>
              <p className="mt-4 text-sm font-semibold text-accent-strong">
                Play →
              </p>
            </Link>
          ))}

          {wordOfDay && (
            <div
              style={{ "--i": games.length } as CSSProperties}
              className="rounded-3xl border-2 border-dashed border-accent-border bg-accent-soft p-5 text-left animate-rise sm:p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-strong">
                Word of the day
              </p>
              <div className="mt-3 flex items-center gap-3">
                <h3 className="text-3xl">{wordOfDay.word}</h3>
                <SpeakButton text={wordOfDay.word} />
              </div>
              <p className="mt-1">
                🇵🇱 {wordOfDay.translation_pl} · 🇬🇧 {wordOfDay.translation_en}
              </p>
              {wordOfDay.example_es && (
                <p className="mt-3 text-sm italic">“{wordOfDay.example_es}”</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* DICTIONARY */}
      <Dictionary data={data} words={words} loading={loading} error={error} />
    </div>
  );
}

export default Home;
