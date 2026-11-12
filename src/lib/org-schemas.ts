import { z } from "zod";

/**
 * Form input for organization accounts (hard rule 3: every action checks its input with Zod).
 * Plain TypeScript with no app imports, so it can be tested with Node.
 */

export const ORG_SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** "Nordbank Risk Team" -> "nordbank-risk-team". Accents are dropped, anything else becomes a dash. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

const passcode = z
  .string()
  .min(8, "Use a passcode of at least 8 characters.")
  .max(100, "Keep the passcode under 100 characters.");

export const createOrgSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your organization's name.")
      .max(60, "Keep the name to 60 characters."),
    passcode,
    confirm: z.string(),
  })
  .refine((v) => v.passcode === v.confirm, { path: ["confirm"], error: "The two passcodes don't match." })
  .transform((v) => ({ name: v.name, passcode: v.passcode, slug: slugify(v.name) }))
  .refine((v) => ORG_SLUG.test(v.slug), {
    path: ["name"],
    error: "Use at least 3 letters or digits in the name.",
  });

export const signInSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(ORG_SLUG, "Enter your organization ID, for example nordbank-risk."),
  passcode: z.string().min(1, "Enter the passcode.").max(100),
});

export const uploadSchema = z.object({
  name: z.string().trim().min(2, "Name the set.").max(80, "Keep the name to 80 characters."),
  description: z
    .string()
    .trim()
    .max(300, "Keep the description to 300 characters.")
    .transform((v) => (v === "" ? null : v)),
});

/** Returned by the organization actions to their forms. */
export type OrgFormState = { error?: string; errors?: string[]; warnings?: string[]; created?: string };
