import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db } from "./firebase";

// STRUKTURA DANYCH W FIRESTORE
//
// users/{uid}                  - profil: statystyki, rekordy, seria dni
// users/{uid}/results/{id}     - pojedyncza rozegrana gra
// users/{uid}/progress/words   - ile razy każde słowo było dobrze / źle
// leaderboards/{gra:tryb}/scores/{id}  - publiczny ranking (każda zaliczona gra osobno)

export type GameId = "quiz" | "test" | "match-chaos" | "tag-sort" | "type-race";

export const GAMES: Record<
  GameId,
  { name: string; icon: string; path: string; bestUnit: string }
> = {
  quiz: { name: "Quiz", icon: "🎯", path: "/quiz", bestUnit: "%" },
  test: { name: "Test", icon: "✍️", path: "/test", bestUnit: "%" },
  "match-chaos": {
    name: "Match Chaos",
    icon: "⚡",
    path: "/match-chaos",
    bestUnit: " pairs",
  },
  "tag-sort": {
    name: "Tag Sort",
    icon: "🏷️",
    path: "/tag-sort",
    bestUnit: "%",
  },
  "type-race": {
    name: "Type Race",
    icon: "🏎️",
    path: "/type-race",
    bestUnit: " WPM",
  },
};

export type GameResultInput = {
  game: GameId;
  // tryb gry, np. "pl:from-es" - razem z game tworzy klucz rekordu
  mode: string;
  correct: number;
  total: number;
  // wartość porównywana z rekordem (wyżej = lepiej); null = nie liczy się do rekordu
  bestValue: number | null;
  durationMs?: number;
  wpm?: number;
  words?: { id: string; ok: boolean }[];
  settings?: Record<string, string | number>;
};

export type GameResult = Omit<GameResultInput, "words"> & {
  id: string;
  xp: number;
  record?: boolean;
  createdAt: Date | null;
};

type Counter = { games: number; correct: number; answered: number };

export type UserProfile = {
  displayName?: string;
  email?: string;
  stats?: Counter & {
    xp: number;
    timeMs: number;
    currentStreak: number;
    longestStreak: number;
    lastDay: string;
  };
  perGame?: Partial<Record<GameId, Counter>>;
  best?: Record<string, number>;
};

// c = poprawne odpowiedzi, w = błędne
export type WordProgress = Record<string, { c?: number; w?: number }>;

// HELPERS

export const bestKey = (game: GameId, mode: string) => `${game}:${mode}`;

// data lokalna w formacie YYYY-MM-DD
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

export function xpFor(input: GameResultInput): number {
  const perfect = input.total >= 5 && input.correct === input.total ? 50 : 0;
  return input.correct * 10 + perfect + Math.round(input.wpm ?? 0);
}

// poziom n zaczyna się od 50 * (n-1)^2 XP
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const start = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, start, next, progress: (xp - start) / (next - start) };
}

// słowo opanowane = co najmniej 2 poprawne odpowiedzi więcej niż błędnych
export function wordStatus(p?: { c?: number; w?: number }) {
  if (!p) return "new";
  const c = p.c ?? 0;
  const w = p.w ?? 0;
  if (c - w >= 2) return "mastered";
  return "learning";
}

// SAVE

