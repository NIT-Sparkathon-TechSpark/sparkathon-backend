import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leaveSessionAction } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { parseLinkLabel } from "@/lib/participant-schemas";
import { readSessionId } from "@/lib/session";
import { isParticipantSet, PARTICIPANT_SETS } from "@/lib/sets";
import { FinalStage, FirstStage } from "../../_components/stages";
import { Report } from "../../_components/report";
import { Shell } from "../../_components/shell";
import { StartForm } from "../../_components/start-form";

export const metadata: Metadata = { title: "The Centaur Test" };

// Always read the cookie and the database fresh. Reads only; every write is a Server Action.
export const dynamic = "force-dynamic";

/**
 * One address for the whole flow. What shows is worked out from the database on every render
 * (spec 0001, "Write safety"): the nickname form, the question, the AI advice, or the report.
 * A refresh in the middle therefore never loses progress or skips a stage.
 */
export default async function SetPage({ params, searchParams }: PageProps<"/s/[set]">) {
  const { set } = await params;
  if (!isParticipantSet(set)) notFound();
  const { label } = await searchParams;

  const [{ getSessionInfo }, { getSessionStep }] = await Promise.all([
    import("@/db/queries/session-info"),
    import("@/db/queries/participant"),
  ]);

  const sessionId = await readSessionId();
  const info = sessionId ? await getSessionInfo(sessionId) : null;

  // No session, a session that was reset, or one from a different set: show the nickname form.
  if (!sessionId || !info || info.setSlug !== set) {
    return (
      <StartScreen
        setSlug={set}
        label={parseLinkLabel(Array.isArray(label) ? label[0] : label)}
        otherSet={info && info.setSlug !== set ? info.setSlug : null}
      />
    );
  }

  const step = await getSessionStep(sessionId);

  if (step.stage === "first") {
    return (
      <Shell>
        <FirstStage step={step} setSlug={set} />
      </Shell>
    );
  }
  if (step.stage === "final") {
    return (
      <Shell>
        <FinalStage step={step} setSlug={set} />
      </Shell>
    );
  }

  const [{ getSessionFacts }, { getReportTasks }] = await Promise.all([
    import("@/db/queries/trial-facts"),
    import("@/db/queries/session-info"),
  ]);
  const [facts, tasks] = await Promise.all([getSessionFacts(sessionId), getReportTasks(sessionId)]);
  return <Report nickname={info.nickname} setSlug={set} facts={facts} tasks={tasks} />;
}

function StartScreen({
  setSlug,
  label,
  otherSet,
}: {
  setSlug: keyof typeof PARTICIPANT_SETS;
  label: ReturnType<typeof parseLinkLabel>;
  otherSet: string | null;
}) {
  const set = PARTICIPANT_SETS[setSlug];
  return (
    <Shell>
      <header className="flex flex-col gap-2 pt-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{set.name}</h1>
        <p className="text-muted-foreground text-lg leading-snug">{set.blurb}</p>
      </header>

      <section aria-labelledby="how-it-works" className="bg-card flex flex-col gap-4 rounded-xl border p-4">
        <h2 id="how-it-works" className="text-sm font-semibold">
          How it works
        </h2>
        <ol className="flex flex-col gap-3 text-sm leading-relaxed">
          <li className="flex gap-3">
            <span aria-hidden className="bg-primary/15 text-primary grid size-7 shrink-0 place-items-center rounded-full font-semibold">
              1
            </span>
            <span>
              <b className="font-semibold">On your own.</b> Pick an answer and tell us how sure you are.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="bg-ai/15 text-ai grid size-7 shrink-0 place-items-center rounded-full font-semibold">
              2
            </span>
            <span>
              <b className="font-semibold">With AI advice.</b> We show you what the AI picked. Keep your answer
              or change it, then tell us how sure you are now.
            </span>
          </li>
        </ol>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <li>{setSlug === "judge-demo" ? "About 1 minute" : "About 8 minutes"}</li>
          <li>Please don&apos;t look anything up</li>
          <li>The AI is wrong sometimes</li>
        </ul>
      </section>

      <StartForm setSlug={setSlug} label={label} />

      {otherSet && (
        <p className="text-muted-foreground text-sm">
          You already started a different topic on this device. If you start here, you begin again from question 1.
        </p>
      )}
      {label !== "pilot" && (
        <p className="text-muted-foreground text-xs">This is a test run ({label}). Your answers won&apos;t be counted in the study.</p>
      )}
    </Shell>
  );
}
