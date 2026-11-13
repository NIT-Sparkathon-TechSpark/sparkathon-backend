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
  { href: "#orgs", label: "For organizations" },
] as const;

/** One colour per topic badge, in the site's condition colours. */
const TOPIC_COLORS = [
  "from-centaur to-primary",
  "from-ai to-ai/70",
  "from-human to-human/70",
  "from-helps to-centaur",
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
            Live results
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
            </div>
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
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
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
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            <span
              aria-hidden
              className="from-primary/50 via-ai/50 to-primary/50 absolute top-6 right-[16.7%] left-[16.7%] hidden h-px bg-linear-to-r md:block"
            />
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
              <p className="text-muted-foreground text-lg leading-relaxed">
                When you and the AI disagree, there are four outcomes. Your report counts each one.
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
          <div className="-mx-4 grid gap-2 md:grid-cols-2">
            {sets.map((slug, i) => (
              <Link
                key={slug}
                href={`/s/${slug}`}
                className="group hover:bg-card/70 flex items-start gap-4 rounded-3xl p-4 transition-all hover:shadow-xl hover:shadow-black/5 hover:backdrop-blur"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-lg font-semibold text-white shadow-md",
                    TOPIC_COLORS[i % TOPIC_COLORS.length],
                  )}
                >
                  {PARTICIPANT_SETS[slug].name.charAt(0)}
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-lg font-semibold">{PARTICIPANT_SETS[slug].name}</span>
                  <span className="text-muted-foreground text-sm leading-relaxed">{PARTICIPANT_SETS[slug].blurb}</span>
                  <span className="text-primary mt-1 text-sm font-medium">Start</span>
                </span>
              </Link>
            ))}
          </div>
        </Band>

        {/* For organizations */}
        <Band id="orgs">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <SectionHead
                eyebrow="For organizations"
                title="Run the test on your own AI"
                lead="Find out whether your team catches your AI assistant's mistakes or goes along with them, on cases from your own work."
              />
              <ol className="flex flex-col gap-4">
                <OrgStep n={1} title="Upload your cases">
                  A CSV or JSON file: each question, four options, the right one, and what your AI answered.
                </OrgStep>
                <OrgStep n={2} title="Share a private link" ai>
                  Your people take the test with a nickname. Nobody can find the set without the link.
                </OrgStep>
                <OrgStep n={3} title="See where AI helps and where it hurts">
                  Results only your organization can see, with plain advice on what to change.
                </OrgStep>
              </ol>
              <div className="flex flex-wrap gap-3">
                <Link href="/org" className={cn(buttonVariants({ size: "lg" }), "h-12 px-7")}>
                  Set up your organization
                </Link>
                <Link href="/org" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7")}>
                  Sign in
                </Link>
              </div>
              <p className="text-muted-foreground text-sm">No personal accounts. Your team shares one passcode.</p>
            </div>

            <OrgExample />
          </div>
        </Band>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-col gap-1.5">
            <div className="text-foreground">
              <Brand />
            </div>
            <p className="text-muted-foreground text-xs">&copy; 2026 The Centaur Test</p>
          </div>

          <nav aria-label="Footer" className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#sets" className="hover:text-foreground transition-colors">
              Topics
            </a>
            <a href="#orgs" className="hover:text-foreground transition-colors">
              For organizations
            </a>
            <Link href="/results" className="hover:text-foreground transition-colors">
              Live results
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

