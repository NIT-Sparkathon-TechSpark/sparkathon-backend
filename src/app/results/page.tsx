import type { Metadata } from "next";
import Link from "next/link";
import { ThreeWayChart, type ConditionBar } from "@/components/results/charts";
import { EmptyState } from "@/components/results/notices";
import { PredictionsCard } from "@/components/results/predictions-card";
import { RelianceGrid } from "@/components/results/reliance-grid";
import { ResultsHeader } from "@/components/results/results-header";
import { StatTile } from "@/components/results/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  aiAloneAccuracy,
  centaurGain,
  helpfulSwitch,
  humanAIAccuracy,
  humanAloneAccuracy,
  harmfulSwitch,
  MIN_TRIALS_PER_SLICE,
  overReliance,
  rateInterval,
  bootstrap,
  summarize,
  underReliance,
  wrongAndSurer,
  type Interval,
  type Rate,
  type TrialFact,
} from "@/lib/metrics";
import { filterQuery, parseFilter, type ResultsFilter } from "./_lib/filters";
import { intervalText, kOfN, pct, points } from "./_lib/format";
import { aiInducedErrors, endedOnWrongAdvice, predictions } from "./_lib/insights";
import { loadFacts } from "./_lib/load-facts";

/** Below this many people, one person's habits dominate every number. */
const MIN_SESSIONS = 3;

export const metadata: Metadata = { title: "Results · The Centaur Test" };

function errorBar(rate: Rate, interval: Interval | null): [number, number] | undefined {
  if (rate.value === null || !interval) return undefined;
  return [(rate.value - interval.low) * 100, (interval.high - rate.value) * 100];
}

/** Feature 7: the three-way comparison and the reliance grid. */
export default async function ResultsPage({ searchParams }: PageProps<"/results">) {
  const filter = parseFilter(await searchParams);
  const { facts, source, problem } = await loadFacts(filter);
  const s = summarize(facts);

  return (
    <>
      <ResultsHeader
        active="/results"
        filter={filter}
        trials={s.trials}
        sessions={s.sessions}
        source={source}
        problem={problem}
      />
      {s.trials === 0 ? <EmptyState seeded={filter.seeded} source={source} /> : <Overview facts={facts} filter={filter} />}
    </>
  );
}

