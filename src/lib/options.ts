import type { Lang } from "./vocab";

export const langOptions: { value: Lang; label: string }[] = [
  { value: "pl", label: "🇵🇱 Polish" },
  { value: "en", label: "🇬🇧 English" },
];

export function categoryOptions(categories: string[]) {
  return [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];
}

export function countOptions(available: number, counts = [5, 10, 20, 50]) {
  const options = counts
    .filter((c) => c < available)
    .map((c) => ({ value: c, label: `${c} questions` }));

  options.push({ value: available, label: `All (${available})` });

  return options;
}
