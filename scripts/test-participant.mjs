// Tests for the input rules of the participant flow (src/lib/participant-schemas.ts and sets.ts).
// Hard rule 3: everything from the browser goes through Zod. Run with: pnpm test:metrics
import assert from "node:assert/strict";
import { test } from "node:test";
import { answerSchema, parseLinkLabel, sessionIdSchema, startSchema } from "../src/lib/participant-schemas.ts";
import { isMixedSet, isParticipantSet, SET_SLUGS } from "../src/lib/sets.ts";

const start = (over = {}) => ({ setSlug: "logic", nickname: "Mo", expertise: "", label: "pilot", ...over });
const answer = (over = {}) => ({ setSlug: "facts", taskId: "facts-01", answer: "2", confidence: "75", ms: "8300", ...over });

test("sets: only real sets can be opened, the dev test set cannot", () => {
  assert.deepEqual([...SET_SLUGS].sort(), ["acme", "alerts", "facts", "judge-demo", "logic"]);
  assert.ok(isParticipantSet("logic"));
  // Spec 0002: only the bank alerts mix the two forms.
  assert.deepEqual(SET_SLUGS.filter(isMixedSet), ["alerts"]);
  for (const bad of ["dev", "", "LOGIC", "__proto__", "toString", "../logic"]) assert.ok(!isParticipantSet(bad), bad);
});

test("link label: unknown values become pilot, and a browser can never ask for seeded", () => {
  assert.equal(parseLinkLabel("practice"), "practice");
  assert.equal(parseLinkLabel("judge"), "judge");
  for (const bad of ["seeded", "admin", "", undefined, null, ["practice"]]) assert.equal(parseLinkLabel(bad), "pilot");
  assert.equal(startSchema.parse(start({ label: "seeded" })).label, "pilot");
});

test("start form: nickname rules", () => {
  assert.equal(startSchema.parse(start({ nickname: "  Mo  " })).nickname, "Mo");
  assert.equal(startSchema.parse(start({ nickname: "Zoë O'Neil-3" })).nickname, "Zoë O'Neil-3");
  for (const bad of ["", "   ", "x".repeat(25), "<script>", "a\nb", "a;drop"]) {
    assert.ok(!startSchema.safeParse(start({ nickname: bad })).success, JSON.stringify(bad));
  }
});

test("start form: expertise is optional and 1 to 5", () => {
  assert.equal(startSchema.parse(start({ expertise: "" })).expertise, null);
  assert.equal(startSchema.parse(start({ expertise: undefined })).expertise, null);
  assert.equal(startSchema.parse(start({ expertise: "4" })).expertise, 4);
  for (const bad of ["0", "6", "2.5", "abc"]) assert.ok(!startSchema.safeParse(start({ expertise: bad })).success, bad);
  assert.ok(!startSchema.safeParse(start({ setSlug: "dev" })).success);
});

test("answer: form strings are checked into whole numbers within bounds", () => {
  assert.deepEqual(answerSchema.parse(answer()), {
    setSlug: "facts",
    taskId: "facts-01",
    answer: 2,
    confidence: 75,
    ms: 8300,
  });
  for (const bad of [{ answer: "4" }, { answer: "-1" }, { answer: "1.5" }, { answer: "" }, { answer: "abc" }]) {
    assert.ok(!answerSchema.safeParse(answer(bad)).success, JSON.stringify(bad));
  }
  for (const bad of [{ confidence: "24" }, { confidence: "101" }, { confidence: "" }]) {
    assert.ok(!answerSchema.safeParse(answer(bad)).success, JSON.stringify(bad));
  }
  for (const bad of [{ ms: "-5" }, { ms: String(60 * 60 * 1000 + 1) }, { ms: "1e99" }]) {
    assert.ok(!answerSchema.safeParse(answer(bad)).success, JSON.stringify(bad));
  }
  assert.ok(!answerSchema.safeParse(answer({ taskId: "" })).success);
  assert.ok(!answerSchema.safeParse(answer({ taskId: "x".repeat(65) })).success);
});

test("answer: the session id is never read from the form, extra fields are dropped", () => {
  const parsed = answerSchema.parse({ ...answer(), sessionId: "11111111-1111-4111-8111-111111111111", label: "seeded" });
  assert.ok(!("sessionId" in parsed));
  assert.ok(!("label" in parsed));
});

test("session id cookie must be a UUID", () => {
  assert.ok(sessionIdSchema.safeParse("3f2b8a52-6c1e-4d0a-9a53-0d6f4f3e7b11").success);
  for (const bad of ["", "abc", "3f2b8a52", undefined, "' or 1=1 --"]) assert.ok(!sessionIdSchema.safeParse(bad).success);
});
