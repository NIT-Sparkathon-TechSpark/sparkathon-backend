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

export type ResultsFilter = {
  /** One set, or null for every set. */
  set: SetSlug | null;
  /** Include `seeded` sessions (amendments A3: on unless `?seeded=off`). */
  seeded: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const filterSchema = z.object({
  set: z.enum(SETS).nullable().catch(null),
  seeded: z.boolean(),
});

/** Link parameters are user input: anything unknown falls back to the default. */
export function parseFilter(searchParams: SearchParams): ResultsFilter {
  return filterSchema.parse({
    set: first(searchParams.set) ?? null,
    seeded: first(searchParams.seeded) !== "off",
  });
}

/** Builds a query string for a filter plus any extra parameters, dropping defaults. */
export function filterQuery(filter: ResultsFilter, extra: Record<string, string | null> = {}) {
  const params = new URLSearchParams();
  if (filter.set) params.set("set", filter.set);
  if (!filter.seeded) params.set("seeded", "off");
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}
