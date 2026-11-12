// Tests for src/lib/metrics.ts and src/db/session-plan.ts on hand-made trials whose results
// were worked out on paper. No test runner or install needed:
//   pnpm test:metrics   (node --experimental-strip-types --test scripts/test-metrics.mjs)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bootstrap,
  calibrationGap,
  centaurGain,
  confidenceShift,
  harmfulSwitch,
  harmfulSwitchToAdvice,
  helpfulSwitch,
  humanAIAccuracy,
  humanAloneAccuracy,
  aiAloneAccuracy,
  mulberry32,
  overReliance,
  rate,
  relianceGrid,
  sessionProfile,
  sliceBy,
  SLICES,
  summarize,
  underReliance,
  wrongAndSurer,
} from "../src/lib/metrics.ts";
import { planSession } from "../src/db/session-plan.ts";
import { taskFileSchema } from "../src/db/task-file.ts";
import { isNonProduction, requireNonProduction } from "./_guard.ts";

const trial = (sessionId, position, correctIndex, adviceIndex, first, firstConf, final, finalConf) => ({
  sessionId,
  taskId: `t${sessionId}-${position}`,
  position,
  setSlug: "dev",
  category: "test",
  difficulty: 1,
  correctIndex,
  adviceIndex,
  rationaleShown: position % 2 === 0,
  firstAnswer: first,
  firstConfidence: firstConf,
  finalAnswer: final,
  finalConfidence: finalConf,
});

const rows = [
  trial("s1", 1, 0, 0, 1, 50, 0, 80), // AI right, switched to it: helped
  trial("s1", 2, 0, 2, 0, 60, 2, 70), // AI wrong, was right, followed: harmful, surer and wrong
  trial("s1", 3, 1, 3, 1, 70, 1, 70), // AI wrong, kept own right answer: caught the mistake
  trial("s2", 1, 2, 2, 3, 40, 3, 40), // AI right, kept own wrong answer: good advice lost
  trial("s2", 2, 3, 3, 3, 90, 3, 95), // agreed with the AI, both right
  trial("s2", 3, 0, 1, 1, 50, 1, 60), // agreed with the AI, both wrong, surer
  trial("s2", 4, 0, 1, 0, 50, null, null), // incomplete: ignored everywhere
];

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("accuracies and centaur gain", () => {
  assert.deepEqual(humanAloneAccuracy(rows), { value: 0.5, k: 3, n: 6 });
  assert.deepEqual(aiAloneAccuracy(rows), { value: 0.5, k: 3, n: 6 });
  assert.deepEqual(humanAIAccuracy(rows), { value: 0.5, k: 3, n: 6 });
  assert.equal(centaurGain(rows), 0);
});

test("reliance", () => {
  assert.deepEqual(relianceGrid(rows), { followedRight: 1, followedWrong: 1, ignoredRight: 1, ignoredWrong: 1 });
  assert.deepEqual(overReliance(rows), { value: 0.5, k: 1, n: 2 });
  assert.deepEqual(underReliance(rows), { value: 0.5, k: 1, n: 2 });
  assert.deepEqual(harmfulSwitchToAdvice(rows), { value: 0.5, k: 1, n: 2 });
  close(harmfulSwitch(rows).value, 1 / 3);
  close(helpfulSwitch(rows).value, 1 / 3);
  close(wrongAndSurer(rows).value, 2 / 6);
});

test("confidence", () => {
  const shift = confidenceShift(rows);
  close(shift.aiRight, 35 / 3);
  close(shift.aiWrong, 20 / 3);
  const gap = calibrationGap(rows);
  close(gap.before, 0.1);
  close(gap.after, 415 / 600 - 0.5);
});

test("empty input gives null, never NaN", () => {
  assert.deepEqual(rate([], () => true), { value: null, k: 0, n: 0 });
  assert.equal(centaurGain([]), null);
  assert.equal(summarize([]).humanAlone.value, null);
  assert.equal(bootstrap([], (r) => humanAloneAccuracy(r).value), null);
});

