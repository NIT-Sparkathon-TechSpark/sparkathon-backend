import type * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "",
  human: "bg-human",
  ai: "bg-ai",
  centaur: "bg-centaur",
  helps: "bg-helps",
  hurts: "bg-hurts",
} as const;

/** One headline number with its base ("7 of 12") and, when there is one, its interval. */
export function StatTile({
  label,
  value,
  detail,
  interval,
  tone = "default",
  size = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  interval?: string | null;
  tone?: keyof typeof tones;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-1 py-3",
        className,
      )}
    >
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        {tone !== "default" && <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", tones[tone])} />}
        {label}
      </span>
      <span
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          size === "lg" ? "text-5xl md:text-6xl" : "text-3xl",
        )}
      >
        {value}
      </span>
      {detail && <span className="text-muted-foreground text-xs">{detail}</span>}
      {interval && <span className="text-muted-foreground text-xs">{interval}</span>}
    </div>
  );
}
