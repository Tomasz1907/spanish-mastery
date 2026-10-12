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
import Leaderboard from "../components/Leaderboard";
import SpeakButton from "../components/SpeakButton";
import { categoryOptions, langOptions } from "../lib/options";
import {
  exampleOf,
  filterByCategory,
  formatTime,
  sample,
  stripAccents,
  unifyDashes,
  timestamp,
  useVocabulary,
  type Lang,
  type Word,
} from "../lib/vocab";
import { bestKey, useGameRecorder, useUserProfile } from "../lib/progress";
import { play } from "../lib/sound";

type Mode = "strict" | "lenient";

// w trybie lenient nie trzeba wpisywać ¿ ¡ ani akcentów
const targetText = (word: Word, mode: Mode) => {
  const text = word.example_es ?? word.word;
  return mode === "lenient" ? text.replace(/[¿¡]/g, "").trim() : text;
};

const sameChar = (typed: string, expected: string, mode: Mode) => {
  const a = unifyDashes(typed);
  const b = unifyDashes(expected);
  return mode === "strict" ? a === b : stripAccents(a) === stripAccents(b);
};

function TypeRace() {
  const { categories, words, loading, error } = useVocabulary();

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");

  // SETTINGS
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState<Lang>("pl");
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<Mode>("lenient");

  // GAME STATE
  const [sentences, setSentences] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [typos, setTypos] = useState(0);
  const recorder = useGameRecorder();
  const { profile } = useUserProfile();

  const inputRef = useRef<HTMLInputElement>(null);

  const available = filterByCategory(words, category).filter(
    (w) => w.example_es,
  );

  const start = () => {
    setSentences(sample(available, Math.min(count, available.length)));
    setIndex(0);
    setTyped("");
    setStartedAt(null);
    setNow(0);
    setKeystrokes(0);
    setTypos(0);
    setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // TIMER
  useEffect(() => {
    if (phase !== "play" || startedAt === null) return;

    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  const sentence = sentences[index];
  const target = sentence ? targetText(sentence, mode) : "";

  const totalChars = sentences.reduce(
    (sum, w) => sum + targetText(w, mode).length,
    0,
  );

  const onType = (value: string) => {
    if (!sentence) return;

    const t = timestamp();
    const begin = startedAt ?? t;
    if (startedAt === null) setStartedAt(t);

    const next = value.slice(0, target.length);

    // liczymy tylko nowo dopisane znaki
    let added = 0;
    let wrongAdded = 0;

    if (next.length > typed.length) {
      added = next.length - typed.length;

      for (let i = typed.length; i < next.length; i++) {
        if (!sameChar(next[i], target[i], mode)) wrongAdded++;
      }

      // cichy „klik” klawisza, niski ton przy literówce
      play(wrongAdded > 0 ? "typo" : "key");

      setKeystrokes((k) => k + added);
      setTypos((n) => n + wrongAdded);
    }

    const done =
      next.length === target.length &&
      [...next].every((ch, i) => sameChar(ch, target[i], mode));

    if (!done) {
      setTyped(next);
      return;
    }

    if (index + 1 < sentences.length) {
      play("correct");
      setIndex((i) => i + 1);
      setTyped("");
      return;
    }

    // KONIEC
    const elapsed = t - begin;
    const wpm = Math.round(totalChars / 5 / (elapsed / 60000));

    setTyped(next);
    setFinishedAt(t);

    const totalKeys = keystrokes + added;
    const totalTypos = typos + wrongAdded;

    play("finish");
    recorder.save({
      game: "type-race",
      // liczba zdań jest częścią trybu
      mode: `${mode}:${sentences.length}`,
      correct: sentences.length,
      total: sentences.length,
      bestValue: wpm,
      durationMs: elapsed,
      wpm,
      settings: {
        category,
        sentences: sentences.length,
        accuracy:
          totalKeys > 0
            ? Math.round(((totalKeys - totalTypos) / totalKeys) * 100)
            : 100,
      },
    });
    setPhase("done");
  };

  if (loading || error) return <Loading error={error} />;

  const elapsed =
    startedAt === null
      ? 0
      : (phase === "done" ? finishedAt : Math.max(now, startedAt)) - startedAt;

  const doneChars =
    sentences
      .slice(0, index)
      .reduce((sum, w) => sum + targetText(w, mode).length, 0) + typed.length;

  const wpm =
    elapsed > 1000 ? Math.round(doneChars / 5 / (elapsed / 60000)) : 0;

  const accuracy =
    keystrokes > 0
      ? Math.round(((keystrokes - typos) / keystrokes) * 100)
      : 100;

  const best =
    profile?.best?.[bestKey("type-race", `${mode}:${count}`)] ?? null;

  return (
    <section>
      <PageHeader
        icon="🏎️"
        title="Type Race"
        description="Type Spanish sentences as fast and accurately as you can. The clock starts on your first keystroke."
      />

      {phase === "setup" && (
        <SetupPanel
          onStart={start}
          canStart={available.length > 0}
          hint={best !== null && `Your best: ${best} WPM`}
        >
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions(categories.map((c) => c.category))}
          />
          <SelectField
            label="Sentences"
            value={count}
            onChange={setCount}
            options={[3, 5, 10].map((n) => ({
              value: n,
              label: `${n} sentences`,
            }))}
          />
          <SelectField
            label="Accents"
            value={mode}
            onChange={setMode}
            options={[
              { value: "lenient", label: "Lenient (á = a, no ¿ ¡)" },
              { value: "strict", label: "Strict (exact characters)" },
            ]}
          />
          <SelectField
            label="Translation hint"
            value={lang}
            onChange={setLang}
            options={langOptions}
          />
        </SetupPanel>
      )}

      {phase === "play" && sentence && (
        <Panel className="max-w-3xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <Stat label="Time" value={formatTime(elapsed)} />
            <Stat label="WPM" value={wpm} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
          </div>
          <ProgressBar value={doneChars / totalChars} />

          <div className="mt-5 flex items-center justify-between gap-2 sm:mt-6">
            <p className="text-sm">
              Sentence {index + 1} / {sentences.length}
            </p>
            <SpeakButton text={sentence.example_es ?? ""} size="sm" />
          </div>

          <p
            key={index}
            onClick={() => inputRef.current?.focus()}
            className="mt-3 cursor-text text-left font-mono text-lg leading-relaxed animate-pop sm:mt-4 sm:text-2xl md:text-3xl"
          >
            {[...target].map((ch, i) => {
              let style = "opacity-50";

              if (i < typed.length) {
                style = sameChar(typed[i], ch, mode)
                  ? "text-good"
                  : "text-bad bg-bad-soft rounded";
              } else if (i === typed.length) {
                style = "text-heading border-b-4 border-accent";
              }

              return (
                <span key={i} className={style}>
                  {ch === " " && i < typed.length && typed[i] !== " "
                    ? "·"
                    : ch}
                </span>
              );
            })}
          </p>

          <p className="mt-3 text-left text-sm">
            {lang === "pl" ? "🇵🇱" : "🇬🇧"} {exampleOf(sentence, lang)}
          </p>

          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => onType(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Start typing..."
            className="mt-5 w-full min-w-0 rounded-2xl border-2 border-line bg-surface-2 px-4 py-3 font-mono text-base text-heading outline-none transition focus:border-accent sm:mt-6 sm:px-5 sm:py-4 sm:text-xl"
          />
        </Panel>
      )}

      {phase === "done" && (
        <ResultScreen
          title="Finish line! 🏁"
          record={recorder.record}
          save={recorder}
          stats={[
            { label: "WPM", value: wpm },
            { label: "Time", value: formatTime(elapsed) },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Typos", value: typos },
          ]}
          onRestart={start}
          onSetup={() => setPhase("setup")}
        />
      )}

      {phase !== "play" && (
        <Leaderboard game="type-race" mode={`${mode}:${count}`} />
      )}
    </section>
  );
}

export default TypeRace;
