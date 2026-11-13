import { z } from "zod";

/**
 * Turns an organization's uploaded CSV or JSON file into questions, or a list of errors with row
 * numbers. Pure and with no app imports, so scripts/test-org-upload.mjs can run it with plain Node.
 *
 * Accepted:
 *  - CSV (comma, semicolon or tab separated, as Excel exports it) with a header row.
 *  - JSON: an array of objects with the same column names, or a task file in the repo's format
 *    ({ "tasks": [ { "options": [...], "correct_index": 0, "advice": { ... } } ] }).
 *
 * Columns (case-insensitive): prompt, option_a, option_b, option_c, option_d, correct, ai_answer,
 * ai_explanation. Optional: context, ai_confidence, category, difficulty, ai_source, ai_model.
 */

export const MAX_UPLOAD_BYTES = 512 * 1024;
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 200;
const MAX_ERRORS_SHOWN = 15;

export const REQUIRED_COLUMNS = [
  "prompt",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct",
  "ai_answer",
  "ai_explanation",
] as const;

export type UploadQuestion = {
  prompt: string;
  context: string | null;
  options: string[];
  correctIndex: number;
  adviceIndex: number;
  adviceConfidence: number | null;
  adviceExplanation: string;
  adviceSource: "recorded" | "seeded";
  adviceModel: string | null;
  category: string;
  difficulty: number;
};

export type UploadResult =
  | { ok: true; questions: UploadQuestion[]; warnings: string[] }
  | { ok: false; errors: string[] };

const LETTERS = ["A", "B", "C", "D"];

