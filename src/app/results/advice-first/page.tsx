import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/results/auto-refresh";
import { DataSourceNotice, TooLittleData } from "@/components/results/notices";
import { StudySwitch } from "@/components/results/results-header";
import { Bars, DetailedNumbers, InShort } from "@/components/results/simple";
import { StatTile } from "@/components/results/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bootstrap,
  catchRate,
  followedWrongRate,
  inForm,
  medianSeconds,
  MIN_TRIALS_PER_SLICE,
  orderGap,
  rightWhenAIRight,
  type Form,
  type Rate,
  type TrialFact,
} from "@/lib/metrics";
import { intervalText, kOfN, pct, points } from "../_lib/format";
import { loadExperimentFacts } from "../_lib/load-facts";

export const metadata: Metadata = { title: "AI shown first · The Centaur Test" };

// Always read the database fresh, like the other results screens.
export const dynamic = "force-dynamic";

const PREDICTION = "People catch fewer AI mistakes when the advice is shown before they answer.";

const VERDICTS = {
  supported: { label: "Confirmed", variant: "helps" },
  opposite: { label: "The opposite", variant: "hurts" },
  unclear: { label: "Not clear yet", variant: "muted" },
  "too-little-data": { label: "Not enough answers yet", variant: "outline" },
} as const;

const seconds = (value: number | null) => (value === null ? "—" : `${Math.round(value)} s`);

/**
 * Spec 0002: the same bank alerts in two forms. On half of them the AI advice is on screen from
 * the start, on the other half the person answers first. This page compares how many AI mistakes
 * are caught in each form. Only computed aggregates leave this component (hard rule 4).
 */
export default async function AdviceFirstPage({ searchParams }: PageProps<"/results/advice-first">) {
  // ?label=practice shows the team's own test runs, so the page can be checked before the study starts.
  const practice = (await searchParams).label === "practice";
  const { facts, source, problem } = await loadExperimentFacts({ practice });
  const answered = inForm(facts, "adviceFirst").length + inForm(facts, "answerFirst").length;
  const sessions = new Set(facts.map((t) => t.sessionId)).size;

  return (
    <>
      <header className="flex flex-col gap-4">
        <StudySwitch active="/results/advice-first" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Do people miss more AI mistakes when they see the AI first?
            </h1>
            {practice && <p className="text-muted-foreground text-sm">Practice runs</p>}
          </div>
          <AutoRefresh />
        </div>

        {source === "demo" ? (
          <div className="bg-ai/5 rounded-xl px-4 py-2 text-sm">
            <strong className="font-medium">No database connected.</strong>{" "}
            <span className="text-muted-foreground">
              This experiment has no example data. Set DATABASE_URL to see real answers.
            </span>
          </div>
        ) : (
          <DataSourceNotice source={source} problem={problem} />
        )}
      </header>

      {practice && (
        <p role="status" className="bg-hurts-soft rounded-xl px-4 py-2 text-sm">
          <strong className="font-medium">Practice runs.</strong>{" "}
          <span className="text-muted-foreground">The team&apos;s own tests, not the study.</span>
        </p>
      )}

      {source === "database" && answered === 0 && (
        <div className="text-muted-foreground bg-secondary/40 rounded-3xl p-10 text-center text-sm">
          Nobody has finished the bank alerts yet.
        </div>
      )}

      {answered > 0 && <Comparison facts={facts} sessions={sessions} />}
    </>
  );
}

