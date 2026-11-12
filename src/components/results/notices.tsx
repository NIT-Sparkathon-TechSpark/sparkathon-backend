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

/** Team plan: every slice shows n and says "too little data" below 10 responses. */
export function TooLittleData({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("text-muted-foreground text-xs italic", className)}>
      Too little data (n = {n}, needs {MIN_TRIALS_PER_SLICE})
    </span>
  );
}

export function EmptyState({ seeded }: { seeded: boolean }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
      No completed answers yet for this selection.
      {!seeded && " Seeded sessions are switched off."}
    </div>
  );
}
