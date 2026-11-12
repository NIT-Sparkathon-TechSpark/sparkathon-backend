import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../index";
import { responses, sessions, tasks, type SessionLabel } from "../schema";
import { planSession } from "../session-plan";

/**
 * Everything the participant flow reads and writes. P1's Server Actions call these with the
 * session id from the cookie (never from a form value). Hard rule 2 lives here: the correct
 * answer and the AI advice are only ever selected for a response whose first answer is stored.
 *
 * Rows are created when the session starts, so "insert if absent" for the first answer is an
 * update that only applies while first_answer is still null. Each write is one statement, or one
 * db.batch (which neon-http runs as a single transaction).
 */

/** The question as the participant sees it before answering. No answer, no advice. */
export type PublicTask = {
  taskId: string;
  prompt: string;
  context: string | null;
  options: string[];
};

export type Advice = {
  index: number;
  confidence: number | null;
  /** Null when this question shows the answer only (amendments A2). */
  explanation: string | null;
};

export type SessionStep =
  | { stage: "first"; position: number; total: number; task: PublicTask }
  | {
      stage: "final";
      position: number;
      total: number;
      task: PublicTask;
      first: { answer: number; confidence: number };
      advice: Advice;
    }
  | { stage: "done"; total: number };

// ---------------------------------------------------------------------------------------------
// Start session

export type StartSessionInput = {
  setSlug: string;
  nickname: string;
  label?: SessionLabel;
  selfRatedExpertise?: number | null;
};

/**
 * Create a session and its planned response rows in one transaction. Returns null when the set
 * has no tasks. The caller sets the returned id in the session cookie.
 */
export async function startSession(input: StartSessionInput): Promise<{ sessionId: string; total: number } | null> {
  const setTasks = await db
    .select({
      id: tasks.id,
      position: tasks.position,
      correctIndex: tasks.correctIndex,
      adviceIndex: tasks.adviceIndex,
    })
    .from(tasks)
    .where(eq(tasks.setSlug, input.setSlug));
  if (setTasks.length === 0) return null;

  const plan = planSession(setTasks, { fixedOrder: input.setSlug === "judge-demo" });
  const sessionId = randomUUID();

  await db.batch([
    db.insert(sessions).values({
      id: sessionId,
      setSlug: input.setSlug,
      nickname: input.nickname,
      label: input.label ?? "pilot",
      selfRatedExpertise: input.selfRatedExpertise ?? null,
    }),
    db.insert(responses).values(
      plan.map((p) => ({
        sessionId,
        taskId: p.taskId,
        position: p.position,
        rationaleShown: p.rationaleShown,
      })),
    ),
  ]);
  return { sessionId, total: plan.length };
}

/** True when the cookie's session id still exists (it may have been reset). */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return rows.length > 0;
}

// ---------------------------------------------------------------------------------------------
// Reads: the stage always comes from the database

/** Stage 1: the next question without a first answer. Never selects the answer or the advice. */
export async function getStageOneTask(
  sessionId: string,
): Promise<{ position: number; total: number; task: PublicTask } | null> {
  const [row] = await db
    .select({
      position: responses.position,
      taskId: tasks.id,
      prompt: tasks.prompt,
      context: tasks.context,
      options: tasks.options,
    })
    .from(responses)
    .innerJoin(tasks, eq(responses.taskId, tasks.id))
    .where(and(eq(responses.sessionId, sessionId), isNull(responses.firstAnswer)))
    .orderBy(asc(responses.position))
    .limit(1);
  if (!row) return null;
  const { position, ...task } = row;
  return { position, total: await countResponses(sessionId), task };
}

/**
 * Stage 2: the advice for a task, only if this session already stored its first answer for it
 * and has not finished it. Returns null otherwise, so a skipped stage never leaks the advice.
 */
