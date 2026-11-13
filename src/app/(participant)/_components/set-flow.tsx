import type { LinkLabel } from "@/lib/participant-schemas";
import { readSessionId } from "@/lib/session";
import { Report } from "./report";
import { Shell } from "./shell";
import { StartForm } from "./start-form";
import { isMixedSet } from "@/lib/sets";
import { AdvisedStage, FinalStage, FirstStage } from "./stages";

/**
 * The whole participant flow for one set, shared by /s/<set> (public sets) and /t/<token>
 * (an organization's private sets). What shows is worked out from the database on every render
 * (spec 0001, "Write safety"): the nickname form, the question, the AI advice, or the report.
 * A refresh in the middle therefore never loses progress or skips a stage.
 */
export type FlowSet = {
  /** tasks.set_slug and sessions.set_slug. */
  slug: string;
  /** What the forms send back: the public slug, or the private set's share token. */
  ref: string;
  name: string;
  blurb: string;
  /** The organization's name, for private sets. */
  owner: string | null;
};

export async function SetFlow({ set, label }: { set: FlowSet; label: LinkLabel }) {
  const [{ getSessionInfo }, { getSessionStep }] = await Promise.all([
    import("@/db/queries/session-info"),
    import("@/db/queries/participant"),
  ]);

  const sessionId = await readSessionId();
  const info = sessionId ? await getSessionInfo(sessionId) : null;

  // No session, a session that was reset, or one from a different set: show the nickname form.
  if (!sessionId || !info || info.setSlug !== set.slug) {
    return <StartScreen set={set} label={label} />;
  }

  const step = await getSessionStep(sessionId);

  if (step.stage === "first") {
    return (
      <Shell>
        <FirstStage step={step} setSlug={set.ref} />
      </Shell>
    );
  }
  if (step.stage === "final") {
    return (
      <Shell>
        <FinalStage step={step} setSlug={set.ref} />
      </Shell>
    );
  }
  // Advice first cases (spec 0002): question and AI advice together, one answer.
  if (step.stage === "advised") {
    return (
      <Shell>
        <AdvisedStage step={step} setSlug={set.ref} />
      </Shell>
    );
  }

  const [{ getSessionFacts }, { getReportTasks }] = await Promise.all([
    import("@/db/queries/trial-facts"),
    import("@/db/queries/session-info"),
  ]);
  const [facts, tasks] = await Promise.all([getSessionFacts(sessionId), getReportTasks(sessionId)]);
  return (
    <Report
      nickname={info.nickname}
      setSlug={set.ref}
      facts={facts}
      tasks={tasks}
      showOtherSets={set.owner === null}
    />
  );
}

function StartScreen({ set, label }: { set: FlowSet; label: LinkLabel }) {
  // Experiment sets mix advice first and answer first cases (spec 0002). Private sets never do.
  const mixed = set.owner === null && isMixedSet(set.slug);
  return (
    <Shell>
      <header className="flex flex-col gap-2 pt-2">
        {set.owner && <p className="text-muted-foreground text-sm font-medium">{set.owner}</p>}
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{set.name}</h1>
        {set.blurb && <p className="text-muted-foreground text-lg leading-snug">{set.blurb}</p>}
      </header>

      <section aria-labelledby="how-it-works" className="bg-secondary/40 flex flex-col gap-4 rounded-3xl p-5">
        <h2 id="how-it-works" className="text-sm font-semibold">
          How it works
        </h2>
        {mixed && (
          <p className="text-sm leading-relaxed">
            Each alert is handled in one of two ways. You will get some of each, in a mixed order.
          </p>
        )}
        <ol className="flex flex-col gap-3 text-sm leading-relaxed">
          {mixed && (
            <li className="flex gap-3">
              <span aria-hidden className="bg-ai/15 text-ai grid size-7 shrink-0 place-items-center rounded-full font-semibold">
                A
              </span>
              <span>
                <b className="font-semibold">AI suggestion shown.</b> You see the alert together with what the AI
                picked. Give your answer and tell us how sure you are.
              </span>
            </li>
          )}
          <li className={mixed ? "flex gap-3 border-t pt-3" : "flex gap-3"}>
            <span aria-hidden className="bg-primary/15 text-primary grid size-7 shrink-0 place-items-center rounded-full font-semibold">
              1
            </span>
            <span>
              <b className="font-semibold">{mixed ? "B, step 1: on your own." : "On your own."}</b> Pick an answer and
              tell us how sure you are.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="bg-ai/15 text-ai grid size-7 shrink-0 place-items-center rounded-full font-semibold">
              2
            </span>
            <span>
              <b className="font-semibold">{mixed ? "B, step 2: with AI advice." : "With AI advice."}</b> We show you
              what the AI picked. Keep your answer
              or change it, then tell us how sure you are now.
            </span>
          </li>
        </ol>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <li>{set.slug === "judge-demo" ? "About 1 minute" : "About 8 minutes"}</li>
          <li>Please don&apos;t look anything up</li>
          <li>The AI is wrong sometimes</li>
        </ul>
      </section>

      <StartForm setSlug={set.ref} label={label} />

      {label !== "pilot" && (
        <p className="text-muted-foreground text-xs">This is a test run ({label}). Your answers won&apos;t be counted in the study.</p>
      )}
    </Shell>
  );
}
