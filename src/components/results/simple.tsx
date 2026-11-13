import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Building blocks for results that read in a few seconds: one plain sentence first, simple
 * visuals second, and the technical numbers folded away at the bottom.
 */

/** The one-sentence answer at the top of a results tab. */
export function InShort({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <section
      aria-label="In short"
      className="bg-card/70 flex flex-col items-start gap-3 rounded-3xl p-6 ring-1 ring-foreground/5 shadow-xl shadow-black/5 backdrop-blur md:p-8"
    >
      <p className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
        In short
      </p>
      <p className="max-w-3xl text-2xl leading-snug font-semibold tracking-tight text-balance md:text-3xl">{children}</p>
      {sub && <p className="text-muted-foreground leading-relaxed">{sub}</p>}
    </section>
  );
}

/** The full numbers (intervals, counts, tables). Results people need, so never hidden behind a click. */
export function DetailedNumbers({ children, title = "The detailed numbers" }: { children: ReactNode; title?: string }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Method notes and other background, closed until someone asks for it. */
export function MoreDetails({ children, label = "Show the detailed numbers" }: { children: ReactNode; label?: string }) {
  return (
    <details className="group/details">
      <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer list-none text-sm font-medium transition-colors">
        <span aria-hidden className="inline-block transition-transform group-open/details:rotate-90">
          ›
        </span>{" "}
        {label}
      </summary>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </details>
  );
}

/** Horizontal bars with one big number each, on a 0–100 scale. */
export function Bars({
  rows,
}: {
  rows: { label: string; value: number | null; bar: string; text: string; display?: string }[];
}) {
  return (
    <ul className="flex flex-col gap-5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[1fr_auto] items-end gap-x-4 gap-y-2">
          <span className="text-sm font-medium">{row.label}</span>
          <span className={cn("row-span-2 self-center text-4xl font-semibold tracking-tight tabular-nums", row.text)}>
            {row.display ?? (row.value === null ? "—" : `${Math.round(row.value)}%`)}
          </span>
          <span className="bg-secondary/70 h-3 overflow-hidden rounded-full">
            <span
              className={cn("block h-full rounded-full", row.bar)}
              style={{ width: `${Math.max(0, Math.min(100, row.value ?? 0))}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

export type DumbbellRow = {
  label: string;
  /** Null when the group has too little data: the row then says so instead of drawing. */
  from: number | null;
  to: number | null;
  /** How many answers the row is built from, shown under the label. */
  n?: number;
  change?: string;
  tone?: "helps" | "hurts" | "even";
};

/**
 * One line per group: a grey dot where people started, a coloured dot where they ended, joined
 * by a line. The direction of the line is the story.
 */
export function Dumbbell({
  rows,
  fromLabel,
  toLabel,
  min = 0,
  max = 100,
  unit = "%",
}: {
  rows: DumbbellRow[];
  fromLabel: string;
  toLabel: string;
  min?: number;
  max?: number;
  /** Written after each value: "%" for shares, "" for confidence points. */
  unit?: string;
}) {
  const ticks = [0, 25, 50, 75, 100].filter((t) => t >= min && t <= max);
  const cols = "grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-1 sm:grid-cols-[minmax(7rem,12rem)_1fr_10.5rem]";
  const pos = (v: number) => `${((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100}%`;
  return (
    <div className="bg-card/70 flex flex-col gap-3 rounded-3xl p-5 ring-1 ring-foreground/5 md:p-6">
      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-human size-2.5 rounded-full" />
          {fromLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-centaur size-2.5 rounded-full" />
          {toLabel}
        </span>
      </div>
      <ul className="flex flex-col divide-y">
        {rows.map((row) => {
          const enough = row.from !== null && row.to !== null;
          const tone = row.tone ?? "even";
          return (
            <li key={row.label} className={cn(cols, "py-3 text-sm")}>
              <span className={cn("flex flex-col font-medium", !enough && "text-muted-foreground")}>
                {row.label}
                {row.n !== undefined && (
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {row.n} {row.n === 1 ? "answer" : "answers"}
                  </span>
                )}
              </span>
              {enough ? (
                <span className="relative order-last col-span-2 h-6 sm:order-none sm:col-span-1">
                  <span className="bg-secondary absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
                  <span
                    className={cn(
                      "absolute top-1/2 h-1 -translate-y-1/2 rounded-full",
                      tone === "helps" ? "bg-helps/50" : tone === "hurts" ? "bg-hurts/50" : "bg-muted-foreground/30",
                    )}
                    style={{
                      left: pos(Math.min(row.from!, row.to!)),
                      width: `calc(${pos(Math.max(row.from!, row.to!))} - ${pos(Math.min(row.from!, row.to!))})`,
                    }}
                  />
                  <span
                    className="bg-human absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: pos(row.from!) }}
                  />
                  <span
                    className={cn(
                      "ring-card absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
                      tone === "hurts" ? "bg-hurts" : "bg-centaur",
                    )}
                    style={{ left: pos(row.to!) }}
                  />
                </span>
              ) : (
                <span className="text-muted-foreground order-last col-span-2 text-xs italic sm:order-none sm:col-span-1">
                  Not enough answers yet
                </span>
              )}
              <span className="flex items-baseline justify-end gap-3 tabular-nums">
                {enough && (
                  <span className="text-muted-foreground text-xs">
                    {Math.round(row.from!)}
                    {unit} → {Math.round(row.to!)}
                    {unit}
                  </span>
                )}
                <span
                  className={cn(
                    "min-w-14 text-right font-semibold",
                    tone === "helps" && "text-helps",
                    tone === "hurts" && "text-hurts",
                    (tone === "even" || !enough) && "text-muted-foreground",
                  )}
                >
                  {enough ? row.change : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {/* The scale the dots sit on, under the tracks only. */}
      <div aria-hidden className={cn(cols, "text-muted-foreground hidden text-xs tabular-nums sm:grid")}>
        <span />
        <span className="relative h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className={cn("absolute top-0", t === min ? "" : t === max ? "-translate-x-full" : "-translate-x-1/2")}
              style={{ left: pos(t) }}
            >
              {t}
              {unit}
            </span>
          ))}
        </span>
        <span />
      </div>
    </div>
  );
}

/** "a", "a and b", "a, b and c". */
export function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
