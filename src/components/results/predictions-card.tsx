import type { Prediction, Verdict } from "@/app/results/_lib/insights";
import { Badge } from "@/components/ui/badge";
import { MIN_TRIALS_PER_SLICE, type Rate } from "@/lib/metrics";

const VERDICTS: Record<Verdict, { label: string; variant: "helps" | "hurts" | "muted" | "outline" }> = {
  supported: { label: "Confirmed", variant: "helps" },
  opposite: { label: "The opposite", variant: "hurts" },
  unclear: { label: "Not clear yet", variant: "muted" },
  "too-little-data": { label: "Not enough answers yet", variant: "outline" },
  "not-applicable": { label: "Needs all topics", variant: "outline" },
};

const pct = (r: Rate) => (r.value === null ? "—" : `${Math.round(r.value * 100)}%`);
const pts = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(Math.round(v * 100))}`;

/** The numbers behind a verdict, shown on hover and in the detailed numbers. */
export function detail(p: Prediction): string {
  if (p.verdict === "not-applicable") return p.note ?? "";
  const diff = p.difference
    ? ` · difference ${pts(p.difference.estimate)} pts, 95% CI ${pts(p.difference.low)} to ${pts(p.difference.high)}`
    : "";
  return `${p.groups[0]} ${pct(p.values[0])} (n ${p.values[0].n}) vs ${p.groups[1]} ${pct(p.values[1])} (n ${p.values[1].n})${diff}. Confirmed means the 95% interval excludes zero, with at least ${MIN_TRIALS_PER_SLICE} answers per group.`;
}

/**
 * The team's predictions with a verdict from the data so far, and the two numbers the verdict
 * compares. A prediction only counts as confirmed when the whole 95% interval of the difference
 * is on the predicted side.
 */
export function PredictionsCard({ items }: { items: Prediction[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {items.map((p) => {
        const v = VERDICTS[p.verdict];
        const compared = p.verdict !== "not-applicable" && p.verdict !== "too-little-data";
        return (
          <li
            key={p.id}
            title={detail(p)}
            className="bg-card/70 flex flex-col gap-3 rounded-3xl p-5 ring-1 ring-foreground/5"
          >
            <Badge variant={v.variant}>{v.label}</Badge>
            <p className="flex-1 leading-snug font-medium">{p.claim}</p>
            {compared ? (
              <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-muted-foreground text-xs">{p.measure}</p>
                <dl className="grid grid-cols-2 gap-3">
                  {p.groups.map((group, i) => (
                    <div key={group} className="flex flex-col">
                      <dd className="text-xl font-semibold tabular-nums">{pct(p.values[i])}</dd>
                      <dt className="text-muted-foreground text-xs">{group}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-muted-foreground border-t pt-3 text-xs">
                {p.verdict === "not-applicable"
                  ? p.note
                  : `Needs at least ${MIN_TRIALS_PER_SLICE} answers in each group.`}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