export async function recordGame(user: User, input: GameResultInput) {
  if (!db) throw new Error("Firestore is not configured.");

  const firestore = db;
  const userRef = doc(firestore, "users", user.uid);
  const resultRef = doc(collection(userRef, "results"));
  const progressRef = doc(userRef, "progress", "words");

  const xp = xpFor(input);
  const key = bestKey(input.game, input.mode);
  // wynik w rankingu ma to samo id co gra w historii użytkownika
  const scoreRef =
    input.bestValue !== null
      ? doc(firestore, "leaderboards", key, "scores", resultRef.id)
      : null;

  return runTransaction(firestore, async (tx) => {
    // w transakcji wszystkie odczyty muszą być przed zapisami
    const snap = await tx.get(userRef);
    const profile = (snap.data() ?? {}) as UserProfile;

    // SERIA DNI
    const today = dayKey();
    const last = profile.stats?.lastDay;
    const streak =
      last === today
        ? (profile.stats?.currentStreak ?? 1)
        : last === previousDayKey()
          ? (profile.stats?.currentStreak ?? 0) + 1
          : 1;
    const longest = Math.max(profile.stats?.longestStreak ?? 0, streak);

    // REKORD
    const previousBest = profile.best?.[key];
    const isRecord =
      input.bestValue !== null &&
      (previousBest === undefined || input.bestValue > previousBest);

    // RANKING - każda gra liczona do rankingu to osobny wynik
    if (scoreRef && input.bestValue !== null) {
      tx.set(scoreRef, {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        photoURL: user.photoURL ?? null,
        value: input.bestValue,
        createdAt: serverTimestamp(),
      });
    }

    tx.set(
      userRef,
      {
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        stats: {
          games: increment(1),
          correct: increment(input.correct),
          answered: increment(input.total),
          xp: increment(xp),
          timeMs: increment(input.durationMs ?? 0),
          currentStreak: streak,
          longestStreak: longest,
          lastDay: today,
        },
        perGame: {
          [input.game]: {
            games: increment(1),
            correct: increment(input.correct),
            answered: increment(input.total),
          },
        },
        ...(isRecord ? { best: { [key]: input.bestValue } } : {}),
      },
      { merge: true },
    );

    const { words, ...result } = input;

    tx.set(resultRef, {
      ...result,
      xp,
      record: isRecord,
      createdAt: serverTimestamp(),
    });

    if (words && words.length > 0) {
      // jedno słowo może wystąpić kilka razy w grze - sumujemy
      const counts: Record<string, { c: number; w: number }> = {};
      for (const { id, ok } of words) {
        counts[id] ??= { c: 0, w: 0 };
        counts[id][ok ? "c" : "w"] += 1;
      }

      const update: Record<string, Record<string, unknown>> = {};
      for (const [id, { c, w }] of Object.entries(counts)) {
        update[id] = {};
        if (c) update[id].c = increment(c);
        if (w) update[id].w = increment(w);
      }

      tx.set(progressRef, { words: update }, { merge: true });
    }

    // pierwsza gra dzisiaj = seria dni przedłużona (albo rozpoczęta)
    return { isRecord, xp, streak, newDay: last !== today };
  });
}

// RANKING

export type LeaderboardEntry = {
  id: string;
  uid: string;
  name: string;
  photoURL: string | null;
  value: number;
  createdAt: Date | null;
};

export const LEADERBOARD_SIZE = 10;

// HOOKS

type SaveStatus = "idle" | "saving" | "saved" | "error";

// używany w grach: zapisuje wynik i pamięta status zapisu
export function useGameRecorder() {
  const { user } = useAuth();

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [record, setRecord] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [newDay, setNewDay] = useState(false);

  const save = useCallback(
    async (input: GameResultInput) => {
      if (!user) return;

      setStatus("saving");
      setRecord(false);
      setNewDay(false);

      try {
        const result = await recordGame(user, input);
        setRecord(result.isRecord);
        setXp(result.xp);
        setStreak(result.streak);
        setNewDay(result.newDay);
        setStatus("saved");
      } catch (err) {
        console.error("Saving result failed:", err);
        setStatus("error");
      }
    },
    [user],
  );

  return { save, status, record, xp, streak, newDay };
}

export function useUserProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;

    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile((snap.data() as UserProfile) ?? null);
        setLoading(false);
      },
      (err) => {
        console.error("Loading profile failed:", err);
        setLoading(false);
      },
    );
  }, [user]);

  return { profile, loading };
}

export function useWordProgress() {
  const { user } = useAuth();

  const [words, setWords] = useState<WordProgress>({});

  useEffect(() => {
    if (!db || !user) return;

    return onSnapshot(
      doc(db, "users", user.uid, "progress", "words"),
      (snap) => setWords((snap.data()?.words as WordProgress) ?? {}),
      (err) => console.error("Loading word progress failed:", err),
    );
  }, [user]);

  return words;
}

