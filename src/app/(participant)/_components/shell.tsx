import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Narrow, phone first column used by every participant screen, under the site's top bar. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Backdrop quiet />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-6 pb-6 sm:pt-10 sm:pb-10">
        {children}
      </main>
    </>
  );
}

/**
 * The top bar shared by the home page and the participant screens. The home page passes its
 * navigation as children. Participant screens pass nothing, and the wordmark is then plain text:
 * a stray tap in the middle of a question should not take anyone away from it.
 */
export function SiteHeader({ homeLink, children }: { homeLink?: boolean; children?: ReactNode }) {
  return (
    <header className="bg-background/70 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        {homeLink ? (
          <Link href="/" aria-label="The Centaur Test, home">
            <Brand />
          </Link>
        ) : (
          <Brand />
        )}
        {children}
      </div>
    </header>
  );
}

/**
 * The page background: a faint grid that fades out down the page, with two soft glows in the AI
 * and centaur colours behind the top. Fixed and behind everything, so it never moves or takes a
 * tap. `quiet` turns it down for the screens where people are reading a question.
 */
export function Backdrop({ quiet }: { quiet?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", quiet && "opacity-60")}
    >
      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute -top-64 left-1/2 size-[44rem] -translate-x-[78%] bg-[radial-gradient(closest-side,var(--ai),transparent)] opacity-25" />
      <div className="absolute -top-56 left-1/2 size-[40rem] -translate-x-[18%] bg-[radial-gradient(closest-side,var(--centaur),transparent)] opacity-25" />
    </div>
  );
}

/** The wordmark with the three condition colours. */
export function Brand() {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <span aria-hidden className="flex gap-0.5">
        <span className="bg-human size-2 rounded-full" />
        <span className="bg-ai size-2 rounded-full" />
        <span className="bg-centaur size-2 rounded-full" />
      </span>
      The Centaur Test
    </p>
  );
}

type Stage = "first" | "final" | "advised";

/**
 * Where the person is: which question, and which of the two steps for that question. An advised
 * question (spec 0002) has one step only, with the AI advice on screen from the start.
 */
export function Progress({ position, total, stage }: { position: number; total: number; stage: Stage }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium tabular-nums">
          Question {position} <span className="text-muted-foreground font-normal">of {total}</span>
        </p>
        <ol aria-label="Steps for this question" className="flex items-center gap-1.5 text-xs">
          {stage === "advised" ? (
            <StepPill n={1} label="With AI advice" state="current" ai />
          ) : (
            <>
              <StepPill n={1} label="On your own" state={stage === "first" ? "current" : "done"} />
              <StepPill n={2} label="With AI advice" state={stage === "final" ? "current" : "todo"} ai />
            </>
          )}
        </ol>
      </div>

      {/* One segment per question. The current one is half full once the first answer is in. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={position - 1}
        aria-label="Questions finished"
        className="flex gap-1"
      >
        {Array.from({ length: total }, (_, i) => {
          const current = i === position - 1;
          const fill = i < position - 1 ? 1 : current && stage === "final" ? 0.5 : 0;
          return (
            <span
              key={i}
              className={cn("h-1.5 flex-1 overflow-hidden rounded-full", current ? "bg-primary/25" : "bg-secondary")}
            >
              <span className="bg-primary block h-full rounded-full" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
    </header>
  );
}

function StepPill({
  n,
  label,
  state,
  ai,
}: {
  n: number;
  label: string;
  state: "done" | "current" | "todo";
  ai?: boolean;
}) {
  const current = state === "current";
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={cn(
        "flex h-6 items-center gap-1.5 rounded-full px-2 font-medium",
        current ? (ai ? "bg-ai/15 text-ai" : "bg-primary/15 text-primary") : "bg-secondary text-muted-foreground",
      )}
    >
      <span aria-hidden className="tabular-nums">
        {state === "done" ? "✓" : n}
      </span>
      <span className={current ? undefined : "sr-only"}>
        {label}
        {state === "done" && " (done)"}
      </span>
    </li>
  );
}

/** The question itself, with the optional background text (for example the Acme policy). */
export function Question({ prompt, context }: { prompt: string; context: string | null }) {
  return (
    <section className="flex flex-col gap-4">
      {context && (
        <aside className="bg-secondary/60 border-l-primary/50 flex flex-col gap-1.5 rounded-lg border-l-4 p-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Background</p>
          <p className="text-secondary-foreground text-sm leading-relaxed whitespace-pre-line">{context}</p>
        </aside>
      )}
      <h1 className="text-xl leading-snug font-semibold text-balance sm:text-2xl">{prompt}</h1>
    </section>
  );
}

/** Small uppercase label above a card or a group. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-xs font-semibold tracking-wide uppercase", className)}>{children}</p>;
}

export const LETTERS = ["A", "B", "C", "D"];