function Overview({ facts, filter }: { facts: TrialFact[]; filter: ResultsFilter }) {
  const s = summarize(facts);
  const ci = {
    human: rateInterval(facts, humanAloneAccuracy),
    ai: rateInterval(facts, aiAloneAccuracy),
    centaur: rateInterval(facts, humanAIAccuracy),
    gain: bootstrap(facts, centaurGain),
    over: rateInterval(facts, overReliance),
    under: rateInterval(facts, underReliance),
  };

  const bars: ConditionBar[] = [
    { key: "human", label: "Humans alone", value: (s.humanAlone.value ?? 0) * 100, error: errorBar(s.humanAlone, ci.human) },
    { key: "ai", label: "AI alone", value: (s.aiAlone.value ?? 0) * 100, error: errorBar(s.aiAlone, ci.ai) },
    { key: "centaur", label: "Humans + AI", value: (s.humanAI.value ?? 0) * 100, error: errorBar(s.humanAI, ci.centaur) },
  ];

  const gain = s.centaurGain;
  const better = (s.aiAlone.value ?? 0) >= (s.humanAlone.value ?? 0) ? "the AI alone" : "people alone";
  const induced = aiInducedErrors(facts);
  const endedWrong = endedOnWrongAdvice(facts);
  const disagreements =
    s.relianceGrid.followedRight + s.relianceGrid.followedWrong + s.relianceGrid.ignoredRight + s.relianceGrid.ignoredWrong;

  return (
    <div className="flex flex-col gap-6">
      {(s.trials < MIN_TRIALS_PER_SLICE || s.sessions < MIN_SESSIONS) && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-2 text-sm">
          Only {s.trials} answers from {s.sessions} {s.sessions === 1 ? "person" : "people"} so far.
          These numbers will still change a lot as more people take part.
        </p>
      )}

      <section
        aria-label="Headline"
        className="border-hurts/40 bg-hurts-soft grid gap-4 rounded-xl border p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8"
      >
        <div className="flex flex-col">
          <span className="text-hurts text-xs font-semibold tracking-wide uppercase">AI-induced errors</span>
          <span className="text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">{induced.k}</span>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-base font-medium">
            {induced.k === 1 ? "Once" : `${induced.k} times`}, someone had the right answer, the AI was wrong,
            and they switched to the AI.
          </p>
          <p className="text-muted-foreground">
            That is {pct(induced)} of the {induced.n} times a person was right and the AI wrong. Overall, when the AI
            was wrong, {pct(endedWrong)} of final answers ({kOfN(endedWrong)}) were the AI&apos;s wrong answer.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Same questions, three scores</CardTitle>
            <CardDescription>
              Share of correct answers. The thin lines show how much each number could move (95% interval).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThreeWayChart bars={bars} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatTile
            className="col-span-2 lg:col-span-1"
            label="Centaur gain"
            value={points(gain)}
            tone={gain == null ? "default" : gain < 0 ? "hurts" : "helps"}
            detail={
              gain == null
                ? undefined
                : gain < 0
                  ? `Humans with AI did worse than ${better}.`
                  : `Humans with AI did better than ${better}, the stronger of the two.`
            }
            interval={intervalText(ci.gain, true)}
          />
          <StatTile label="Humans alone" value={pct(s.humanAlone)} detail={kOfN(s.humanAlone)} interval={intervalText(ci.human)} tone="human" />
          <StatTile label="AI alone" value={pct(s.aiAlone)} detail={kOfN(s.aiAlone)} interval={intervalText(ci.ai)} tone="ai" />
          <StatTile label="Humans + AI" value={pct(s.humanAI)} detail={kOfN(s.humanAI)} interval={intervalText(ci.centaur)} tone="centaur" />
        </div>
      </section>

      <PredictionsCard items={predictions(facts, { allSets: filter.set === null })} />

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>What people did when they disagreed with the AI</CardTitle>
            <CardDescription>
              Only the {disagreements} answers where the person&apos;s first answer was different from the
              AI&apos;s. Those are the ones where they had to decide whether to trust it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RelianceGrid grid={s.relianceGrid} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatTile
            label="Over-reliance"
            value={pct(s.overReliance)}
            detail={`AI wrong: ${kOfN(s.overReliance)} switched to it`}
            interval={intervalText(ci.over)}
            tone="hurts"
          />
          <StatTile
            label="Under-reliance"
            value={pct(s.underReliance)}
            detail={`AI right: ${kOfN(s.underReliance)} kept their own`}
            interval={intervalText(ci.under)}
            tone="hurts"
          />
          <StatTile
            label="Harmful switch"
            value={pct(s.harmfulSwitch)}
            detail={`Right at first, wrong in the end: ${kOfN(s.harmfulSwitch)}`}
            tone="hurts"
          />
          <StatTile
            label="Helpful switch"
            value={pct(s.helpfulSwitch)}
            detail={`Wrong at first, right in the end: ${kOfN(s.helpfulSwitch)}`}
            tone="helps"
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href={`/results/breakdowns${filterQuery(filter)}`}
          className="bg-card hover:bg-muted/50 rounded-lg border p-4 transition-colors"
        >
          <span className="font-medium">Where does AI help, and where does it hurt? →</span>
          <p className="text-muted-foreground text-sm">
            Compare by AI right or wrong, explanation shown, difficulty, category, question set and expertise.
          </p>
        </Link>
        <Link
          href={`/results/confidence${filterQuery(filter)}`}
          className="bg-card hover:bg-muted/50 rounded-lg border p-4 transition-colors"
        >
          <span className="font-medium">
            Wrong and surer: {pct(wrongAndSurer(facts))} of answers →
          </span>
          <p className="text-muted-foreground text-sm">
            How confidence moves after advice, for right and wrong final answers.
          </p>
        </Link>
      </section>
    </div>
  );
}
