import { useState, type CSSProperties } from "react";

import {
  Button,
  Loading,
  PageHeader,
  Panel,
  ProgressBar,
  ResultScreen,
  SelectField,
  SetupPanel,
  Stat,
  type Mistake,
} from "../components/GameUI";
import Leaderboard from "../components/Leaderboard";
import { langOptions } from "../lib/options";
import {
  sample,
  shuffle,
  translationOf,
  useVocabulary,
  type Lang,
  type Word,
} from "../lib/vocab";
import { play } from "../lib/sound";
import { useGameRecorder } from "../lib/progress";

// tagi zbyt ogólne, żeby dało się je sensownie zgadywać
const IGNORED_TAGS = ["basic", "grammar"];
const MIN_TAG_SIZE = 10;

const TAG_ICONS: Record<string, string> = {
  work: "💼",
  travel: "✈️",
  shopping: "🛍️",
  health: "🩺",
  transport: "🚌",
  food: "🍽️",
  technology: "💻",
  city: "🏙️",
  clothing: "👕",
  chores: "🧹",
  emotions: "😊",
  education: "🎓",
  home: "🏠",
  accommodation: "🏨",
  personality: "🧠",
  appearance: "🪞",
  restaurant: "🍷",
  directions: "🧭",
  animals: "🐾",
  environment: "🌱",
  emergency: "🚨",
  family: "👨‍👩‍👧",
  weather: "⛅",
  relationships: "❤️",
  communication: "💬",
  finance: "💶",
  time: "⏰",
  formal: "🎩",
  cooking: "🍳",
  greetings: "👋",
  nature: "🌳",
  fashion: "👗",
};

type Round = {
  tag: string;
  answer: Word;
  options: Word[];
};

const prettyTag = (tag: string) =>
  tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, " ");

