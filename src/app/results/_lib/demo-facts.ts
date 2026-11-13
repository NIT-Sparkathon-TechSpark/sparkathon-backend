import type { SessionLabel } from "@/db/schema";
import { mulberry32, type TrialFact } from "@/lib/metrics";
import { setsOf, type ResultsFilter, type SetSlug } from "./filters";

/**
 * Generated responses for reviewing the results screens without a database. Deterministic
 * (fixed seed), shaped like the team plan: 12 tasks per session, 4 with wrong advice, the
 * explanation shown on about half. People do worse on `facts` (they cannot check the
 * reasoning) and follow the AI more readily there. Never written to the database.
 */

const CATEGORIES: Record<SetSlug, string[]> = {
  logic: ["probability", "traps", "comparison", "deduction"],
  facts: ["geography", "history"],
  acme: ["refunds"],
  "judge-demo": ["probability", "geography", "refunds"],
};

const SESSIONS: { set: SetSlug; label: SessionLabel; expertise: number | null }[] = [
  ...Array.from({ length: 16 }, (_, i) => ({
    set: (i % 2 === 0 ? "logic" : "facts") as SetSlug,
    label: (i < 9 ? "pilot" : "seeded") as SessionLabel,
    expertise: i % 5 === 0 ? null : (i % 5) + 1,
  })),
  { set: "acme", label: "pilot", expertise: 3 },
  { set: "acme", label: "seeded", expertise: 4 },
  { set: "acme", label: "seeded", expertise: 2 },
  // A few judges on the 3-question demo, so the judge-demo set can be previewed.
  ...Array.from({ length: 6 }, (_, i) => ({
    set: "judge-demo" as SetSlug,
    label: "judge" as SessionLabel,
    expertise: (i % 4) + 2,
  })),
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const step5 = (v: number) => clamp(Math.round(v / 5) * 5, 25, 100);

function buildAll(): (TrialFact & { label: SessionLabel })[] {
  const random = mulberry32(2026);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const rows: (TrialFact & { label: SessionLabel })[] = [];

  SESSIONS.forEach((s, si) => {
    const sessionId = `demo-${String(si + 1).padStart(2, "0")}`;
    const count = s.set === "acme" ? 10 : s.set === "judge-demo" ? 3 : 12;
    const wrongAdvice = s.set === "acme" ? 3 : 4;
    const checkable = s.set === "logic";
    const skill = (s.expertise ?? 3) * 0.04;

    for (let p = 1; p <= count; p++) {
      const difficulty = 1 + Math.floor(random() * 3);
      const correctIndex = Math.floor(random() * 4);
      // judge-demo: wrong advice on question 2 only (amendments A4); elsewhere order does not matter.
      const aiRight = s.set === "judge-demo" ? p !== 2 : p > wrongAdvice;
      const adviceIndex = aiRight ? correctIndex : (correctIndex + 1 + Math.floor(random() * 3)) % 4;
      const rationaleShown = random() < 0.5;

      const pFirst = clamp((checkable ? 0.66 : 0.5) + skill - 0.1 * (difficulty - 2), 0.15, 0.9);
      const firstRight = random() < pFirst;
      const firstAnswer = firstRight ? correctIndex : (correctIndex + 1 + Math.floor(random() * 3)) % 4;
      const firstConfidence = step5((firstRight ? 68 : 55) + (random() - 0.5) * 40);

      let finalAnswer = firstAnswer;
      let finalConfidence = firstConfidence;
      if (firstAnswer === adviceIndex) {
        finalConfidence = step5(firstConfidence + 5 + random() * 15);
      } else {
        let pFollow = checkable ? (aiRight ? 0.6 : 0.3) : aiRight ? 0.65 : 0.55;
        if (rationaleShown) pFollow += 0.12;
        if (random() < pFollow) {
          finalAnswer = adviceIndex;
          finalConfidence = step5(firstConfidence + 2 + random() * 18);
        } else {
          finalConfidence = step5(firstConfidence - 12 + random() * 14);
        }
      }

      rows.push({
        sessionId,
        taskId: `${s.set}-${String(p).padStart(2, "0")}`,
        position: p,
        setSlug: s.set,
        category: pick(CATEGORIES[s.set]),
        difficulty,
        correctIndex,
        adviceIndex,
        rationaleShown,
        firstAnswer,
        firstConfidence,
        finalAnswer,
        finalConfidence,
        label: s.label,
        selfRatedExpertise: s.expertise,
      });
    }
  });
  return rows;
}

let cache: ReturnType<typeof buildAll> | null = null;

export function demoFacts(filter: ResultsFilter, labels: SessionLabel[]): TrialFact[] {
  cache ??= buildAll();
  const sets: readonly string[] = setsOf(filter);
  return cache.filter((t) => labels.includes(t.label) && sets.includes(t.setSlug));
}
