import type { Rate } from "@/lib/metrics";

const pct = (r: Rate) => (r.value === null ? "—" : `${Math.round(r.value * 100)}%`);

/**
 * The headline of every results screen: how often a right answer was switched to the AI's wrong
 * one. Takes aggregates only (from `aiInducedErrors` and `endedOnWrongAdvice` in
 * src/app/results/_lib/insights.ts), so it is safe on public and organization pages alike.
 */
export function AiInducedErrorsBanner({
  induced,
  endedWrong,
  people = "someone",
}: {
  induced: Rate;
  endedWrong: Rate;
  /** Who answered, as the reader would say it: "someone", "one of your people". */
  people?: string;
}) {
  return (
    <section
      aria-label="AI-induced errors"
      className="border-hurts/40 bg-hurts-soft grid gap-4 rounded-xl border p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8"
    >
      <div className="flex flex-col">
        <span className="text-hurts text-xs font-semibold tracking-wide uppercase">AI-induced errors</span>
        <span className="text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">{induced.k}</span>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-base font-medium">
          {induced.k === 0
            ? `Nobody switched from a right answer to the AI's wrong one.`
            : `${induced.k === 1 ? "Once" : `${induced.k} times`}, ${people} had the right answer, the AI was wrong, and they switched to the AI.`}
        </p>
        <p className="text-muted-foreground">
          That is {pct(induced)} of the {induced.n} times a person was right and the AI wrong. Overall, when the AI was
          wrong, {pct(endedWrong)} of final answers ({endedWrong.k} of {endedWrong.n}) were the AI&apos;s wrong answer.
        </p>
      </div>
    </section>
  );
}