function TagSort() {
  const { words, loading, error } = useVocabulary();

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");

  // SETTINGS
  const [lang, setLang] = useState<Lang>("pl");
  const [count, setCount] = useState(10);
  const [hints, setHints] = useState<"off" | "on">("off");

  // GAME STATE
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Word | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [answers, setAnswers] = useState<{ id: string; ok: boolean }[]>([]);

  const recorder = useGameRecorder();

  // tag -> słowa z tym tagiem
  const tagMap = new Map<string, Word[]>();
  for (const w of words) {
    for (const t of w.tags) {
      if (IGNORED_TAGS.includes(t)) continue;
      tagMap.set(t, [...(tagMap.get(t) ?? []), w]);
    }
  }
  const tags = [...tagMap.keys()].filter(
    (t) => tagMap.get(t)!.length >= MIN_TAG_SIZE,
  );

  const start = () => {
    const generated: Round[] = [];

    for (let i = 0; i < count; i++) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const answer = sample(tagMap.get(tag)!, 1)[0];
      const others = sample(
        words.filter((w) => !w.tags.includes(tag)),
        3,
      );

      generated.push({ tag, answer, options: shuffle([answer, ...others]) });
    }

    setRounds(generated);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMistakes([]);
    setAnswers([]);
    setPhase("play");
  };

  const round = rounds[index];

  const choose = (word: Word) => {
    if (!round || picked) return;

    setPicked(word);
    setAnswers((a) => [
      ...a,
      { id: round.answer.id, ok: word.id === round.answer.id },
    ]);

    if (word.id === round.answer.id) {
      // co trzecia dobra odpowiedź z rzędu = dźwięk serii
      play((streak + 1) % 3 === 0 ? "combo" : "correct");
      setScore((s) => s + 1);
      setStreak(streak + 1);
      setBestStreak((b) => Math.max(b, streak + 1));
    } else {
      play("wrong");
      setStreak(0);
      setMistakes((m) => [
        ...m,
        {
          prompt: prettyTag(round.tag),
          given: word.word,
          correct: round.answer.word,
        },
      ]);
    }
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      recorder.save({
        game: "tag-sort",
        mode: String(rounds.length),
        correct: score,
        total: rounds.length,
        bestValue: Math.round((score / rounds.length) * 100),
        words: answers,
        settings: { rounds: rounds.length, bestStreak },
      });
      play("finish");
      setPhase("done");
    } else {
      play("click");
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  if (loading || error) return <Loading error={error} />;

  return (
    <section>
      <PageHeader
        icon="🏷️"
        title="Tag Sort"
        description="A topic appears — pick the one Spanish word that belongs to it."
      />

      {phase === "setup" && (
        <SetupPanel
          onStart={start}
          canStart={tags.length > 0}
          hint={`${tags.length} topics available`}
        >
          <SelectField
            label="Rounds"
            value={count}
            onChange={setCount}
            options={[10, 20, 30].map((n) => ({
              value: n,
              label: `${n} rounds`,
            }))}
          />
          <SelectField
            label="Language"
            value={lang}
            onChange={setLang}
            options={langOptions}
          />
          <SelectField
            label="Translations"
            value={hints}
            onChange={setHints}
            options={[
              { value: "off", label: "Show after answering" },
              { value: "on", label: "Always show (easier)" },
            ]}
          />
        </SetupPanel>
      )}

      {phase === "play" && round && (
        <Panel className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Round {index + 1} / {rounds.length}
            </span>
            <span>
              🔥 Streak: <b className="text-heading">{streak}</b>
            </span>
          </div>
          <ProgressBar value={index / rounds.length} />

          <div key={index} className="animate-pop">
            <div className="mt-6 inline-flex max-w-full items-center gap-3 rounded-full border-2 border-accent bg-accent-soft px-5 py-2.5 sm:mt-8 sm:px-6 sm:py-3">
              <span className="text-2xl sm:text-3xl">
                {TAG_ICONS[round.tag] ?? "🏷️"}
              </span>
              <span className="text-xl font-bold text-heading sm:text-2xl">
                {prettyTag(round.tag)}
              </span>
            </div>

            <p className="mt-4 mb-5 sm:mb-6">
              Which word belongs to this topic?
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              {round.options.map((word, i) => {
                let style = `border-line bg-surface-2 hover:border-accent hover:-translate-y-0.5 animate-rise`;

                if (picked) {
                  if (word.id === round.answer.id) {
                    style = "border-good bg-good-soft animate-correct";
                  } else if (word.id === picked.id) {
                    style = "border-bad bg-bad-soft animate-shake";
                  } else {
                    style = "border-line bg-surface-2 opacity-60";
                  }
                }

                return (
                  <button
                    key={word.id}
                    onClick={() => choose(word)}
                    disabled={!!picked}
                    style={{ "--i": i } as CSSProperties}
                    className={`min-w-0 rounded-2xl border-2 px-4 py-3 transition sm:px-5 sm:py-4 ${style}`}
                  >
                    <span className="block text-lg font-semibold text-heading sm:text-xl">
                      {word.word}
                    </span>
                    {/* tłumaczenie zajmuje miejsce od początku (niewidoczne),
                        żeby przyciski nie zmieniały wysokości po odpowiedzi */}
                    <span
                      className={`mt-1 block text-sm ${
                        picked || hints === "on" ? "" : "invisible"
                      }`}
                    >
                      {translationOf(word, lang)}
                      {picked && (
                        <span className="opacity-70">
                          {" "}
                          · {word.tags.map(prettyTag).join(", ")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              className={`mt-5 w-full sm:mt-6 sm:w-auto ${picked ? "animate-pop" : "invisible"}`}
              onClick={next}
              aria-hidden={!picked}
            >
              {index + 1 >= rounds.length ? "See results" : "Next →"}
            </Button>
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <Stat label="Score" value={score} />
          </div>
        </Panel>
      )}

      {phase === "done" && (
        <ResultScreen
          title="Sorting done! 🏷️"
          record={recorder.record}
          celebrate={score === rounds.length}
          save={recorder}
          stats={[
            { label: "Correct", value: `${score}/${rounds.length}` },
            { label: "Best streak", value: bestStreak },
          ]}
          mistakes={mistakes}
          onRestart={start}
          onSetup={() => setPhase("setup")}
        />
      )}

      {phase !== "play" && <Leaderboard game="tag-sort" mode={String(count)} />}
    </section>
  );
}

export default TagSort;
