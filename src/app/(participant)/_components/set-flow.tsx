import type { LinkLabel } from "@/lib/participant-schemas";
import { readSessionId } from "@/lib/session";
import { Report } from "./report";
import { Shell } from "./shell";
import { StartForm } from "./start-form";
import { FinalStage, FirstStage } from "./stages";

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
    return <StartScreen set={set} label={label} inOtherSet={Boolean(info && info.setSlug !== set.slug)} />;
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

function StartScreen({ set, label, inOtherSet }: { set: FlowSet; label: LinkLabel; inOtherSet: boolean }) {
  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm font-medium">
          The Centaur Test{set.owner ? ` · ${set.owner}` : ""}
        </p>
        <h1 className="text-2xl font-semibold text-balance">{set.name}</h1>
        {set.blurb && <p className="text-muted-foreground">{set.blurb}</p>}
      </header>

      <section className="bg-card flex flex-col gap-3 rounded-lg border p-4 text-sm leading-relaxed">
        <p className="font-semibold">How it works</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>Answer each question on your own and say how sure you are.</li>
          <li>Then you see the AI&apos;s advice. Keep your answer or change it, and say how sure you are now.</li>
        </ol>
        <p>Answer honestly and no searching. AI advice will sometimes be wrong. It takes about 8 minutes.</p>
      </section>

      <StartForm setSlug={set.ref} label={label} />

      {inOtherSet && (
        <p className="text-muted-foreground text-sm">
          This device is already in a session on another set. Starting here begins a new one.
        </p>
      )}
      {label !== "pilot" && (
        <p className="text-muted-foreground text-xs">Test run ({label}). Your answers are kept apart from the study.</p>
      )}
    </Shell>
  );
}
