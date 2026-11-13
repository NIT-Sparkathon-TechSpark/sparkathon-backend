import { z } from "zod";

/** Question sets (amendments A1). */
export const SETS = ["logic", "facts", "acme", "judge-demo"] as const;
export type SetSlug = (typeof SETS)[number];

export const SET_NAMES: Record<SetSlug, string> = {
  logic: "Logic & probability",
  facts: "Facts",
  acme: "Acme refunds",
  "judge-demo": "Judge demo",
};

/**
 * Two kinds of question in the public sets: the question on its own, or the question with a
 * text to read first (the Acme refund policy). A kind is a group of sets, nothing more: the sets
 * also differ in topic and difficulty, so a gap between kinds is not the effect of the text alone.
 */
export const KINDS = ["qna", "context"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_NAMES: Record<Kind, string> = {
  qna: "Question only",
  context: "With a policy to read",
};

export const KIND_SETS: Record<Kind, readonly SetSlug[]> = {
  qna: ["logic", "facts"],
  context: ["acme"],
};

/** The kind a set belongs to, or null (the judge demo mixes both). */
export const kindOf = (slug: string): Kind | null =>
  KINDS.find((kind) => (KIND_SETS[kind] as readonly string[]).includes(slug)) ?? null;

/** The sets a filter reads: one set, the sets of one kind, or every set. */
export const setsOf = (filter: Pick<ResultsFilter, "set" | "kind">): readonly SetSlug[] =>
  filter.set ? [filter.set] : filter.kind ? KIND_SETS[filter.kind] : SETS;

export type ResultsFilter = {
  /** One set, or null for every set. */
  set: SetSlug | null;
  /** One kind of question, or null for every kind. Ignored when one set is chosen. */
  kind: Kind | null;
  /** Include `seeded` sessions (amendments A3: on unless `?seeded=off`). */
  seeded: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const filterSchema = z.object({
  set: z.enum(SETS).nullable().catch(null),
  kind: z.enum(KINDS).nullable().catch(null),
  seeded: z.boolean(),
});

/** Link parameters are user input: anything unknown falls back to the default. */
export function parseFilter(searchParams: SearchParams): ResultsFilter {
  const parsed = filterSchema.parse({
    set: first(searchParams.set) ?? null,
    kind: first(searchParams.kind) ?? null,
    seeded: first(searchParams.seeded) !== "off",
  });
  // One set is narrower than a kind, so it wins.
  return parsed.set ? { ...parsed, kind: null } : parsed;
}

/** Builds a query string for a filter plus any extra parameters, dropping defaults. */
export function filterQuery(filter: ResultsFilter, extra: Record<string, string | null> = {}) {
  const params = new URLSearchParams();
  if (filter.set) params.set("set", filter.set);
  else if (filter.kind) params.set("kind", filter.kind);
  if (!filter.seeded) params.set("seeded", "off");
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}
