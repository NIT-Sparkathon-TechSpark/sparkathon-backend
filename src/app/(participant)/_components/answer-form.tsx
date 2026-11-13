"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_LEVELS, type FormState } from "@/lib/participant-schemas";
import { cn } from "@/lib/utils";
import { LETTERS } from "./shell";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  setSlug: string;
  taskId: string;
  options: string[];
  answerLegend: string;
  confidenceLegend: string;
  submitLabel: string;
  /** Rendered between the question and the pickers. The final and advised stages pass the AI advice. */
  above?: ReactNode;
  /**
   * Which option the AI suggests and, in the final stage, which one was the person's first answer,
   * so they can be tagged in the list. An advised question has no first answer, so `you` is left
   * out. Nothing is preselected; the person still has to choose.
   */
  marks?: { you?: number; ai: number };
};

/**
 * One answer and one confidence rating, for both stages. The server decides which stage is on
 * screen; this form only sends what the person picked and how long they took. The parent gives it a
 * `key` per question and stage, so the picks and the timer start fresh each time.
 */
export function AnswerForm({
  action,
  setSlug,
  taskId,
  options,
  answerLegend,
  confidenceLegend,
  submitLabel,
  above,
  marks,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [answer, setAnswer] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const startedAt = useRef(0);
  const msField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  // The browser measures how long this stage took; the server checks it against sane bounds.
  const stampTime = () => {
    if (msField.current) msField.current.value = String(Math.round(performance.now() - startedAt.current));
  };

  const ready = answer !== null && confidence !== null && !pending;
  const hint =
    answer === null ? "Pick an answer first." : confidence === null ? "Now tell us how sure you are." : null;

  return (
    <form action={formAction} onSubmit={stampTime} className="flex flex-col gap-6">
      <input type="hidden" name="setSlug" value={setSlug} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="ms" defaultValue="0" ref={msField} />

      {above}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{answerLegend}</legend>
        {options.map((option, i) => (
          <label
            key={i}
            className={cn(
              "group bg-card flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
              "hover:border-primary/50 active:bg-accent/60",
              "has-checked:border-primary has-checked:bg-accent has-checked:ring-primary has-checked:ring-1",
              "has-focus-visible:outline-ring has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
            )}
          >
            <input
              type="radio"
              name="answer"
              value={i}
              checked={answer === i}
              onChange={() => setAnswer(i)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors",
                "group-has-checked:bg-primary group-has-checked:text-primary-foreground",
              )}
            >
              {LETTERS[i]}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-base leading-snug">{option}</span>
              {marks && (marks.you === i || marks.ai === i) && (
                <span className="flex flex-wrap gap-1.5">
                  {marks.you === i && <Tag className="bg-human/15 text-foreground">Your first answer</Tag>}
                  {marks.ai === i && <Tag className="bg-ai/15 text-ai">The AI&apos;s answer</Tag>}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">{confidenceLegend}</legend>
        <div className="grid grid-cols-4 gap-2">
          {CONFIDENCE_LEVELS.map((level, i) => (
            <label
              key={level.value}
              className={cn(
                "group bg-card flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-center text-xs leading-tight transition-colors",
                "hover:border-primary/50 active:bg-accent/60",
                "has-checked:border-primary has-checked:bg-accent has-checked:ring-primary has-checked:font-semibold has-checked:ring-1",
                "has-focus-visible:outline-ring has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
              )}
            >
              <input
                type="radio"
                name="confidence"
                value={level.value}
                checked={confidence === level.value}
                onChange={() => setConfidence(level.value)}
                className="sr-only"
              />
              {/* A small four bar meter: one more bar lit for each level. */}
              <span aria-hidden className="flex items-end gap-0.5">
                {CONFIDENCE_LEVELS.map((_, bar) => (
                  <span
                    key={bar}
                    className={cn(
                      "w-1 rounded-full transition-colors",
                      bar <= i ? "bg-foreground/70 group-has-checked:bg-primary" : "bg-foreground/15",
                    )}
                    style={{ height: `${6 + bar * 3}px` }}
                  />
                ))}
              </span>
              {level.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Stays at the bottom of the screen, so the button is always within reach of a thumb. */}
      <div className="bg-background/85 sticky bottom-0 -mx-4 flex flex-col gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {state.error && (
          <p role="alert" className="text-destructive text-sm font-medium">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!ready}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {hint && (
          <p aria-live="polite" className="text-muted-foreground text-center text-xs">
            {hint}
          </p>
        )}
      </div>
    </form>
  );
}

function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;
}
