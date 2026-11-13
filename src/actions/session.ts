"use server";

import { redirect } from "next/navigation";
import {
  answerSchema,
  startSchema,
  type FormState,
} from "@/lib/participant-schemas";
import { clearSessionCookie, readSessionId, setSessionCookie } from "@/lib/session";
import { isParticipantSet, setPath } from "@/lib/sets";

/**
 * Every write the participant flow makes. Rules from CLAUDE.md that live here:
 *  - Zod checks all input, and the session id comes from the cookie, never from the form (rule 3).
 *  - Nothing returned from an action carries a correct answer or AI advice. The advice reaches the
 *    page only through a render: after the first answer is stored, or with the question on a
 *    response marked advice first (rule 2 and spec 0002).
 *  - Only actions write to the database, never a page render (rule 5).
 *
 * The database modules are imported inside the functions: they throw at import time when
 * DATABASE_URL is missing, and the build must not need a database.
 */

function logFailure(action: string, error: unknown, extra: Record<string, unknown> = {}) {
  console.error(`[participant] ${action} failed`, { ...extra, error });
}

const SOMETHING_WRONG = "Something went wrong on our side. Please try again.";

/** Start a session from the nickname form, set the cookie, and show the first question. */
export async function startSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  // A public set's slug, or a private set's share token (organizations, /t/<token>).
  const { setSlug: setRef, nickname, expertise, label } = parsed.data;

  let sessionId: string;
  let setSlug: string = setRef;
  try {
    if (!isParticipantSet(setRef)) {
      const { findSetByToken } = await import("@/db/queries/orgs");
      const shared = await findSetByToken(setRef);
      if (!shared) return { error: "This question set is not available." };
      setSlug = shared.slug;
    }
    const { startSession } = await import("@/db/queries/participant");
    const started = await startSession({
      setSlug,
      nickname,
      label,
      selfRatedExpertise: expertise,
    });
    if (!started) return { error: "This topic isn't open yet." };
    sessionId = started.sessionId;
  } catch (error) {
    logFailure("startSession", error, { setSlug });
    return { error: SOMETHING_WRONG };
  }

  await setSessionCookie(sessionId);
  redirect(setPath(setRef));
}

/** The page of the set a session belongs to: /s/<slug> for a public set, /t/<token> for a private one. */
async function pathForSession(setSlug: string): Promise<string> {
  if (isParticipantSet(setSlug)) return `/s/${setSlug}`;
  const { findTokenForSet } = await import("@/db/queries/orgs");
  const token = await findTokenForSet(setSlug);
  return token ? `/t/${token}` : "/";
}

type Stage = "first" | "final" | "advised";

/**
 * Shared by both answer actions. The stage and the question always come from the database, so a
 * double tap, the Back button, or a form from an older page can never skip or repeat a stage:
 * anything out of step just lands back on the current screen.
 */
async function submitAnswer(stage: Stage, formData: FormData): Promise<FormState> {
  const parsed = answerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick an answer and tell us how sure you are." };
  const { setSlug, taskId, answer, confidence, ms } = parsed.data;

  const sessionId = await readSessionId();
  if (!sessionId) redirect(setPath(setSlug));

  try {
    const [{ getSessionInfo }, { getSessionStep, recordFirstAnswer, recordFinalAnswer, recordAdvisedAnswer }] =
      await Promise.all([
        import("@/db/queries/session-info"),
        import("@/db/queries/participant"),
      ]);

    const info = await getSessionInfo(sessionId);
    if (!info) redirect(setPath(setSlug));

    const step = await getSessionStep(sessionId);
    const inStep = step.stage !== "done" && step.stage === stage && step.task.taskId === taskId;
    if (inStep) {
      const input = { sessionId, taskId, answer, confidence, ms };
      // Both writes apply at most once and return false on a repeat, which is fine here.
      if (stage === "first") await recordFirstAnswer(input);
      else if (stage === "final") await recordFinalAnswer(input);
      else await recordAdvisedAnswer(input);
    }
    redirect(await pathForSession(info.setSlug));
  } catch (error) {
    // redirect() works by throwing; let it through.
    if (isRedirect(error)) throw error;
    logFailure(`submit ${stage} answer`, error, { sessionId, taskId });
    return { error: "We could not save your answer. Please try again." };
  }
}

function isRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export async function submitFirstAnswerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submitAnswer("first", formData);
}

export async function submitFinalAnswerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submitAnswer("final", formData);
}

/** Spec 0002: the one answer of a question where the AI advice was shown from the start. */
export async function submitAdvisedAnswerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return submitAnswer("advised", formData);
}

/** "Start over" and "try another set": forget this session on this device. The data stays. */
export async function leaveSessionAction(formData: FormData): Promise<void> {
  const set = String(formData.get("setSlug") ?? "");
  await clearSessionCookie();
  redirect(setPath(set));
}
