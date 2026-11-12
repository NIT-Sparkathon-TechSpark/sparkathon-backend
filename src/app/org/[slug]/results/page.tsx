import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { pct, intervalText, kOfN, points } from "@/app/results/_lib/format";
import { aiInducedErrors, endedOnWrongAdvice } from "@/app/results/_lib/insights";
import { AiInducedErrorsBanner } from "@/components/results/ai-induced-errors";
import { AutoRefresh } from "@/components/results/auto-refresh";
import { SliceChart, ThreeWayChart, type ConditionBar, type SliceBar } from "@/components/results/charts";
import { TooLittleData } from "@/components/results/notices";
import { RelianceGrid } from "@/components/results/reliance-grid";
import { StatTile } from "@/components/results/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OrgSetSummary } from "@/db/queries/orgs";
import {
  aiAloneAccuracy,
  bootstrap,
  centaurGain,
  humanAIAccuracy,
  humanAloneAccuracy,
  rateInterval,
  sliceBy,
  SLICES,
  summarize,
  type Interval,
  type Rate,
  type Slice,
  type TrialFact,
} from "@/lib/metrics";
import { requireOrg } from "@/lib/org-auth";
import { PRIVATE_SET_SLUG } from "@/lib/sets";
import { OrgTabs } from "../../_components/org-tabs";

export const metadata: Metadata = { title: "Results · The Centaur Test", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * An organization's results: only its own sets, only finished `pilot` sessions (practice runs
 * from "Try it yourself" are left out), aggregates only (hard rule 4).
 */
