import type { Metadata } from "next";
import { SliceChart } from "@/components/results/charts";
import { EmptyState, TooLittleData } from "@/components/results/notices";
import { FilterMenu } from "@/components/results/filter-menu";
import { ResultsHeader } from "@/components/results/results-header";
import { Dumbbell, InShort, listOf, DetailedNumbers } from "@/components/results/simple";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sliceBy, summarize, type Slice } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { DIMENSIONS, parseDimension, sliceLabel, type DimensionKey } from "../_lib/dimensions";
import { filterQuery, parseFilter } from "../_lib/filters";
import { pct, points } from "../_lib/format";
import { loadFacts } from "../_lib/load-facts";

export const metadata: Metadata = { title: "Helps or hurts · The Centaur Test" };

/** "Question set" to "question set", but "AI right or wrong" stays as it is. */
const lowerFirst = (label: string) => (label.startsWith("AI") ? label : label[0].toLowerCase() + label.slice(1));

/** A group as it reads in a sentence: "questions where the AI was wrong", "history questions". */
const groupName = (key: string) => {
  const label = sliceLabel(key);
  if (/^AI (right|wrong)$/.test(label)) return `when the AI was ${label.slice(3)}`;
  return `on ${label} questions`;
};

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
  const { facts, source, problem } = await loadFacts(filter);
  const total = summarize(facts);

  const slices = sliceBy(facts, DIMENSIONS[by].keyOf).map((slice) => ({ slice, ...verdictOf(slice) }));
  const hurts = slices.filter((s) => s.verdict === "hurts");
  const helps = slices.filter((s) => s.verdict === "helps");
  const judged = slices.filter((s) => s.verdict !== "unknown").length;
  const others = (n: number) => (n === 1 ? "one other group" : `${n} other groups`);
  const summary =
    judged === 0
      ? "Not enough answers yet."
      : hurts.length > 0
        ? `AI advice hurt ${listOf(hurts.map((h) => groupName(h.slice.key)))}${
            helps.length === 0
              ? ""
              : helps.length <= 2
                ? `, and helped ${listOf(helps.map((h) => groupName(h.slice.key)))}`
                : ` and helped in ${others(helps.length)}`
          }.`
        : helps.length === judged
          ? "AI advice helped in every group."
          : `AI advice helped in ${helps.length} of ${judged} groups, and never hurt.`;
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
        source={source}
        problem={problem}
      />


      {total.trials === 0 ? (
        <EmptyState seeded={filter.seeded} source={source} />
      ) : (
        <>
          <InShort>
            {summary}
          </InShort>

          <section aria-label="Groups" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Correct answers by group</h2>
            <FilterMenu
              label="Split by"
              align="end"
              options={(Object.keys(DIMENSIONS) as DimensionKey[]).map((key) => ({
                href: `/results/breakdowns${filterQuery(filter, { by: key })}`,
                label: DIMENSIONS[key].label,
                active: key === by,
              }))}
            />
          </div>
          <Dumbbell
            fromLabel="On their own"
            toLabel="With AI advice"
            rows={slices.map(({ slice, verdict, delta }) => ({
              label: sliceLabel(slice.key),
              n: slice.summary.trials,
              from: slice.enoughData && slice.summary.humanAlone.value !== null ? slice.summary.humanAlone.value * 100 : null,
              to: slice.enoughData && slice.summary.humanAI.value !== null ? slice.summary.humanAI.value * 100 : null,
              change: points(delta),
              tone: verdict === "helps" ? "helps" : verdict === "hurts" ? "hurts" : "even",
            }))}
          />
          </section>

          <DetailedNumbers>
          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Alone versus with AI</CardTitle>
                <CardDescription>Share of correct answers, for groups with at least 10 answers.</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <SliceChart data={chartData} />
                ) : (
                  <p className="text-muted-foreground text-sm">No group has enough data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By {lowerFirst(DIMENSIONS[by].label)}</CardTitle>
                <CardDescription>
                  Over-reliance: the AI was wrong and the person first disagreed. The share who switched to it
                  anyway.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="py-2 pr-3 font-medium">Group</th>
                      <th className="py-2 pr-3 text-right font-medium">Answers</th>
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
          </DetailedNumbers>
        </>
      )}
    </>
  );
}
