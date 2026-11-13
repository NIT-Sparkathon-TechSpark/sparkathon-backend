import { SLICES, type CompleteTrial } from "@/lib/metrics";
import { KIND_NAMES, kindOf, SET_NAMES, type SetSlug } from "./filters";

/** "Question only", "With a policy to read", or the set's own name when it is in neither kind. */
export const kindLabel = (t: CompleteTrial) => {
  const kind = kindOf(t.setSlug);
  return kind ? KIND_NAMES[kind] : (SET_NAMES[t.setSlug as SetSlug] ?? t.setSlug);
};

/** Breakdown dimensions for feature 9. Keys appear in the URL as `?by=`. */
export const DIMENSIONS = {
  aiCorrect: { label: "AI right or wrong", keyOf: SLICES.aiCorrect },
  rationale: { label: "Explanation shown", keyOf: SLICES.rationale },
  difficulty: { label: "Difficulty", keyOf: SLICES.difficulty },
  category: { label: "Category", keyOf: SLICES.category },
  kind: { label: "Kind of question", keyOf: kindLabel },
  set: {
    label: "Question set",
    keyOf: (t: CompleteTrial) => SET_NAMES[t.setSlug as SetSlug] ?? t.setSlug,
  },
  firstConfidence: {
    label: "Confidence before advice",
    keyOf: (t: CompleteTrial) =>
      t.firstConfidence < 50 ? "1 · Unsure (25–45)" : t.firstConfidence < 75 ? "2 · Middle (50–70)" : "3 · Sure (75–100)",
  },
  expertise: { label: "Self-rated expertise", keyOf: SLICES.expertise },
} as const;

export type DimensionKey = keyof typeof DIMENSIONS;

export function parseDimension(value: string | string[] | undefined): DimensionKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v in DIMENSIONS ? (v as DimensionKey) : "aiCorrect";
}

/** Strips the "1 · " ordering prefix used to sort bands. */
export const sliceLabel = (key: string) => key.replace(/^\d · /, "");
