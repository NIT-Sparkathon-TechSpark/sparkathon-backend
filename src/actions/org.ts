"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearOrgCookie,
  hashPasscode,
  OrgAuthNotConfigured,
  readOrgId,
  setOrgCookie,
  verifyPasscode,
} from "@/lib/org-auth";
import { createOrgSchema, signInSchema, uploadSchema, type OrgFormState } from "@/lib/org-schemas";
import { MAX_UPLOAD_BYTES, parseUpload } from "@/lib/org-upload";

/**
 * Every write for organization accounts (docs/plan/org-accounts.md). The organization always
 * comes from the signed cookie, never from the form (hard rule 3). Database modules are imported
 * inside the functions so the build doesn't need a database.
 */

const SOMETHING_WRONG = "Something went wrong on our side. Please try again.";
const NOT_CONFIGURED = "Organization sign-in isn't set up on this server yet (ORG_COOKIE_SECRET is missing).";

function logFailure(action: string, error: unknown, extra: Record<string, unknown> = {}) {
  console.error(`[org] ${action} failed`, { ...extra, error });
}

function isRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export async function createOrgAction(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const parsed = createOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { name, slug, passcode } = parsed.data;

  try {
    const { createOrganization } = await import("@/db/queries/orgs");
    const org = await createOrganization({ name, slug, passcodeHash: await hashPasscode(passcode) });
    if (!org) return { error: `The ID "${slug}" is taken. Add something to the name, like your team or city.` };
    await setOrgCookie(org.id);
  } catch (error) {
    if (error instanceof OrgAuthNotConfigured) return { error: NOT_CONFIGURED };
    logFailure("create", error, { slug });
    return { error: SOMETHING_WRONG };
  }
  redirect(`/org/${slug}`);
}

export async function signInOrgAction(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { slug, passcode } = parsed.data;

  try {
    const { findOrgBySlug } = await import("@/db/queries/orgs");
    const org = await findOrgBySlug(slug);
    // Same check and same time whether or not the organization exists.
    const ok = await verifyPasscode(passcode, org?.passcodeHash ?? null);
    if (!org || !ok) return { error: "That organization ID and passcode don't match." };
    await setOrgCookie(org.id);
  } catch (error) {
    if (error instanceof OrgAuthNotConfigured) return { error: NOT_CONFIGURED };
    logFailure("sign in", error, { slug });
    return { error: SOMETHING_WRONG };
  }
  redirect(`/org/${slug}`);
}

export async function signOutOrgAction(): Promise<void> {
  await clearOrgCookie();
  redirect("/org");
}

/** Upload a CSV or JSON file of questions and create a private set for the signed-in organization. */
export async function uploadSetAction(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const orgId = await readOrgId();
  if (!orgId) redirect("/org");

  const fields = uploadSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!fields.success) return { error: fields.error.issues[0]?.message ?? "Check the form and try again." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or JSON file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Keep the file under 512 KB." };
  if (!/\.(csv|json|tsv|txt)$/i.test(file.name)) return { error: "Upload a .csv or .json file." };

  const result = parseUpload(file.name, await file.text());
  if (!result.ok) return { error: "Nothing was saved. Fix these and upload again:", errors: result.errors };

  try {
    const { findOrgById, createPrivateSet } = await import("@/db/queries/orgs");
    const org = await findOrgById(orgId);
    if (!org) redirect("/org");
    await createPrivateSet({
      orgId,
      name: fields.data.name,
      description: fields.data.description,
      tasks: result.questions.map((q) => ({
        category: q.category,
        difficulty: q.difficulty,
        prompt: q.prompt,
        context: q.context,
        options: q.options,
        correctIndex: q.correctIndex,
        adviceIndex: q.adviceIndex,
        adviceConfidence: q.adviceConfidence,
        adviceExplanation: q.adviceExplanation,
        adviceSource: q.adviceSource,
        adviceModel: q.adviceModel,
        verifiedBy: `upload:${org.slug}`,
      })),
    });
    revalidatePath(`/org/${org.slug}`);
    return {
      created: `"${fields.data.name}" is ready with ${result.questions.length} questions. Share its link below.`,
      warnings: result.warnings,
    };
  } catch (error) {
    if (isRedirect(error)) throw error;
    logFailure("upload", error, { orgId });
    return { error: SOMETHING_WRONG };
  }
}
