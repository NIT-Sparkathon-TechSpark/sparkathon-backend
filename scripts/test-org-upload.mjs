// Tests for src/lib/org-upload.ts (an organization's question upload).
//   pnpm test:org-upload
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseCsv, parseUpload } from "../src/lib/org-upload.ts";

const header = "prompt,option_a,option_b,option_c,option_d,correct,ai_answer,ai_explanation,ai_confidence,category,difficulty";
const rows = [
  '"Refund after 20 days, opened?",Full refund,Partial refund,Store credit,No refund,D,B,"Opened items get a 15% fee, so a partial refund.",80,refunds,2',
  "Refund after 5 days unopened?,Full refund,Partial refund,Store credit,No refund,A,A,Unopened within 30 days is a full refund.,90,refunds,1",
  "Sale item returned?,Full refund,Partial refund,Store credit,No refund,D,D,Sale items are final.,85,refunds,1",
];

test("valid CSV becomes questions", () => {
  const result = parseUpload("cases.csv", [header, ...rows].join("\n"));
  assert.equal(result.ok, true);
  assert.equal(result.questions.length, 3);
  assert.deepEqual(result.questions[0], {
    prompt: "Refund after 20 days, opened?",
    context: null,
    options: ["Full refund", "Partial refund", "Store credit", "No refund"],
    correctIndex: 3,
    adviceIndex: 1,
    adviceConfidence: 80,
    adviceExplanation: "Opened items get a 15% fee, so a partial refund.",
    adviceSource: "recorded",
    adviceModel: null,
    category: "refunds",
    difficulty: 2,
  });
});

test("semicolon CSV from Excel, BOM, CRLF, lower-case letters and quotes with line breaks", () => {
  const semi = "﻿" + [header, ...rows].join("\r\n").replaceAll(",", ";").replace(
    '"Opened items get a 15% fee; so a partial refund."',
    '"Opened items get a ""15%"" fee\nso a partial refund."',
  );
  const result = parseUpload("cases.csv", semi.replace(";D;B;", ";d;b;"));
  assert.equal(result.ok, true);
  assert.equal(result.questions[0].adviceExplanation, 'Opened items get a "15%" fee\nso a partial refund.');
  assert.equal(result.questions[0].correctIndex, 3);
});

test("row errors carry row numbers; header problems are named", () => {
  const bad = [
    header,
    rows[0].replace(",D,B,", ",E,B,"),
    rows[1].replace("Partial refund", "Full refund"),
    rows[2].replace(",85,", ",150,"),
  ].join("\n");
  const result = parseUpload("cases.csv", bad);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "Row 2: correct must be A, B, C or D",
    "Row 3: options has two options with the same text",
    "Row 4: ai_confidence must be a whole number from 0 to 100",
  ]);

  const missing = parseUpload("cases.csv", "prompt,option_a\nx,y");
  assert.deepEqual(missing.errors, [
    "The header row is missing: option_b, option_c, option_d, correct, ai_answer, ai_explanation.",
  ]);
});

test("needs some wrong AI advice, and between 3 and 200 questions", () => {
  const allRight = parseUpload("x.csv", [header, ...rows.map((r) => r.replace(",D,B,", ",D,D,"))].join("\n"));
  assert.equal(allRight.ok, false);
  assert.match(allRight.errors[0], /right on every question/);
  assert.match(parseUpload("x.csv", [header, rows[0]].join("\n")).errors[0], /at least 3/);
});

test("JSON list with the same columns, and the repo's task-file format", () => {
  const list = JSON.stringify(
    [0, 1, 2].map((i) => ({
      Prompt: `Q${i}`,
      option_a: "a",
      option_b: "b",
      option_c: "c",
      option_d: "d",
      correct: "A",
      ai_answer: i === 0 ? "B" : "A",
      ai_explanation: "Because.",
      ai_confidence: 70,
    })),
  );
  const flat = parseUpload("q.json", list);
  assert.equal(flat.ok, true);
  assert.equal(flat.questions[0].adviceIndex, 1);
  assert.equal(flat.questions[0].adviceConfidence, 70);

  const acme = parseUpload("acme.json", readFileSync(new URL("../data/tasks/acme.json", import.meta.url), "utf8"));
  assert.equal(acme.ok, true, JSON.stringify(acme.errors));
  assert.ok(acme.questions.length >= 3);
  assert.ok(acme.questions.every((q) => q.context));

  assert.equal(parseUpload("q.json", "{not json").errors[0], "This file is not valid JSON.");
});

test("parseCsv keeps empty cells and drops blank lines", () => {
  assert.deepEqual(parseCsv('a,b,c\n1,,"x,y"\n\n'), [
    ["a", "b", "c"],
    ["1", "", "x,y"],
  ]);
});

test("the sample files on the dashboard upload cleanly, with no warnings", () => {
  for (const name of ["kyc-alerts-demo.csv", "centaur-cases-template.csv"]) {
    const result = parseUpload(name, readFileSync(new URL(`../public/samples/${name}`, import.meta.url), "utf8"));
    assert.equal(result.ok, true, `${name}: ${result.ok ? "" : result.errors.join("; ")}`);
    assert.deepEqual(result.warnings, [], name);
  }
  const demo = parseUpload("kyc-alerts-demo.csv", readFileSync(new URL("../public/samples/kyc-alerts-demo.csv", import.meta.url), "utf8"));
  assert.equal(demo.questions.length, 12);
  assert.equal(demo.questions.filter((q) => q.adviceIndex !== q.correctIndex).length, 4);
});
