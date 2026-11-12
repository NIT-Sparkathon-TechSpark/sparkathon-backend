import { cookies } from "next/headers";
import { sessionIdSchema } from "./participant-schemas";

/**
 * The participant's session id lives in an HttpOnly cookie (spec 0001, "Identity and access").
 * Reading is fine anywhere on the server. Setting and clearing happen only inside Server Actions.
 */
export const SESSION_COOKIE = "centaur_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

/** The session id from the cookie, or null when missing or not a UUID. Existence is checked by the caller. */
export async function readSessionId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const parsed = sessionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Server Actions only. */
export async function setSessionCookie(sessionId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SEVEN_DAYS,
    path: "/",
  });
}

/** Server Actions only. */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
