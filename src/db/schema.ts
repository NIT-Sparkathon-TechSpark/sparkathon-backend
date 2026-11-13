import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Data model for the Centaur Test. See docs/plan/team-plan.md and
 * docs/specs/0001-stack-architecture/amendments.md.
 *
 * Answer indexes are 0-3 (position in `options`). Confidence is 0-100;
 * the UI uses 25-100 for a four-option question.
 */

export const SESSION_LABELS = ["pilot", "practice", "judge", "seeded"] as const;
export type SessionLabel = (typeof SESSION_LABELS)[number];

export const ADVICE_SOURCES = ["recorded", "seeded"] as const;
export type AdviceSource = (typeof ADVICE_SOURCES)[number];

/** One question, with the AI advice recorded ahead of time. Loaded from data/tasks/<set>.json. */
export const tasks = pgTable(
  "tasks",
  {
    // Stable id from the JSON file, e.g. "logic-01". Never reused for a different question.
    id: text("id").primaryKey(),
    setSlug: text("set_slug").notNull(),
    position: smallint("position").notNull(),
    category: text("category").notNull(),
    difficulty: smallint("difficulty").notNull(),
    prompt: text("prompt").notNull(),
    context: text("context"),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: smallint("correct_index").notNull(),
    adviceIndex: smallint("advice_index").notNull(),
    adviceConfidence: smallint("advice_confidence"),
    adviceExplanation: text("advice_explanation").notNull(),
    adviceSource: text("advice_source").$type<AdviceSource>().notNull(),
    adviceModel: text("advice_model"),
    verifiedBy: text("verified_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("tasks_set_position_unique").on(t.setSlug, t.position),
    index("tasks_set_idx").on(t.setSlug),
    check("tasks_difficulty_range", sql`${t.difficulty} between 1 and 3`),
    check("tasks_correct_index_range", sql`${t.correctIndex} between 0 and 3`),
    check("tasks_advice_index_range", sql`${t.adviceIndex} between 0 and 3`),
    check(
      "tasks_advice_confidence_range",
      sql`${t.adviceConfidence} is null or ${t.adviceConfidence} between 0 and 100`,
    ),
    check("tasks_advice_source_valid", sql`${t.adviceSource} in ('recorded', 'seeded')`),
  ],
);

/** One participant run through one set. Its id lives in an HttpOnly cookie. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setSlug: text("set_slug").notNull(),
    nickname: text("nickname").notNull(),
    label: text("label").$type<SessionLabel>().notNull().default("pilot"),
    selfRatedExpertise: smallint("self_rated_expertise"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("sessions_set_label_idx").on(t.setSlug, t.label),
    check("sessions_label_valid", sql`${t.label} in ('pilot', 'practice', 'judge', 'seeded')`),
    check(
      "sessions_expertise_range",
      sql`${t.selfRatedExpertise} is null or ${t.selfRatedExpertise} between 1 and 5`,
    ),
  ],
);

/**
 * One row per session and task, created when the session starts (the session plan),
 * filled in two stages. Stage logic for the screen:
 *   first_answer is null                       -> show the question alone
 *   first_answer set, final_answer is null     -> show the AI advice
 *   both set                                   -> done, next position
 * Advice first rows (spec 0002, `advice_first`) skip the first stage: the advice is shown with the
 * question and only the final answer is ever stored. Their first_* columns stay null for ever.
 * Writes: the first answer only updates while first_answer is null; the final answer only
 * while final_answer is null and first_answer is set. One SQL statement each (neon-http).
 */
export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    // No cascade: a task that has responses can never be deleted.
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    position: smallint("position").notNull(),
    rationaleShown: boolean("rationale_shown").notNull(),
    // Spec 0002: true when the AI advice is shown before the person answers (one step).
    adviceFirst: boolean("advice_first").notNull().default(false),
    firstAnswer: smallint("first_answer"),
    firstConfidence: smallint("first_confidence"),
    finalAnswer: smallint("final_answer"),
    finalConfidence: smallint("final_confidence"),
    msFirst: integer("ms_first"),
    msFinal: integer("ms_final"),
    firstAt: timestamp("first_at", { withTimezone: true }),
    finalAt: timestamp("final_at", { withTimezone: true }),
  },
  (t) => [
    unique("responses_session_task_unique").on(t.sessionId, t.taskId),
    unique("responses_session_position_unique").on(t.sessionId, t.position),
    index("responses_task_idx").on(t.taskId),
    check(
      "responses_first_answer_range",
      sql`${t.firstAnswer} is null or ${t.firstAnswer} between 0 and 3`,
    ),
    check(
      "responses_final_answer_range",
      sql`${t.finalAnswer} is null or ${t.finalAnswer} between 0 and 3`,
    ),
    check(
      "responses_first_confidence_range",
      sql`${t.firstConfidence} is null or ${t.firstConfidence} between 0 and 100`,
    ),
    check(
      "responses_final_confidence_range",
      sql`${t.finalConfidence} is null or ${t.finalConfidence} between 0 and 100`,
    ),
    check(
      "responses_final_after_first",
      sql`${t.finalAnswer} is null or ${t.firstAnswer} is not null or ${t.adviceFirst}`,
    ),
    check(
      "responses_advice_first_no_first",
      sql`not ${t.adviceFirst} or (${t.firstAnswer} is null and ${t.firstConfidence} is null)`,
    ),
  ],
);

/**
 * An organization with its own private question sets (docs/plan/org-accounts.md). Its admins
 * sign in with the organization's slug and passcode; there are no personal accounts.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Shown in the admin address, /org/<slug>. Lowercase letters, digits and dashes.
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    // "scrypt$<salt hex>$<hash hex>". Never the passcode itself.
    passcodeHash: text("passcode_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("organizations_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'`)],
);

/**
 * A private question set owned by one organization. Its slug ("o-" plus random characters) is
 * what tasks.set_slug and sessions.set_slug hold, like the public set names do. Participants
 * reach it only through /t/<share_token>, so it can't be found, guessed or listed.
 *
 * The public sets (logic, facts, acme, judge-demo) have no row here: they stay the fixed list in
 * src/lib/sets.ts. That is why tasks.set_slug has no foreign key to this table.
 */
export const taskSets = pgTable(
  "task_sets",
  {
    slug: text("slug").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    description: text("description"),
    shareToken: text("share_token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("task_sets_org_idx").on(t.orgId),
    check("task_sets_slug_format", sql`${t.slug} ~ '^o-[a-z0-9]{10}$'`),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type TaskSet = typeof taskSets.$inferSelect;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Session = typeof sessions.$inferSelect;
// Not named `Response`, which would shadow the global fetch Response type.
export type ResponseRow = typeof responses.$inferSelect;
