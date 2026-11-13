import type { RelianceGrid as Grid } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type Outcome = { count: number; action: string; name: string; good: boolean };

/**
 * One half of the problem statement's 2×2: what people did when the AI was right, or when it
 * was wrong. A single bar split in two, so it is plain that the two shares add up to 100%.
 */
function Split({ heading, total, switched, kept }: { heading: string; total: number; switched: Outcome; kept: Outcome }) {
  const share = (k: number) => (total === 0 ? null : Math.round((k / total) * 100));
  const parts = [switched, kept];
  return (
    <div className="bg-card/70 flex flex-col gap-4 rounded-3xl p-5 ring-1 ring-foreground/5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{heading}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {total} {total === 1 ? "time" : "times"}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">This has not happened yet.</p>
      ) : (
        <>
          <div aria-hidden className="flex h-3 gap-1">
            {parts.map(
              (p) =>
                p.count > 0 && (
                  <span
                    key={p.name}
                    className={cn("h-full min-w-1.5 rounded-full", p.good ? "bg-helps" : "bg-hurts")}
                    style={{ flexGrow: p.count, flexBasis: 0 }}
                  />
                ),
            )}
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {parts.map((p) => (
              <div key={p.name} className="flex flex-col gap-0.5">
                <dd className="text-3xl font-semibold tracking-tight tabular-nums">{share(p.count)}%</dd>
                <dt className="flex flex-col text-sm">
                  <span className={cn("font-semibold", p.good ? "text-helps" : "text-hurts")}>{p.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.action} · {p.count} of {total}
                  </span>
                </dt>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

/**
 * The problem statement's 2×2: followed or ignored the AI, by whether the AI was right.
 * Counts only disagreement trials (first answer differed from the AI's), where reliance shows.
 * Same four names as the home page, so people recognise them.
 */
export function RelianceGrid({ grid }: { grid: Grid }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Split
        heading="When the AI was right"
        total={grid.followedRight + grid.ignoredRight}
        switched={{ count: grid.followedRight, action: "Switched to the AI", name: "It helped them", good: true }}
        kept={{ count: grid.ignoredRight, action: "Kept their own answer", name: "They missed out", good: false }}
      />
      <Split
        heading="When the AI was wrong"
        total={grid.followedWrong + grid.ignoredWrong}
        switched={{ count: grid.followedWrong, action: "Switched to the AI", name: "It fooled them", good: false }}
        kept={{ count: grid.ignoredWrong, action: "Kept their own answer", name: "They caught it", good: true }}
      />
    </div>
  );
}
