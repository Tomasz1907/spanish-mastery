import { useEffect, useMemo, useState } from "react";

import type { CefrLevel } from "./tags";

type Conjugation = {
  yo: string;
  tú: string;
  él_ella: string;
  nosotros: string;
  vosotros: string;
  ellos: string;
};

export type WordItem = {
  id: string;
  word: string;
  translation_pl: string;
  translation_en: string;
  part_of_speech: string;
  level: CefrLevel;
  tags: string[];

  example_es?: string;
  example_pl?: string;
  example_en?: string;

  article?: string;
  gender?: string;
  plural?: string;

  gerund?: string;
  participle?: string;
  regular?: boolean;

  conjugation?: Conjugation;
};

export type CategoryData = {
  category: string;
  items: WordItem[];
};

// Słowo z dopisaną nazwą kategorii - wygodne w grach
export type Word = WordItem & { category: string };

export type Lang = "pl" | "en";

// LOAD DATA (jeden fetch na całą aplikację)
let cache: Promise<CategoryData[]> | null = null;

export function loadVocabulary(): Promise<CategoryData[]> {
  if (!cache) {
    cache = fetch("/data/data.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => (Array.isArray(json) ? json : [json]))
      .catch((err) => {
        cache = null;
        throw err;
      });
  }

  return cache;
}

export function useVocabulary() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVocabulary()
      .then(setCategories)
      .catch((err) => {
        console.error("Błąd ładowania JSON:", err);
        setError(String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  const words: Word[] = useMemo(
    () =>
      categories.flatMap((c) =>
        c.items.map((item) => ({ ...item, category: c.category })),
      ),
    [categories],
  );

  return { categories, words, loading, error };
}

// HELPERS

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

// n losowych błędnych odpowiedzi - najlepiej ta sama część mowy, bez duplikatów
export function pickDistractors(
  word: Word,
  pool: Word[],
  n: number,
  textOf: (w: Word) => string,
): string[] {
  const correct = normalize(textOf(word));
  const used = new Set([correct]);
  const result: string[] = [];

  const samePos = shuffle(
    pool.filter((w) => w.part_of_speech === word.part_of_speech),
  );
  const rest = shuffle(pool);

  for (const candidate of [...samePos, ...rest]) {
    if (result.length >= n) break;

    const text = textOf(candidate);
    const key = normalize(text);

    if (used.has(key)) continue;

    used.add(key);
    result.push(text);
  }

  return result;
}

export function translationOf(word: WordItem, lang: Lang): string {
  return lang === "pl" ? word.translation_pl : word.translation_en;
}

export function exampleOf(word: WordItem, lang: Lang): string | undefined {
  return lang === "pl" ? word.example_pl : word.example_en;
}

export function filterByCategory(words: Word[], category: string): Word[] {
  return category === "all"
    ? words
    : words.filter((w) => w.category === category);
}

// usuwa akcenty (á -> a, ñ -> n), interpunkcję i nadmiarowe spacje
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// długie myślniki (—, –, ‒, ―, −) są nie do wpisania z klawiatury - traktujemy je jak "-"
export function unifyDashes(text: string): string {
  return text.replace(/[\u2010-\u2015\u2212]/g, "-");
}

export function normalize(text: string, ignoreAccents = false): string {
  let result = unifyDashes(text).toLowerCase().trim();

  if (ignoreAccents) result = stripAccents(result);

  return result
    .replace(/[¿¡?!.,;:"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "mówić, rozmawiać" / "hi/hello" / "być (stan)" -> lista akceptowanych odpowiedzi
export function acceptedAnswers(text: string): string[] {
  const withoutNotes = text.replace(/\([^)]*\)/g, "");

  const parts = withoutNotes
    .split(/[/,]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const answers = new Set<string>([text, withoutNotes, ...parts]);

  // angielskie czasowniki: "to speak" == "speak"
  for (const p of parts) {
    if (p.startsWith("to ")) answers.add(p.slice(3));
  }

  return [...answers];
}

const ARTICLES = ["el", "la", "los", "las"];

// W danych większość rzeczowników ma rodzajnik w polu word ("la familia"),
// a kilka osobno w polu article ("pregunta" + "la") - ujednolicamy to tutaj.
export function splitArticle(word: WordItem): {
  article: string | null;
  base: string;
} {
  const [first, ...rest] = word.word.split(" ");

  if (
    word.part_of_speech === "noun" &&
    ARTICLES.includes(first) &&
    rest.length
  ) {
    return { article: first, base: rest.join(" ") };
  }

  return { article: word.article ?? null, base: word.word };
}

export function withArticle(word: WordItem): string {
  const { article, base } = splitArticle(word);
  return article ? `${article} ${base}` : base;
}

// odpowiedź po hiszpańsku jest poprawna z rodzajnikiem i bez
export function spanishAnswers(word: WordItem): string[] {
  const { article, base } = splitArticle(word);
  const answers = acceptedAnswers(base);

  if (article) answers.push(`${article} ${base}`);

  return answers;
}

export type CheckResult = "correct" | "accent" | "wrong";

// "accent" = poprawnie, ale bez akcentów / z błędnym akcentem
export function checkAnswer(input: string, accepted: string[]): CheckResult {
  const exact = accepted.map((a) => normalize(a));

  if (exact.includes(normalize(input))) return "correct";

  const loose = accepted.map((a) => normalize(a, true));

  if (loose.includes(normalize(input, true))) return "accent";

  return "wrong";
}

export function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// wywoływane w handlerach zdarzeń, nie podczas renderowania
export function timestamp(): number {
  return Date.now();
}
