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
  /** Rendered between the question and the pickers. Only the final stage passes the AI advice. */
  above?: ReactNode;
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

  return (
    <form action={formAction} onSubmit={stampTime} className="flex flex-col gap-6">
      <input type="hidden" name="setSlug" value={setSlug} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="ms" defaultValue="0" ref={msField} />

      {above}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{answerLegend}</legend>
        {options.map((option, i) => (
          <label
            key={i}
            className={cn(
              "bg-card flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3",
              "has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring",
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
              className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
            >
              {LETTERS[i]}
            </span>
            <span className="text-base leading-snug">{option}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{confidenceLegend}</legend>
        <div className="grid grid-cols-2 gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <label
              key={level.value}
              className={cn(
                "bg-card flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm",
                "has-checked:border-primary has-checked:bg-accent has-checked:font-semibold has-focus-visible:ring-2 has-focus-visible:ring-ring",
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
              {level.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!ready}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