const text = (max: number) => z.string().trim().min(1, "is empty").max(max, `is longer than ${max} characters`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `is longer than ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const letter = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => LETTERS.includes(v), "must be A, B, C or D")
  .transform((v) => LETTERS.indexOf(v));

const optionalWhole = (min: number, max: number, message: string) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const s = String(v).trim().replace(/%$/, "");
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return n;
    })
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** One question in the flat (CSV-like) shape, after cleaning. */
const flatRowSchema = z
  .object({
    prompt: text(2000),
    context: optionalText(6000).optional().transform((v) => v ?? null),
    option_a: text(300),
    option_b: text(300),
    option_c: text(300),
    option_d: text(300),
    correct: letter,
    ai_answer: letter,
    ai_explanation: text(1000),
    ai_confidence: optionalWhole(0, 100, "must be a whole number from 0 to 100"),
    category: optionalText(40).optional().transform((v) => v ?? "general"),
    difficulty: optionalWhole(1, 3, "must be 1, 2 or 3"),
    ai_source: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v === "" || v === undefined ? "recorded" : v))
      .pipe(z.enum(["recorded", "seeded"], { error: 'must be "recorded" or "seeded"' })),
    ai_model: optionalText(60).optional().transform((v) => v ?? null),
  })
  .superRefine((row, ctx) => {
    const options = [row.option_a, row.option_b, row.option_c, row.option_d].map((o) => o.toLowerCase());
    if (new Set(options).size < 4) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "has two options with the same text" });
    }
  })
  .transform(
    (row): UploadQuestion => ({
      prompt: row.prompt,
      context: row.context,
      options: [row.option_a, row.option_b, row.option_c, row.option_d],
      correctIndex: row.correct,
      adviceIndex: row.ai_answer,
      adviceConfidence: row.ai_confidence,
      adviceExplanation: row.ai_explanation,
      adviceSource: row.ai_source,
      adviceModel: row.ai_model,
      category: row.category,
      difficulty: row.difficulty ?? 2,
    }),
  );

// ---------------------------------------------------------------------------------------------
// CSV

/** Finds the separator Excel used: the most common of , ; and tab in the header line. */
function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** RFC 4180 style: quoted fields, "" for a quote, line breaks inside quotes. */
export function parseCsv(input: string): string[][] {
  const source = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(source.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const normalizeKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

function csvToObjects(rows: string[][]): { records: Record<string, string>[]; missing: string[] } {
  const [header = [], ...data] = rows;
  const keys = header.map(normalizeKey);
  const missing = REQUIRED_COLUMNS.filter((c) => !keys.includes(c));
  const records = data.map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? ""])));
  return { records, missing };
}

// ---------------------------------------------------------------------------------------------
// JSON

/** The repo's task-file shape (data/tasks/<set>.json), mapped to the flat columns. */
function taskFileItemToFlat(item: Record<string, unknown>): Record<string, unknown> {
  const options = Array.isArray(item.options) ? item.options : [];
  const advice = (item.advice ?? {}) as Record<string, unknown>;
  const toLetter = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 3 ? LETTERS[v] : String(v ?? ""));
  return {
    prompt: item.prompt,
    context: item.context ?? "",
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    correct: toLetter(item.correct_index),
    ai_answer: toLetter(advice.index),
    ai_explanation: advice.explanation,
    ai_confidence: advice.confidence ?? "",
    category: item.category ?? "",
    difficulty: item.difficulty ?? "",
    ai_source: advice.source ?? "",
    ai_model: advice.model ?? "",
  };
}

function jsonToObjects(value: unknown): Record<string, unknown>[] | null {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { tasks?: unknown }).tasks)
      ? (value as { tasks: unknown[] }).tasks
      : null;
  if (!list) return null;
  return list.map((item) => {
    if (!item || typeof item !== "object") return {};
    const record = item as Record<string, unknown>;
    if (Array.isArray(record.options)) return taskFileItemToFlat(record);
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [normalizeKey(k), v]));
  });
}

// ---------------------------------------------------------------------------------------------

const FIELD_NAMES: Record<string, string> = {
  options: "options",
  ai_answer: "ai_answer",
  ai_explanation: "ai_explanation",
  ai_confidence: "ai_confidence",
};

/** Every cell as text (JSON numbers too), and empty cells as missing, so messages stay simple. */
function asStrings(record: Record<string, unknown>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [
      k,
      v === null || v === undefined ? undefined : typeof v === "object" ? JSON.stringify(v) : String(v),
    ]),
  );
}

function cap(errors: string[]): string[] {
  if (errors.length <= MAX_ERRORS_SHOWN) return errors;
  return [...errors.slice(0, MAX_ERRORS_SHOWN), `…and ${errors.length - MAX_ERRORS_SHOWN} more problems.`];
}

/** Parse and check an uploaded file. `fileName` decides CSV or JSON. */
export function parseUpload(fileName: string, content: string): UploadResult {
  const isJson = /\.json$/i.test(fileName) || /^\s*[[{]/.test(content);
  let records: Record<string, unknown>[];
  let rowLabel: (i: number) => string;

  if (isJson) {
    let value: unknown;
    try {
      value = JSON.parse(content.replace(/^﻿/, ""));
    } catch {
      return { ok: false, errors: ["This file is not valid JSON."] };
    }
    const objects = jsonToObjects(value);
    if (!objects) {
      return { ok: false, errors: ['JSON must be a list of questions, or an object with a "tasks" list.'] };
    }
    records = objects;
    rowLabel = (i) => `Question ${i + 1}`;
  } else {
    const { records: csvRecords, missing } = csvToObjects(parseCsv(content));
    if (missing.length > 0) {
      return { ok: false, errors: [`The header row is missing: ${missing.join(", ")}.`] };
    }
    records = csvRecords;
    rowLabel = (i) => `Row ${i + 2}`; // row 1 is the header
  }

  if (records.length < MIN_QUESTIONS) {
    return { ok: false, errors: [`Add at least ${MIN_QUESTIONS} questions; this file has ${records.length}.`] };
  }
  if (records.length > MAX_QUESTIONS) {
    return { ok: false, errors: [`Keep it to ${MAX_QUESTIONS} questions; this file has ${records.length}.`] };
  }

  const errors: string[] = [];
  const questions: UploadQuestion[] = [];
  records.forEach((record, i) => {
    const parsed = flatRowSchema.safeParse(asStrings(record));
    if (parsed.success) {
      questions.push(parsed.data);
      return;
    }
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      const name = FIELD_NAMES[field] ?? field;
      const message = issue.code === "invalid_type" ? "is missing" : issue.message;
      errors.push(`${rowLabel(i)}: ${name ? `${name} ` : ""}${message}`);
    }
  });
  if (errors.length > 0) return { ok: false, errors: cap(errors) };

  const wrong = questions.filter((q) => q.adviceIndex !== q.correctIndex).length;
  if (wrong === 0) {
    return {
      ok: false,
      errors: [
        "The AI's answer is right on every question. Include some where it is wrong (about a third), or over-reliance can't be measured.",
      ],
    };
  }

  const warnings: string[] = [];
  const share = wrong / questions.length;
  if (share < 0.2 || share > 0.5) {
    warnings.push(
      `The AI is wrong on ${wrong} of ${questions.length} questions. About a third gives the clearest results.`,
    );
  }
  const correctSpread = [0, 1, 2, 3].map((k) => questions.filter((q) => q.correctIndex === k).length);
  if (questions.length >= 8 && Math.max(...correctSpread) > questions.length * 0.5) {
    warnings.push("More than half of the correct answers are in the same position. Shuffle the options so people can't guess the pattern.");
  }
  return { ok: true, questions, warnings };
}
