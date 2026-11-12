/**
 * Keeps scripts that write test data away from the production database.
 *
 * It fails closed: a script only counts as safe when NEON_BRANCH (set in .env.local, see
 * .env.example) is exactly "development" or "preview". A missing value, "production", or a typo
 * all count as production. Pure environment checks, no database access, so it works with
 * `--dry-run` and without DATABASE_URL.
 */

const SAFE_BRANCHES = ["development", "preview"];

export function isNonProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return SAFE_BRANCHES.includes(env.NEON_BRANCH ?? "");
}

/** Throws unless the target is a development or preview branch. */
export function requireNonProduction(action: string, env: NodeJS.ProcessEnv = process.env): void {
  if (isNonProduction(env)) return;
  const branch = env.NEON_BRANCH ? `"${env.NEON_BRANCH}"` : "not set";
  throw new Error(
    `Refusing to ${action}: NEON_BRANCH is ${branch}, and this script only runs on "development" or "preview". ` +
      `Check .env.local points at the development branch and sets NEON_BRANCH=development.`,
  );
}
