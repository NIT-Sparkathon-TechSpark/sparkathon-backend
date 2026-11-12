/**
 * Every number the app and the pitch show comes from this file. Pure functions, no imports, so
 * the end screen, the results screens and the analysis can never disagree.
 * Definitions: docs/plan/team-plan.md, "Metrics".
 *
 * Rates are fractions (0-1) with their numerator and denominator; multiply by 100 for display.
 * `value` is null when the denominator is 0, never NaN.
 * Test: node --experimental-strip-types scripts/test-metrics.mjs
 */

/** One answered response joined with its task. Built by the results queries. */
export type TrialFact = {
  sessionId: string;
  taskId: string;
  position?: number;
  setSlug: string;
  category: string;
  difficulty: number;
  correctIndex: number;
  adviceIndex: number;
  rationaleShown: boolean;
  firstAnswer: number | null;
  firstConfidence: number | null;
  finalAnswer: number | null;
  finalConfidence: number | null;
  label?: string;
  selfRatedExpertise?: number | null;
};

/** A trial where both stages are stored. Only these count in any metric. */
export type CompleteTrial = TrialFact & {
  firstAnswer: number;
  firstConfidence: number;
  finalAnswer: number;
  finalConfidence: number;
};

export type Rate = { value: number | null; k: number; n: number };

export type RelianceGrid = {
  followedRight: number; // AI right, person switched to it: the AI helped
  followedWrong: number; // AI wrong, person switched to it: followed too readily
  ignoredRight: number; // AI right, person kept their own answer: good advice lost
  ignoredWrong: number; // AI wrong, person kept their own answer: caught the mistake
};

export type Summary = {
  trials: number;
  sessions: number;
  humanAlone: Rate;
  aiAlone: Rate;
  humanAI: Rate;
  /** Human + AI minus the better of human alone and AI alone. Fraction; null with no trials. */
  centaurGain: number | null;
  overReliance: Rate;
  underReliance: Rate;
  harmfulSwitch: Rate;
  /** First answer right and AI wrong: share that switched to the AI's wrong answer. */
  harmfulSwitchToAdvice: Rate;
  helpfulSwitch: Rate;
  wrongAndSurer: Rate;
  relianceGrid: RelianceGrid;
  confidenceShift: { aiRight: number | null; aiWrong: number | null };
  /** Mean confidence (0-1) minus accuracy. Above 0 means overconfident. */
  calibrationGap: { before: number | null; after: number | null };
};

export const isComplete = (t: TrialFact): t is CompleteTrial =>
  t.firstAnswer !== null &&
  t.firstConfidence !== null &&
  t.finalAnswer !== null &&
  t.finalConfidence !== null;

export const aiCorrect = (t: TrialFact) => t.adviceIndex === t.correctIndex;
export const firstCorrect = (t: CompleteTrial) => t.firstAnswer === t.correctIndex;
export const finalCorrect = (t: CompleteTrial) => t.finalAnswer === t.correctIndex;
/** Reliance is only visible when the first answer differs from the AI's. */
export const disagreed = (t: CompleteTrial) => t.firstAnswer !== t.adviceIndex;
export const followedAI = (t: CompleteTrial) => t.finalAnswer === t.adviceIndex;

