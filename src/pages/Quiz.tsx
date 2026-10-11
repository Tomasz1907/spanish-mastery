import { useCallback, useEffect, useState } from "react";

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
import { categoryOptions, countOptions, langOptions } from "../lib/options";
import {
  exampleOf,
  filterByCategory,
  pickDistractors,
  sample,
  saveBest,
  shuffle,
  translationOf,
  useVocabulary,
  type Lang,
  type Word,
} from "../lib/vocab";

type Direction = "from-es" | "to-es";

type Question = {
  word: Word;
  prompt: string;
  correct: string;
  options: string[];
};

function Quiz() {
  const { categories, words, loading, error } = useVocabulary();

  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");

  // SETTINGS
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState<Lang>("pl");
  const [direction, setDirection] = useState<Direction>("from-es");
  const [count, setCount] = useState(10);

  // GAME STATE
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [record, setRecord] = useState(false);

  const available = filterByCategory(words, category);
  const questionCount = Math.min(count, available.length);

  const start = () => {
    const textOf = (w: Word) =>
      direction === "from-es" ? translationOf(w, lang) : w.word;

    const generated = sample(available, questionCount).map((word) => {
      const correct = textOf(word);

      return {
        word,
        prompt: direction === "from-es" ? word.word : translationOf(word, lang),
        correct,
        options: shuffle([
          correct,
          ...pickDistractors(word, words, 3, textOf),
        ]),
      };
    });

    setQuestions(generated);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setMistakes([]);
    setRecord(false);
    setPhase("play");
  };

  const question = questions[index];

  const choose = useCallback(
    (option: string) => {
      if (!question || picked !== null) return;

      setPicked(option);

      if (option === question.correct) {
        setScore((s) => s + 1);
      } else {
        setMistakes((m) => [
          ...m,
          { prompt: question.prompt, given: option, correct: question.correct },
        ]);
      }
    },
    [question, picked],
  );

  const next = useCallback(() => {
    if (picked === null) return;

    if (index + 1 >= questions.length) {
      const percent = Math.round((score / questions.length) * 100);
      setRecord(
        questions.length >= 10 && saveBest(`quiz:${lang}:${direction}`, percent),
      );
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  }, [picked, index, questions.length, score, lang, direction]);

  // KLAWIATURA: 1-4 wybór, Enter dalej
  useEffect(() => {
    if (phase !== "play") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const n = Number(e.key);

      if (n >= 1 && n <= 4 && question?.options[n - 1]) {
        choose(question.options[n - 1]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, question, choose, next]);

  if (loading || error) return <Loading error={error} />;

  return (
    <section>
      <PageHeader
        icon="🎯"
        title="Quiz"
        description="Pick the correct translation out of four options. Use keys 1–4 and Enter for speed."
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
              { value: "from-es", label: "Spanish → translation" },
              { value: "to-es", label: "Translation → Spanish" },
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

      {phase === "play" && question && (
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

          <div key={index} className="animate-pop">
            <p className="mt-8 text-sm uppercase tracking-wide">
              {question.word.category} · {question.word.part_of_speech}
            </p>
            <h2 className="text-4xl my-6">{question.prompt}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option, i) => {
                let style = "border-line bg-surface-2 hover:border-accent";

                if (picked !== null) {
                  if (option === question.correct) {
                    style = "border-good bg-good-soft text-heading";
                  } else if (option === picked) {
                    style = "border-bad bg-bad-soft animate-shake";
                  } else {
                    style = "border-line bg-surface-2 opacity-50";
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => choose(option)}
                    disabled={picked !== null}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-lg transition ${style}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sm font-bold">
                      {i + 1}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-6 animate-pop">
                {question.word.example_es && (
                  <p className="text-sm">
                    🇪🇸 <i>{question.word.example_es}</i>
                    <br />
                    {lang === "pl" ? "🇵🇱" : "🇬🇧"}{" "}
                    {exampleOf(question.word, lang)}
                  </p>
                )}

                <Button className="mt-5" onClick={next}>
                  {index + 1 >= questions.length ? "See results" : "Next →"}
                </Button>
              </div>
            )}
          </div>
        </Panel>
      )}

      {phase === "done" && (
        <ResultScreen
          title={
            score === questions.length ? "Perfect! 🎉" : "Quiz finished"
          }
          record={record}
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
    </section>
  );
}

export default Quiz;
