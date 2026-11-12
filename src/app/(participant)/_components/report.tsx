import { leaveSessionAction } from "@/actions/session";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ReportTask } from "@/db/queries/session-info";
import { aiAloneAccuracy, sessionProfile, type ProfileItem, type TrialFact } from "@/lib/metrics";
import { PARTICIPANT_SETS, SET_SLUGS } from "@/lib/sets";
import { cn } from "@/lib/utils";
import { LETTERS, Shell } from "./shell";

type Props = { nickname: string; setSlug: string; facts: TrialFact[]; tasks: ReportTask[] };

/**
 * The personal report (scope feature 12). Built only from this person's own answers, and only for a
 * finished session. The correct answers appear here for the first time, after the last question.
 */
export function Report({ nickname, setSlug, facts, tasks }: Props) {
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
  const otherSets = SET_SLUGS.filter((s) => s !== setSlug && s !== "judge-demo");

  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Thanks, {nickname}. You finished.</p>
        <h1 className="text-2xl font-semibold text-balance">Your centaur report</h1>
        <p className="text-muted-foreground">
          A centaur is a person working together with a machine. Here is how you did alone, how the AI did on the
          same questions, and how you did with its advice.
        </p>
      </header>

      <section aria-label="Scores" className="grid grid-cols-3 gap-2">
        <Score label="You alone" k={profile.accuracyBefore.k} n={profile.accuracyBefore.n} color="--human" />
        <Score label="AI alone" k={ai.k} n={ai.n} color="--ai" />
        <Score label="You with AI" k={profile.accuracyAfter.k} n={profile.accuracyAfter.n} color="--centaur" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">How you used the AI</h2>
        {disagreements === 0 ? (
          <p>The AI suggested the same answer you gave on every question, so there was nothing to follow or ignore.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              You and the AI disagreed on <b>{disagreements}</b> {disagreements === 1 ? "question" : "questions"}.
              You switched to the AI&apos;s answer {switched === 1 ? "once" : `${switched} times`}.
            </li>
            {helped > 0 && (
              <li>
                <b>{helped}</b> {helped === 1 ? "time" : "times"} the AI was right and you followed it. It helped you.
              </li>
            )}
            {followedWrong > 0 && (
              <li>
                <b>{followedWrong}</b> {followedWrong === 1 ? "time" : "times"} you followed the AI when it was wrong.
                This is what researchers call following too readily.
              </li>
            )}
            {ignoredGood > 0 && (
              <li>
                <b>{ignoredGood}</b> {ignoredGood === 1 ? "time" : "times"} you kept your own answer when the AI was
                right. Good advice was lost.
              </li>
            )}
            {caught > 0 && (
              <li>
                <b>{caught}</b> {caught === 1 ? "time" : "times"} you kept your own answer and the AI was wrong. You
                caught its mistake.
              </li>
            )}
          </ul>
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
                className={cn("rounded-lg border p-4", wrong ? "border-(--hurts) bg-(--hurts-soft)" : "bg-card")}
              >
                <p className="text-xs font-semibold tracking-wide uppercase">
                  {wrong ? "You followed wrong advice" : "You ignored good advice"}
                </p>
                <p className="mt-1 font-medium">{task.prompt}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <Row term="You first said" option={task.options[item.firstAnswer]} letter={LETTERS[item.firstAnswer]} />
                  <Row term="The AI said" option={task.options[item.adviceIndex]} letter={LETTERS[item.adviceIndex]} />
                  <Row term="You ended on" option={task.options[item.finalAnswer]} letter={LETTERS[item.finalAnswer]} />
                  <Row term="Correct answer" option={task.options[item.correctIndex]} letter={LETTERS[item.correctIndex]} strong />
                </dl>
              </article>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-semibold">Try another set</h2>
        <div className="flex flex-wrap gap-2">
          {otherSets.map((slug) => (
            <form key={slug} action={leaveSessionAction}>
              <input type="hidden" name="setSlug" value={slug} />
              <Button type="submit" variant="outline">
                {PARTICIPANT_SETS[slug].name}
              </Button>
            </form>
          ))}
          <a href="/" className={buttonVariants({ variant: "ghost" })}>
            Home
          </a>
        </div>
      </section>
    </Shell>
  );
}

function Score({ label, k, n, color }: { label: string; k: number; n: number; color: string }) {
  return (
    <div className="bg-card rounded-lg border border-t-4 p-3 text-center" style={{ borderTopColor: `var(${color})` }}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {k}
        <span className="text-muted-foreground text-base font-normal"> / {n}</span>
      </p>
    </div>
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