export async function getStageTwoAdvice(sessionId: string, taskId: string) {
  const [row] = await db
    .select({
      position: responses.position,
      rationaleShown: responses.rationaleShown,
      firstAnswer: responses.firstAnswer,
      firstConfidence: responses.firstConfidence,
      prompt: tasks.prompt,
      context: tasks.context,
      options: tasks.options,
      adviceIndex: tasks.adviceIndex,
      adviceConfidence: tasks.adviceConfidence,
      adviceExplanation: tasks.adviceExplanation,
    })
    .from(responses)
    .innerJoin(tasks, eq(responses.taskId, tasks.id))
    .where(
      and(
        eq(responses.sessionId, sessionId),
        eq(responses.taskId, taskId),
        isNotNull(responses.firstAnswer),
        isNull(responses.finalAnswer),
      ),
    )
    .limit(1);
  if (!row || row.firstAnswer === null || row.firstConfidence === null) return null;
  return {
    position: row.position,
    task: { taskId, prompt: row.prompt, context: row.context, options: row.options } as PublicTask,
    first: { answer: row.firstAnswer, confidence: row.firstConfidence },
    advice: {
      index: row.adviceIndex,
      confidence: row.adviceConfidence,
      explanation: row.rationaleShown ? row.adviceExplanation : null,
    } as Advice,
  };
}

/** What the session screen should show right now. Use this on every render of the flow. */
export async function getSessionStep(sessionId: string): Promise<SessionStep> {
  const total = await countResponses(sessionId);
  // A response with a first answer but no final answer: show its advice.
  const [pending] = await db
    .select({ taskId: responses.taskId })
    .from(responses)
    .where(
      and(
        eq(responses.sessionId, sessionId),
        isNotNull(responses.firstAnswer),
        isNull(responses.finalAnswer),
      ),
    )
    .orderBy(asc(responses.position))
    .limit(1);
  if (pending) {
    const stage2 = await getStageTwoAdvice(sessionId, pending.taskId);
    if (stage2) return { stage: "final", total, ...stage2 };
  }
  const stage1 = await getStageOneTask(sessionId);
  if (stage1) return { stage: "first", ...stage1 };
  return { stage: "done", total };
}

async function countResponses(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(responses)
    .where(eq(responses.sessionId, sessionId));
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------------------------
// Writes: each applies at most once, so double submits and replays do nothing

export type AnswerInput = {
  sessionId: string;
  taskId: string;
  answer: number;
  confidence: number;
  ms: number;
};

/** Store the first answer. Returns false when it was already stored (or the row isn't this session's). */
export async function recordFirstAnswer(input: AnswerInput): Promise<boolean> {
  const updated = await db
    .update(responses)
    .set({
      firstAnswer: input.answer,
      firstConfidence: input.confidence,
      msFirst: input.ms,
      firstAt: sql`now()`,
    })
    .where(
      and(
        eq(responses.sessionId, input.sessionId),
        eq(responses.taskId, input.taskId),
        isNull(responses.firstAnswer),
      ),
    )
    .returning({ id: responses.id });
  return updated.length > 0;
}

/**
 * Store the final answer, only after the first answer and only once. Marks the session complete
 * in the same transaction when this was its last open question. Returns false when nothing was written.
 */
export async function recordFinalAnswer(input: AnswerInput): Promise<boolean> {
  const [updated] = await db.batch([
    db
      .update(responses)
      .set({
        finalAnswer: input.answer,
        finalConfidence: input.confidence,
        msFinal: input.ms,
        finalAt: sql`now()`,
      })
      .where(
        and(
          eq(responses.sessionId, input.sessionId),
          eq(responses.taskId, input.taskId),
          isNotNull(responses.firstAnswer),
          isNull(responses.finalAnswer),
        ),
      )
      .returning({ id: responses.id }),
    db
      .update(sessions)
      .set({ completedAt: sql`now()` })
      .where(
        and(
          eq(sessions.id, input.sessionId),
          isNull(sessions.completedAt),
          sql`not exists (select 1 from responses r where r.session_id = ${input.sessionId} and r.final_answer is null)`,
        ),
      ),
  ]);
  return updated.length > 0;
}