test("summary, slices and the personal profile", () => {
  const s = summarize(rows);
  assert.equal(s.trials, 6);
  assert.equal(s.sessions, 2);
  const slices = sliceBy(rows, SLICES.aiCorrect);
  assert.deepEqual(slices.map((x) => [x.key, x.summary.trials, x.enoughData]), [
    ["AI right", 3, false],
    ["AI wrong", 3, false],
  ]);
  const p = sessionProfile(rows.filter((r) => r.sessionId === "s1"));
  assert.equal(p.answered, 3);
  close(p.accuracyBefore.value, 2 / 3);
  close(p.accuracyAfter.value, 2 / 3);
  assert.equal(p.followedWrongAdvice, 1);
  assert.equal(p.ignoredGoodAdvice, 0);
  assert.equal(p.harmfulSwitches, 1);
  assert.deepEqual(p.items.map((i) => i.outcome), ["helped", "followed wrong advice", "caught the mistake"]);
});

test("bootstrap is deterministic and brackets the estimate", () => {
  const stat = (r) => humanAIAccuracy(r).value;
  const a = bootstrap(rows, stat);
  const b = bootstrap(rows, stat);
  assert.deepEqual(a, b);
  assert.ok(a.low <= a.estimate && a.estimate <= a.high);
});

const makeTasks = (n, wrong) =>
  Array.from({ length: n }, (_, i) => ({
    id: `x-${String(i + 1).padStart(2, "0")}`,
    position: i + 1,
    correctIndex: 0,
    adviceIndex: i < wrong ? 1 : 0,
  }));

test("planSession: large set gives 12 with exactly 4 wrong", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const tasks = makeTasks(20, 7);
    const plan = planSession(tasks, { random: mulberry32(seed) });
    assert.equal(plan.length, 12);
    assert.equal(new Set(plan.map((p) => p.taskId)).size, 12);
    assert.deepEqual(plan.map((p) => p.position), Array.from({ length: 12 }, (_, i) => i + 1));
    const wrong = plan.filter((p) => tasks.find((t) => t.id === p.taskId).adviceIndex !== 0).length;
    assert.equal(wrong, 4);
    assert.equal(plan.filter((p) => p.rationaleShown).length, 6);
  }
});

test("planSession: small set uses every task, judge demo keeps its order", () => {
  const plan = planSession(makeTasks(8, 3), { random: mulberry32(7) });
  assert.equal(plan.length, 8);
  assert.equal(plan.filter((p) => p.rationaleShown).length, 4);

  const judge = planSession(makeTasks(3, 1).reverse(), { fixedOrder: true });
  assert.deepEqual(judge.map((p) => p.taskId), ["x-01", "x-02", "x-03"]);
  assert.ok(judge.every((p) => p.rationaleShown));
});

// --- task files: the advice index must point at the option the advice names -----------------------

const taskFile = (adviceIndex, answerText) => ({
  set: "x",
  name: "X",
  tasks: [
    {
      id: "x-01",
      position: 1,
      category: "c",
      difficulty: 1,
      prompt: "Capital of Australia?",
      context: null,
      options: ["Sydney", "Melbourne", "Canberra", "Perth"],
      correct_index: 2,
      advice: {
        index: adviceIndex,
        answer_text: answerText,
        confidence: 90,
        explanation: "Canberra is the capital.",
        source: "recorded",
        model: "claude",
      },
      verified_by: null,
    },
  ],
});

test("task file: advice.answer_text must equal the option at advice.index", () => {
  assert.ok(taskFileSchema.safeParse(taskFile(2, "Canberra")).success);

  // Options were shuffled but the index was not moved with them.
  const drifted = taskFileSchema.safeParse(taskFile(1, "Canberra"));
  assert.ok(!drifted.success);
  assert.match(drifted.error.issues[0].message, /options\[1\]/);

  assert.ok(!taskFileSchema.safeParse(taskFile(2, "")).success);
});

// --- scripts that write test data refuse to run on production ------------------------------------

test("guard: only development and preview count as safe, anything else is production", () => {
  assert.ok(isNonProduction({ NEON_BRANCH: "development" }));
  assert.ok(isNonProduction({ NEON_BRANCH: "preview" }));
  for (const branch of ["production", "main", "Development", "", undefined]) {
    assert.ok(!isNonProduction({ NEON_BRANCH: branch }), String(branch));
    assert.throws(() => requireNonProduction("seed", { NEON_BRANCH: branch }), /Refusing to seed/);
  }
  assert.doesNotThrow(() => requireNonProduction("seed", { NEON_BRANCH: "development" }));
});
