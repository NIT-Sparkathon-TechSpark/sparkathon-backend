import type { SessionLabel } from "@/db/schema";
import type { TrialFact } from "@/lib/metrics";
import { demoFacts } from "./demo-facts";
import { MIXED_SETS } from "@/lib/sets";
import type { ResultsFilter } from "./filters";

export type FactsSource = "database" | "demo" | "unavailable";

/** Why the database could not be read, in words the team can act on. */
export type FactsProblem = "missing-tables" | "query-failed";

export type LoadedFacts = { facts: TrialFact[]; source: FactsSource; problem?: FactsProblem };

/** Postgres "undefined_table": the migrations have not been applied to this database branch. */
function isMissingTable(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    if (code === "42P01") return true;
    if (typeof message === "string" && /relation .* does not exist/.test(message)) return true;
  }
  return false;
}

/**
 * Server only. Loads answered responses for the results screens and /live.
 *
 * With DATABASE_URL set, reads Neon through P2's query. Without it (a fresh clone with no
 * `.env.local`), falls back to generated demo data so the screens can be reviewed; every
 * screen then shows a "demo data" banner. The rows never leave the server: pages pass only
 * computed aggregates to the browser (CLAUDE.md hard rule 4).
 *
 * If the database cannot be read (for example the migrations have not run on this branch), the
 * screens say so instead of failing with a 500. The full error goes to the server log only.
 */
export async function loadFacts(filter: ResultsFilter): Promise<LoadedFacts> {
  const labels: SessionLabel[] = filter.seeded ? ["pilot", "seeded"] : ["pilot"];
  // Judges take `judge-demo` with ?label=judge during the pitch. Their answers count only in that
  // set's view, so the live demo shows them and they never mix into the pilot findings.
  if (filter.set === "judge-demo") labels.push("judge");

  if (!process.env.DATABASE_URL) {
    return { facts: demoFacts(filter, labels), source: "demo" };
  }

  try {
    // Imported lazily: the database module throws at import time when DATABASE_URL is missing.
    const { getTrialFacts } = await import("@/db/queries/trial-facts");
    // Experiment sets (spec 0002) have their own page and never mix into these screens.
    const facts = await getTrialFacts({
      sets: filter.set ? [filter.set] : undefined,
      excludeSets: [...MIXED_SETS],
      labels,
    });
    return { facts, source: "database" };
  } catch (error) {
    const problem: FactsProblem = isMissingTable(error) ? "missing-tables" : "query-failed";
    console.error("[results] loadFacts failed", { problem, filter, error });
    return { facts: [], source: "unavailable", problem };
  }
}

/**
 * Server only. Completed pilot sessions of the advice first experiment (spec 0002), for
 * /results/advice-first. There is no generated demo data for this set: without a database the
 * page says so. A database without the `advice_first` column counts as unavailable.
 * `practice` shows the team's own test runs instead of the study, so the page can be checked
 * before the first participant; the two are never mixed.
 */
export async function loadExperimentFacts({ practice = false } = {}): Promise<LoadedFacts> {
  if (!process.env.DATABASE_URL) return { facts: [], source: "demo" };
  try {
    const { getTrialFacts } = await import("@/db/queries/trial-facts");
    const facts = await getTrialFacts({ sets: [...MIXED_SETS], labels: [practice ? "practice" : "pilot"] });
    return { facts, source: "database" };
  } catch (error) {
    const problem: FactsProblem = isMissingTable(error) ? "missing-tables" : "query-failed";
    console.error("[results] loadExperimentFacts failed", { problem, error });
    return { facts: [], source: "unavailable", problem };
  }
}
