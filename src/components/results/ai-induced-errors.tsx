import type { Rate } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const pct = (r: Rate) => (r.value === null ? "—" : `${Math.round(r.value * 100)}%`);
const times = (k: number) => (k === 1 ? "time" : "times");

/** One big count with a plain sentence beside it and, underneath, exactly what was counted. */
function Callout({
  tone,
  count,
  title,
  detail,
  label,
  hint,
}: {
  tone: "helps" | "hurts";
  count: number;
  title: string;
  detail: string;
  label: string;
  hint?: string;
}) {
  return (
    <section
      aria-label={label}
      title={hint}
      className={cn(
        "grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1 rounded-3xl p-5 md:p-6",
        tone === "helps" ? "bg-helps-soft" : "bg-hurts-soft",
      )}
    >
      <span
        className={cn(
          "row-span-2 text-5xl leading-none font-semibold tracking-tight tabular-nums md:text-6xl",
          tone === "helps" ? "text-helps" : "text-hurts",
        )}
      >
        {count}
      </span>
      <p className="self-end text-base leading-snug font-semibold md:text-lg">{title}</p>
      <p className="text-foreground/70 self-start text-sm leading-snug">{detail}</p>
    </section>
  );
}

/**
 * The cost of AI advice in one number: how often a right answer was switched to the AI's wrong
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
    <Callout
      tone="hurts"
      label="AI-induced errors"
      count={induced.k}
      title={
        induced.k === 0
          ? `The AI never talked ${people} out of a right answer.`
          : `${times(induced.k)} the AI talked ${people} out of a right answer`
      }
      detail={
        induced.n === 0
          ? "No one has had a right answer against wrong advice yet."
          : `They were right, the AI was wrong, and they switched: ${pct(induced)} of the ${induced.n} times that could happen.`
      }
      hint={`When the AI was wrong, ${pct(endedWrong)} of final answers went with it.`}
    />
  );
}

/**
 * The other side of the same coin: how often a wrong answer was switched to the AI's right one.
 * `fixed` is the top row of the reliance grid: k switched, out of n wrong answers against right advice.
 */
export function AiFixedErrorsBanner({ fixed, people = "someone" }: { fixed: Rate; people?: string }) {
  return (
    <Callout
      tone="helps"
      label="Errors fixed by AI advice"
      count={fixed.k}
      title={
        fixed.k === 0
          ? `AI advice has not yet turned a wrong answer into a right one.`
          : `${times(fixed.k)} AI advice turned ${people === "someone" ? "a" : `${people}'s`} wrong answer into a right one`
      }
      detail={
        fixed.n === 0
          ? "No one has had a wrong answer against right advice yet."
          : `They were wrong, the AI was right, and they switched: ${pct(fixed)} of the ${fixed.n} times that could happen.`
      }
    />
  );
}
