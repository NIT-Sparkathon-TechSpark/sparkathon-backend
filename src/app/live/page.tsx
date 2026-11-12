import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { filterQuery, parseFilter, SET_NAMES } from "@/app/results/_lib/filters";
import { pct, points } from "@/app/results/_lib/format";
import { loadFacts } from "@/app/results/_lib/load-facts";
import { AutoRefresh } from "@/components/results/auto-refresh";
import { ThreeWayChart } from "@/components/results/charts";
import { DemoDataBanner } from "@/components/results/notices";
import { StatTile } from "@/components/results/stat-tile";
import { MIN_TRIALS_PER_SLICE, summarize } from "@/lib/metrics";

export const metadata: Metadata = { title: "Live · The Centaur Test" };

/**
 * Projector view for the pitch (team plan, A5: open 10 minutes early to warm the database).
 * Large type, dark background, refreshes every 5 seconds. Aggregates only.
 */
export default async function LivePage({ searchParams }: PageProps<"/live">) {
  const filter = parseFilter(await searchParams);
  const { facts, source } = await loadFacts(filter);
  const s = summarize(facts);
  const gain = s.centaurGain;
  // The judge link from the team plan, shown big on the projector during the pitch.
  const host = (await headers()).get("host");
  const joinUrl = filter.set === "judge-demo" && host ? `${host}/s/judge-demo?label=judge` : null;

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
          {joinUrl && (
            <p className="mt-3 text-xl md:text-2xl">
              Take the test: <span className="text-centaur font-mono font-semibold break-all">{joinUrl}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <AutoRefresh />
          <span className="text-muted-foreground text-sm tabular-nums">
            {s.sessions} people · {s.trials} answers
            {filter.set ? ` · ${SET_NAMES[filter.set]}` : ""}
          </span>
        </div>
      </header>

      <DemoDataBanner show={source === "demo"} />

      {s.trials === 0 ? (
        <p className="text-muted-foreground flex flex-1 items-center justify-center text-2xl">
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
