import Link from "next/link";
import { PARTICIPANT_SETS, SET_SLUGS } from "@/lib/sets";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">The Centaur Test</h1>
        <p className="text-muted-foreground">
          Does AI advice help you decide, or hurt? Answer a few questions on your own, then with an AI&apos;s advice.
        </p>
      </header>

      <nav aria-label="Question sets" className="flex flex-col gap-2">
        {SET_SLUGS.filter((slug) => slug !== "judge-demo").map((slug) => (
          <Link
            key={slug}
            href={`/s/${slug}`}
            className="bg-card hover:bg-accent flex flex-col rounded-lg border p-4 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-semibold">{PARTICIPANT_SETS[slug].name}</span>
            <span className="text-muted-foreground text-sm">{PARTICIPANT_SETS[slug].blurb}</span>
          </Link>
        ))}
      </nav>

      <Link href="/results" className="text-muted-foreground text-sm underline underline-offset-4">
        See the results
      </Link>
    </main>
  );
}
