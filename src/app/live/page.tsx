import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { filterQuery, parseFilter, SET_NAMES } from "@/app/results/_lib/filters";
import { pct, points } from "@/app/results/_lib/format";
import { aiInducedErrors, endedOnWrongAdvice } from "@/app/results/_lib/insights";
import { loadFacts } from "@/app/results/_lib/load-facts";
import { AutoRefresh } from "@/components/results/auto-refresh";
import { ThreeWayChart } from "@/components/results/charts";
import { DataSourceNotice } from "@/components/results/notices";
import { StatTile } from "@/components/results/stat-tile";
import { MIN_TRIALS_PER_SLICE, summarize } from "@/lib/metrics";

export const metadata: Metadata = { title: "Live · The Centaur Test" };

/**
 * Projector view for the pitch (team plan, A5: open 10 minutes early to warm the database).
 * Large type, dark background, refreshes every 5 seconds. Aggregates only.
 */
export default async function LivePage({ searchParams }: PageProps<"/live">) {
  const filter = parseFilter(await searchParams);
  const { facts, source, problem } = await loadFacts(filter);
  const s = summarize(facts);
  const gain = s.centaurGain;
  // The judge link from the team plan, shown big on the projector during the pitch.
  const host = (await headers()).get("host");
  const jury = filter.set === "judge-demo";
  const joinUrl = jury && host ? `${host}/s/judge-demo?label=judge` : null;
  const induced = aiInducedErrors(facts);
  const endedWrong = endedOnWrongAdvice(facts);

  return (
    <main className="dark bg-background text-foreground flex min-h-dvh flex-1 flex-col gap-8 px-6 py-8 md:px-12 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            The Centaur Test · live
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Does AI advice make people better, or worse?
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <AutoRefresh />
          <span className="text-muted-foreground text-sm tabular-nums">
            {s.sessions} people · {s.trials} answers
            {filter.set ? ` · ${SET_NAMES[filter.set]}` : ""}
          </span>
        </div>
      </header>

      <DataSourceNotice source={source} problem={problem} />

      {jury && <JuryPanel joinUrl={joinUrl} people={s.sessions} endedWrong={endedWrong} />}

      {source === "unavailable" ? null : s.trials === 0 ? (
        jury ? null : <p className="text-muted-foreground flex flex-1 items-center justify-center text-2xl">
          Waiting for the first answers…
        </p>
      ) : (
        <div className="grid flex-1 gap-8 lg:grid-cols-[3fr_2fr]">
          <section className="flex flex-col justify-center">
            <ThreeWayChart
              large
              bars={[
                { key: "human", label: "Humans alone", value: (s.humanAlone.value ?? 0) * 100 },
                { key: "ai", label: "AI alone", value: (s.aiAlone.value ?? 0) * 100 },
                { key: "centaur", label: "Humans + AI", value: (s.humanAI.value ?? 0) * 100 },
              ]}
            />
          </section>

          <section className="grid content-center gap-4">
            <StatTile
              size="lg"
              label="Centaur gain"
              value={points(gain)}
              tone={gain == null ? "default" : gain < 0 ? "hurts" : "helps"}
              detail="Humans + AI minus the better of humans alone and AI alone"
            />
            <StatTile
              size="lg"
              tone="hurts"
              label="Followed wrong advice"
              value={pct(s.overReliance)}
              detail={`${s.overReliance.k} of ${s.overReliance.n} times the AI was wrong and they first disagreed`}
            />
            <StatTile
              size="lg"
              tone="hurts"
              label="AI-induced errors"
              value={String(induced.k)}
              detail={`Times someone had it right, the AI was wrong, and they switched to the AI (of ${induced.n})`}
            />
            <StatTile
              size="lg"
              tone="hurts"
              label="Wrong and surer"
              value={pct(s.wrongAndSurer)}
              detail="Ended wrong, with more confidence than before the advice"
            />
          </section>
        </div>
      )}

      <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {s.trials > 0 && (s.trials < MIN_TRIALS_PER_SLICE || s.sessions < 3)
            ? `Early numbers: ${s.trials} answers from ${s.sessions} ${s.sessions === 1 ? "person" : "people"} so far.`
            : "Directional evidence, not proof."}
        </span>
        <Link href={`/results${filterQuery(filter)}`} className="hover:text-foreground">
          Full results →
        </Link>
      </footer>
    </main>
  );
}

/**
 * The live jury test (pitch format: "working demo, live jury test"). Judges scan the code and
 * answer three questions; question 2 carries wrong AI advice. The headline updates as they answer.
 */
function JuryPanel({
  joinUrl,
  people,
  endedWrong,
}: {
  joinUrl: string | null;
  people: number;
  endedWrong: ReturnType<typeof endedOnWrongAdvice>;
}) {
  return (
    <section className="grid gap-8 rounded-2xl border p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
      <div className="flex flex-col items-center gap-3">
        {/* Static QR for the production judge link: https://sparkathon-hazel.vercel.app/s/judge-demo?label=judge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/judge-qr.svg"
          alt="QR code: open the judge demo on your phone"
          width={260}
          height={260}
          className="size-56 rounded-xl bg-white p-3 md:size-64"
        />
        <span className="text-muted-foreground text-sm">3 questions · about 1 minute</span>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-2xl font-semibold md:text-4xl">Scan, answer alone, then see what the AI says.</p>
        {joinUrl && (
          <p className="text-muted-foreground font-mono text-base break-all md:text-lg">{joinUrl}</p>
        )}
        {endedWrong.n > 0 ? (
          <p className="text-xl md:text-3xl">
            When the AI was wrong,{" "}
            <span className="text-hurts font-semibold tabular-nums">
              {endedWrong.k} of {endedWrong.n}
            </span>{" "}
            of your final answers went with it.
          </p>
        ) : (
          <p className="text-muted-foreground text-xl md:text-2xl">
            {people === 0 ? "Waiting for the first judge…" : `${people} answering… one of the questions has wrong AI advice.`}
          </p>
        )}
      </div>
    </section>
  );
}
