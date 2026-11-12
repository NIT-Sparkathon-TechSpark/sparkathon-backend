import type { RelianceGrid as Grid } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/**
 * The problem statement's 2×2: followed or ignored the AI, by whether the AI was right.
 * Counts only disagreement trials (first answer differed from the AI's), where reliance shows.
 */
export function RelianceGrid({ grid }: { grid: Grid }) {
  const aiRight = grid.followedRight + grid.ignoredRight;
  const aiWrong = grid.followedWrong + grid.ignoredWrong;
  const share = (k: number, n: number) => (n === 0 ? "—" : `${Math.round((k / n) * 100)}%`);

  const cell = (
    k: number,
    n: number,
    title: string,
    caption: string,
    good: boolean,
  ) => (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg p-4",
        good ? "bg-helps-soft" : "bg-hurts-soft",
      )}
    >
      <span className={cn("text-xs font-medium", good ? "text-helps" : "text-hurts")}>
        {good ? "Good" : "Bad"} · {title}
      </span>
      <span className="text-3xl font-semibold tabular-nums">{share(k, n)}</span>
      <span className="text-muted-foreground text-xs">
        {k} of {n} · {caption}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
      <div />
      <div className="text-muted-foreground px-1 pb-1 text-xs font-medium">
        AI was right <span className="font-normal">(n = {aiRight})</span>
      </div>
      <div className="text-muted-foreground px-1 pb-1 text-xs font-medium">
        AI was wrong <span className="font-normal">(n = {aiWrong})</span>
      </div>

      <div className="text-muted-foreground flex items-center pr-2 text-xs font-medium">
        Followed
      </div>
      {cell(grid.followedRight, aiRight, "the AI helped", "switched to the right advice", true)}
      {cell(grid.followedWrong, aiWrong, "followed too readily", "switched to the wrong advice", false)}

      <div className="text-muted-foreground flex items-center pr-2 text-xs font-medium">
        Ignored
      </div>
      {cell(grid.ignoredRight, aiRight, "good advice lost", "kept their own wrong answer", false)}
      {cell(grid.ignoredWrong, aiWrong, "caught the mistake", "kept their own answer", true)}
    </div>
  );
}
