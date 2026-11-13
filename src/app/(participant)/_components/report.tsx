import { leaveSessionAction } from "@/actions/session";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ReportTask } from "@/db/queries/session-info";
import { advisedProfile, aiAloneAccuracy, sessionProfile, type ProfileItem, type Rate, type TrialFact } from "@/lib/metrics";
import { PARTICIPANT_SETS, SET_SLUGS } from "@/lib/sets";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Eyebrow, LETTERS, Shell } from "./shell";

type Props = {
  nickname: string;
  /** The public set's slug, or a private set's share token. */
  setSlug: string;
  facts: TrialFact[];
  tasks: ReportTask[];
  /** Off for an organization's private set: its people shouldn't be sent to the public sets. */
  showOtherSets?: boolean;
};

/**
 * The personal report (scope feature 12). Built only from this person's own answers, and only for a
 * finished session. The correct answers appear here for the first time, after the last question.
 */
export function Report({ nickname, setSlug, facts, tasks, showOtherSets = true }: Props) {
  const profile = sessionProfile(facts);
  // Spec 0002: questions where the AI advice was on screen from the start. Empty for every other set.
  const advised = advisedProfile(facts);
  const mixed = advised.answered > 0;
  const ai = aiAloneAccuracy(facts);
  const byTask = new Map(tasks.map((t) => [t.taskId, t]));

  const count = (outcome: ProfileItem["outcome"]) => profile.items.filter((i) => i.outcome === outcome).length;
  const helped = count("helped");
  const followedWrong = count("followed wrong advice");
  const ignoredGood = count("ignored good advice");
  const caught = count("caught the mistake");
  const switched = helped + followedWrong;
  const disagreements = switched + ignoredGood + caught;

  const notable = profile.items.filter(
    (i) => i.outcome === "followed wrong advice" || i.outcome === "ignored good advice",
  );
  const delta = profile.accuracyAfter.k - profile.accuracyBefore.k;
  const plural = (n: number) => (n === 1 ? "question" : "questions");
  const otherSets = SET_SLUGS.filter((s) => s !== setSlug && s !== "judge-demo");

  const you = profile.accuracyBefore;
  const withAI = profile.accuracyAfter;
  const tone = delta > 0 ? "helps" : delta < 0 ? "hurts" : "even";
  const headline =
    delta > 0
      ? "The AI's advice helped you."
      : delta < 0
        ? "You did better on your own."
        : "The AI's advice didn't change your score.";
  const change =
    delta > 0
      ? `You got ${delta} more ${plural(delta)} right after seeing it.`
      : delta < 0
        ? `You got ${-delta} fewer ${plural(-delta)} right after seeing the AI's advice.`
        : `You got ${withAI.k} of ${withAI.n} right before and after seeing it.`;
  const againstAI =
    withAI.k > ai.k
      ? "Together you beat the AI on its own."
      : withAI.k < ai.k
        ? "The AI on its own still scored higher."
        : "You ended level with the AI on its own.";

  return (
    <Shell>
      <section
        aria-labelledby="report-title"
        className="bg-card/70 flex flex-col gap-6 rounded-3xl p-5 ring-1 ring-foreground/5 shadow-xl shadow-black/5 backdrop-blur sm:p-7"
      >
        <header className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">Thanks, {nickname}. That was the last question.</p>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
              tone === "helps" && "bg-helps-soft text-helps",
              tone === "hurts" && "bg-hurts-soft text-hurts",
              tone === "even" && "bg-accent text-accent-foreground",
            )}
          >
            Your result
          </span>
          <h1 id="report-title" className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">
            {headline}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {change} {againstAI}
          </p>
        </header>

        <ul aria-label="Scores" className="flex flex-col gap-5">
          <Score label="You on your own" rate={you} tone="human" />
          <Score label="You with AI advice" rate={withAI} tone="centaur" delta={delta} />
          <Score label="AI alone" rate={ai} tone="ai" />
        </ul>

        <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
          {mixed
            ? `Right answers on the ${profile.answered} alerts you answered on your own first.`
            : "Right answers on the same questions, answered three ways."}{" "}
          Chess players call a human and a computer playing together a centaur. That&apos;s where the name comes from.
        </p>
      </section>

      {mixed && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">When the AI went first</h2>
          <p>
            On <b>{advised.answered}</b> alerts you saw the AI&apos;s suggestion before you answered. You got{" "}
            <b>{advised.right}</b> of them right.
          </p>
          <ul className="grid grid-cols-2 gap-3">
            <Outcome
              count={advised.caught}
              good
              title="You caught it"
              detail={`The AI was wrong on ${advised.aiWrong} of these, and you still got these right.`}
            />
            <Outcome
              count={advised.followedWrong.length}
              title="It fooled you"
              detail="The AI was wrong and you went with its answer."
            />
          </ul>
          {advised.followedWrong.map((item) => {
            const task = byTask.get(item.taskId);
            if (!task) return null;
            return (
              <article key={item.taskId} className="bg-hurts-soft rounded-3xl p-5 ring-1 ring-foreground/5">
                <Eyebrow className="text-hurts">It fooled you</Eyebrow>
                <p className="mt-1.5 leading-snug font-medium">{task.prompt}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <Row term="The AI said" option={task.options[item.adviceIndex]} letter={LETTERS[item.adviceIndex]} />
                  <Row term="Your answer" option={task.options[item.finalAnswer]} letter={LETTERS[item.finalAnswer]} wrong />
                  <Row term="Correct answer" option={task.options[item.correctIndex]} letter={LETTERS[item.correctIndex]} strong />
                </dl>
              </article>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{mixed ? "When you answered first" : "How you used the AI"}</h2>
        {disagreements === 0 ? (
          <p className="text-muted-foreground text-sm">
            The AI picked the same answer as you on every question, so you never had to choose between them.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              You and the AI disagreed on {disagreements} of {profile.answered} {plural(profile.answered)}, and you{" "}
              {switched === 0
                ? "never switched to its answer"
                : `switched to its answer ${switched === 1 ? "once" : `${switched} times`}`}
              .
            </p>
            <Split
              heading="When the AI was right"
              parts={[
                { count: helped, name: "It helped you", action: "You switched to its answer", good: true },
                { count: ignoredGood, name: "You missed out", action: "You kept your own answer", good: false },
              ]}
            />
            <Split
              heading="When the AI was wrong"
              parts={[
                { count: followedWrong, name: "It fooled you", action: "You switched to its answer", good: false },
                { count: caught, name: "You caught it", action: "You kept your own answer", good: true },
              ]}
            />
          </>
        )}
      </section>

      {notable.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Questions worth a second look</h2>
          {notable.map((item) => {
            const task = byTask.get(item.taskId);
            if (!task) return null;
            const wrong = item.outcome === "followed wrong advice";
            return (
              <article
                key={item.taskId}
                className={cn("rounded-3xl p-5 ring-1 ring-foreground/5", wrong ? "bg-hurts-soft" : "bg-card/70")}
              >
                <Eyebrow className={wrong ? "text-hurts" : "text-muted-foreground"}>
                  {wrong ? "It fooled you" : "You missed out"}
                </Eyebrow>
                <p className="mt-1.5 leading-snug font-medium">{task.prompt}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <Row term="You first said" option={task.options[item.firstAnswer]} letter={LETTERS[item.firstAnswer]} />
                  <Row term="The AI said" option={task.options[item.adviceIndex]} letter={LETTERS[item.adviceIndex]} />
                  <Row term="Your final answer" option={task.options[item.finalAnswer]} letter={LETTERS[item.finalAnswer]} wrong />
                  <Row term="Correct answer" option={task.options[item.correctIndex]} letter={LETTERS[item.correctIndex]} strong />
                </dl>
              </article>
            );
          })}
        </section>
      )}

      {showOtherSets && (
      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Try another topic</h2>
        <div className="flex flex-wrap gap-2">
          {otherSets.map((slug) => (
            <form key={slug} action={leaveSessionAction}>
              <input type="hidden" name="setSlug" value={slug} />
              <Button type="submit" variant="outline">
                {PARTICIPANT_SETS[slug].name}
              </Button>
            </form>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/results" className={buttonVariants()}>
            See how everyone did
          </Link>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Home
          </Link>
        </div>
      </section>
      )}
    </Shell>
  );
}

const TONES = {
  human: { bar: "bg-human", text: "text-human" },
  centaur: { bar: "bg-centaur", text: "text-centaur" },
  ai: { bar: "bg-ai", text: "text-ai" },
} as const;

/** One score as a bar on the shared 0 to n scale, with "7 / 10" beside it. */
function Score({ label, rate, tone, delta }: { label: string; rate: Rate; tone: keyof typeof TONES; delta?: number }) {
  const { k, n } = rate;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
        {label}
        {delta !== undefined && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              delta > 0 && "bg-helps-soft text-helps",
              delta < 0 && "bg-hurts-soft text-hurts",
              delta === 0 && "bg-muted text-muted-foreground",
            )}
          >
            {delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "±0"} vs on your own
          </span>
        )}
      </span>
      <span className={cn("row-span-2 text-right text-4xl leading-none font-semibold tracking-tight tabular-nums", TONES[tone].text)}>
        {k}
        <span className="text-muted-foreground text-base font-normal"> / {n}</span>
      </span>
      <span aria-hidden className="bg-secondary h-3 overflow-hidden rounded-full">
        <span
          className={cn("block h-full rounded-full", TONES[tone].bar)}
          style={{ width: `${n > 0 ? (k / n) * 100 : 0}%` }}
        />
      </span>
    </li>
  );
}

type Part = { count: number; name: string; action: string; good: boolean };

/**
 * What the person did when the AI was right, or when it was wrong: one bar split in two, with
 * the count of each. The same picture as on the public results, with counts instead of shares.
 */
function Split({ heading, parts }: { heading: string; parts: [Part, Part] }) {
  const total = parts[0].count + parts[1].count;
  return (
    <div className="bg-card/70 flex flex-col gap-4 rounded-3xl p-5 ring-1 ring-foreground/5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{heading}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {total} {total === 1 ? "time" : "times"}
        </span>
      </div>
      {total === 0 ? (
        <p className="text-muted-foreground text-sm">This didn&apos;t come up while you disagreed with it.</p>
      ) : (
        <>
          <div aria-hidden className="flex h-3 gap-1">
            {parts.map(
              (p) =>
                p.count > 0 && (
                  <span
                    key={p.name}
                    className={cn("h-full rounded-full", p.good ? "bg-helps" : "bg-hurts")}
                    style={{ flexGrow: p.count, flexBasis: 0 }}
                  />
                ),
            )}
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {parts.map((p) => (
              <div key={p.name} className={cn("flex flex-col gap-0.5", p.count === 0 && "opacity-60")}>
                <dd className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{p.count}</dd>
                <dt className="flex flex-col text-sm">
                  <span className={cn("font-semibold", p.good ? "text-helps" : "text-hurts")}>{p.name}</span>
                  <span className="text-muted-foreground text-xs leading-snug">{p.action}</span>
                </dt>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

/** One counted outcome as a tile, for the questions where the AI went first. */
function Outcome({ count, title, detail, good }: { count: number; title: string; detail: string; good?: boolean }) {
  return (
    <li className={cn("bg-card/70 flex flex-col gap-1 rounded-3xl p-5 ring-1 ring-foreground/5", count === 0 && "opacity-60")}>
      <span className={cn("text-2xl leading-none font-semibold tabular-nums", count > 0 && (good ? "text-helps" : "text-hurts"))}>
        {count}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs leading-snug">{detail}</span>
    </li>
  );
}

function Row({
  term,
  option,
  letter,
  strong,
  wrong,
}: {
  term: string;
  option: string;
  letter: string;
  /** The correct answer. */
  strong?: boolean;
  /** The person's final answer, which was not the correct one. */
  wrong?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={cn(strong && "text-helps font-semibold", wrong && "text-hurts font-medium")}>
        {letter}. {option}
      </dd>
    </>
  );
}
