/**
 * Which tasks a new session gets, in which order, and where the explanation is shown
 * (amendments A2 and A4). Pure, so P1's start-session action and the tests share it.
 *
 * - judge-demo (fixedOrder): every task in `position` order, explanation always shown.
 * - 16 or more tasks: 12 of them, exactly 4 with wrong AI advice when the set has 4, shuffled.
 * - fewer: every task, shuffled.
 * The explanation is shown on a random half of the questions.
 */

export type PlanTask = {
  id: string;
  position: number;
  correctIndex: number;
  adviceIndex: number;
};

export type PlannedResponse = { taskId: string; position: number; rationaleShown: boolean };

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
  { fixedOrder = false, random = Math.random }: { fixedOrder?: boolean; random?: () => number } = {},
): PlannedResponse[] {
  if (tasks.length === 0) throw new Error("This set has no tasks");

  if (fixedOrder) {
    return [...tasks]
      .sort((a, b) => a.position - b.position)
      .map((t, i) => ({ taskId: t.id, position: i + 1, rationaleShown: true }));
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
  return ordered.map((t, i) => ({ taskId: t.id, position: i + 1, rationaleShown: showRationale[i] }));
}
