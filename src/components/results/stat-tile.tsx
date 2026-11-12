import type * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "",
  human: "border-l-human",
  ai: "border-l-ai",
  centaur: "border-l-centaur",
  helps: "border-l-helps",
  hurts: "border-l-hurts",
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
        "bg-card flex flex-col gap-1 rounded-lg border p-4",
        tone !== "default" && "border-l-4",
        tones[tone],
        className,
      )}
    >
      <span className="text-muted-foreground text-sm">{label}</span>
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
