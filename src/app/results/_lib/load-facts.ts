import type { SessionLabel } from "@/db/schema";
import type { TrialFact } from "@/lib/metrics";
import { demoFacts } from "./demo-facts";
import type { ResultsFilter } from "./filters";

export type FactsSource = "database" | "demo";

/**
 * Server only. Loads answered responses for the results screens and /live.
 *
 * With DATABASE_URL set, reads Neon through P2's query. Without it (a fresh clone with no
 * `.env.local`), falls back to generated demo data so the screens can be reviewed; every
 * screen then shows a "demo data" banner. The rows never leave the server: pages pass only
 * computed aggregates to the browser (CLAUDE.md hard rule 4).
 */
export async function loadFacts(
  filter: ResultsFilter,
): Promise<{ facts: TrialFact[]; source: FactsSource }> {
  const labels: SessionLabel[] = filter.seeded ? ["pilot", "seeded"] : ["pilot"];

  if (!process.env.DATABASE_URL) {
    return { facts: demoFacts(filter, labels), source: "demo" };
  }

  // Imported lazily: the database module throws at import time when DATABASE_URL is missing.
  const { getTrialFacts } = await import("@/db/queries/trial-facts");
  const facts = await getTrialFacts({ sets: filter.set ? [filter.set] : undefined, labels });
  return { facts, source: "database" };
}
