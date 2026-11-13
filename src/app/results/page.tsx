import type { Metadata } from "next";
import Link from "next/link";
import { ThreeWayChart, type ConditionBar } from "@/components/results/charts";
import { AiFixedErrorsBanner, AiInducedErrorsBanner } from "@/components/results/ai-induced-errors";
import { EmptyState } from "@/components/results/notices";
import { PredictionsCard } from "@/components/results/predictions-card";
import { ScoreBars, verdict } from "@/components/results/score-bars";
import { DetailedNumbers, Dumbbell } from "@/components/results/simple";
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
  sliceBy,
  bootstrap,
  summarize,
  underReliance,
  wrongAndSurer,
  type Interval,
  type Rate,
  type TrialFact,
} from "@/lib/metrics";
import { kindLabel } from "./_lib/dimensions";
import { filterQuery, KIND_NAMES, KINDS, parseFilter, type ResultsFilter } from "./_lib/filters";
import { intervalText, kOfN, pct, points } from "./_lib/format";
import { aiInducedErrors, endedOnWrongAdvice, predictions } from "./_lib/insights";
import { loadFacts } from "./_lib/load-facts";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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

/** A titled block of the overview: one finding, said in the heading, then shown. */
function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {lead && <p className="text-muted-foreground text-sm">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function MoreLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="group bg-card/70 hover:ring-primary/40 flex flex-col gap-1 rounded-3xl p-5 ring-1 ring-foreground/5 transition-shadow"
    >
      <span className="group-hover:text-primary font-semibold transition-colors">{title}</span>
      <span className="text-muted-foreground text-sm">{text}</span>
    </Link>
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
  // The first prediction compares facts with logic, so it needs both in view.
  const predictionItems = predictions(facts, { allSets: filter.set === null && filter.kind !== "context" });
  // Both kinds side by side, only while nothing narrower is chosen. A kind nobody has answered
  // yet still gets its row, so it is plain that it exists and has no numbers.
  const kindSlices = sliceBy(facts, kindLabel);
  const kinds =
    filter.set === null && filter.kind === null
      ? KINDS.map((kind) => ({ name: KIND_NAMES[kind], slice: kindSlices.find((x) => x.key === KIND_NAMES[kind]) }))
      : [];
  const disagreements =
    s.relianceGrid.followedRight + s.relianceGrid.followedWrong + s.relianceGrid.ignoredRight + s.relianceGrid.ignoredWrong;

  const v = verdict(s.humanAlone, s.humanAI, s.aiAlone);
  const early = s.trials < MIN_TRIALS_PER_SLICE || s.sessions < MIN_SESSIONS;
  // Wrong at first, AI right: how many switched to it. The mirror image of the AI-induced errors.
  const aiRightDisagreements = s.relianceGrid.followedRight + s.relianceGrid.ignoredRight;
  const fixed: Rate = {
    k: s.relianceGrid.followedRight,
    n: aiRightDisagreements,
    value: aiRightDisagreements === 0 ? null : s.relianceGrid.followedRight / aiRightDisagreements,
  };

  return (
    <div className="flex flex-col gap-12">
      {/* 1. The answer: one sentence and three bars on one scale */}
      <section
        aria-labelledby="in-short"
        className="bg-card/70 grid gap-8 rounded-3xl p-6 ring-1 ring-foreground/5 shadow-xl shadow-black/5 backdrop-blur md:p-8 lg:grid-cols-[5fr_6fr] lg:items-center lg:gap-14"
      >
        <div className="flex flex-col items-start gap-4">
          {v && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
                v.tone === "helps" && "bg-helps-soft text-helps",
                v.tone === "hurts" && "bg-hurts-soft text-hurts",
                v.tone === "mixed" && "bg-accent text-accent-foreground",
              )}
            >
              {v.label}
            </span>
          )}
          <h2 id="in-short" className="text-2xl leading-snug font-semibold tracking-tight text-balance md:text-3xl">
            {v ? v.text : "Not enough answers yet."}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Share of correct answers on the same questions, answered three ways.
            {early && ` Early numbers: only ${s.sessions} ${s.sessions === 1 ? "person" : "people"} so far.`}
          </p>
        </div>
        <ScoreBars alone={s.humanAlone} withAI={s.humanAI} aiAlone={s.aiAlone} />
      </section>

      {/* 2. Where it helped and where it hurt, as two counts */}
      <Section
        id="trade-off"
        title="The trade-off"
        lead="AI advice changes answers in both directions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AiFixedErrorsBanner fixed={fixed} />
          <AiInducedErrorsBanner induced={induced} endedWrong={endedWrong} />
        </div>
      </Section>

      {/* 3. Reliance: what people did when they and the AI disagreed */}
      <Section
        id="disagreed"
        title="When people and the AI disagreed"
        lead={`${disagreements} of ${s.trials} answers. Did people switch to the AI's answer or keep their own?`}
      >
        <RelianceGrid grid={s.relianceGrid} />
      </Section>

      {/* 4. The same comparison for each kind of question */}
      {kinds.length > 0 && (
        <Section
          id="kinds"
          title="By kind of question"
          lead="Some questions stand alone. Others come with a policy to read first. The sets also differ in topic and difficulty."
        >
          <Dumbbell
            fromLabel="On their own"
            toLabel="With AI advice"
            rows={kinds.map(({ name, slice }) => {
              const alone = slice?.summary.humanAlone.value ?? null;
              const withAI = slice?.summary.humanAI.value ?? null;
              const ok = Boolean(slice?.enoughData) && alone !== null && withAI !== null;
              const delta = ok ? Math.round(withAI! * 100) - Math.round(alone! * 100) : null;
              return {
                label: name,
                n: slice?.summary.trials ?? 0,
                from: ok ? alone! * 100 : null,
                to: ok ? withAI! * 100 : null,
                change: delta === null ? "" : points(delta / 100),
                tone: delta === null || delta === 0 ? "even" : delta > 0 ? "helps" : "hurts",
              };
            })}
          />
        </Section>
      )}

      {/* 5. What the team expected, against what happened */}
      <Section id="predictions" title="What we predicted" lead="Written down before the first answer came in.">
        <PredictionsCard items={predictionItems} />
      </Section>

      {/* 6. The other two views, each with its headline number */}
      <Section id="more" title="Look closer">
        <div className="grid gap-4 md:grid-cols-2">
          <MoreLink
            href={`/results/breakdowns${filterQuery(filter)}`}
            title="Where AI helps or hurts"
            text="Split the scores by topic, difficulty, explanation and more."
          />
          <MoreLink
            href={`/results/confidence${filterQuery(filter)}`}
            title="Wrong but surer"
            text={`${pct(wrongAndSurer(facts))} of answers ended wrong with more confidence than before the advice.`}
          />
        </div>
      </Section>

      <DetailedNumbers>
        <div className="flex flex-col gap-6">
          <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Three scores, with 95% intervals</CardTitle>
                <CardDescription>
                  The thin lines show how much each number could move, from resampling whole sessions.
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
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          </section>
        </div>
      </DetailedNumbers>
    </div>
  );
}