export function useRecentResults(count = 200) {
  const { user } = useAuth();

  const [results, setResults] = useState<GameResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, "users", user.uid, "results"),
      orderBy("createdAt", "desc"),
      limit(count),
    );

    return onSnapshot(
      q,
      (snap) => {
        setResults(
          snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            const createdAt = data.createdAt as Timestamp | null;
            return {
              ...(data as Omit<GameResult, "id" | "createdAt">),
              id: d.id,
              createdAt: createdAt ? createdAt.toDate() : null,
            };
          }),
        );
        setError(null);
      },
      (err) => {
        console.error("Loading results failed:", err);
        setError(err.message);
      },
    );
  }, [user, count]);

  return { results, error };
}

// seria liczy się tylko, jeśli ostatnia gra była dziś albo wczoraj
export function activeStreak(stats: UserProfile["stats"]): number {
  if (!stats) return 0;
  return stats.lastDay === dayKey() || stats.lastDay === previousDayKey()
    ? stats.currentStreak
    : 0;
}

// ostatnie n dni (od najstarszego), jako klucze YYYY-MM-DD
export function lastDays(n: number): { key: string; date: Date }[] {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push({ key: dayKey(date), date });
  }
  return days;
}

export function formatMode(game: GameId, mode: string): string {
  const flag = (lang: string) => (lang === "pl" ? "🇵🇱" : "🇬🇧");
  const [a, b] = mode.split(":");

  switch (game) {
    case "quiz":
    case "test":
      return `${flag(a)} ${b === "from-es" ? "ES → " + a.toUpperCase() : a.toUpperCase() + " → ES"}`;
    case "match-chaos":
      return `${flag(a)} ${b}s`;
    case "tag-sort":
      return `${a} rounds`;
    case "type-race":
      return a === "strict" ? "Strict" : "Lenient";
  }
}

export function timeAgo(date: Date | null): string {
  if (!date) return "just now";

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// rodzaje błędów rankingu - komponent pokazuje dla nich przyjazne komunikaty
export type LeaderboardError = "preparing" | "offline" | "denied" | "unknown";

function leaderboardErrorKind(code: string): LeaderboardError {
  switch (code) {
    // brak indeksu / indeks wciąż się buduje
    case "failed-precondition":
      return "preparing";
    case "unavailable":
    case "deadline-exceeded":
      return "offline";
    case "permission-denied":
    case "unauthenticated":
      return "denied";
    default:
      return "unknown";
  }
}

// co ile ponawiać, gdy ranking jest jeszcze przygotowywany
const PREPARING_RETRY_MS = 30_000;

// top 10 wyników w trybie gry; przy remisie wyżej wynik osiągnięty wcześniej
export function useLeaderboard(game: GameId, mode: string) {
  const { user } = useAuth();
  const key = bestKey(game, mode);

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    entries: LeaderboardEntry[];
    error: LeaderboardError | null;
  } | null>(null);

  useEffect(() => {
    if (!db || !user) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const q = query(
      collection(db, "leaderboards", key, "scores"),
      orderBy("value", "desc"),
      orderBy("createdAt", "asc"),
      limit(LEADERBOARD_SIZE),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) =>
        setState({
          key,
          error: null,
          entries: snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            const createdAt = data.createdAt as Timestamp | null;
            return {
              id: d.id,
              uid: data.uid as string,
              name: data.name as string,
              photoURL: (data.photoURL as string | null) ?? null,
              value: data.value as number,
              createdAt: createdAt ? createdAt.toDate() : null,
            };
          }),
        }),
      (err) => {
        // szczegóły tylko w konsoli - użytkownik dostaje prosty komunikat
        console.error("Loading leaderboard failed:", err);

        const kind = leaderboardErrorKind(err.code);
        setState({ key, entries: [], error: kind });

        // indeks się buduje - spróbujmy ponownie za chwilę
        if (kind === "preparing") {
          retryTimer = setTimeout(
            () => setAttempt((n) => n + 1),
            PREPARING_RETRY_MS,
          );
        }
      },
    );

    return () => {
      unsubscribe();
      clearTimeout(retryTimer);
    };
  }, [user, key, attempt]);

  // dane z poprzedniego trybu traktujemy jako "ładowanie"
  const current = state?.key === key ? state : null;

  return {
    entries: current?.entries ?? [],
    loading: current === null,
    error: current?.error ?? null,
    retry: () => setAttempt((n) => n + 1),
  };
}
