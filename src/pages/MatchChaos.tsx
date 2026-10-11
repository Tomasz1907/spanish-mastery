import { useEffect, useRef, useState } from "react";

import {
  Loading,
  PageHeader,
  Panel,
  ProgressBar,
  ResultScreen,
  SelectField,
  SetupPanel,
  Stat,
} from "../components/GameUI";
import { categoryOptions, langOptions } from "../lib/options";
import {
  filterByCategory,
  getBest,
  normalize,
  saveBest,
  shuffle,
  timestamp,
  translationOf,
  useVocabulary,
  type Lang,
  type Word,
} from "../lib/vocab";

const PAIRS = 4;
const SET_BONUS_MS = 3000;

type Board = {
  left: Word[];
  right: Word[];
};

type Side = "left" | "right";

function MatchChaos() {
  const { categories, words, loading, error } = useVocabulary();

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");

  // SETTINGS
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState<Lang>("pl");
  const [duration, setDuration] = useState(60);

  // GAME STATE
  const [board, setBoard] = useState<Board>({ left: [], right: [] });
  const [matched, setMatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(
    null,
  );
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(0);
  const [record, setRecord] = useState(false);

  const deck = useRef<Word[]>([]);
  const scoreRef = useRef(0);

  const available = filterByCategory(words, category);
  const bestKey = `match:${lang}:${duration}`;

  // 4 pary bez powtórzonych słów i tłumaczeń
  const drawBoard = (): Board => {
    const picked: Word[] = [];
    const seen = new Set<string>();

    while (picked.length < PAIRS) {
      if (deck.current.length === 0) deck.current = shuffle(available);

      const word = deck.current.pop()!;
      const keys = [
        `es:${normalize(word.word)}`,
        `tr:${normalize(translationOf(word, lang))}`,
      ];

      if (picked.some((p) => p.id === word.id)) continue;

      if (keys.some((k) => seen.has(k))) {
        // przy małej puli i tak bierzemy słowo, żeby się nie zapętlić
        if (available.length > PAIRS * 3) continue;
      }

      keys.forEach((k) => seen.add(k));
      picked.push(word);
    }

    return { left: shuffle(picked), right: shuffle(picked) };
  };

  const start = () => {
    deck.current = shuffle(available);
    scoreRef.current = 0;

    const t = timestamp();

    setBoard(drawBoard());
    setMatched([]);
    setSelected(null);
    setWrong([]);
    setScore(0);
    setErrors(0);
    setRecord(false);
    setNow(t);
    setEndAt(t + duration * 1000);
    setPhase("play");
  };

  // TIMER
  useEffect(() => {
    if (phase !== "play") return;

    const timer = setInterval(() => {
      const t = timestamp();
      setNow(t);

      if (t >= endAt) {
        setRecord(saveBest(bestKey, scoreRef.current));
        setPhase("done");
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, endAt, bestKey]);

  const pick = (side: Side, word: Word) => {
    if (matched.includes(word.id) || wrong.length > 0) return;

    if (!selected || selected.side === side) {
      setSelected({ side, id: word.id });
      return;
    }

    if (selected.id === word.id) {
      const nextMatched = [...matched, word.id];

      scoreRef.current += 1;
      setScore(scoreRef.current);
      setSelected(null);

      if (nextMatched.length === PAIRS) {
        // cała plansza - nowe słowa i bonus czasowy
        setMatched([]);
        setBoard(drawBoard());
        setEndAt((e) => e + SET_BONUS_MS);
      } else {
        setMatched(nextMatched);
      }
    } else {
      const pair = [`${selected.side}:${selected.id}`, `${side}:${word.id}`];

      setErrors((n) => n + 1);
      setWrong(pair);
      setSelected(null);
      setTimeout(() => setWrong([]), 450);
    }
  };

  if (loading || error) return <Loading error={error} />;

  const remaining = Math.max(0, endAt - now);
  const best = getBest(bestKey);

  const tile = (side: Side, word: Word) => {
    const key = `${side}:${word.id}`;
    const isMatched = matched.includes(word.id);
    const isSelected = selected?.side === side && selected.id === word.id;
    const isWrong = wrong.includes(key);

    let style = "border-line bg-surface-2 hover:border-accent";
    if (isMatched) style = "border-good bg-good-soft opacity-0 scale-90";
    else if (isWrong) style = "border-bad bg-bad-soft animate-shake";
    else if (isSelected) style = "border-accent bg-accent-soft scale-[1.03]";

    return (
      <button
        key={key}
        onClick={() => pick(side, word)}
        disabled={isMatched}
        className={`min-h-20 rounded-2xl border-2 px-4 py-3 text-lg font-medium text-heading transition-all duration-200 animate-pop ${style}`}
      >
        {side === "left" ? word.word : translationOf(word, lang)}
      </button>
    );
  };

  return (
    <section>
      <PageHeader
        icon="⚡"
        title="Match Chaos"
        description="Match Spanish words with their translations before the clock runs out. Every cleared board gives +3 seconds."
      />

      {phase === "setup" && (
        <SetupPanel
          onStart={start}
          canStart={available.length >= PAIRS}
          hint={best !== null && `Best for this mode: ${best} pairs`}
        >
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions(categories.map((c) => c.category))}
          />
          <SelectField
            label="Language"
            value={lang}
            onChange={setLang}
            options={langOptions}
          />
          <SelectField
            label="Time"
            value={duration}
            onChange={setDuration}
            options={[
              { value: 30, label: "30 seconds" },
              { value: 60, label: "60 seconds" },
              { value: 90, label: "90 seconds" },
            ]}
          />
        </SetupPanel>
      )}

      {phase === "play" && (
        <Panel className="max-w-3xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <Stat label="Time" value={`${(remaining / 1000).toFixed(1)}s`} />
            <Stat label="Pairs" value={score} />
            <Stat label="Errors" value={errors} />
          </div>
          <ProgressBar value={remaining / (duration * 1000)} />

          <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-8">
            <div className="flex flex-col gap-3">
              <p className="text-sm uppercase tracking-wide">🇪🇸 Spanish</p>
              {board.left.map((w) => tile("left", w))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm uppercase tracking-wide">
                {lang === "pl" ? "🇵🇱 Polish" : "🇬🇧 English"}
              </p>
              {board.right.map((w) => tile("right", w))}
            </div>
          </div>
        </Panel>
      )}

      {phase === "done" && (
        <ResultScreen
          title="Time's up! ⏱️"
          record={record}
          stats={[
            { label: "Pairs", value: score },
            { label: "Errors", value: errors },
            {
              label: "Accuracy",
              value:
                score + errors > 0
                  ? `${Math.round((score / (score + errors)) * 100)}%`
                  : "—",
            },
          ]}
          onRestart={start}
          onSetup={() => setPhase("setup")}
        />
      )}
    </section>
  );
}

export default MatchChaos;
