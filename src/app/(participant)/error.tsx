"use client";

import { Button } from "@/components/ui/button";

/** Shown when something fails while loading a participant screen, for example the database is waking up. */
export default function ParticipantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[participant] screen failed", { digest: error.digest });
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="text-muted-foreground">
        Your answers so far are saved. Wait a moment and try again.
      </p>
      <Button size="lg" className="h-12" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
