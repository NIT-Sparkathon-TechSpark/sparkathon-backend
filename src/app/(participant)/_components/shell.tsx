import type { ReactNode } from "react";

/** Narrow, phone first column used by every participant screen. */
export function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">{children}</main>;
}

export function Progress({ position, total, step }: { position: number; total: number; step: string }) {
  return (
    <header className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-baseline justify-between text-sm">
        <span>
          Question {position} of {total}
        </span>
        <span>{step}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={position - 1}
        aria-label="Progress"
        className="bg-secondary h-2 overflow-hidden rounded-full"
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${((position - 1) / total) * 100}%` }} />
      </div>
    </header>
  );
}

/** The question itself, with the optional background text (for example the Acme policy). */
export function Question({ prompt, context }: { prompt: string; context: string | null }) {
  return (
    <section className="flex flex-col gap-3">
      {context && (
        <div className="bg-secondary text-secondary-foreground rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
          {context}
        </div>
      )}
      <h1 className="text-xl leading-snug font-semibold text-balance">{prompt}</h1>
    </section>
  );
}

export const LETTERS = ["A", "B", "C", "D"];
