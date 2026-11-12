import { submitFinalAnswerAction, submitFirstAnswerAction } from "@/actions/session";
import type { SessionStep } from "@/db/queries/participant";
import { CONFIDENCE_LEVELS } from "@/lib/participant-schemas";
import { AnswerForm } from "./answer-form";
import { LETTERS, Progress, Question } from "./shell";

type Step<S extends SessionStep["stage"]> = Extract<SessionStep, { stage: S }>;

/** Stage 1: the question alone. The step it gets holds no answer and no advice (rule 2). */
export function FirstStage({ step, setSlug }: { step: Step<"first">; setSlug: string }) {
  const { task } = step;
  return (
    <>
      <Progress position={step.position} total={step.total} step="Step 1 of 2 · On your own" />
      <AnswerForm
        key={`${task.taskId}-first`}
        action={submitFirstAnswerAction}
        setSlug={setSlug}
        taskId={task.taskId}
        options={task.options}
        answerLegend="Your answer"
        confidenceLegend="How sure are you?"
        submitLabel="Lock in my answer"
        above={<Question prompt={task.prompt} context={task.context} />}
      />
    </>
  );
}

/**
 * Stage 2: the AI advice, shown only because the server found this question's first answer already
 * stored. The explanation is present only on the questions where it is meant to be shown (A2).
 */
export function FinalStage({ step, setSlug }: { step: Step<"final">; setSlug: string }) {
  const { task, first, advice } = step;
  const firstSure = CONFIDENCE_LEVELS.find((l) => l.value === first.confidence)?.label ?? `${first.confidence}%`;

  return (
    <>
      <Progress position={step.position} total={step.total} step="Step 2 of 2 · With AI advice" />
      <AnswerForm
        key={`${task.taskId}-final`}
        action={submitFinalAnswerAction}
        setSlug={setSlug}
        taskId={task.taskId}
        options={task.options}
        answerLegend="Your final answer"
        confidenceLegend="How sure are you now?"
        submitLabel="Submit final answer"
        above={
          <>
            <Question prompt={task.prompt} context={task.context} />

            <section className="flex flex-col gap-3">
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">You answered</p>
                <p className="mt-1">
                  <span className="font-semibold">{LETTERS[first.answer]}.</span> {task.options[first.answer]}
                  <span className="text-muted-foreground"> · {firstSure}</span>
                </p>
              </div>

              <div className="rounded-lg border border-(--ai) bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-(--ai) uppercase">The AI suggests</p>
                <p className="mt-1 font-medium">
                  <span className="font-semibold">{LETTERS[advice.index]}.</span> {task.options[advice.index]}
                </p>
                {advice.explanation && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{advice.explanation}</p>
                )}
              </div>
            </section>
          </>
        }
      />
    </>
  );
}
