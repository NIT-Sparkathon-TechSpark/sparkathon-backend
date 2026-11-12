"use client";

import { Bar, BarChart, CartesianGrid, ErrorBar, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/*
 * Client charts. Every prop here is an aggregate (a percentage or a mean), never a response
 * row, so nothing about one person reaches the browser (CLAUDE.md hard rule 4).
 */

const pctLabel = (v: unknown) => (typeof v === "number" ? `${Math.round(v)}%` : "");

export type ConditionBar = {
  key: "human" | "ai" | "centaur";
  label: string;
  /** Percentage 0–100. */
  value: number;
  /** [below, above] distances to the 95% interval ends, in percentage points. */
  error?: [number, number];
};

const conditionConfig = {
  value: { label: "Accuracy" },
  human: { label: "Humans alone", color: "var(--human)" },
  ai: { label: "AI alone", color: "var(--ai)" },
  centaur: { label: "Humans + AI", color: "var(--centaur)" },
} satisfies ChartConfig;

/** Feature 7: the three accuracies side by side, with bootstrap intervals. */
export function ThreeWayChart({ bars, large = false }: { bars: ConditionBar[]; large?: boolean }) {
  const data = bars.map((b) => ({ ...b, fill: `var(--color-${b.key})` }));
  return (
    <ChartContainer config={conditionConfig} className={large ? "h-[340px] w-full aspect-auto" : "h-[260px] w-full aspect-auto"}>
      <BarChart data={data} margin={{ top: 28, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={large ? 16 : 12} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(v) => pctLabel(v)} />}
        />
        <Bar dataKey="value" fillOpacity={0.7} radius={[6, 6, 0, 0]} maxBarSize={large ? 140 : 96} isAnimationActive={false}>
          <ErrorBar dataKey="error" direction="y" width={12} strokeWidth={2} stroke="var(--foreground)" />
          <LabelList dataKey="value" position="insideBottom" offset={14} formatter={pctLabel} className="fill-foreground" fontSize={large ? 22 : 14} fontWeight={600} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export type SliceBar = { slice: string; alone: number; withAI: number };

const sliceConfig = {
  alone: { label: "Humans alone", color: "var(--human)" },
  withAI: { label: "Humans + AI", color: "var(--centaur)" },
} satisfies ChartConfig;

/** Feature 9: alone versus with-AI accuracy per slice. */
export function SliceChart({ data }: { data: SliceBar[] }) {
  return (
    <ChartContainer
      config={sliceConfig}
      className="w-full aspect-auto"
      style={{ height: Math.max(180, data.length * 64 + 60) }}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="slice" width={130} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => pctLabel(v)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="alone" fill="var(--color-alone)" radius={4} isAnimationActive={false}>
          <LabelList dataKey="alone" position="right" formatter={pctLabel} className="fill-muted-foreground" fontSize={11} />
        </Bar>
        <Bar dataKey="withAI" fill="var(--color-withAI)" radius={4} isAnimationActive={false}>
          <LabelList dataKey="withAI" position="right" formatter={pctLabel} className="fill-foreground" fontSize={11} fontWeight={600} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export type ConfidenceBar = { group: string; before: number; after: number };

const confidenceConfig = {
  before: { label: "Before advice", color: "var(--human)" },
  after: { label: "After advice", color: "var(--centaur)" },
} satisfies ChartConfig;

/** Feature 10: mean confidence before and after advice, per group. */
export function ConfidenceChart({ data }: { data: ConfidenceBar[] }) {
  const round = (v: unknown) => (typeof v === "number" ? v.toFixed(0) : "");
  return (
    <ChartContainer config={confidenceConfig} className="h-[280px] w-full aspect-auto">
      <BarChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="group" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[25, 100]} ticks={[25, 50, 75, 100]} tickLine={false} axisLine={false} allowDataOverflow />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => round(v)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="before" fill="var(--color-before)" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="before" position="top" formatter={round} className="fill-muted-foreground" fontSize={11} />
        </Bar>
        <Bar dataKey="after" fill="var(--color-after)" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="after" position="top" formatter={round} className="fill-foreground" fontSize={11} fontWeight={600} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export type ShiftBar = { group: string; up: number; same: number; down: number };

const shiftConfig = {
  up: { label: "More confident", color: "var(--ai)" },
  same: { label: "Unchanged", color: "var(--muted-foreground)" },
  down: { label: "Less confident", color: "var(--human)" },
} satisfies ChartConfig;

/** Feature 10: share of answers whose confidence went up, stayed or went down. */
export function ShiftChart({ data }: { data: ShiftBar[] }) {
  return (
    <ChartContainer config={shiftConfig} className="h-[200px] w-full aspect-auto">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis type="category" dataKey="group" width={110} tickLine={false} axisLine={false} />
        <ReferenceLine x={50} stroke="var(--border)" />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => pctLabel(v)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="up" stackId="s" fill="var(--color-up)" isAnimationActive={false} />
        <Bar dataKey="same" stackId="s" fill="var(--color-same)" fillOpacity={0.35} isAnimationActive={false} />
        <Bar dataKey="down" stackId="s" fill="var(--color-down)" isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
