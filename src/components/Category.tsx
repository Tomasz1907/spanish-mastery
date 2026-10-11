import type { CategoryData } from "../lib/vocab";
import WordCard from "./WordCard";

type Props = {
  data: CategoryData;
};

function Category({ data }: Props) {
  return (
    <section className="py-5">
      <h2 className="mb-4 text-left">
        {data.category}{" "}
        <span className="text-base font-normal opacity-60">
          ({data.items.length})
        </span>
      </h2>

      <div className="words grid gap-4 sm:grid-cols-2">
        {data.items.map((item) => (
          <WordCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default Category;
