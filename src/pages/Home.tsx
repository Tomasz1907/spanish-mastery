import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Category from "../components/Category";
import SearchBar from "../components/SearchBar";
import { useVocabulary, type CategoryData } from "../lib/vocab";

const PAGE_SIZE = 40;

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
    path: "/tag-sort",
    icon: "🏷️",
    name: "Tag Sort",
    description: "Find the word that fits the topic.",
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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");

  // "Show more" - zapamiętane dla konkretnego filtra
  const [limit, setLimit] = useState({ key: "", count: PAGE_SIZE });

  // DEBOUNCING 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const categories = data.map((category) => category.category);

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  const filteredData = data
    // filtr kategorii
    .filter(
      (category) =>
        selectedCategory === "all" || category.category === selectedCategory,
    )

    // filtr wyszukiwania
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const searchableText = [
          item.word,
          item.translation_pl,
          item.translation_en,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      }),
    }))

    // usuń puste kategorie
    .filter((category) => category.items.length > 0);

  const totalItems = words.length;

  const availableItems = filteredData.reduce(
    (sum, category) => sum + category.items.length,
    0,
  );

  // PAGINACJA - renderujemy tylko część z 1800 kart
  const filterKey = `${selectedCategory}|${normalizedSearch}`;
  const visibleCount = limit.key === filterKey ? limit.count : PAGE_SIZE;

  const visibleData: CategoryData[] = [];
  let remaining = visibleCount;

  for (const category of filteredData) {
    if (remaining <= 0) break;

    visibleData.push({
      ...category,
      items: category.items.slice(0, remaining),
    });
    remaining -= category.items.length;
  }

  const tagCount = new Set(words.flatMap((w) => w.tags)).size;
  const wordOfDay = words.length > 0 ? words[DAY_NUMBER % words.length] : null;

  return (
    <div className="flex flex-col gap-12">
      {/* HERO */}
      <section className="pt-8 sm:pt-12">
        <span className="inline-block rounded-full border border-accent-border bg-accent-soft px-4 py-1 text-sm font-medium text-accent-strong">
          ¡Hola! Learn Spanish through play
        </span>

        <h1 className="mt-6 mb-4">
          Master Spanish,{" "}
          <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
            one word at a time
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg">
          Browse the dictionary, then put your memory to the test in five quick
          games with Polish and English translations.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/quiz"
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-black shadow-card transition hover:brightness-110 active:scale-95"
          >
            Start a quiz
          </Link>
          <a
            href="#dictionary"
            className="rounded-xl border border-line bg-surface px-6 py-3 font-semibold text-heading transition hover:border-accent"
          >
            Browse words
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {[
            { label: "Words", value: totalItems },
            { label: "Categories", value: categories.length },
            { label: "Topics", value: tagCount },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="text-3xl font-bold text-heading tabular-nums">
                {loading ? "…" : s.value}
              </div>
              <div className="text-xs uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES */}
      <section>
        <h2 className="mb-6">Choose a game</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.path}
              to={game.path}
              className="group rounded-3xl border border-line bg-surface p-6 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-card"
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
            <div className="rounded-3xl border-2 border-dashed border-accent-border bg-accent-soft p-6 text-left">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-strong">
                Word of the day
              </p>
              <h3 className="mt-3 text-3xl">{wordOfDay.word}</h3>
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
      <section id="dictionary" className="scroll-mt-24">
        <h2 className="mb-6">Dictionary</h2>

        <SearchBar
          value={search}
          onChange={setSearch}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <p className="mb-2">
          Showing <span className="font-semibold">{availableItems}</span> of{" "}
          <span className="font-semibold">{totalItems}</span> items
        </p>

        {loading || error ? (
          <p className="text-center py-10">
            {error ? `Could not load words: ${error}` : "Loading..."}
          </p>
        ) : (
          visibleData.map((category) => (
            <Category key={category.category} data={category} />
          ))
        )}

        {visibleCount < availableItems && (
          <button
            onClick={() =>
              setLimit({ key: filterKey, count: visibleCount + PAGE_SIZE })
            }
            className="mt-4 rounded-xl border border-line bg-surface px-6 py-3 font-semibold text-heading transition hover:border-accent"
          >
            Show more ({availableItems - visibleCount} left)
          </button>
        )}

        {!loading && filteredData.length === 0 && (
          <p className="mt-10 text-center">No results</p>
        )}
      </section>
    </div>
  );
}

export default Home;
