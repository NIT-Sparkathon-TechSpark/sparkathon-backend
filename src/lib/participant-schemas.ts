import { z } from "zod";
import { SET_SLUGS, SHARE_TOKEN } from "./sets.ts";

/**
 * Zod schemas for everything the participant flow accepts from the browser (hard rule 3).
 * Plain TypeScript with relative imports only, so scripts/test-participant.mjs can run it.
 *
 * Note what is NOT here: the session id. It always comes from the cookie.
 */

/** Labels a link may set (?label=practice, ?label=judge). `seeded` can never come from a browser. */
export const LINK_LABELS = ["pilot", "practice", "judge"] as const;
export type LinkLabel = (typeof LINK_LABELS)[number];

/** Anything unknown or missing falls back to a normal pilot session. */
export const parseLinkLabel = (value: unknown): LinkLabel =>
  z.enum(LINK_LABELS).catch("pilot").parse(value);

/** The four confidence levels offered. 25 is a pure guess on a four option question. */
export const CONFIDENCE_LEVELS = [
  { value: 25, label: "Just guessing" },
  { value: 50, label: "Not very sure" },
  { value: 75, label: "Fairly sure" },
  { value: 100, label: "Certain" },
] as const;

export const EXPERTISE_LEVELS = [
  { value: 1, label: "1 · New to it" },
  { value: 2, label: "2 · A little" },
  { value: 3, label: "3 · Some" },
  { value: 4, label: "4 · Quite a lot" },
  { value: 5, label: "5 · Expert" },
] as const;

/**
 * Which set a form is about: a public set's slug, or a private set's share token. The field keeps
 * its name `setSlug` so the forms didn't change; the action turns a token into the set's slug.
 */
export const setRefSchema = z.union([z.enum(SET_SLUGS), z.string().regex(SHARE_TOKEN)]);

export const startSchema = z.object({
  setSlug: setRefSchema,
  nickname: z
    .string()
    .trim()
    .min(1, "Pick a nickname to start.")
    .max(24, "Keep your nickname to 24 characters.")
    .regex(/^[\p{L}\p{N} ._'-]+$/u, "Use letters, numbers, spaces and . _ ' - only."),
  expertise: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(1).max(5).nullable()),
  label: z.enum(LINK_LABELS).catch("pilot"),
});

/**
 * A whole number sent as a form string. Not `z.coerce.number()`: that turns an empty string into 0,
 * which would store a missing answer as option A.
 */
const whole = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,7}$/, "Enter a whole number.")
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

/** First answer and final answer share one shape. `ms` is measured by the browser, within bounds. */
export const answerSchema = z.object({
  // Only used to send the person back to the right page when their session is gone.
  setSlug: setRefSchema,
  taskId: z.string().min(1).max(64),
  answer: whole(0, 3),
  confidence: whole(25, 100),
  ms: whole(0, 60 * 60 * 1000),
});

export const sessionIdSchema = z.uuid();

/** Returned by actions to the form. Never carries a correct answer or advice (hard rule 2). */
export type FormState = { error?: string };
