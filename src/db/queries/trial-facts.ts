import { and, eq, inArray, isNotNull, notInArray, type SQL } from "drizzle-orm";
import type { TrialFact } from "../../lib/metrics";
import { db } from "../index";
import { responses, sessions, tasks, type SessionLabel } from "../schema";

/**
 * Answered responses joined with their task and session, shaped for src/lib/metrics.ts.
 * Server only: call it from Server Components or Server Actions, then pass only the computed
 * summaries (aggregates) to the browser, never these rows (hard rule 4 in CLAUDE.md).
 */
const factColumns = {
  sessionId: responses.sessionId,
  taskId: responses.taskId,
  position: responses.position,
  rationaleShown: responses.rationaleShown,
  adviceFirst: responses.adviceFirst,
  msFirst: responses.msFirst,
  msFinal: responses.msFinal,
  firstAnswer: responses.firstAnswer,
  firstConfidence: responses.firstConfidence,
  finalAnswer: responses.finalAnswer,
  finalConfidence: responses.finalConfidence,
  setSlug: tasks.setSlug,
  category: tasks.category,
  difficulty: tasks.difficulty,
  correctIndex: tasks.correctIndex,
  adviceIndex: tasks.adviceIndex,
  label: sessions.label,
  selfRatedExpertise: sessions.selfRatedExpertise,
};

function baseQuery(where: SQL | undefined) {
  return db
    .select(factColumns)
    .from(responses)
    .innerJoin(tasks, eq(responses.taskId, tasks.id))
    .innerJoin(sessions, eq(responses.sessionId, sessions.id))
    .where(where);
}

/**
 * Results-screen data. Defaults match amendments A3: `pilot` and `seeded` sessions,
 * completed sessions only, every set unless `sets` narrows it.
 */
export async function getTrialFacts({
  sets,
  excludeSets,
  labels = ["pilot", "seeded"],
  completedOnly = true,
}: {
  sets?: string[];
  /** Sets to leave out, for example the experiment sets of spec 0002 on the main results screens. */
  excludeSets?: string[];
  labels?: SessionLabel[];
  completedOnly?: boolean;
} = {}): Promise<TrialFact[]> {
  const filters: SQL[] = [inArray(sessions.label, labels), isNotNull(responses.finalAnswer)];
  if (sets && sets.length > 0) filters.push(inArray(tasks.setSlug, sets));
  if (excludeSets && excludeSets.length > 0) filters.push(notInArray(tasks.setSlug, excludeSets));
  if (completedOnly) filters.push(isNotNull(sessions.completedAt));
  return baseQuery(and(...filters));
}

/** One session's answered responses, for the participant's own end screen (sessionProfile). */
export async function getSessionFacts(sessionId: string): Promise<TrialFact[]> {
  return baseQuery(and(eq(responses.sessionId, sessionId), isNotNull(responses.finalAnswer)));
}