function Comparison({ facts, sessions }: { facts: TrialFact[]; sessions: number }) {
  const caught: Record<Form, Rate> = {
    adviceFirst: catchRate(facts, "adviceFirst"),
    answerFirst: catchRate(facts, "answerFirst"),
  };
  const enough = caught.adviceFirst.n >= MIN_TRIALS_PER_SLICE && caught.answerFirst.n >= MIN_TRIALS_PER_SLICE;
  const gap = enough ? bootstrap(facts, orderGap) : null;
  const verdict: keyof typeof VERDICTS = !gap
    ? "too-little-data"
    : gap.low > 0
      ? "supported"
      : gap.high < 0
        ? "opposite"
        : "unclear";
  const v = VERDICTS[verdict];

  const rows: { label: string; hint: string; value: (form: Form) => string; base: (form: Form) => string }[] = [
    {
      label: "Right when the AI was right",
      hint: "What answering first costs, if anything",
      value: (f) => pct(rightWhenAIRight(facts, f)),
      base: (f) => kOfN(rightWhenAIRight(facts, f)),
    },
    {
      label: "Ended on the AI's wrong answer",
      hint: "Of the answers where the AI was wrong",
      value: (f) => pct(followedWrongRate(facts, f)),
      base: (f) => kOfN(followedWrongRate(facts, f)),
    },
    {
      label: "Median time per alert",
      hint: "Both steps added together for “answered first”",
      value: (f) => seconds(medianSeconds(facts, f)),
      base: () => "",
    },
  ];

  const a = caught.answerFirst.value;
  const f = caught.adviceFirst.value;
  const sentence = !enough || a === null || f === null
    ? "Not enough answers yet."
    : Math.round(a * 100) === Math.round(f * 100)
      ? `People caught ${pct(caught.answerFirst)} of AI mistakes either way.`
      : `People caught ${pct(caught.answerFirst)} of AI mistakes answering first, ${pct(caught.adviceFirst)} seeing the AI first.`;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
        <InShort>
          {sentence}
        </InShort>
        {enough && (
        <Bars
          rows={[
            {
              label: "Answered first",
              value: enough && a !== null ? a * 100 : null,
              bar: "bg-human",
              text: "text-human",
            },
            {
              label: "Saw the AI first",
              value: enough && f !== null ? f * 100 : null,
              bar: "bg-ai",
              text: "text-ai",
            },
          ]}
        />
        )}
      </section>

      <p className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Our guess:</span>
        <span className="font-medium">&ldquo;{PREDICTION}&rdquo;</span>
        <Badge variant={v.variant}>{v.label}</Badge>
      </p>

      <DetailedNumbers>
      <section aria-label="AI mistakes caught" className="grid gap-3 md:grid-cols-3">
        <StatTile
          label="AI mistakes caught · AI shown first"
          value={enough ? pct(caught.adviceFirst) : "—"}
          detail={
            enough ? (
              `AI wrong: ${kOfN(caught.adviceFirst)} final answers were still right`
            ) : (
              <TooLittleData n={caught.adviceFirst.n} />
            )
          }
          tone="ai"
        />
        <StatTile
          label="AI mistakes caught · answered first"
          value={enough ? pct(caught.answerFirst) : "—"}
          detail={
            enough ? (
              `AI wrong: ${kOfN(caught.answerFirst)} final answers were still right`
            ) : (
              <TooLittleData n={caught.answerFirst.n} />
            )
          }
          tone="human"
        />
        <StatTile
          label="Gap (answered first minus AI shown first)"
          value={gap ? points(gap.estimate) : "—"}
          detail={`${sessions} ${sessions === 1 ? "person" : "people"}, each with both kinds of alert`}
          interval={intervalText(gap, true)}
          tone={verdict === "supported" ? "hurts" : verdict === "opposite" ? "helps" : "default"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Our prediction <Badge variant={v.variant}>{v.label}</Badge>
          </CardTitle>
          <CardDescription>
            &ldquo;{PREDICTION}&rdquo; It counts as supported only when the whole 95% interval of the gap is above
            zero, and each kind needs at least {MIN_TRIALS_PER_SLICE} answers where the AI was wrong.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Also worth knowing
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  AI shown first
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  Answered first
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    {row.label}
                    <span className="text-muted-foreground block text-xs">{row.hint}</span>
                  </th>
                  {(["adviceFirst", "answerFirst"] as const).map((form) => (
                    <td key={form} className="px-3 py-2 text-right tabular-nums last:pr-0">
                      {row.value(form)}
                      {row.base(form) && <span className="text-muted-foreground block text-xs">{row.base(form)}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      </DetailedNumbers>
    </div>
  );
}
