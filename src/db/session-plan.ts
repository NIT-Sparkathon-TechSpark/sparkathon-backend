/**
 * Which tasks a new session gets, in which order, and where the explanation is shown
 * (amendments A2 and A4). Pure, so P1's start-session action and the tests share it.
 *
 * - judge-demo (fixedOrder): every task in `position` order, explanation always shown.
 * - 16 or more tasks: 12 of them, exactly 4 with wrong AI advice when the set has 4, shuffled.
 * - fewer: every task, shuffled.
 * The explanation is shown on a random half of the questions.
 *
 * - mixed (spec 0002): every task, shuffled. Half of the wrong advice tasks and half of the right
 *   advice tasks are marked advice first (the AI is shown before the person answers); with an odd
 *   count the extra task goes to a random side. The explanation is always shown, so it is not a
 *   second thing that varies.
 */

export type PlanTask = {
  id: string;
  position: number;
  correctIndex: number;
  adviceIndex: number;
};

export type PlannedResponse = {
  taskId: string;
  position: number;
  rationaleShown: boolean;
  adviceFirst: boolean;
};

export const SESSION_LENGTH = 12;
export const WRONG_PER_SESSION = 4;
const LARGE_SET = 16;

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function planSession(
  tasks: PlanTask[],
  {
    fixedOrder = false,
    mixed = false,
    random = Math.random,
  }: { fixedOrder?: boolean; mixed?: boolean; random?: () => number } = {},
): PlannedResponse[] {
  if (tasks.length === 0) throw new Error("This set has no tasks");

  if (mixed) {
    const adviceFirst = new Set<string>();
    const markHalf = (group: PlanTask[]) => {
      const shuffled = shuffle(group, random);
      const extra = shuffled.length % 2 === 1 && random() < 0.5 ? 1 : 0;
      for (const t of shuffled.slice(0, Math.floor(shuffled.length / 2) + extra)) adviceFirst.add(t.id);
    };
    markHalf(tasks.filter((t) => t.adviceIndex !== t.correctIndex));
    markHalf(tasks.filter((t) => t.adviceIndex === t.correctIndex));
    return shuffle(tasks, random).map((t, i) => ({
      taskId: t.id,
      position: i + 1,
      rationaleShown: true,
      adviceFirst: adviceFirst.has(t.id),
    }));
  }

  if (fixedOrder) {
    return [...tasks]
      .sort((a, b) => a.position - b.position)
      .map((t, i) => ({ taskId: t.id, position: i + 1, rationaleShown: true, adviceFirst: false }));
  }

  let chosen: PlanTask[];
  if (tasks.length >= LARGE_SET) {
    const wrong = shuffle(tasks.filter((t) => t.adviceIndex !== t.correctIndex), random);
    const right = shuffle(tasks.filter((t) => t.adviceIndex === t.correctIndex), random);
    const pickedWrong = wrong.slice(0, WRONG_PER_SESSION);
    const fill = [...right, ...wrong.slice(WRONG_PER_SESSION)];
    chosen = [...pickedWrong, ...fill.slice(0, SESSION_LENGTH - pickedWrong.length)];
  } else {
    chosen = tasks;
  }

  const ordered = shuffle(chosen, random);
  const half = Math.floor(ordered.length / 2);
  const showRationale = shuffle(
    ordered.map((_, i) => i < half),
    random,
  );
  return ordered.map((t, i) => ({
    taskId: t.id,
    position: i + 1,
    rationaleShown: showRationale[i],
    adviceFirst: false,
  }));
}
