import type { FactsProblem, FactsSource } from "@/app/results/_lib/load-facts";
import { MIN_TRIALS_PER_SLICE } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** Shown on every results screen while the numbers come from generated demo data. */
export function DemoDataBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-dashed border-ai/60 bg-ai/5 px-4 py-2 text-sm">
      <strong className="font-medium">Demo data.</strong>{" "}
      <span className="text-muted-foreground">
        No database is connected (DATABASE_URL is not set), so these numbers are generated
        examples, not real responses.
      </span>
    </div>
  );
}

/** Shown instead of numbers when the database could not be read. */
export function UnavailableBanner({ problem }: { problem?: FactsProblem }) {
  return (
    <div role="alert" className="border-hurts/50 bg-hurts-soft rounded-lg border px-4 py-3 text-sm">
      <strong className="text-hurts font-medium">Results are unavailable right now.</strong>{" "}
      <span className="text-muted-foreground">
        {problem === "missing-tables"
          ? "The database has no tables yet: the migrations have not been applied to this environment (pnpm db:migrate)."
          : "The database could not be read. Details are in the server log."}
      </span>
    </div>
  );
}

/** The banner that fits where the numbers came from: demo data, or no data at all. */
export function DataSourceNotice({ source, problem }: { source: FactsSource; problem?: FactsProblem }) {
  if (source === "demo") return <DemoDataBanner show />;
  if (source === "unavailable") return <UnavailableBanner problem={problem} />;
  return null;
}

/** Team plan: every slice shows n and says "too little data" below 10 responses. */
export function TooLittleData({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("text-muted-foreground text-xs italic", className)}>
      Too little data (n = {n}, needs {MIN_TRIALS_PER_SLICE})
    </span>
  );
}

export function EmptyState({ seeded, source }: { seeded: boolean; source?: FactsSource }) {
  // The banner above already explains an unreadable database; "no answers yet" would mislead.
  if (source === "unavailable") return null;
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
      No completed answers yet for this selection.
      {!seeded && " Seeded sessions are switched off."}
    </div>
  );
}
