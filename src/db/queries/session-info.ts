import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../index";
import { responses, sessions, tasks, type SessionLabel } from "../schema";

/**
 * Small reads the participant pages need beyond participant.ts. Server only.
 * Hard rule 2 still holds: nothing here selects a correct answer or advice.
 */

export type SessionInfo = {
  id: string;
  setSlug: string;
  nickname: string;
  label: SessionLabel;
  completed: boolean;
};

/** Null when the id matches no session (for example after a reset). */
export async function getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
  const [row] = await db
    .select({
      id: sessions.id,
      setSlug: sessions.setSlug,
      nickname: sessions.nickname,
      label: sessions.label,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  const { completedAt, ...rest } = row;
  return { ...rest, completed: completedAt !== null };
}

export type ReportTask = { taskId: string; prompt: string; options: string[] };

/**
 * The question text for the personal report. Returns rows only for a session that is complete,
 * so the report can never be pulled up in the middle of a session.
 */
export async function getReportTasks(sessionId: string): Promise<ReportTask[]> {
  return db
    .select({ taskId: tasks.id, prompt: tasks.prompt, options: tasks.options })
    .from(responses)
    .innerJoin(tasks, eq(responses.taskId, tasks.id))
    .innerJoin(sessions, eq(responses.sessionId, sessions.id))
    .where(and(eq(responses.sessionId, sessionId), isNotNull(sessions.completedAt)))
    .orderBy(asc(responses.position));
}
