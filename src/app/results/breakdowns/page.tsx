import type { Metadata } from "next";
import Link from "next/link";
import { SliceChart } from "@/components/results/charts";
import { EmptyState, TooLittleData } from "@/components/results/notices";
import { ResultsHeader } from "@/components/results/results-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sliceBy, summarize, type Slice } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { DIMENSIONS, parseDimension, sliceLabel, type DimensionKey } from "../_lib/dimensions";
import { filterQuery, parseFilter } from "../_lib/filters";
import { pct, points } from "../_lib/format";
import { loadFacts } from "../_lib/load-facts";

export const metadata: Metadata = { title: "Helps or hurts · The Centaur Test" };

type Verdict = "helps" | "hurts" | "even" | "unknown";

function verdictOf(slice: Slice): { verdict: Verdict; delta: number | null } {
  const { humanAlone, humanAI } = slice.summary;
  const delta = humanAlone.value === null || humanAI.value === null ? null : humanAI.value - humanAlone.value;
  if (!slice.enoughData || delta === null) return { verdict: "unknown", delta };
  return { verdict: delta > 0 ? "helps" : delta < 0 ? "hurts" : "even", delta };
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "helps") return <Badge variant="helps">AI helps here</Badge>;
  if (verdict === "hurts") return <Badge variant="hurts">AI hurts here</Badge>;
  if (verdict === "even") return <Badge variant="muted">No change</Badge>;
  return <Badge variant="outline">Too little data</Badge>;
}

/** Feature 9: split the comparison by a condition and call out where people got worse. */
export default async function BreakdownsPage({ searchParams }: PageProps<"/results/breakdowns">) {
  const params = await searchParams;
  const filter = parseFilter(params);
  const by = parseDimension(params.by);
  const { facts, source } = await loadFacts(filter);
  const total = summarize(facts);

  const slices = sliceBy(facts, DIMENSIONS[by].keyOf).map((slice) => ({ slice, ...verdictOf(slice) }));
  const hurts = slices.filter((s) => s.verdict === "hurts");
  const chartData = slices
    .filter((s) => s.slice.enoughData)
    .map(({ slice }) => ({
      slice: sliceLabel(slice.key),
      alone: (slice.summary.humanAlone.value ?? 0) * 100,
      withAI: (slice.summary.humanAI.value ?? 0) * 100,
    }));

  return (
    <>
      <ResultsHeader
        active="/results/breakdowns"
        filter={filter}
        extra={{ by }}
        trials={total.trials}
        sessions={total.sessions}
        demo={source === "demo"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground mr-1 text-sm">Split by</span>
        {(Object.keys(DIMENSIONS) as DimensionKey[]).map((key) => (
          <Link
            key={key}
            href={`/results/breakdowns${filterQuery(filter, { by: key })}`}
            aria-current={key === by ? "true" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              key === by
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted text-foreground",
            )}
          >
            {DIMENSIONS[key].label}
          </Link>
        ))}
      </div>

      {total.trials === 0 ? (
        <EmptyState seeded={filter.seeded} />
      ) : (
        <>
          <section
            className={cn(
              "rounded-xl border p-5",
              hurts.length > 0 ? "border-hurts/40 bg-hurts-soft" : "bg-card",
            )}
          >
            {hurts.length > 0 ? (
              <>
                <h2 className="text-hurts text-lg font-semibold">
                  People got worse with AI in {hurts.length === 1 ? "this slice" : `these ${hurts.length} slices`}
                </h2>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {hurts.map(({ slice, delta }) => (
                    <li key={slice.key}>
                      <strong className="font-medium">{sliceLabel(slice.key)}</strong>: accuracy went from{" "}
                      {pct(slice.summary.humanAlone)} alone to {pct(slice.summary.humanAI)} with AI (
                      {points(delta)}), and {pct(slice.summary.overReliance)} of disagreements on wrong advice
                      ended with the AI&apos;s answer.
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm">
                No slice with enough data shows people doing worse with AI when split by{" "}
                {DIMENSIONS[by].label.toLowerCase()}.
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Alone versus with AI</CardTitle>
                <CardDescription>Share correct, slices with at least 10 answers.</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <SliceChart data={chartData} />
                ) : (
                  <p className="text-muted-foreground text-sm">No slice has enough data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By {DIMENSIONS[by].label.toLowerCase()}</CardTitle>
                <CardDescription>
                  Over-reliance: AI wrong and the person first disagreed, share who switched to it.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="py-2 pr-3 font-medium">Slice</th>
                      <th className="py-2 pr-3 text-right font-medium">n</th>
                      <th className="py-2 pr-3 text-right font-medium">Alone</th>
                      <th className="py-2 pr-3 text-right font-medium">With AI</th>
                      <th className="py-2 pr-3 text-right font-medium">Change</th>
                      <th className="py-2 pr-3 text-right font-medium">Over-reliance</th>
                      <th className="py-2 font-medium">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slices.map(({ slice, verdict, delta }) => (
                      <tr key={slice.key} className={cn("border-b last:border-0", !slice.enoughData && "text-muted-foreground")}>
                        <td className="py-2.5 pr-3 font-medium">{sliceLabel(slice.key)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{slice.summary.trials}</td>
                        {slice.enoughData ? (
                          <>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{pct(slice.summary.humanAlone)}</td>
                            <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{pct(slice.summary.humanAI)}</td>
                            <td
                              className={cn(
                                "py-2.5 pr-3 text-right tabular-nums",
                                verdict === "hurts" && "text-hurts font-medium",
                                verdict === "helps" && "text-helps font-medium",
                              )}
                            >
                              {points(delta)}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">
                              {pct(slice.summary.overReliance)}
                              <span className="text-muted-foreground text-xs"> /{slice.summary.overReliance.n}</span>
                            </td>
                          </>
                        ) : (
                          <td colSpan={4} className="py-2.5 pr-3 text-right">
                            <TooLittleData n={slice.summary.trials} />
                          </td>
                        )}
                        <td className="py-2.5">
                          <VerdictBadge verdict={verdict} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