export default async function OrgResults({ params, searchParams }: PageProps<"/org/[slug]/results">) {
  const { slug } = await params;
  const org = await requireOrg(slug);
  const { set } = await searchParams;
  const requested = typeof set === "string" && PRIVATE_SET_SLUG.test(set) ? set : null;

  let sets: OrgSetSummary[] = [];
  let facts: TrialFact[] = [];
  let failed = false;
  try {
    const { listOrgSets, getOrgFacts } = await import("@/db/queries/orgs");
    sets = await listOrgSets(org.id);
    // A set slug from the link counts only if this organization owns it.
    const setSlug = sets.some((s) => s.slug === requested) ? requested : null;
    facts = await getOrgFacts(org.id, { setSlug });
  } catch (error) {
    console.error("[org] results failed", { org: org.slug, error });
    failed = true;
  }
  const current = sets.find((s) => s.slug === requested) ?? null;
  const s = summarize(facts);

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">{org.name} · Results</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {current ? current.name : "All question sets"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {s.trials} answers from {s.sessions} {s.sessions === 1 ? "person" : "people"} · finished sessions only
            </p>
          </div>
          <AutoRefresh />
        </div>
        <OrgTabs slug={org.slug} active="results" />
        {sets.length > 1 && (
          <nav aria-label="Sets" className="flex flex-wrap gap-2">
            <Chip href={`/org/${org.slug}/results`} active={!current}>
              All sets
            </Chip>
            {sets.map((x) => (
              <Chip key={x.slug} href={`/org/${org.slug}/results?set=${x.slug}`} active={current?.slug === x.slug}>
                {x.name}
              </Chip>
            ))}
          </nav>
        )}
      </header>

      {failed ? (
        <p className="border-hurts/40 bg-hurts-soft rounded-2xl border p-5 text-sm">The results could not be loaded. Try again in a moment.</p>
      ) : s.trials === 0 ? (
        <p className="bg-card/70 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm backdrop-blur">
          No finished sessions yet. Share a set&apos;s participant link from your{" "}
          <Link href={`/org/${org.slug}`} className="underline underline-offset-4">
            dashboard
          </Link>
          ; results appear here as people finish.
        </p>
      ) : (
        <Overview facts={facts} />
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm",
        active ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}

function errorBar(rate: Rate, interval: Interval | null): [number, number] | undefined {
  if (rate.value === null || !interval) return undefined;
  return [(rate.value - interval.low) * 100, (interval.high - rate.value) * 100];
}

const toBars = (slices: Slice[]): SliceBar[] =>
  slices.map((x) => ({
    slice: x.key,
    alone: (x.summary.humanAlone.value ?? 0) * 100,
    withAI: (x.summary.humanAI.value ?? 0) * 100,
  }));

function Overview({ facts }: { facts: TrialFact[] }) {
  const s = summarize(facts);
  const ci = {
    human: rateInterval(facts, humanAloneAccuracy),
    ai: rateInterval(facts, aiAloneAccuracy),
    centaur: rateInterval(facts, humanAIAccuracy),
    gain: bootstrap(facts, centaurGain),
  };
  const bars: ConditionBar[] = [
    { key: "human", label: "People alone", value: (s.humanAlone.value ?? 0) * 100, error: errorBar(s.humanAlone, ci.human) },
    { key: "ai", label: "AI alone", value: (s.aiAlone.value ?? 0) * 100, error: errorBar(s.aiAlone, ci.ai) },
    { key: "centaur", label: "People + AI", value: (s.humanAI.value ?? 0) * 100, error: errorBar(s.humanAI, ci.centaur) },
  ];
  const byCategory = sliceBy(facts, SLICES.category);
  const byDifficulty = sliceBy(facts, SLICES.difficulty);
  const byRationale = sliceBy(facts, SLICES.rationale);
  const advice = recommendations(s, byCategory, byRationale);

  return (
    <div className="flex flex-col gap-6">
      <AiInducedErrorsBanner
        induced={aiInducedErrors(facts)}
        endedWrong={endedOnWrongAdvice(facts)}
        people="one of your people"
      />

      <Card className="border-l-4 border-l-centaur">
        <CardHeader>
          <CardTitle>What this means for your rollout</CardTitle>
          <CardDescription>Read from these results. Check the numbers below before acting on them.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {advice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Three ways to answer your cases</CardTitle>
            <CardDescription>Share of correct answers, with 95% intervals.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThreeWayChart bars={bars} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatTile
            className="col-span-2 lg:col-span-1"
            label="Centaur gain"
            value={points(s.centaurGain)}
            tone={s.centaurGain == null ? "default" : s.centaurGain < 0 ? "hurts" : "helps"}
            interval={intervalText(ci.gain, true)}
          />
          <StatTile label="Over-reliance" value={pct(s.overReliance)} detail={`AI wrong: ${kOfN(s.overReliance)} switched to it`} tone="hurts" />
          <StatTile label="Under-reliance" value={pct(s.underReliance)} detail={`AI right: ${kOfN(s.underReliance)} kept their own`} tone="hurts" />
          <StatTile label="Harmful switch" value={pct(s.harmfulSwitch)} detail={`Right at first, wrong in the end: ${kOfN(s.harmfulSwitch)}`} tone="hurts" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Followed, ignored, or followed too readily</CardTitle>
            <CardDescription>Answers where the person first disagreed with the AI.</CardDescription>
          </CardHeader>
          <CardContent>
            <RelianceGrid grid={s.relianceGrid} />
          </CardContent>
        </Card>
        <SliceCard title="By category" slices={byCategory} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SliceCard title="By difficulty" slices={byDifficulty} />
        <SliceCard title="Answer only, or with the AI's explanation" slices={byRationale} />
      </section>
    </div>
  );
}

function SliceCard({ title, slices }: { title: string; slices: Slice[] }) {
  const shown = slices.filter((x) => x.enoughData);
  const hidden = slices.filter((x) => !x.enoughData);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Accuracy alone and with AI advice.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {shown.length > 0 ? <SliceChart data={toBars(shown)} /> : null}
        {hidden.map((x) => (
          <p key={x.key} className="text-sm">
            {x.key}: <TooLittleData n={x.summary.trials} />
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

const pts = (v: number) => Math.round(v * 100);

/** Plain-language findings for a manager. Only from slices with enough data. */
function recommendations(s: ReturnType<typeof summarize>, byCategory: Slice[], byRationale: Slice[]): string[] {
  const lines: string[] = [];
  const gain = s.centaurGain;
  if (gain !== null) {
    if (gain < -0.02) {
      lines.push(
        `With the AI's advice your people scored ${Math.abs(pts(gain))} points lower than the better of people alone and the AI alone. Don't roll it out as it is.`,
      );
    } else if (gain > 0.02) {
      lines.push(`People with the AI beat both people alone and the AI alone, by ${pts(gain)} points. The combination works.`);
    } else {
      lines.push("People with the AI did about as well as the better of the two on its own: no gain yet from working together.");
    }
  }

  const over = s.overReliance;
  if (over.value !== null && over.n >= 5 && over.value >= 0.4) {
    lines.push(
      `When the AI was wrong and people disagreed with it, they still switched to its answer ${pct(over)} of the time (${kOfN(over)}). Ask for their own answer first, and train on the AI's typical mistakes.`,
    );
  }

  const risky = byCategory
    .filter((x) => x.enoughData && x.summary.overReliance.n >= 3 && x.summary.overReliance.value !== null)
    .sort((a, b) => (b.summary.overReliance.value ?? 0) - (a.summary.overReliance.value ?? 0))[0];
  if (risky && (risky.summary.overReliance.value ?? 0) >= 0.5 && byCategory.length > 1) {
    lines.push(
      `"${risky.key}" cases are the riskiest: wrong advice was followed ${pct(risky.summary.overReliance)} of the time. Add a second check there.`,
    );
  }

  const withExp = byRationale.find((x) => x.key === "Explanation shown");
  const without = byRationale.find((x) => x.key === "Answer only");
  const a = withExp?.summary.overReliance.value;
  const b = without?.summary.overReliance.value;
  if (withExp?.enoughData && without?.enoughData && a != null && b != null && a - b >= 0.1) {
    lines.push(
      `The AI's explanations made people follow wrong advice more often (${pct(a)} with, ${pct(b)} without). A confident explanation is persuasive even when it's wrong.`,
    );
  }

  if (s.wrongAndSurer.value !== null && s.wrongAndSurer.value >= 0.1) {
    lines.push(`${pct(s.wrongAndSurer)} of answers ended wrong but more confident than before: the AI raised confidence without raising accuracy.`);
  }
  if (s.sessions < 10) {
    lines.push(`Based on ${s.sessions} ${s.sessions === 1 ? "person" : "people"} so far; these numbers will move as more take the test.`);
  }
  return lines;
}