function Band({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16">
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
    <div className="flex flex-col gap-2">
      <span aria-hidden className="relative mb-3 grid size-14 place-items-center">
        <span className={cn("absolute inset-0 rounded-full opacity-20 blur-md", color)} />
        <span className={cn("absolute inset-2 rounded-full opacity-25", color)} />
        <span className={cn("relative size-4 rounded-full", color)} />
      </span>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Step({ n, title, ai, children }: { n: number; title: string; ai?: boolean; children: ReactNode }) {
  return (
    <li className="relative flex flex-col items-center gap-2 text-center">
      <span
        aria-hidden
        className={cn(
          "bg-background mb-3 grid size-12 place-items-center rounded-full text-lg font-semibold shadow-lg ring-4",
          ai ? "text-ai ring-ai/20 shadow-ai/20" : "text-primary ring-primary/20 shadow-primary/20",
        )}
      >
        {n}
      </span>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-xs leading-relaxed">{children}</p>
    </li>
  );
}

function OrgStep({ n, title, ai, children }: { n: number; title: string; ai?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full font-semibold",
          ai ? "bg-ai/15 text-ai" : "bg-primary/15 text-primary",
        )}
      >
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

/**
 * A made up organization dashboard, the counterpart of HeroExample: what an organization sees
 * after one upload. Illustrative numbers, not real data.
 */
function OrgExample() {
  return (
    <figure aria-label="An example organization dashboard" className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="bg-card flex flex-col gap-4 rounded-3xl p-6 shadow-2xl shadow-black/15 ring-1 ring-foreground/5">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-muted-foreground">Example dashboard</Eyebrow>
          <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            Private
          </span>
        </div>
        <p className="text-lg leading-snug font-semibold">Loan application reviews</p>
        <div className="grid grid-cols-3 gap-2">
          <ExampleStat label="Questions" value="24" />
          <ExampleStat label="AI wrong" value="8" ai />
          <ExampleStat label="Finished" value="17" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Eyebrow className="text-muted-foreground">Participant link</Eyebrow>
          <p className="bg-secondary/60 truncate rounded-xl px-3 py-2 font-mono text-xs">
            /t/k7Qm2xP9vLr4Tn8wZc1bYa
          </p>
        </div>
        <div className="bg-hurts-soft flex flex-col gap-1 rounded-2xl p-3 text-sm">
          <span className="text-hurts font-semibold">It fooled them 41% of the time</span>
          <span className="text-xs leading-snug">
            When the AI was wrong and people disagreed with it, 41% switched to its answer anyway.
          </span>
        </div>
      </div>
    </figure>
  );
}

function ExampleStat({ label, value, ai }: { label: string; value: string; ai?: boolean }) {
  return (
    <div className="bg-secondary/50 flex flex-col gap-1 rounded-2xl p-3">
      <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wide uppercase">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", ai && "text-ai")}>{value}</span>
    </div>
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
      <Cell good title="It helped you" />
      <Cell title="It fooled you" />

      <RowLabel>You kept yours</RowLabel>
      <Cell title="You missed out" />
      <Cell good title="You caught it" />
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

function Cell({ title, good }: { title: string; good?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-24 flex-col justify-center rounded-3xl p-5",
        good ? "bg-helps-soft" : "bg-hurts-soft",
      )}
    >
      <span className={cn("text-lg font-semibold", good ? "text-helps" : "text-hurts")}>{title}</span>
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
      <div aria-hidden className="bg-card flex flex-col gap-4 rounded-3xl p-6 shadow-2xl shadow-black/15 ring-1 ring-foreground/5">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-muted-foreground">Example question</Eyebrow>
          <span className="bg-ai/15 text-ai rounded-full px-2 py-0.5 text-xs font-medium">2 With AI advice</span>
        </div>
        <p className="text-lg leading-snug font-semibold">
          A shop cuts a price by 20%, then raises it by 20%. The new price is…
        </p>
        <div className="bg-secondary/60 rounded-2xl p-3 text-sm">
          <Eyebrow className="text-muted-foreground">You answered</Eyebrow>
          <p className="mt-1">
            <b className="font-semibold">B.</b> The same as before
            <span className="text-muted-foreground"> · Fairly sure</span>
          </p>
        </div>
        <div className="bg-ai/8 rounded-2xl p-3 text-sm">
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
            <div key={option} className="bg-secondary/40 flex items-center gap-3 rounded-full px-2 py-1.5 text-sm">
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
