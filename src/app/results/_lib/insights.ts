import {
  aiCorrect,
  bootstrap,
  complete,
  followedAI,
  harmfulSwitchToAdvice,
  MIN_TRIALS_PER_SLICE,
  overReliance,
  rate,
  wrongAndSurer,
  type Interval,
  type Rate,
  type TrialFact,
} from "@/lib/metrics";

/*
 * Headline insights built only from src/lib/metrics.ts, so every screen agrees with the analysis.
 * Server only: callers pass the returned aggregates to the browser, never the rows.
 */

/** "AI-induced errors": the person had it right, the AI was wrong, and they switched to the AI. */
export const aiInducedErrors = (rows: TrialFact[]): Rate => harmfulSwitchToAdvice(rows);

/** Whenever the AI was wrong, how often the final answer was the AI's wrong answer. */
export function endedOnWrongAdvice(rows: TrialFact[]): Rate {
  return rate(
    complete(rows).filter((t) => !aiCorrect(t)),
    followedAI,
  );
}

export type Verdict = "supported" | "opposite" | "unclear" | "too-little-data" | "not-applicable";

export type Prediction = {
  id: string;
  claim: string;
  /** What the two numbers measure, as a short caption: "Fooled by wrong advice". */
  measure: string;
  /** What the two groups are, in reading order: the group predicted to be higher first. */
  groups: [string, string];
  values: [Rate, Rate];
  /** Group 1 minus group 2, as a fraction. */
  difference: Interval | null;
  verdict: Verdict;
  note?: string;
};

const FOOLED = "Switched to wrong advice";

type Split = (rows: TrialFact[]) => [TrialFact[], TrialFact[]];

function judge(
  rows: TrialFact[],
  split: Split,
  metric: (rows: TrialFact[]) => Rate,
): Pick<Prediction, "values" | "difference" | "verdict"> {
  const [a, b] = split(rows);
  const values: [Rate, Rate] = [metric(a), metric(b)];
  if (values[0].n < MIN_TRIALS_PER_SLICE || values[1].n < MIN_TRIALS_PER_SLICE) {
    return { values, difference: null, verdict: "too-little-data" };
  }
  // Resample whole sessions (bootstrap), then compare the two groups inside each resample.
  const difference = bootstrap(rows, (resample) => {
    const [ra, rb] = split(resample);
    const va = metric(ra).value;
    const vb = metric(rb).value;
    return va === null || vb === null ? null : va - vb;
  });
  if (!difference) return { values, difference, verdict: "too-little-data" };
  const verdict: Verdict = difference.low > 0 ? "supported" : difference.high < 0 ? "opposite" : "unclear";
  return { values, difference, verdict };
}

/**
 * The team's three predictions, written down before the first pilot wave (see git history).
 * Each compares two groups with a 95% session-level bootstrap interval of the difference.
 */
export function predictions(rows: TrialFact[], { allSets }: { allSets: boolean }): Prediction[] {
  const bySet: Split = (r) => [r.filter((t) => t.setSlug === "facts"), r.filter((t) => t.setSlug === "logic")];
  const byExplanation: Split = (r) => [r.filter((t) => t.rationaleShown), r.filter((t) => !t.rationaleShown)];
  const byAdvice: Split = (r) => [r.filter((t) => !aiCorrect(t)), r.filter((t) => aiCorrect(t))];

  const p1: Prediction = allSets
    ? {
        id: "checkability",
        claim: "Wrong advice fools people more on facts than on logic.",
        measure: FOOLED,
        groups: ["Facts", "Logic"],
        ...judge(rows, bySet, overReliance),
      }
    : {
        id: "checkability",
        claim: "Wrong advice fools people more on facts than on logic.",
        measure: FOOLED,
        groups: ["Facts", "Logic"],
        values: [overReliance([]), overReliance([])],
        difference: null,
        verdict: "not-applicable",
        note: "Compares two sets: choose “All” to see it.",
      };

  return [
    p1,
    {
      id: "explanation",
      claim: "An explanation makes wrong advice more convincing.",
      measure: FOOLED,
      groups: ["With explanation", "Answer only"],
      ...judge(rows, byExplanation, overReliance),
    },
    {
      id: "surer",
      claim: "Wrong advice leaves people wrong and surer.",
      measure: "Ended wrong and surer",
      groups: ["AI wrong", "AI right"],
      ...judge(rows, byAdvice, wrongAndSurer),
    },
  ];
}
