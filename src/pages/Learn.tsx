import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Button,
  Loading,
  PageHeader,
  Panel,
  ProgressBar,
  ResultScreen,
  SelectField,
  SetupPanel,
} from "../components/GameUI";
import SpeakButton from "../components/SpeakButton";
import { categoryOptions, langOptions } from "../lib/options";
import {
  useGameRecorder,
  useWordProgress,
  wordStatus,
  type WordProgress,
} from "../lib/progress";
import { play } from "../lib/sound";
import { speak } from "../lib/speech";
import {
  checkAnswer,
  exampleOf,
  filterByCategory,
  normalize,
  pickDistractors,
  shuffle,
  spanishAnswers,
  splitArticle,
  translationOf,
  useVocabulary,
  withArticle,
  type Lang,
  type Word,
} from "../lib/vocab";

// ── ETAPY LEKCJI ─────────────────────────────────────────────────────────

type Stage = "setup" | "discover" | "recognize" | "recall" | "spell" | "done";

const STEPS: { id: Stage; label: string; icon: string; hint: string }[] = [
  {
    id: "discover",
    label: "Discover",
    icon: "👀",
    hint: "Meet the new words — tap a card to flip it.",
  },
  {
    id: "recognize",
    label: "Recognize",
    icon: "🧠",
    hint: "Pick the right translation.",
  },
  {
    id: "recall",
    label: "Recall",
    icon: "🔁",
    hint: "Now the other way round — pick the Spanish word.",
  },
  {
    id: "spell",
    label: "Spell",
    icon: "✍️",
    hint: "Type the Spanish word from memory.",
  },
];

const SIZES = [5, 8, 10];

// najpierw nowe słowa, potem te w trakcie nauki, na końcu opanowane;
// bez dwóch słów o tym samym tłumaczeniu w jednej lekcji
function chooseWords(
  pool: Word[],
  progress: WordProgress,
  size: number,
  lang: Lang,
) {
  const order = { new: 0, learning: 1, mastered: 2 } as const;
  const sorted = shuffle(pool).sort(
    (a, b) =>
      order[wordStatus(progress[a.id])] - order[wordStatus(progress[b.id])],
  );

  const chosen: Word[] = [];
  const seen = new Set<string>();
  for (const w of sorted) {
    const keys = [normalize(w.word), normalize(translationOf(w, lang))];
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    chosen.push(w);
    if (chosen.length === size) break;
  }
  return chosen;
}

type Question = { id: string; options: string[]; correct: string };

