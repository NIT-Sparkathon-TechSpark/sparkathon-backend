/**
 * Export answered trials as CSV for the analysis and the submission (scope feature 13).
 *
 *   pnpm db:export                         pilot sessions only, completed ones
 *   pnpm db:export --labels pilot,seeded   choose labels
 *   pnpm db:export --all                   include unfinished sessions
 *   pnpm db:export --sets logic,facts      choose sets (default: the public sets, never an organization's)
 *
 * Writes exports/trials-<timestamp>.csv and prints the headline numbers. No nicknames are
 * exported; session ids are random and carry no personal data.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTrialFacts } from "../src/db/queries/trial-facts";
import type { SessionLabel } from "../src/db/schema";
import { SESSION_LABELS } from "../src/db/schema";
import { summarize, type TrialFact } from "../src/lib/metrics";
import { SET_SLUGS } from "../src/lib/sets";

const args = process.argv.slice(2);
const labelsArg = args.indexOf("--labels");
const labels = (labelsArg >= 0 ? args[labelsArg + 1].split(",") : ["pilot"]) as SessionLabel[];
for (const l of labels) {
  if (!SESSION_LABELS.includes(l)) throw new Error(`Unknown label "${l}"`);
}

const COLUMNS: (keyof TrialFact)[] = [
  "sessionId",
  "label",
  "setSlug",
  "taskId",
  "position",
  "category",
  "difficulty",
  "selfRatedExpertise",
  "rationaleShown",
  "adviceFirst",
  "correctIndex",
  "adviceIndex",
  "firstAnswer",
  "firstConfidence",
  "finalAnswer",
  "finalConfidence",
  "msFirst",
  "msFinal",
];

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);

async function main() {
  const setsArg = args.indexOf("--sets");
  const sets = setsArg >= 0 ? args[setsArg + 1].split(",") : [...SET_SLUGS];
  const rows = await getTrialFacts({ sets, labels, completedOnly: !args.includes("--all") });
  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","))].join("\n");

  const dir = path.join(process.cwd(), "exports");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `trials-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
  await writeFile(file, csv + "\n", "utf8");

  const s = summarize(rows);
  console.log(`Wrote ${rows.length} trials from ${s.sessions} sessions (${labels.join(", ")}) to ${file}`);
  console.log(
    `Human alone ${pct(s.humanAlone.value)} · AI alone ${pct(s.aiAlone.value)} · Human + AI ${pct(s.humanAI.value)} · ` +
      `centaur gain ${s.centaurGain === null ? "n/a" : `${(s.centaurGain * 100).toFixed(1)} pts`} · ` +
      `over-reliance ${pct(s.overReliance.value)} (n=${s.overReliance.n})`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
