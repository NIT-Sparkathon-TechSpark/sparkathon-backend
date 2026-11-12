import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { PARTICIPANT_SETS, SET_SLUGS } from "@/lib/sets";
import { cn } from "@/lib/utils";
import { Backdrop, Brand, Eyebrow, SiteHeader } from "./(participant)/_components/shell";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#measure", label: "What you get" },
  { href: "#sets", label: "Topics" },
] as const;

/** The public front page. Static: it reads nothing from the database. */
export default function Home() {
  const sets = SET_SLUGS.filter((slug) => slug !== "judge-demo");

  return (
    <>
      <Backdrop />
      <SiteHeader homeLink>
        <nav aria-label="Sections" className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/results" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            Results
          </Link>
          <a href="#sets" className={buttonVariants()}>
            Take the test
          </a>
        </div>
      </SiteHeader>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
          <div className="flex flex-col gap-6">
            <p className="bg-card/70 text-muted-foreground flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
              <span aria-hidden className="bg-centaur size-1.5 rounded-full" />
              Takes about 8 minutes
            </p>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Would you notice if{" "}
              <span className="from-centaur to-ai bg-linear-to-r bg-clip-text text-transparent">
                the AI was wrong?
              </span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              You answer each question yourself first. Then we show you what an AI picked, and you can keep
              your answer or change it. At the end you see how often it helped you and how often it talked you
              out of the right answer.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#sets" className={cn(buttonVariants({ size: "lg" }), "h-12 px-7")}>
                Take the test
              </a>
              <Link href="/results" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7")}>
                See the results
              </Link>
            </div>
            <p className="text-muted-foreground text-sm">No account needed, only a nickname.</p>
          </div>

          <HeroExample />
        </section>

        {/* Three conditions */}
        <Band>
          <SectionHead
            eyebrow="Why we built this"
            title="We score every question three times"
            lead="AI advice is useful when it's right. When it's wrong, it usually sounds just as sure, and people go along with it. Comparing these three scores shows what it did for you."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Condition color="bg-human" title="You alone">
              What you answered before you saw any advice.
            </Condition>
            <Condition color="bg-ai" title="AI alone">
              What the AI answered without you.
            </Condition>
            <Condition color="bg-centaur" title="You with AI">
              What you ended up with after seeing the AI&apos;s answer.
            </Condition>
          </div>
        </Band>

        {/* How it works */}
        <Band id="how">
          <SectionHead eyebrow="How it works" title="Answer first, then see the AI" />
          <ol className="grid gap-3 md:grid-cols-3">
            <Step n={1} title="Answer it yourself">
              Pick an answer and tell us how sure you are.
            </Step>
            <Step n={2} title="See the AI's answer" ai>
              We show you what the AI picked. Keep your answer or switch to its one.
            </Step>
            <Step n={3} title="Get your report">
              After the last question you see where the AI helped you and where it led you wrong.
            </Step>
          </ol>
        </Band>

        {/* What we measure */}
        <Band id="measure">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <SectionHead
                eyebrow="What you get"
                title="When should you listen to the AI?"
              />
              <p className="text-muted-foreground leading-relaxed">
                Sometimes you and the AI will pick different answers. You either switch to its answer or keep
                yours, and the AI was either right or wrong. That makes four possible outcomes.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Your report counts how many times each of the four happened to you.
              </p>
            </div>
            <RelianceGrid />
          </div>
        </Band>

        {/* Question sets */}
        <Band id="sets">
          <SectionHead
            eyebrow="Start here"
            title="Pick a topic"
            lead="Each one takes about 8 minutes. Please don't look anything up. A guess is fine."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {sets.map((slug) => (
              <Link
                key={slug}
                href={`/s/${slug}`}
                className="group bg-card/70 hover:border-primary/50 hover:bg-accent flex flex-col gap-2 rounded-2xl border p-6 shadow-xs backdrop-blur transition-colors"
              >
                <span className="text-lg font-semibold">{PARTICIPANT_SETS[slug].name}</span>
                <span className="text-muted-foreground flex-1 text-sm leading-relaxed">
                  {PARTICIPANT_SETS[slug].blurb}
                </span>
                <span className="text-primary mt-3 flex items-center gap-1.5 text-sm font-medium">
                  Start
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Band>

        {/* Results */}
        <Band>
          <div className="bg-card/70 flex flex-col items-start gap-5 rounded-2xl border p-8 backdrop-blur md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex max-w-xl flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">See how everyone did</h2>
              <p className="text-muted-foreground leading-relaxed">
                The results update live as people finish. We only show totals, so nobody can see your answers.
              </p>
            </div>
            <Link href="/results" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 px-7")}>
              View results
            </Link>
          </div>
        </Band>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-start md:justify-between md:px-8">
          <div className="text-foreground">
            <Brand />
          </div>
          <ul className="flex max-w-xl flex-col gap-1.5 leading-relaxed">
            <li>We store your nickname and your answers, and nothing else.</li>
            <li>The AI&apos;s answers were recorded before the test. Nothing is generated while you answer.</li>
            <li>
              <Link href="/org" className="hover:text-foreground underline underline-offset-4 transition-colors">
                For organizations: test your own AI on your own cases
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}

function Band({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-14 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:px-8 lg:py-20">{children}</div>
    </section>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <Eyebrow className="text-primary">{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">{title}</h2>
      {lead && <p className="text-muted-foreground text-lg leading-relaxed">{lead}</p>}
    </div>
  );
}

function Condition({ color, title, children }: { color: string; title: string; children: ReactNode }) {
  return (
    <div className="bg-card/70 flex flex-col gap-2 rounded-2xl border p-6 backdrop-blur">
      <span aria-hidden className={cn("mb-2 h-1 w-10 rounded-full", color)} />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Step({ n, title, ai, children }: { n: number; title: string; ai?: boolean; children: ReactNode }) {
  return (
    <li className="bg-card/70 flex flex-col gap-2 rounded-2xl border p-6 backdrop-blur">
      <span
        aria-hidden
        className={cn(
          "mb-2 grid size-9 place-items-center rounded-full font-semibold",
          ai ? "bg-ai/15 text-ai" : "bg-primary/15 text-primary",
        )}
      >
        {n}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
    </li>
  );
}

/** The four things that can happen once the AI has given its advice. */
function RelianceGrid() {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
      <span />
      <span className="text-muted-foreground pb-1 text-center text-xs font-semibold tracking-wide uppercase">
        AI was right
      </span>
      <span className="text-muted-foreground pb-1 text-center text-xs font-semibold tracking-wide uppercase">
        AI was wrong
      </span>

      <RowLabel>You switched</RowLabel>
      <Cell good title="It helped you" detail="The AI was right and you switched to it." />
      <Cell title="It fooled you" detail="The AI was wrong and you switched anyway." />

      <RowLabel>You kept yours</RowLabel>
      <Cell title="You missed out" detail="The AI was right but you kept your answer." />
      <Cell good title="You caught it" detail="The AI was wrong and you didn't fall for it." />
    </div>
  );
}

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground flex w-20 items-center text-xs leading-snug font-semibold tracking-wide uppercase sm:w-28">
      {children}
    </span>
  );
}

function Cell({ title, detail, good }: { title: string; detail: string; good?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-col justify-center gap-1 rounded-2xl border p-4",
        good ? "border-helps/40 bg-helps-soft" : "border-hurts/40 bg-hurts-soft",
      )}
    >
      <span className={cn("font-semibold", good ? "text-helps" : "text-hurts")}>{title}</span>
      <span className="text-xs leading-snug">{detail}</span>
    </div>
  );
}

/**
 * A made up question that shows what step 2 looks like. It is deliberately not one of the real
 * tasks: real advice must never be visible before someone's first answer is stored.
 */
function HeroExample() {
  const options = ["Higher than before", "The same as before", "Lower than before"];
  return (
    <figure aria-label="An example question with the AI's advice" className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-muted-foreground">Example question</Eyebrow>
          <span className="bg-ai/15 text-ai rounded-full px-2 py-0.5 text-xs font-medium">2 With AI advice</span>
        </div>
        <p className="text-lg leading-snug font-semibold">
          A shop cuts a price by 20%, then raises it by 20%. The new price is…
        </p>
        <div className="rounded-xl border p-3 text-sm">
          <Eyebrow className="text-muted-foreground">You answered</Eyebrow>
          <p className="mt-1">
            <b className="font-semibold">B.</b> The same as before
            <span className="text-muted-foreground"> · Fairly sure</span>
          </p>
        </div>
        <div className="border-ai/50 bg-ai/8 rounded-xl border p-3 text-sm">
          <Eyebrow className="text-ai">The AI picked</Eyebrow>
          <p className="mt-1 font-medium">
            <b className="font-semibold">C.</b> Lower than before
          </p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            After the cut the price is 80. A 20% rise on 80 adds 16, which gives 96.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <div key={option} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
              <span className="bg-secondary grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                {"ABC"[i]}
              </span>
              {option}
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-center text-xs">Keep B or switch to C?</p>
      </div>
    </figure>
  );
}
