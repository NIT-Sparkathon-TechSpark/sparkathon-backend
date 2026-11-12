/**
 * Load every data/tasks/<set>.json into the tasks table.
 *
 *   pnpm db:seed               validate, then upsert into the database in DATABASE_URL
 *   pnpm tasks:check           validate only, no database needed
 *
 * Upserts by task id and never deletes, so it is safe to run again after people have answered
 * (amendments A1, spec 0001 "Task set and AI advice"). Runs outside Next.js, so imports are relative.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { tasks, type NewTask } from "../src/db/schema";
import { taskFileSchema, type TaskFile } from "../src/db/task-file";

const TASKS_DIR = path.join(process.cwd(), "data", "tasks");
const dryRun = process.argv.includes("--dry-run");

async function readTaskFiles(): Promise<TaskFile[]> {
  const names = (await readdir(TASKS_DIR)).filter((n) => n.endsWith(".json")).sort();
  if (names.length === 0) throw new Error(`No .json files in ${TASKS_DIR}`);

  const files: TaskFile[] = [];
  const problems: string[] = [];
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(TASKS_DIR, name), "utf8"));
    const parsed = taskFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push(`${name} ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    if (`${parsed.data.set}.json` !== name) {
      problems.push(`${name}: "set" is "${parsed.data.set}", so the file must be ${parsed.data.set}.json`);
      continue;
    }
    files.push(parsed.data);
  }

  const seen = new Map<string, string>();
  for (const file of files) {
    for (const task of file.tasks) {
      const other = seen.get(task.id);
      if (other) problems.push(`Task id ${task.id} appears in both ${other} and ${file.set}`);
      seen.set(task.id, file.set);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Task files are invalid:\n- ${problems.join("\n- ")}`);
  }
  return files;
}

function toRow(set: string, t: TaskFile["tasks"][number]): NewTask {
  return {
    id: t.id,
    setSlug: set,
    position: t.position,
    category: t.category,
    difficulty: t.difficulty,
    prompt: t.prompt,
    context: t.context,
    options: t.options,
    correctIndex: t.correct_index,
    adviceIndex: t.advice.index,
    adviceConfidence: t.advice.confidence,
    adviceExplanation: t.advice.explanation,
    adviceSource: t.advice.source,
    adviceModel: t.advice.model,
    verifiedBy: t.verified_by,
  };
}

function report(files: TaskFile[]) {
  for (const file of files) {
    const wrong = file.tasks.filter((t) => t.advice.index !== t.correct_index).length;
    const share = Math.round((wrong / file.tasks.length) * 100);
    const note = share < 25 || share > 40 ? "  <- aim for about a third" : "";
    console.log(
      `${file.set}: ${file.tasks.length} tasks, AI wrong on ${wrong} (${share}%)${note}`,
    );
  }
}

/** `excluded.<column>`: the value the insert tried to write, for ON CONFLICT DO UPDATE. */
const excluded = (column: PgColumn) => sql.raw(`excluded."${column.name}"`);

async function main() {
  const files = await readTaskFiles();
  report(files);
  if (dryRun) {
    console.log("Valid. Dry run, nothing written.");
    return;
  }

  // Imported here so `--dry-run` works without DATABASE_URL.
  const { db } = await import("../src/db/index");
  const rows = files.flatMap((f) => f.tasks.map((t) => toRow(f.set, t)));

  // One statement: insert all, update existing rows by id. Never deletes.
  await db
    .insert(tasks)
    .values(rows)
    .onConflictDoUpdate({
      target: tasks.id,
      set: {
        setSlug: excluded(tasks.setSlug),
        position: excluded(tasks.position),
        category: excluded(tasks.category),
        difficulty: excluded(tasks.difficulty),
        prompt: excluded(tasks.prompt),
        context: excluded(tasks.context),
        options: excluded(tasks.options),
        correctIndex: excluded(tasks.correctIndex),
        adviceIndex: excluded(tasks.adviceIndex),
        adviceConfidence: excluded(tasks.adviceConfidence),
        adviceExplanation: excluded(tasks.adviceExplanation),
        adviceSource: excluded(tasks.adviceSource),
        adviceModel: excluded(tasks.adviceModel),
        verifiedBy: excluded(tasks.verifiedBy),
        updatedAt: sql`now()`,
      },
    });

  // Tasks in the database that no file mentions any more are kept, but reported.
  const fileIds = new Set(rows.map((r) => r.id));
  const dbIds = await db.select({ id: tasks.id }).from(tasks);
  const orphans = dbIds.map((r) => r.id).filter((id) => !fileIds.has(id));
  if (orphans.length > 0) {
    console.warn(`Kept ${orphans.length} task(s) no file mentions: ${orphans.join(", ")}`);
  }
  console.log(`Upserted ${rows.length} tasks.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