export function rate<T>(items: T[], hit: (item: T) => boolean): Rate {
  const k = items.filter(hit).length;
  return { value: items.length === 0 ? null : k / items.length, k, n: items.length };
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

export const complete = (rows: TrialFact[]): CompleteTrial[] => rows.filter(isComplete);

export const humanAloneAccuracy = (rows: TrialFact[]) => rate(complete(rows), firstCorrect);
export const aiAloneAccuracy = (rows: TrialFact[]) => rate(complete(rows), aiCorrect);
export const humanAIAccuracy = (rows: TrialFact[]) => rate(complete(rows), finalCorrect);

export function centaurGain(rows: TrialFact[]): number | null {
  const human = humanAloneAccuracy(rows).value;
  const ai = aiAloneAccuracy(rows).value;
  const both = humanAIAccuracy(rows).value;
  if (human === null || ai === null || both === null) return null;
  return both - Math.max(human, ai);
}

export const overReliance = (rows: TrialFact[]) =>
  rate(complete(rows).filter((t) => disagreed(t) && !aiCorrect(t)), followedAI);

export const underReliance = (rows: TrialFact[]) =>
  rate(complete(rows).filter((t) => disagreed(t) && aiCorrect(t)), (t) => !followedAI(t));

export const harmfulSwitch = (rows: TrialFact[]) =>
  rate(complete(rows).filter(firstCorrect), (t) => !finalCorrect(t));

export const harmfulSwitchToAdvice = (rows: TrialFact[]) =>
  rate(complete(rows).filter((t) => firstCorrect(t) && !aiCorrect(t)), followedAI);

export const helpfulSwitch = (rows: TrialFact[]) =>
  rate(complete(rows).filter((t) => !firstCorrect(t)), finalCorrect);

export const wrongAndSurer = (rows: TrialFact[]) =>
  rate(complete(rows), (t) => !finalCorrect(t) && t.finalConfidence > t.firstConfidence);

export function relianceGrid(rows: TrialFact[]): RelianceGrid {
  const grid: RelianceGrid = { followedRight: 0, followedWrong: 0, ignoredRight: 0, ignoredWrong: 0 };
  for (const t of complete(rows).filter(disagreed)) {
    const right = aiCorrect(t);
    if (followedAI(t)) {
      if (right) grid.followedRight++;
      else grid.followedWrong++;
    } else if (right) {
      grid.ignoredRight++;
    } else {
      grid.ignoredWrong++;
    }
  }
  return grid;
}

export function confidenceShift(rows: TrialFact[]) {
  const done = complete(rows);
  const shift = (ts: CompleteTrial[]) => mean(ts.map((t) => t.finalConfidence - t.firstConfidence));
  return {
    aiRight: shift(done.filter(aiCorrect)),
    aiWrong: shift(done.filter((t) => !aiCorrect(t))),
  };
}

export function calibrationGap(rows: TrialFact[]) {
  const done = complete(rows);
  const gap = (conf: (t: CompleteTrial) => number, ok: (t: CompleteTrial) => boolean) => {
    const c = mean(done.map((t) => conf(t) / 100));
    const a = rate(done, ok).value;
    return c === null || a === null ? null : c - a;
  };
  return {
    before: gap((t) => t.firstConfidence, firstCorrect),
    after: gap((t) => t.finalConfidence, finalCorrect),
  };
}

export function summarize(rows: TrialFact[]): Summary {
  const done = complete(rows);
  return {
    trials: done.length,
    sessions: new Set(done.map((t) => t.sessionId)).size,
    humanAlone: humanAloneAccuracy(done),
    aiAlone: aiAloneAccuracy(done),
    humanAI: humanAIAccuracy(done),
    centaurGain: centaurGain(done),
    overReliance: overReliance(done),
    underReliance: underReliance(done),
    harmfulSwitch: harmfulSwitch(done),
    harmfulSwitchToAdvice: harmfulSwitchToAdvice(done),
    helpfulSwitch: helpfulSwitch(done),
    wrongAndSurer: wrongAndSurer(done),
    relianceGrid: relianceGrid(done),
    confidenceShift: confidenceShift(done),
    calibrationGap: calibrationGap(done),
  };
}

/** Fewer complete trials than this in a slice: show "too little data", not the number. */
export const MIN_TRIALS_PER_SLICE = 10;

export type Slice = { key: string; summary: Summary; enoughData: boolean };

/** Split by any dimension: category, difficulty, set, rationale shown, AI right or wrong, ... */
export function sliceBy(rows: TrialFact[], keyOf: (t: CompleteTrial) => string): Slice[] {
  const groups = new Map<string, CompleteTrial[]>();
  for (const t of complete(rows)) {
    const key = keyOf(t);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => ({
      key,
      summary: summarize(group),
      enoughData: group.length >= MIN_TRIALS_PER_SLICE,
    }));
}

/** Ready-made slice keys for the "where AI hurts" view. */
export const SLICES = {
  aiCorrect: (t: CompleteTrial) => (aiCorrect(t) ? "AI right" : "AI wrong"),
  rationale: (t: CompleteTrial) => (t.rationaleShown ? "Explanation shown" : "Answer only"),
  difficulty: (t: CompleteTrial) => `Difficulty ${t.difficulty}`,
  category: (t: CompleteTrial) => t.category,
  set: (t: CompleteTrial) => t.setSlug,
  expertise: (t: CompleteTrial) =>
    t.selfRatedExpertise == null
      ? "Not given"
      : t.selfRatedExpertise <= 2
        ? "Low (1-2)"
        : t.selfRatedExpertise >= 4
          ? "High (4-5)"
          : "Middle (3)",
} as const;

/** Small seeded random number generator, so intervals are the same on every render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Interval = { estimate: number; low: number; high: number };

/**
 * 95% percentile bootstrap interval for any statistic, resampling whole sessions
 * (a person's answers are not independent of each other). Null when the statistic is null.
 */
export function bootstrap(
  rows: TrialFact[],
  stat: (rows: TrialFact[]) => number | null,
  { iterations = 1000, seed = 42, level = 0.95 } = {},
): Interval | null {
  const estimate = stat(rows);
  if (estimate === null) return null;

  const bySession = new Map<string, TrialFact[]>();
  for (const t of rows) bySession.set(t.sessionId, [...(bySession.get(t.sessionId) ?? []), t]);
  const groups = [...bySession.values()];
  const random = mulberry32(seed);

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const resample: TrialFact[] = [];
    for (let j = 0; j < groups.length; j++) {
      resample.push(...groups[Math.floor(random() * groups.length)]);
    }
    const value = stat(resample);
    if (value !== null) samples.push(value);
  }
  if (samples.length === 0) return { estimate, low: estimate, high: estimate };

  samples.sort((a, b) => a - b);
  const pick = (q: number) =>
    samples[Math.min(samples.length - 1, Math.max(0, Math.floor(q * samples.length)))];
  return { estimate, low: pick((1 - level) / 2), high: pick(1 - (1 - level) / 2) };
}

