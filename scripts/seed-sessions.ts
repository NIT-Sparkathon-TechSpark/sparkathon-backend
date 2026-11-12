/**
 * Create simulated sessions labelled `seeded`, so the results screens have data before the pilot
 * (scope feature 8). They are clearly labelled and the results can hide them (`?seeded=off`).
 *
 *   pnpm db:seed-sessions                 30 sessions per set (logic and facts)
 *   pnpm db:seed-sessions --count 10      a different number per set
 *   pnpm db:seed-sessions --replace       delete existing seeded sessions first
 *
 * Simulated people over-rely on the AI on purpose, more when the explanation is shown,
 * so the charts have a visible pattern to test against. These numbers are never findings.
 */
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db/index";
import { responses, sessions, tasks } from "../src/db/schema";
import { mulberry32 } from "../src/lib/metrics";
import { planSession } from "../src/db/session-plan";
import { requireNonProduction } from "./_guard";

const SETS = ["logic", "facts"];
const args = process.argv.slice(2);
const countArg = args.indexOf("--count");
const perSet = countArg >= 0 ? Number(args[countArg + 1]) : 30;
const replace = args.includes("--replace");
const random = mulberry32(2026);

const chance = (p: number) => random() < p;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const otherThan = (exclude: number[]) => {
  const choices = [0, 1, 2, 3].filter((i) => !exclude.includes(i));
  return choices[Math.floor(random() * choices.length)];
};

async function main() {
  // Simulated people must never reach the production results (amendments A3).
  requireNonProduction("create seeded sessions");
  if (!Number.isInteger(perSet) || perSet < 1 || perSet > 200) {
    throw new Error("--count must be a whole number from 1 to 200");
  }
  if (replace) {
    await db.delete(sessions).where(eq(sessions.label, "seeded"));
    console.log("Deleted existing seeded sessions.");
  }

  const allTasks = await db.select().from(tasks).where(inArray(tasks.setSlug, SETS));
  const sessionRows: (typeof sessions.$inferInsert)[] = [];
  const responseRows: (typeof responses.$inferInsert)[] = [];

  for (const set of SETS) {
    const setTasks = allTasks.filter((t) => t.setSlug === set);
    if (setTasks.length === 0) {
      console.warn(`No tasks for ${set}; run pnpm db:seed first. Skipped.`);
      continue;
    }
    for (let p = 0; p < perSet; p++) {
      const sessionId = randomUUID();
      const skill = 0.45 + random() * 0.35; // chance of a right first answer on an easy question
      const trust = 0.35 + random() * 0.4; // chance of switching to the AI when disagreeing
      const expertise = clamp(1 + random() * 5, 1, 5);
      const start = Date.now() - Math.floor(random() * 6 * 3600_000);
      sessionRows.push({
        id: sessionId,
        setSlug: set,
        nickname: `seed-${set}-${String(p + 1).padStart(2, "0")}`,
        label: "seeded",
        selfRatedExpertise: expertise,
        createdAt: new Date(start),
        completedAt: new Date(start + 8 * 60_000),
      });

      const plan = planSession(setTasks, { random });
      for (const item of plan) {
        const task = setTasks.find((t) => t.id === item.taskId)!;
        const aiRight = task.adviceIndex === task.correctIndex;
        const pFirst = skill - (task.difficulty - 1) * 0.15;
        const first = chance(pFirst) ? task.correctIndex : otherThan([task.correctIndex]);
        const firstConf = clamp(45 + random() * 40 + (first === task.correctIndex ? 8 : 0), 25, 100);

        let final = first;
        if (first !== task.adviceIndex) {
          // Over-reliance on purpose: AI correctness barely matters, explanations raise it.
          const pFollow = trust + (item.rationaleShown ? 0.15 : 0) + (aiRight ? 0.05 : 0);
          if (chance(Math.min(pFollow, 0.95))) final = task.adviceIndex;
        }
        const finalConf = clamp(
          firstConf + (final === task.adviceIndex ? 10 + random() * 10 : random() * 6 - 3),
          25,
          100,
        );
        const msFirst = clamp(6000 + random() * 14000, 1000, 120000);
        responseRows.push({
          sessionId,
          taskId: task.id,
          position: item.position,
          rationaleShown: item.rationaleShown,
          firstAnswer: first,
          firstConfidence: firstConf,
          finalAnswer: final,
          finalConfidence: finalConf,
          msFirst,
          msFinal: clamp(3000 + random() * 8000, 500, 120000),
          firstAt: new Date(start + item.position * 40_000),
          finalAt: new Date(start + item.position * 40_000 + 5_000),
        });
      }
    }
  }

  if (sessionRows.length === 0) throw new Error("Nothing to insert.");
  await db.batch([db.insert(sessions).values(sessionRows), db.insert(responses).values(responseRows)]);
  console.log(`Inserted ${sessionRows.length} seeded sessions with ${responseRows.length} responses.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
