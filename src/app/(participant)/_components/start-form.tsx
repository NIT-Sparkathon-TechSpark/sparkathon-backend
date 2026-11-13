"use client";

import { useActionState, useState } from "react";
import { startSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { EXPERTISE_LEVELS, type LinkLabel } from "@/lib/participant-schemas";

/** The nickname form. Starting a session is a Server Action; nothing is written while the page renders. */
export function StartForm({ setSlug, label }: { setSlug: string; label: LinkLabel }) {
  const [state, formAction, pending] = useActionState(startSessionAction, {});
  // Optional: tapping the chosen level again clears it, and then nothing is sent.
  const [expertise, setExpertise] = useState<number | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="setSlug" value={setSlug} />
      <input type="hidden" name="label" value={label} />

      <div className="flex flex-col gap-2">
        <label htmlFor="nickname" className="text-sm font-medium">
          Pick a nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          maxLength={24}
          autoComplete="off"
          autoCapitalize="words"
          aria-describedby="nickname-hint"
          placeholder="e.g. Quiet Fox"
          className="bg-secondary/60 placeholder:text-muted-foreground/70 h-12 rounded-2xl px-4 text-base transition-colors focus-visible:bg-card"
        />
        <p id="nickname-hint" className="text-muted-foreground text-sm">
          Anything except your real name.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          How well do you know this topic? <span className="text-muted-foreground font-normal">(optional)</span>
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {EXPERTISE_LEVELS.map((level) => {
            const [number, word] = level.label.split(" · ");
            return (
              <label
                key={level.value}
                className="bg-secondary/60 hover:bg-secondary has-checked:bg-accent has-checked:ring-primary has-focus-visible:outline-ring flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-center transition-colors has-checked:ring-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
              >
                <input
                  type="radio"
                  name="expertise"
                  value={level.value}
                  checked={expertise === level.value}
                  onChange={() => setExpertise(level.value)}
                  onClick={() => expertise === level.value && setExpertise(null)}
                  className="sr-only"
                />
                <span className="text-base font-semibold tabular-nums">{number}</span>
                <span className="text-muted-foreground text-[0.6875rem] leading-tight">{word}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "Starting…" : "Start"}
      </Button>
    </form>
  );
}
