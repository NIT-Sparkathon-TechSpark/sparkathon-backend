import { leaveSessionAction } from "@/actions/session";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ReportTask } from "@/db/queries/session-info";
import { aiAloneAccuracy, sessionProfile, type ProfileItem, type TrialFact } from "@/lib/metrics";
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

  return (
    <Shell>
      <header className="flex flex-col gap-2 pt-2">
        <p className="text-muted-foreground text-sm">Thanks, {nickname}. That was the last question.</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Here&apos;s how you did</h1>
        <p className="text-muted-foreground leading-relaxed">
          Three scores for the same questions: yours before any advice, the AI&apos;s, and yours after seeing its
          advice. (Chess players call a human and a computer playing together a centaur. That&apos;s where the
          name comes from.)
        </p>
      </header>

      <section aria-label="Scores" className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Score label="You alone" k={profile.accuracyBefore.k} n={profile.accuracyBefore.n} color="--human" />
          <Score label="AI alone" k={ai.k} n={ai.n} color="--ai" />
          <Score label="You with AI" k={profile.accuracyAfter.k} n={profile.accuracyAfter.n} color="--centaur" />
        </div>
        <p
          className={cn(
            "rounded-xl border p-4 font-medium",
            delta > 0 && "border-helps/50 bg-helps-soft",
            delta < 0 && "border-hurts/50 bg-hurts-soft",
            delta === 0 && "bg-card",
          )}
        >
          {delta > 0 && `You got ${delta} more ${plural(delta)} right after seeing the AI's advice.`}
          {delta < 0 && `You got ${-delta} fewer ${plural(-delta)} right after seeing the AI's advice. You did better on your own.`}
          {delta === 0 && "Your score didn't change after you saw the AI's advice."}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How you used the AI</h2>
        {disagreements === 0 ? (
          <p>The AI picked the same answer as you on every question, so you never had to choose between them.</p>
        ) : (
          <>
            <p>
              You and the AI disagreed on <b>{disagreements}</b> {plural(disagreements)}. You switched to the
              AI&apos;s answer {switched === 1 ? "once" : `${switched} times`}.
            </p>
            <ul className="grid grid-cols-2 gap-2">
              <Outcome count={helped} good title="It helped you" detail="The AI was right and you switched to it." />
              <Outcome
                count={followedWrong}
                title="It fooled you"
                detail="The AI was wrong and you switched anyway."
              />
              <Outcome
                count={ignoredGood}
                title="You missed out"
                detail="The AI was right but you kept your answer."
              />
              <Outcome
                count={caught}
                good
                title="You caught it"
                detail="The AI was wrong and you didn't fall for it."
              />
            </ul>
          </>
        )}
      </section>

      {notable.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Questions worth a second look</h2>
          {notable.map((item) => {
            const task = byTask.get(item.taskId);
            if (!task) return null;
            const wrong = item.outcome === "followed wrong advice";
            return (
              <article
                key={item.taskId}
                className={cn("rounded-xl border p-4", wrong ? "border-hurts/50 bg-hurts-soft" : "bg-card")}
              >
                <Eyebrow className={wrong ? "text-hurts" : "text-muted-foreground"}>
                  {wrong ? "It fooled you" : "You missed out"}
                </Eyebrow>
                <p className="mt-1.5 leading-snug font-medium">{task.prompt}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <Row term="You first said" option={task.options[item.firstAnswer]} letter={LETTERS[item.firstAnswer]} />
                  <Row term="The AI said" option={task.options[item.adviceIndex]} letter={LETTERS[item.adviceIndex]} />
                  <Row term="Your final answer" option={task.options[item.finalAnswer]} letter={LETTERS[item.finalAnswer]} />
                  <Row term="Correct answer" option={task.options[item.correctIndex]} letter={LETTERS[item.correctIndex]} strong />
                </dl>
              </article>
            );
          })}
        </section>
      )}

      {showOtherSets && (
      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-semibold">Try another topic</h2>
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
          <Link href="/results" className={buttonVariants({ variant: "secondary" })}>
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

function Score({ label, k, n, color }: { label: string; k: number; n: number; color: string }) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-xl border p-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: `var(${color})` }} />
        {label}
      </p>
      <p className="text-3xl leading-none font-semibold tabular-nums">
        {k}
        <span className="text-muted-foreground text-base font-normal"> / {n}</span>
      </p>
      <div aria-hidden className="bg-secondary h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{ width: `${n > 0 ? (k / n) * 100 : 0}%`, background: `var(${color})` }}
        />
      </div>
    </div>
  );
}

/** One of the four things that can happen when the person and the AI disagree. */
function Outcome({ count, title, detail, good }: { count: number; title: string; detail: string; good?: boolean }) {
  return (
    <li className={cn("bg-card flex flex-col gap-1 rounded-xl border p-3", count === 0 && "opacity-60")}>
      <span className={cn("text-2xl leading-none font-semibold tabular-nums", count > 0 && (good ? "text-helps" : "text-hurts"))}>
        {count}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs leading-snug">{detail}</span>
    </li>
  );
}

function Row({ term, option, letter, strong }: { term: string; option: string; letter: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={strong ? "font-semibold" : undefined}>
        {letter}. {option}
      </dd>
    </>
  );
}
