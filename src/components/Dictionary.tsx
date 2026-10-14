import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { LEVELS, LEVEL_NAMES, prettyTag, type CefrLevel } from "../lib/tags";
import type { CategoryData, Word } from "../lib/vocab";
import Category from "./Category";
import WordCard from "./WordCard";

const PAGE_SIZE = 40;

type SortKey = "category" | "level-asc" | "level-desc" | "az" | "za" | "tag";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "level-asc", label: "Level: A1 → B2" },
  { value: "level-desc", label: "Level: B2 → A1" },
  { value: "az", label: "Spanish: A → Z" },
  { value: "za", label: "Spanish: Z → A" },
  { value: "tag", label: "Tag" },
];

const LEVEL_ORDER: Record<CefrLevel, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };

// sortowanie alfabetyczne bez rodzajnika i znaków ¿ ¡
const sortKey = (w: Word) =>
  w.word.replace(/^(el|la|los|las)\s+/i, "").replace(/^[¿¡]/, "");

const selectClass =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-heading shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft";

function Dictionary({
  data,
  words,
  loading,
  error,
}: {
  data: CategoryData[];
  words: Word[];
  loading: boolean;
  error: string | null;
}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  // ?tag=travel - np. z mapy tagów
  const [tag, setTag] = useState(() => params.get("tag") ?? "all");
  const [levels, setLevels] = useState<CefrLevel[]>([]);
  const [sort, setSort] = useState<SortKey>("category");
  const [limit, setLimit] = useState({ key: "", count: PAGE_SIZE });

  // DEBOUNCING 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // wejście z linku #dictionary - przewiń po załadowaniu danych
  useEffect(() => {
    if (!loading && location.hash === "#dictionary") {
      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, location.hash]);

  // tagi do listy wyboru (alfabetycznie, z liczbą słów)
  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of words)
      for (const t of w.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [words]);

  const q = debouncedSearch.trim().toLowerCase();

  const filtered = words.filter((w) => {
    if (category !== "all" && w.category !== category) return false;
    if (tag !== "all" && !w.tags.includes(tag)) return false;
    if (levels.length > 0 && !levels.includes(w.level)) return false;
    if (!q) return true;
    return [w.word, w.translation_pl, w.translation_en, ...w.tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const sorted = [...filtered];
  const byWord = (a: Word, b: Word) =>
    sortKey(a).localeCompare(sortKey(b), "es");
  if (sort === "level-asc")
    sorted.sort(
      (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || byWord(a, b),
    );
  if (sort === "level-desc")
    sorted.sort(
      (a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level] || byWord(a, b),
    );
  if (sort === "az") sorted.sort(byWord);
  if (sort === "za") sorted.sort((a, b) => byWord(b, a));
  if (sort === "tag") {
    // przy aktywnym filtrze tagu sortujemy po pozostałych tagach słowa
    const firstTag = (w: Word) =>
      [...w.tags].filter((t) => t !== tag).sort()[0] ?? "";
    sorted.sort(
      (a, b) => firstTag(a).localeCompare(firstTag(b)) || byWord(a, b),
    );
  }

  // PAGINACJA
  const filterKey = [category, tag, levels.join(), sort, q].join("|");
  const visibleCount = limit.key === filterKey ? limit.count : PAGE_SIZE;
  const visible = sorted.slice(0, visibleCount);

  // przy sortowaniu po kategorii karty są pogrupowane jak dotąd
  const grouped: CategoryData[] = [];
  if (sort === "category") {
    for (const c of data) {
      const items = visible.filter((w) => w.category === c.category);
      if (items.length) grouped.push({ category: c.category, items });
    }
  }

  const toggleLevel = (lvl: CefrLevel) =>
    setLevels((ls) =>
      ls.includes(lvl) ? ls.filter((l) => l !== lvl) : [...ls, lvl],
    );

  const filtersActive =
    category !== "all" || tag !== "all" || levels.length > 0 || search !== "";
  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setTag("all");
    setLevels([]);
  };

  const levelCounts = LEVELS.map((l) => ({
    level: l,
    count: words.filter(
      (w) =>
        w.level === l &&
        (category === "all" || w.category === category) &&
        (tag === "all" || w.tags.includes(tag)),
    ).length,
  }));

  return (
    <section id="dictionary" ref={sectionRef} className="scroll-mt-24">
      <h2 className="mb-5 sm:mb-6">Dictionary</h2>

      {/* WYSZUKIWARKA */}
      <div className="relative mb-3">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search words, translations, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search the dictionary"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-base text-heading shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft sm:text-lg"
        />
      </div>

      {/* FILTRY */}
      <div className="grid gap-3 text-left sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">
            Category
          </span>
          <select
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {data.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">
            Tag
          </span>
          <select
            className={selectClass}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="all">All tags</option>
            {tagOptions.map(([t, n]) => (
              <option key={t} value={t}>
                #{t} ({n})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">
            Sort by
          </span>
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* POZIOMY CEFR */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide">
          Level
        </span>
        {levelCounts.map(({ level, count }) => {
          const on = levels.includes(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              aria-pressed={on}
              title={LEVEL_NAMES[level]}
              className={`level-${level} flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                on
                  ? "border-[var(--lvl)] bg-[color-mix(in_srgb,var(--lvl)_16%,transparent)] text-[var(--lvl)]"
                  : "border-line bg-surface text-body hover:border-[var(--lvl)]"
              }`}
            >
              {on && <span aria-hidden="true">✓</span>}
              {level}
              <span className="text-xs font-normal opacity-70">{count}</span>
            </button>
          );
        })}

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium text-accent-strong transition hover:bg-accent-soft"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      <p className="mb-2 mt-5">
        Showing{" "}
        <span className="font-semibold text-heading">{sorted.length}</span> of{" "}
        <span className="font-semibold text-heading">{words.length}</span> words
        {tag !== "all" && (
          <>
            {" "}
            tagged <b className="text-heading">#{prettyTag(tag)}</b>
          </>
        )}
      </p>

      {loading || error ? (
        <p className="py-10 text-center">
          {error ? `Could not load words: ${error}` : "Loading..."}
        </p>
      ) : sort === "category" ? (
        grouped.map((c) => (
          <Category
            key={c.category}
            data={c}
            onTagClick={setTag}
            activeTag={tag}
          />
        ))
      ) : (
        <div className="grid gap-4 py-5 sm:grid-cols-2">
          {visible.map((w) => (
            <WordCard
              key={w.id}
              item={w}
              category={w.category}
              onTagClick={setTag}
              activeTag={tag}
            />
          ))}
        </div>
      )}

      {visibleCount < sorted.length && (
        <button
          onClick={() =>
            setLimit({ key: filterKey, count: visibleCount + PAGE_SIZE })
          }
          className="mt-4 rounded-xl border border-line bg-surface px-6 py-3 font-semibold text-heading transition hover:-translate-y-0.5 hover:border-accent"
        >
          Show more ({sorted.length - visibleCount} left)
        </button>
      )}

      {!loading && sorted.length === 0 && (
        <div className="mt-10 text-center">
          <p>No words match these filters.</p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="mt-3 font-semibold text-accent-strong hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default Dictionary;
