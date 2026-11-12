"use client";

import { useActionState } from "react";
import { startSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { EXPERTISE_LEVELS, type LinkLabel } from "@/lib/participant-schemas";

/** The nickname form. Starting a session is a Server Action; nothing is written while the page renders. */
export function StartForm({ setSlug, label }: { setSlug: string; label: LinkLabel }) {
  const [state, formAction, pending] = useActionState(startSessionAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="setSlug" value={setSlug} />
      <input type="hidden" name="label" value={label} />

      <div className="flex flex-col gap-2">
        <label htmlFor="nickname" className="text-sm font-medium">
          Nickname
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
          className="bg-card h-12 rounded-lg border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p id="nickname-hint" className="text-muted-foreground text-sm">
          Not your real name. We never ask for one.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="expertise" className="text-sm font-medium">
          How well do you know this topic? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select
          id="expertise"
          name="expertise"
          defaultValue=""
          className="bg-card h-12 rounded-lg border px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Prefer not to say</option>
          {EXPERTISE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

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
