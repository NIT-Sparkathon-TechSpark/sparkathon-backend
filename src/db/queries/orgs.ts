import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { TrialFact } from "../../lib/metrics";
import { db } from "../index";
import { organizations, sessions, taskSets, tasks, type NewTask, type SessionLabel } from "../schema";
import { getTrialFacts } from "./trial-facts";

/**
 * Organizations and their private sets (docs/plan/org-accounts.md). Server only.
 * Every function that reads or changes an organization's sets takes the organization id from the
 * signed cookie (src/lib/org-auth.ts), never from a form or a link.
 */

const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Random lowercase letters and digits, without modulo bias. */
function randomSlugPart(length: number): string {
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 252 && out.length < length) out += LETTERS[byte % 36];
    }
  }
  return out;
}

const newSetSlug = () => `o-${randomSlugPart(10)}`;
const newShareToken = () => randomBytes(16).toString("base64url"); // 22 characters

// ---------------------------------------------------------------------------------------------
// Organizations

export type OrgRecord = { id: string; slug: string; name: string; passcodeHash: string };

export async function findOrgBySlug(slug: string): Promise<OrgRecord | null> {
  const [row] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      passcodeHash: organizations.passcodeHash,
    })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function findOrgById(id: string): Promise<Omit<OrgRecord, "passcodeHash"> | null> {
  const [row] = await db
    .select({ id: organizations.id, slug: organizations.slug, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return row ?? null;
}

/** Returns null when the slug is already taken. */
export async function createOrganization(input: {
  slug: string;
  name: string;
  passcodeHash: string;
}): Promise<{ id: string; slug: string } | null> {
  const rows = await db
    .insert(organizations)
    .values(input)
    .onConflictDoNothing({ target: organizations.slug })
    .returning({ id: organizations.id, slug: organizations.slug });
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Private sets

export type UploadedTask = Omit<NewTask, "id" | "setSlug" | "position">;

/**
 * Create a private set and its tasks in one transaction. Task ids are "<set slug>-01", "-02"...
 * in upload order, which is also their position.
 */
export async function createPrivateSet(input: {
  orgId: string;
  name: string;
  description: string | null;
  tasks: UploadedTask[];
}): Promise<{ slug: string; shareToken: string }> {
  const slug = newSetSlug();
  const shareToken = newShareToken();
  const width = Math.max(2, String(input.tasks.length).length);

  await db.batch([
    db.insert(taskSets).values({
      slug,
      orgId: input.orgId,
      name: input.name,
      description: input.description,
      shareToken,
    }),
    db.insert(tasks).values(
      input.tasks.map((t, i) => ({
        ...t,
        id: `${slug}-${String(i + 1).padStart(width, "0")}`,
        setSlug: slug,
        position: i + 1,
      })),
    ),
  ]);
  return { slug, shareToken };
}

export type OrgSetSummary = {
  slug: string;
  name: string;
  description: string | null;
  shareToken: string;
  createdAt: Date;
  tasks: number;
  aiWrong: number;
  startedSessions: number;
  completedSessions: number;
};

/** An organization's sets with their sizes and how many pilot sessions they have. */
export async function listOrgSets(orgId: string): Promise<OrgSetSummary[]> {
  const sets = await db
    .select({
      slug: taskSets.slug,
      name: taskSets.name,
      description: taskSets.description,
      shareToken: taskSets.shareToken,
      createdAt: taskSets.createdAt,
    })
    .from(taskSets)
    .where(eq(taskSets.orgId, orgId))
    .orderBy(asc(taskSets.createdAt));
  if (sets.length === 0) return [];
  const slugs = sets.map((s) => s.slug);

  const [taskCounts, sessionCounts] = await Promise.all([
    db
      .select({
        setSlug: tasks.setSlug,
        total: count(),
        aiWrong: sql<number>`count(*) filter (where ${tasks.adviceIndex} <> ${tasks.correctIndex})::int`,
      })
      .from(tasks)
      .where(inArray(tasks.setSlug, slugs))
      .groupBy(tasks.setSlug),
    db
      .select({
        setSlug: sessions.setSlug,
        started: count(),
        completed: sql<number>`count(${sessions.completedAt})::int`,
      })
      .from(sessions)
      .where(and(inArray(sessions.setSlug, slugs), eq(sessions.label, "pilot")))
      .groupBy(sessions.setSlug),
  ]);

  return sets.map((s) => {
    const t = taskCounts.find((r) => r.setSlug === s.slug);
    const c = sessionCounts.find((r) => r.setSlug === s.slug);
    return {
      ...s,
      tasks: t?.total ?? 0,
      aiWrong: t?.aiWrong ?? 0,
      startedSessions: c?.started ?? 0,
      completedSessions: c?.completed ?? 0,
    };
  });
}

/**
 * Answered responses for an organization's sets, for its results page. Only sets this
 * organization owns: a set slug from the link is ignored unless it is one of them.
 */
export async function getOrgFacts(
  orgId: string,
  { setSlug, labels = ["pilot"] }: { setSlug?: string | null; labels?: SessionLabel[] } = {},
): Promise<TrialFact[]> {
  const owned = await db.select({ slug: taskSets.slug }).from(taskSets).where(eq(taskSets.orgId, orgId));
  const slugs = owned.map((r) => r.slug).filter((s) => !setSlug || s === setSlug);
  if (slugs.length === 0) return [];
  return getTrialFacts({ sets: slugs, labels });
}

// ---------------------------------------------------------------------------------------------
// Participant side: share tokens

export type SharedSet = { slug: string; name: string; description: string | null; orgName: string };

/** The set behind a share token, or null. Never selects answers or advice. */
export async function findSetByToken(token: string): Promise<SharedSet | null> {
  const [row] = await db
    .select({
      slug: taskSets.slug,
      name: taskSets.name,
      description: taskSets.description,
      orgName: organizations.name,
    })
    .from(taskSets)
    .innerJoin(organizations, eq(taskSets.orgId, organizations.id))
    .where(eq(taskSets.shareToken, token))
    .limit(1);
  return row ?? null;
}

/** The share token of a private set, so the flow can send people back to /t/<token>. */
export async function findTokenForSet(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ shareToken: taskSets.shareToken })
    .from(taskSets)
    .where(eq(taskSets.slug, slug))
    .limit(1);
  return row?.shareToken ?? null;
}
