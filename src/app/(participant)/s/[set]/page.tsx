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
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm font-medium">The Centaur Test</p>
        <h1 className="text-2xl font-semibold text-balance">{set.name}</h1>
        <p className="text-muted-foreground">{set.blurb}</p>
      </header>

      <section className="bg-card flex flex-col gap-3 rounded-lg border p-4 text-sm leading-relaxed">
        <p className="font-semibold">How it works</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>Answer each question on your own and say how sure you are.</li>
          <li>Then you see the AI&apos;s advice. Keep your answer or change it, and say how sure you are now.</li>
        </ol>
        <p>Answer honestly and no searching. AI advice will sometimes be wrong. It takes about 8 minutes.</p>
      </section>

      <StartForm setSlug={setSlug} label={label} />

      {otherSet && (
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
