import type { Rate } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const round = (r: Rate) => (r.value === null ? null : Math.round(r.value * 100));

export type VerdictTone = "helps" | "hurts" | "mixed";

/**
 * The one-sentence answer to "did AI advice help?", from the three scores. Plain words only:
 * the numbers sit right next to it in the bars, so the sentence does not repeat them.
 */
export function verdict(
  alone: Rate,
  withAI: Rate,
  aiAlone: Rate,
): { label: string; text: string; tone: VerdictTone } | null {
  const h = round(alone);
  const c = round(withAI);
  const a = round(aiAlone);
  if (h === null || c === null || a === null) return null;
  if (c > Math.max(h, a)) {
    return { label: "AI helped", text: "Together, people and AI beat both on their own.", tone: "helps" };
  }
  if (c < Math.min(h, a)) {
    return { label: "AI hurt", text: "AI advice left people worse off than either on their own.", tone: "hurts" };
  }
  if (a >= h) {
    if (c === h) {
      return { label: "No gain", text: "AI advice did not move people's scores, and the AI alone did better.", tone: "mixed" };
    }
    return {
      label: "Mixed result",
      text: "AI advice made people better, but not as good as the AI alone.",
      tone: "mixed",
    };
  }
  if (c === h) {
    return { label: "No gain", text: "People beat the AI, and its advice made no difference.", tone: "mixed" };
  }
  return { label: "AI hurt", text: "People beat the AI on their own, and its advice pulled them down.", tone: "hurts" };
}

/** "+12 pts" from two rounded percentages, so the chip always agrees with the numbers shown. */
function gap(to: number, from: number): string {
  const d = to - from;
  if (d === 0) return "±0 pts";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)} ${Math.abs(d) === 1 ? "pt" : "pts"}`;
}

/**
 * Three bars on one shared 0–100 scale: on their own, with AI advice, and the AI by itself.
 * The "with AI advice" row carries the change against people on their own, which is the result.
 */
export function ScoreBars({ alone, withAI, aiAlone }: { alone: Rate; withAI: Rate; aiAlone: Rate }) {
  const h = round(alone);
  const c = round(withAI);
  const delta = h === null || c === null ? null : c - h;
  const rows = [
    { label: "People on their own", rate: alone, bar: "bg-human", text: "text-human", main: false },
    { label: "People with AI advice", rate: withAI, bar: "bg-centaur", text: "text-centaur", main: true },
    { label: "AI alone", rate: aiAlone, bar: "bg-ai", text: "text-ai", main: false },
  ];
  return (
    <ul className="flex flex-col gap-5">
      {rows.map((row) => {
        const v = round(row.rate);
        return (
          <li key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              {row.label}
              {row.main && delta !== null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    delta > 0 && "bg-helps-soft text-helps",
                    delta < 0 && "bg-hurts-soft text-hurts",
                    delta === 0 && "bg-muted text-muted-foreground",
                  )}
                >
                  {gap(c!, h!)} vs on their own
                </span>
              )}
            </span>
            <span
              className={cn(
                "row-span-2 min-w-[4.5ch] text-right text-4xl font-semibold tracking-tight tabular-nums md:text-5xl",
                row.text,
              )}
            >
              {v === null ? "—" : `${v}%`}
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="bg-secondary h-3 overflow-hidden rounded-full">
                <span className={cn("block h-full rounded-full", row.bar)} style={{ width: `${v ?? 0}%` }} />
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {row.rate.k} of {row.rate.n} correct
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
