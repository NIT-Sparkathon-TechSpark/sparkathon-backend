import type { Prediction, Verdict } from "@/app/results/_lib/insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_TRIALS_PER_SLICE, type Rate } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const VERDICTS: Record<Verdict, { label: string; variant: "helps" | "hurts" | "muted" | "outline" }> = {
  supported: { label: "Supported", variant: "helps" },
  opposite: { label: "Opposite found", variant: "hurts" },
  unclear: { label: "No clear difference yet", variant: "muted" },
  "too-little-data": { label: "Too little data", variant: "outline" },
  "not-applicable": { label: "Needs all sets", variant: "outline" },
};

const pct = (r: Rate) => (r.value === null ? "—" : `${Math.round(r.value * 100)}%`);
const pts = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(Math.round(v * 100))}`;

/**
 * The team's predictions with a verdict from the data so far. A prediction only counts as
 * supported when the whole 95% interval of the difference is on the predicted side.
 */
export function PredictionsCard({ items }: { items: Prediction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Our three predictions, tested</CardTitle>
        <CardDescription>
          Written down before the pilot. &ldquo;Supported&rdquo; means the 95% interval of the difference
          excludes zero; each group needs at least {MIN_TRIALS_PER_SLICE} answers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col divide-y">
          {items.map((p, i) => {
            const v = VERDICTS[p.verdict];
            return (
              <li key={p.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:gap-4">
                <span className="text-muted-foreground w-5 shrink-0 font-mono text-sm">{i + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium">{p.claim}</p>
                  {p.verdict === "not-applicable" ? (
                    <p className="text-muted-foreground text-xs">{p.note}</p>
                  ) : (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {p.groups[0]} {pct(p.values[0])} (n {p.values[0].n}) vs {p.groups[1]} {pct(p.values[1])} (n{" "}
                      {p.values[1].n})
                      {p.difference &&
                        ` · difference ${pts(p.difference.estimate)} pts, 95% CI ${pts(p.difference.low)} to ${pts(p.difference.high)}`}
                    </p>
                  )}
                </div>
                <Badge variant={v.variant} className={cn("md:mt-0.5")}>
                  {v.label}
                </Badge>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
