import type { Metadata } from "next";
import { ConfidenceChart, ShiftChart, type ConfidenceBar, type ShiftBar } from "@/components/results/charts";
import { EmptyState, TooLittleData } from "@/components/results/notices";
import { ResultsHeader } from "@/components/results/results-header";
import { StatTile } from "@/components/results/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  aiCorrect,
  complete,
  finalCorrect,
  MIN_TRIALS_PER_SLICE,
  rateInterval,
  summarize,
  wrongAndSurer,
  type CompleteTrial,
} from "@/lib/metrics";
import { parseFilter } from "../_lib/filters";
import { intervalText, kOfN, pct, points, signed } from "../_lib/format";
import { loadFacts } from "../_lib/load-facts";

export const metadata: Metadata = { title: "Confidence · The Centaur Test" };

const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

type Group = { label: string; trials: CompleteTrial[] };

function confidenceRow({ label, trials }: Group) {
  return {
    label,
    n: trials.length,
    before: mean(trials.map((t) => t.firstConfidence)),
    after: mean(trials.map((t) => t.finalConfidence)),
    shift: mean(trials.map((t) => t.finalConfidence - t.firstConfidence)),
  };
}

function shiftShares({ label, trials }: Group): ShiftBar {
  const n = trials.length || 1;
  const up = trials.filter((t) => t.finalConfidence > t.firstConfidence).length;
  const down = trials.filter((t) => t.finalConfidence < t.firstConfidence).length;
  return { group: label, up: (up / n) * 100, same: ((n - up - down) / n) * 100, down: (down / n) * 100 };
}

/** Feature 10: the second meaning of "worse", feeling surer of a wrong answer. */
export default async function ConfidencePage({ searchParams }: PageProps<"/results/confidence">) {
  const filter = parseFilter(await searchParams);
  const { facts, source, problem } = await loadFacts(filter);
  const s = summarize(facts);
  const done = complete(facts);

  const byFinal: Group[] = [
    { label: "Ended right", trials: done.filter(finalCorrect) },
    { label: "Ended wrong", trials: done.filter((t) => !finalCorrect(t)) },
  ];
  const byAI: Group[] = [
    { label: "AI right", trials: done.filter(aiCorrect) },
    { label: "AI wrong", trials: done.filter((t) => !aiCorrect(t)) },
  ];
  const rows = [...byFinal, ...byAI].map(confidenceRow);
  const chartData: ConfidenceBar[] = rows
    .filter((r) => r.n >= MIN_TRIALS_PER_SLICE && r.before !== null && r.after !== null)
    .map((r) => ({ group: r.label, before: r.before!, after: r.after! }));

  const surer = wrongAndSurer(facts);
  const surerCI = rateInterval(facts, wrongAndSurer);
  const wrongAdvice = facts.filter((t) => !aiCorrect(t));
  const surerOnWrongAdvice = wrongAndSurer(wrongAdvice);
  const endedWrong = byFinal[1].trials;
  const surerAmongWrong = endedWrong.filter((t) => t.finalConfidence > t.firstConfidence).length;

  return (
    <>
      <ResultsHeader
        active="/results/confidence"
        filter={filter}
        trials={s.trials}
        sessions={s.sessions}
        source={source}
        problem={problem}
      />

      {s.trials === 0 ? (
        <EmptyState seeded={filter.seeded} source={source} />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid gap-3 md:grid-cols-3">
            <StatTile
              size="lg"
              tone="hurts"
              label="Wrong and surer"
              value={pct(surer)}
              detail={`${kOfN(surer)} answers ended wrong with more confidence than before advice`}
              interval={intervalText(surerCI)}
            />
            <StatTile
              tone="hurts"
              label="When the AI was wrong"
              value={pct(surerOnWrongAdvice)}
              detail={`${kOfN(surerOnWrongAdvice)} answers on wrong advice ended wrong and surer`}
            />
            <StatTile
              tone="ai"
              label="Of the answers that ended wrong"
              value={endedWrong.length === 0 ? "—" : `${Math.round((surerAmongWrong / endedWrong.length) * 100)}%`}
              detail={`${surerAmongWrong} of ${endedWrong.length} had gained confidence`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Confidence before and after advice</CardTitle>
                <CardDescription>Average confidence, from 25 (just guessing) to 100 (certain).</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ConfidenceChart data={chartData} />
                ) : (
                  <p className="text-muted-foreground text-sm">No group has enough data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Did confidence go up or down?</CardTitle>
                <CardDescription>Share of answers, by whether the final answer was right.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {byFinal.every((g) => g.trials.length >= MIN_TRIALS_PER_SLICE) ? (
                  <ShiftChart data={byFinal.map(shiftShares)} />
                ) : (
                  <TooLittleData n={Math.min(...byFinal.map((g) => g.trials.length))} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Confidence change after advice</CardTitle>
                <CardDescription>Confidence after the advice minus confidence before it, in points.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="py-2 pr-3 font-medium">Group</th>
                      <th className="py-2 pr-3 text-right font-medium">Answers</th>
                      <th className="py-2 pr-3 text-right font-medium">Before</th>
                      <th className="py-2 pr-3 text-right font-medium">After</th>
                      <th className="py-2 text-right font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-b last:border-0">
                        <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{r.n}</td>
                        {r.n >= MIN_TRIALS_PER_SLICE ? (
                          <>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{r.before?.toFixed(0)}</td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{r.after?.toFixed(0)}</td>
                            <td className="py-2.5 text-right font-medium tabular-nums">{signed(r.shift)}</td>
                          </>
                        ) : (
                          <td colSpan={3} className="py-2.5 text-right">
                            <TooLittleData n={r.n} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>More sure than right?</CardTitle>
                <CardDescription>
                  Average confidence minus share correct (calibration). Above zero means people were more sure
                  than they were right.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatTile label="Before advice" value={points(s.calibrationGap.before)} tone="human" />
                <StatTile label="After advice" value={points(s.calibrationGap.after)} tone="centaur" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
