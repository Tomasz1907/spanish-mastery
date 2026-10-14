// Kontrolowana lista tagów (każde słowo ma dokładnie 3) i poziomy CEFR.

export type CefrLevel = "A1" | "A2" | "B1" | "B2";

export const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2"];

export const LEVEL_NAMES: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
};

export type TagGroup = "topic" | "meaning" | "usage";

// temat (o czym jest słowo), znaczenie (co robi w zdaniu), użycie (jak go używamy)
const GROUPS: Record<TagGroup, string[]> = {
  topic: [
    "travel",
    "transport",
    "accommodation",
    "food",
    "drinks",
    "cooking",
    "restaurant",
    "shopping",
    "money",
    "clothing",
    "fashion",
    "home",
    "furniture",
    "household",
    "family",
    "relationships",
    "people",
    "body",
    "health",
    "emotions",
    "personality",
    "appearance",
    "nature",
    "weather",
    "animals",
    "environment",
    "city",
    "directions",
    "work",
    "business",
    "education",
    "technology",
    "communication",
    "language",
    "time",
    "emergency",
    "law",
    "leisure",
  ],
  meaning: [
    "action",
    "movement",
    "description",
    "quantity",
    "size",
    "place",
    "frequency",
    "comparison",
    "opinion",
    "greetings",
    "politeness",
    "questions",
    "connector",
    "condition",
    "cause",
    "contrast",
    "possession",
    "person",
    "reference",
  ],
  usage: [
    "everyday",
    "formal",
    "informal",
    "expression",
    "grammar",
    "reflexive",
    "irregular",
  ],
};

export const TAG_GROUP: Record<string, TagGroup> = Object.fromEntries(
  (Object.keys(GROUPS) as TagGroup[]).flatMap((g) =>
    GROUPS[g].map((t) => [t, g]),
  ),
);

export const GROUP_INFO: Record<
  TagGroup,
  { label: string; description: string; color: string }
> = {
  // kolory sprawdzone walidatorem palety (jasny i ciemny motyw)
  topic: {
    label: "Topic",
    description: "what the word is about",
    color: "#d97706",
  },
  meaning: {
    label: "Meaning",
    description: "what the word does in a sentence",
    color: "#2563eb",
  },
  usage: {
    label: "Usage",
    description: "how and when the word is used",
    color: "#16a34a",
  },
};

export function prettyTag(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, " ");
}
