/**
 * Delete practice and judge sessions (their responses go with them).
 *
 *   pnpm db:reset-live           show what would be deleted
 *   pnpm db:reset-live --yes     delete it
 *
 * Never touches `pilot` or `seeded` sessions: pilot data is what the findings rest on
 * (amendments A3). Check which database DATABASE_URL points at before using --yes.
 */
import { count, inArray } from "drizzle-orm";
import { db } from "../src/db/index";
import { sessions, type SessionLabel } from "../src/db/schema";

const DELETABLE: SessionLabel[] = ["practice", "judge"];

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host;
  const [{ n }] = await db
    .select({ n: count() })
    .from(sessions)
    .where(inArray(sessions.label, DELETABLE));

  console.log(`Database: ${host}`);
  console.log(`${n} session(s) labelled ${DELETABLE.join(" or ")}.`);

  if (!process.argv.includes("--yes")) {
    console.log("Nothing deleted. Run again with --yes to delete them.");
    return;
  }
  await db.delete(sessions).where(inArray(sessions.label, DELETABLE));
  console.log(`Deleted ${n} session(s). Pilot and seeded sessions were not touched.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
