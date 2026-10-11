import { useRef, useState, type FormEvent } from "react";

import {
  Button,
  Loading,
  PageHeader,
  Panel,
  ProgressBar,
  ResultScreen,
  SelectField,
  SetupPanel,
  type Mistake,
} from "../components/GameUI";
import Leaderboard from "../components/Leaderboard";
import { categoryOptions, countOptions, langOptions } from "../lib/options";
import {
  acceptedAnswers,
  checkAnswer,
  filterByCategory,
  sample,
  spanishAnswers,
  translationOf,
  useVocabulary,
  withArticle,
  type CheckResult,
  type Lang,
  type Word,
} from "../lib/vocab";
import { play } from "../lib/sound";
import { useGameRecorder } from "../lib/progress";

type Direction = "to-es" | "from-es";

const feedbackText: Record<CheckResult, string> = {
  correct: "✅ Correct!",
  accent: "🟡 Correct, but watch the accents",
  wrong: "❌ Wrong",
};

function Test() {
  const { categories, words, loading, error } = useVocabulary();

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");

  // SETTINGS
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState<Lang>("pl");
  const [direction, setDirection] = useState<Direction>("to-es");
  const [count, setCount] = useState(10);

  // GAME STATE
  const [questions, setQuestions] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [answers, setAnswers] = useState<{ id: string; ok: boolean }[]>([]);

  const recorder = useGameRecorder();

  const inputRef = useRef<HTMLInputElement>(null);

  const available = filterByCategory(words, category);
  const questionCount = Math.min(count, available.length);

  const word = questions[index];

  const promptOf = (w: Word) =>
    direction === "to-es" ? translationOf(w, lang) : w.word;

  const solutionOf = (w: Word) =>
    direction === "to-es" ? withArticle(w) : translationOf(w, lang);

  const start = () => {
    setQuestions(sample(available, questionCount));
    setIndex(0);
    setAnswer("");
    setResult(null);
    setScore(0);
    setMistakes([]);
    setAnswers([]);
    setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();

    // drugi Enter = następne pytanie
    if (result !== null) {
      next();
      return;
    }

    if (!word || !answer.trim()) return;

    const accepted =
      direction === "to-es"
        ? spanishAnswers(word)
        : acceptedAnswers(translationOf(word, lang));

    const check = checkAnswer(answer, accepted);

    setResult(check);
    play(
      check === "correct" ? "correct" : check === "accent" ? "almost" : "wrong",
    );
    setAnswers((a) => [...a, { id: word.id, ok: check !== "wrong" }]);

    if (check === "wrong") {
      setMistakes((m) => [
        ...m,
        { prompt: promptOf(word), given: answer, correct: solutionOf(word) },
      ]);
    } else {
      setScore((s) => s + 1);
    }
  };

  const skip = () => {
    if (!word || result !== null) return;

    setResult("wrong");
    play("wrong");
    setAnswers((a) => [...a, { id: word.id, ok: false }]);
    setMistakes((m) => [
      ...m,
      { prompt: promptOf(word), given: "", correct: solutionOf(word) },
    ]);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      const percent = Math.round((score / questions.length) * 100);
      recorder.save({
        game: "test",
        mode: `${lang}:${direction}`,
        correct: score,
        total: questions.length,
        bestValue: questions.length >= 10 ? percent : null,
        words: answers,
        settings: { category, lang, direction },
      });
      play("finish");
      setPhase("done");
      return;
    }

    play("click");
    setIndex((i) => i + 1);
    setAnswer("");
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (loading || error) return <Loading error={error} />;

  const resultStyle =
    result === "wrong"
      ? "border-bad bg-bad-soft animate-shake"
      : result
        ? "border-good bg-good-soft"
        : "border-line bg-surface-2 focus:border-accent";

  return (
    <section>
      <PageHeader
        icon="✍️"
        title="Test"
        description="Type the translation yourself. Accents are checked, but a missing accent still counts as correct."
      />

      {phase === "setup" && (
        <SetupPanel onStart={start} canStart={available.length >= 1}>
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
            label="Direction"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "to-es", label: "Translation → type Spanish" },
              { value: "from-es", label: "Spanish → type translation" },
            ]}
          />
          <SelectField
            label="Questions"
            value={questionCount}
            onChange={setCount}
            options={countOptions(available.length)}
          />
        </SetupPanel>
      )}

      {phase === "play" && word && (
        <Panel className="max-w-2xl mx-auto">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Question {index + 1} / {questions.length}
            </span>
            <span>
              Score: <b className="text-heading">{score}</b>
            </span>
          </div>
          <ProgressBar value={index / questions.length} />

          <p className="mt-8 text-sm uppercase tracking-wide">
            {word.category} · {word.part_of_speech}
          </p>
          <h2 key={index} className="text-4xl my-6 animate-pop">
            {promptOf(word)}
          </h2>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              readOnly={result !== null}
              placeholder={
                direction === "to-es"
                  ? "Type in Spanish..."
                  : "Type the translation..."
              }
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`w-full rounded-2xl border-2 px-5 py-4 text-center text-2xl text-heading outline-none transition ${resultStyle}`}
            />

            {direction === "to-es" && result === null && (
              <div className="flex flex-wrap justify-center gap-2">
                {["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setAnswer((a) => a + ch);
                      inputRef.current?.focus();
                    }}
                    className="h-10 w-10 rounded-lg border border-line bg-surface-2 text-heading hover:border-accent"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}

            {result !== null && (
              <div className="animate-pop">
                <p className="text-lg font-semibold text-heading">
                  {feedbackText[result]}
                </p>
                {result !== "correct" && (
                  <p className="mt-1">
                    Answer: <b className="text-good">{solutionOf(word)}</b>
                  </p>
                )}
                {word.example_es && (
                  <p className="mt-3 text-sm">
                    🇪🇸 <i>{word.example_es}</i>
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-3">
              {result === null ? (
                <>
                  <Button type="submit">Check</Button>
                  <Button type="button" variant="ghost" onClick={skip}>
                    I don't know
                  </Button>
                </>
              ) : (
                <Button type="submit">
                  {index + 1 >= questions.length ? "See results" : "Next →"}
                </Button>
              )}
            </div>
          </form>
        </Panel>
      )}

      {phase === "done" && (
        <ResultScreen
          title={score === questions.length ? "Perfect! 🎉" : "Test finished"}
          record={recorder.record}
          save={recorder}
          stats={[
            { label: "Correct", value: `${score}/${questions.length}` },
            {
              label: "Accuracy",
              value: `${Math.round((score / questions.length) * 100)}%`,
            },
          ]}
          mistakes={mistakes}
          onRestart={start}
          onSetup={() => setPhase("setup")}
        />
      )}

      {phase !== "play" && (
        <Leaderboard
          game="test"
          mode={`${lang}:${direction}`}
          note="Only tests with 10+ questions count."
        />
      )}
    </section>
  );
}

export default Test;