/** Convenience: interval for a Rate-returning metric such as overReliance. */
export const rateInterval = (
  rows: TrialFact[],
  metric: (rows: TrialFact[]) => Rate,
  options?: Parameters<typeof bootstrap>[2],
) => bootstrap(rows, (r) => metric(r).value, options);

export type ProfileItem = {
  taskId: string;
  position: number | null;
  firstAnswer: number;
  finalAnswer: number;
  adviceIndex: number;
  correctIndex: number;
  outcome: "helped" | "followed wrong advice" | "ignored good advice" | "caught the mistake" | "agreed";
};

/** The participant's own end screen. Rows are that one session's responses. */
export function sessionProfile(rows: TrialFact[]) {
  const done = complete(rows).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const items: ProfileItem[] = done.map((t) => {
    let outcome: ProfileItem["outcome"] = "agreed";
    if (disagreed(t)) {
      if (followedAI(t)) outcome = aiCorrect(t) ? "helped" : "followed wrong advice";
      else outcome = aiCorrect(t) ? "ignored good advice" : "caught the mistake";
    }
    return {
      taskId: t.taskId,
      position: t.position ?? null,
      firstAnswer: t.firstAnswer,
      finalAnswer: t.finalAnswer,
      adviceIndex: t.adviceIndex,
      correctIndex: t.correctIndex,
      outcome,
    };
  });
  const grid = relianceGrid(done);
  return {
    answered: done.length,
    accuracyBefore: humanAloneAccuracy(done),
    accuracyAfter: humanAIAccuracy(done),
    followedWrongAdvice: grid.followedWrong,
    ignoredGoodAdvice: grid.ignoredRight,
    harmfulSwitches: harmfulSwitch(done).k,
    items,
  };
}