function Learn() {
  const { categories, words: allWords, loading, error } = useVocabulary();
  const progress = useWordProgress();
  const recorder = useGameRecorder();
  const [params] = useSearchParams();

  // tryb powtórki: /learn?words=id1,id2,...
  const reviewIds = (params.get("words") ?? "").split(",").filter(Boolean);
  const reviewWords = allWords.filter((w) => reviewIds.includes(w.id));
  const isReview = reviewWords.length > 0;

  // SETTINGS
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState<Lang>("pl");
  const [size, setSize] = useState(5);
  const [autoSpeak, setAutoSpeak] = useState<"on" | "off">("on");

  // LESSON STATE
  const [stage, setStage] = useState<Stage>("setup");
  const [words, setWords] = useState<Word[]>([]);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [queue, setQueue] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [stageDone, setStageDone] = useState(0);

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "accent" | "wrong" | null>(
    null,
  );
  const [hint, setHint] = useState(1);

  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState({ correct: 0, total: 0 });

  const byId = (id: string) => words.find((w) => w.id === id)!;
  const pool = filterByCategory(allWords, category);

  const say = (text: string, l: "es" | Lang = "es") => {
    if (autoSpeak === "on") speak(text, l);
  };

  // ── START / ETAPY ─────────────────────────────────────────────────────

  const begin = (batch: Word[]) => {
    setWords(batch);
    setCard(0);
    setFlipped(false);
    setFirstTry({});
    setAnswers({ correct: 0, total: 0 });
    setStage("discover");
    say(withArticle(batch[0]));
  };

  const start = () => {
    begin(
      isReview ? shuffle(reviewWords) : chooseWords(pool, progress, size, lang),
    );
  };

  const makeQuestion = (id: string, kind: Stage, batch = words): Question => {
    const word = batch.find((w) => w.id === id)!;
    const textOf = (w: Word) =>
      kind === "recognize" ? translationOf(w, lang) : withArticle(w);
    const correct = textOf(word);

    // najpierw myląco podobne słowa z tej samej lekcji, potem z całego słownika
    const fromBatch = shuffle(batch.filter((w) => w.id !== id))
      .map(textOf)
      .filter((t) => normalize(t) !== normalize(correct));
    const extra = pickDistractors(word, allWords, 3, textOf).filter(
      (t) => !fromBatch.includes(t),
    );
    const distractors = [...new Set([...fromBatch, ...extra])].slice(0, 3);

    return { id, correct, options: shuffle([correct, ...distractors]) };
  };

  const enterStage = (next: Stage) => {
    const ids = shuffle(words.map((w) => w.id));
    setStage(next);
    setQueue(ids);
    setStageDone(0);
    setPicked(null);
    setAnswer("");
    setResult(null);
    setHint(1);
    play("combo");

    if (next === "spell") setQuestion(null);
    else setQuestion(makeQuestion(ids[0], next));

    if (next === "recognize") say(withArticle(byId(ids[0])));
  };

  // ── DISCOVER ──────────────────────────────────────────────────────────

  const nextCard = () => {
    play("click");
    if (card + 1 < words.length) {
      setCard(card + 1);
      setFlipped(false);
      say(withArticle(words[card + 1]));
    } else {
      enterStage("recognize");
    }
  };

  // ── WYBÓR Z 4 (recognize / recall) ───────────────────────────────────

  const choose = (option: string) => {
    if (!question || picked !== null) return;
    const ok = option === question.correct;

    setPicked(option);
    setAnswers((a) => ({
      correct: a.correct + (ok ? 1 : 0),
      total: a.total + 1,
    }));
    play(ok ? "correct" : "wrong");
    if (ok) setStageDone((n) => n + 1);
    say(withArticle(byId(question.id)));
  };

  const advance = (wasCorrect: boolean) => {
    const [current, ...rest] = queue;
    // pomyłka = słowo wraca na koniec kolejki
    const nextQueue = wasCorrect ? rest : [...rest, current];

    setPicked(null);
    setAnswer("");
    setResult(null);
    setHint(1);

    if (nextQueue.length === 0) {
      if (stage === "recognize") enterStage("recall");
      else if (stage === "recall") enterStage("spell");
      else finish();
      return;
    }

    play("click");
    setQueue(nextQueue);
    if (stage !== "spell") {
      setQuestion(makeQuestion(nextQueue[0], stage));
      if (stage === "recognize") say(withArticle(byId(nextQueue[0])));
    }
  };

  // ── SPELL ─────────────────────────────────────────────────────────────

  const spellWord =
    stage === "spell" && queue.length > 0 ? byId(queue[0]) : null;

  const submitSpell = (e: FormEvent) => {
    e.preventDefault();
    if (!spellWord) return;

    if (result !== null) {
      advance(result !== "wrong");
      return;
    }
    if (!answer.trim()) return;

    const check = checkAnswer(answer, spanishAnswers(spellWord));
    const ok = check !== "wrong";

    setResult(check);
    setAnswers((a) => ({
      correct: a.correct + (ok ? 1 : 0),
      total: a.total + 1,
    }));
    // tylko pierwsza próba liczy się do postępu słowa
    setFirstTry((f) => (spellWord.id in f ? f : { ...f, [spellWord.id]: ok }));
    play(
      check === "correct" ? "correct" : check === "accent" ? "almost" : "wrong",
    );
    if (ok) setStageDone((n) => n + 1);
    speak(withArticle(spellWord), "es");
  };

  const giveUp = () => {
    if (!spellWord || result !== null) return;
    setResult("wrong");
    setFirstTry((f) =>
      spellWord.id in f ? f : { ...f, [spellWord.id]: false },
    );
    setAnswers((a) => ({ ...a, total: a.total + 1 }));
    play("wrong");
    speak(withArticle(spellWord), "es");
  };

  // ── KONIEC ────────────────────────────────────────────────────────────

  const finish = () => {
    const learned = words.filter((w) => firstTry[w.id] ?? true).length;
    play("finish");
    setStage("done");
    recorder.save({
      game: "learn",
      mode: isReview ? "review" : String(words.length),
      correct: learned,
      total: words.length,
      bestValue: null,
      words: words.map((w) => ({ id: w.id, ok: firstTry[w.id] ?? true })),
      settings: { category: isReview ? "review" : category, lang },
    });
  };

  if (loading || error) return <Loading error={error} />;

  // ── WIDOK ─────────────────────────────────────────────────────────────

  const stepIndex = STEPS.findIndex((s) => s.id === stage);
  const counts = pool.reduce(
    (acc, w) => {
      acc[wordStatus(progress[w.id])] += 1;
      return acc;
    },
    { new: 0, learning: 0, mastered: 0 },
  );

  return (
    <section>
      <PageHeader
        icon="📖"
        title={isReview ? "Review" : "Learn"}
        description={
          isReview
            ? "Go through the words you find hardest, step by step."
            : "Learn new words in four short steps: discover, recognize, recall and spell."
        }
      />

      {stage === "setup" && (
        <SetupPanel
          onStart={start}
          canStart={isReview || pool.length >= 4}
          hint={
            isReview ? undefined : (
              <>
                In this category: <b className="text-heading">{counts.new}</b>{" "}
                new · <b className="text-heading">{counts.learning}</b> learning
                · <b className="text-heading">{counts.mastered}</b> mastered.
                New words come first.
              </>
            )
          }
        >
          {isReview ? (
            <div className="sm:col-span-2">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide">
                {reviewWords.length} words to review
              </p>
              <div className="flex flex-wrap gap-2">
                {reviewWords.map((w, i) => (
                  <span
                    key={w.id}
                    style={{ "--i": i } as CSSProperties}
                    className="rounded-full bg-surface-2 px-3 py-1 text-sm text-heading animate-rise"
                  >
                    {withArticle(w)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <SelectField
                label="Category"
                value={category}
                onChange={setCategory}
                options={categoryOptions(categories.map((c) => c.category))}
              />
              <SelectField
                label="Words per lesson"
                value={size}
                onChange={setSize}
                options={SIZES.map((n) => ({ value: n, label: `${n} words` }))}
              />
            </>
          )}
          <SelectField
            label="Language"
            value={lang}
            onChange={setLang}
            options={langOptions}
          />
          <SelectField
            label="Pronunciation"
            value={autoSpeak}
            onChange={setAutoSpeak}
            options={[
              { value: "on", label: "🔊 Read words aloud" },
              { value: "off", label: "🔈 Only on click" },
            ]}
          />
        </SetupPanel>
      )}

      {stepIndex >= 0 && (
        <>
          {/* ETAPY */}
          <ol className="mx-auto mb-4 grid max-w-2xl grid-cols-4 gap-1.5 sm:gap-2">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-xs font-semibold transition sm:flex-row sm:justify-center sm:gap-2 sm:text-sm ${
                  i === stepIndex
                    ? "bg-accent text-black shadow-card"
                    : i < stepIndex
                      ? "bg-good-soft text-good"
                      : "bg-surface text-body"
                }`}
              >
                <span className="text-base">
                  {i < stepIndex ? "✓" : s.icon}
                </span>
                <span className="truncate">{s.label}</span>
              </li>
            ))}
          </ol>

          <Panel className="mx-auto max-w-2xl">
            <div
              key={stage}
              className="mb-3 flex items-center justify-between gap-3 text-sm animate-pop"
            >
              <span className="text-left">{STEPS[stepIndex].hint}</span>
              <span className="shrink-0 tabular-nums">
                {stage === "discover" ? card + 1 : stageDone} / {words.length}
              </span>
            </div>
            <ProgressBar
              value={
                stage === "discover"
                  ? (card + 1) / words.length
                  : stageDone / words.length
              }
            />

            {stage === "discover" && words[card] && (
              <DiscoverCard
                key={card}
                word={words[card]}
                lang={lang}
                flipped={flipped}
                onFlip={() => {
                  play("select");
                  setFlipped((f) => !f);
                }}
              />
            )}

            {stage === "discover" && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  variant="ghost"
                  disabled={card === 0}
                  onClick={() => {
                    setCard(card - 1);
                    setFlipped(false);
                  }}
                >
                  ← Back
                </Button>
                <Button onClick={nextCard}>
                  {card + 1 < words.length ? "Next word →" : "Start practice →"}
                </Button>
              </div>
            )}

            {(stage === "recognize" || stage === "recall") && question && (
              <ChoiceQuestion
                key={`${stage}-${question.id}-${queue.length}`}
                word={byId(question.id)}
                stage={stage}
                lang={lang}
                question={question}
                picked={picked}
                onChoose={choose}
                onNext={() => advance(picked === question.correct)}
              />
            )}

            {stage === "spell" && spellWord && (
              <form
                key={`${spellWord.id}-${queue.length}`}
                onSubmit={submitSpell}
                className="mt-6 flex flex-col items-center gap-4 animate-pop"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl sm:text-4xl">
                    {translationOf(spellWord, lang)}
                  </h2>
                  <SpeakButton
                    text={translationOf(spellWord, lang)}
                    lang={lang}
                  />
                </div>

                <HintLetters
                  word={spellWord}
                  revealed={hint}
                  done={result !== null}
                />

                <input
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  readOnly={result !== null}
                  placeholder="Type in Spanish..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  lang="es"
                  className={`w-full min-w-0 rounded-2xl border-2 px-4 py-3 text-center text-xl text-heading outline-none transition sm:text-2xl ${
                    result === "wrong"
                      ? "border-bad bg-bad-soft animate-shake"
                      : result
                        ? "border-good bg-good-soft animate-correct"
                        : "border-line bg-surface-2 focus:border-accent"
                  }`}
                />

                <div className="flex min-h-[3.5rem] flex-col items-center justify-center text-sm">
                  {result === null ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {["á", "é", "í", "ó", "ú", "ñ"].map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setAnswer((a) => a + ch)}
                          className="h-9 w-9 rounded-lg border border-line bg-surface-2 text-heading transition hover:border-accent active:scale-90"
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="animate-pop">
                      {result === "correct" && "✅ Correct!"}
                      {result === "accent" &&
                        "🟡 Correct — watch the accents: "}
                      {result === "wrong" && "❌ The answer is "}
                      {result !== "correct" && (
                        <b className="text-good">{withArticle(spellWord)}</b>
                      )}
                      {result === "wrong" && (
                        <span className="block text-xs">
                          It will come back at the end.
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {result === null ? (
                    <>
                      <Button type="submit">Check</Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setHint((h) => h + 1)}
                        disabled={hint >= splitArticle(spellWord).base.length}
                      >
                        💡 Hint
                      </Button>
                      <Button type="button" variant="ghost" onClick={giveUp}>
                        Show answer
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" autoFocus>
                      Continue →
                    </Button>
                  )}
                </div>
              </form>
            )}
          </Panel>
        </>
      )}

      {stage === "done" && (
        <>
          <ResultScreen
            title="Lesson complete! 🎓"
            record={false}
            celebrate={answers.correct === answers.total}
            save={recorder}
            stats={[
              {
                label: "Learned",
                value: `${words.filter((w) => firstTry[w.id] ?? true).length}/${words.length}`,
              },
              {
                label: "Accuracy",
                value: answers.total
                  ? `${Math.round((answers.correct / answers.total) * 100)}%`
                  : "—",
              },
            ]}
            onRestart={() => begin(shuffle(words))}
            onSetup={() => setStage("setup")}
          />

          <Panel className="mx-auto mt-6 max-w-2xl text-left">
            <h2 className="mb-4 text-xl">Words in this lesson</h2>
            <ul className="flex flex-col gap-2">
              {words.map((w, i) => (
                <li
                  key={w.id}
                  style={{ "--i": i } as CSSProperties}
                  className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 animate-rise"
                >
                  <span className="text-lg">
                    {firstTry[w.id] === false ? "🔁" : "✅"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-heading">
                      {withArticle(w)}
                    </span>
                    <span className="block text-xs">
                      {translationOf(w, lang)}
                    </span>
                  </span>
                  <SpeakButton text={withArticle(w)} size="sm" />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/quiz"
                className="rounded-xl border border-line bg-surface px-5 py-2.5 font-semibold text-heading transition hover:-translate-y-0.5 hover:border-accent"
              >
                Practice in Quiz →
              </Link>
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}

// ── FISZKA ───────────────────────────────────────────────────────────────

function DiscoverCard({
  word,
  lang,
  flipped,
  onFlip,
}: {
  word: Word;
  lang: Lang;
  flipped: boolean;
  onFlip: () => void;
}) {
  const { article, base } = splitArticle(word);
  const other: Lang = lang === "pl" ? "en" : "pl";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={flipped ? "Show the Spanish side" : "Show the translation"}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onFlip();
        }
      }}
      className={`flip-card mt-6 cursor-pointer select-none animate-rise ${flipped ? "flipped" : ""}`}
    >
      <div className="flip-inner">
        {/* PRZÓD: słowo po hiszpańsku */}
        <div className="flex min-h-[17rem] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-accent-border bg-linear-to-br from-accent-soft to-surface-2 p-6">
          <span className="rounded-full bg-surface px-3 py-0.5 text-xs font-medium">
            {word.part_of_speech} · {word.category}
          </span>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl sm:text-5xl" lang="es">
              {article && (
                <span className="font-normal opacity-50">{article} </span>
              )}
              {base}
            </h2>
            <SpeakButton text={withArticle(word)} size="lg" />
          </div>
          <span className="mt-2 text-sm opacity-70">
            Tap to see the translation ↻
          </span>
        </div>

        {/* TYŁ: tłumaczenie + przykłady */}
        <div className="flip-back flex min-h-[17rem] flex-col justify-center gap-3 rounded-3xl border-2 border-good bg-surface-2 p-5 text-left sm:p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-heading sm:text-4xl">
              {translationOf(word, lang)}
            </p>
            <p className="text-sm">
              {other === "pl" ? "🇵🇱" : "🇬🇧"} {translationOf(word, other)}
            </p>
          </div>

          {word.example_es && (
            <div className="rounded-2xl bg-surface p-3 text-sm">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-medium text-heading" lang="es">
                  🇪🇸 {word.example_es}
                </p>
                <SpeakButton text={word.example_es} size="sm" />
              </div>
              <p className="mt-1">
                {lang === "pl" ? "🇵🇱" : "🇬🇧"} {exampleOf(word, lang)}
              </p>
            </div>
          )}

          <Grammar word={word} />
        </div>
      </div>
    </div>
  );
}

function Grammar({ word }: { word: Word }) {
  const facts: string[] = [];
  if (word.plural) facts.push(`plural: ${word.plural}`);
  if (word.conjugation) {
    const c = word.conjugation;
    facts.push(`yo ${c.yo} · tú ${c.tú} · él/ella ${c.él_ella}`);
  }
  if (word.participle) facts.push(`participio: ${word.participle}`);

  if (facts.length === 0) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-1.5 text-xs">
      {facts.map((f) => (
        <li key={f} className="rounded-full bg-surface px-2.5 py-1" lang="es">
          {f}
        </li>
      ))}
    </ul>
  );
}

// ── PYTANIE Z 4 ODPOWIEDZIAMI ────────────────────────────────────────────

function ChoiceQuestion({
  word,
  stage,
  lang,
  question,
  picked,
  onChoose,
  onNext,
}: {
  word: Word;
  stage: "recognize" | "recall";
  lang: Lang;
  question: Question;
  picked: string | null;
  onChoose: (option: string) => void;
  onNext: () => void;
}) {
  const prompt =
    stage === "recognize" ? withArticle(word) : translationOf(word, lang);

  return (
    <div className="mt-6 animate-pop">
      <div className="mb-5 flex items-center justify-center gap-3">
        <h2
          className="text-3xl sm:text-4xl"
          lang={stage === "recognize" ? "es" : lang}
        >
          {prompt}
        </h2>
        <SpeakButton text={prompt} lang={stage === "recognize" ? "es" : lang} />
      </div>

      {stage === "recall" && word.example_pl && (
        <p className="mb-5 text-sm italic">“{exampleOf(word, lang)}”</p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {question.options.map((option, i) => {
          let style =
            "border-line bg-surface-2 hover:-translate-y-0.5 hover:border-accent";
          if (picked !== null) {
            if (option === question.correct)
              style = "border-good bg-good-soft text-heading animate-correct";
            else if (option === picked)
              style = "border-bad bg-bad-soft animate-shake";
            else style = "border-line bg-surface-2 opacity-50";
          }

          return (
            <button
              key={option}
              onClick={() => onChoose(option)}
              disabled={picked !== null}
              style={{ "--i": i } as CSSProperties}
              className={`min-w-0 rounded-2xl border-2 px-4 py-3 text-base font-medium transition sm:text-lg ${
                picked === null ? "animate-rise" : ""
              } ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-5 ${picked === null ? "invisible" : "animate-pop"}`}
        aria-hidden={picked === null}
      >
        <p className="mb-3 text-sm">
          {picked === question.correct
            ? "✅ Great!"
            : `❌ ${withArticle(word)} = ${translationOf(word, lang)} — it will come back later.`}
        </p>
        <Button className="w-full sm:w-auto" onClick={onNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}

// ── PODPOWIEDŹ LITER ─────────────────────────────────────────────────────

function HintLetters({
  word,
  revealed,
  done,
}: {
  word: Word;
  revealed: number;
  done: boolean;
}) {
  const { article, base } = splitArticle(word);

  return (
    <p
      className="font-mono text-lg tracking-[0.2em] text-heading sm:text-xl"
      aria-label="Hint"
    >
      {article && (
        <span className="mr-2 tracking-normal opacity-60">{article}</span>
      )}
      {[...base].map((ch, i) =>
        ch === " " ? (
          <span key={i}> </span>
        ) : (
          <span key={i} className={i < revealed || done ? "" : "opacity-40"}>
            {i < revealed || done ? ch : "_"}
          </span>
        ),
      )}
    </p>
  );
}

export default Learn;
