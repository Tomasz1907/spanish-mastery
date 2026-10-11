import { splitArticle, type WordItem } from "../lib/vocab";

type Props = {
  item: WordItem;
};

function WordCard({ item }: Props) {
  const { article, base } = splitArticle(item);
  const hasDetails =
    item.example_es ||
    item.conjugation ||
    item.plural ||
    item.gerund ||
    item.participle;

  return (
    <article className="card flex flex-col rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-accent hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl">
          {article && (
            <span className="font-normal opacity-60">{article} </span>
          )}
          {base}
        </h3>

        <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
          {item.part_of_speech}
        </span>
      </div>

      <p className="mt-2">🇵🇱 {item.translation_pl}</p>
      <p>🇬🇧 {item.translation_en}</p>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-2 px-2 py-0.5 text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {hasDetails && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-heading">
            Details
          </summary>

          <div className="mt-2 flex flex-col gap-1">
            {item.gender && (
              <p>
                <b>Rodzaj:</b> {item.gender}
              </p>
            )}

            {item.plural && (
              <p>
                <b>Liczba mnoga:</b> {item.plural}
              </p>
            )}

            {item.example_es && (
              <div className="mt-1 rounded-xl bg-surface-2 p-3">
                <p>🇪🇸 {item.example_es}</p>
                <p>🇵🇱 {item.example_pl}</p>
                <p>🇬🇧 {item.example_en}</p>
              </div>
            )}

            {item.conjugation && (
              <div className="mt-1">
                <b>Conjugation</b>
                <ul className="grid grid-cols-2 gap-x-3">
                  <li>yo: {item.conjugation.yo}</li>
                  <li>tú: {item.conjugation.tú}</li>
                  <li>él/ella: {item.conjugation.él_ella}</li>
                  <li>nosotros: {item.conjugation.nosotros}</li>
                  <li>vosotros: {item.conjugation.vosotros}</li>
                  <li>ellos: {item.conjugation.ellos}</li>
                </ul>
              </div>
            )}

            {item.gerund && (
              <p>
                <b>Gerundio:</b> {item.gerund}
              </p>
            )}

            {item.participle && (
              <p>
                <b>Participio:</b> {item.participle}
              </p>
            )}

            {item.regular !== undefined && (
              <p>
                <b>Regularny:</b> {item.regular ? "tak" : "nie"}
              </p>
            )}
          </div>
        </details>
      )}
    </article>
  );
}

export default WordCard;
