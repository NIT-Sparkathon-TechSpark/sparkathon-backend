import { submitFinalAnswerAction, submitFirstAnswerAction } from "@/actions/session";
import type { SessionStep } from "@/db/queries/participant";
import { CONFIDENCE_LEVELS } from "@/lib/participant-schemas";
import { AnswerForm } from "./answer-form";
import { Eyebrow, LETTERS, Progress, Question } from "./shell";

type Step<S extends SessionStep["stage"]> = Extract<SessionStep, { stage: S }>;

/** Stage 1: the question alone. The step it gets holds no answer and no advice (rule 2). */
export function FirstStage({ step, setSlug }: { step: Step<"first">; setSlug: string }) {
  const { task } = step;
  return (
    <>
      <Progress position={step.position} total={step.total} stage="first" />
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
      <Progress position={step.position} total={step.total} stage="final" />
      <AnswerForm
        key={`${task.taskId}-final`}
        action={submitFinalAnswerAction}
        setSlug={setSlug}
        taskId={task.taskId}
        options={task.options}
        answerLegend="Your final answer"
        confidenceLegend="How sure are you now?"
        submitLabel="That's my final answer"
        marks={{ you: first.answer, ai: advice.index }}
        above={
          <>
            <Question prompt={task.prompt} context={task.context} />

            <section className="flex flex-col gap-3">
              <div className="bg-card rounded-xl border p-4">
                <Eyebrow className="text-muted-foreground">You answered</Eyebrow>
                <p className="mt-1.5">
                  <span className="font-semibold">{LETTERS[first.answer]}.</span> {task.options[first.answer]}
                  <span className="text-muted-foreground"> · {firstSure}</span>
                </p>
              </div>

              <div className="border-ai/50 bg-ai/8 rounded-xl border p-4 transition-all duration-500 starting:translate-y-2 starting:opacity-0">
                <Eyebrow className="text-ai flex items-center gap-1.5">
                  <Sparkle />
                  The AI picked
                </Eyebrow>
                <p className="mt-1.5 text-lg leading-snug font-medium">
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

function Sparkle() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 fill-current">
      <path d="M8 0l1.8 4.9a2 2 0 0 0 1.3 1.3L16 8l-4.9 1.8a2 2 0 0 0-1.3 1.3L8 16l-1.8-4.9a2 2 0 0 0-1.3-1.3L0 8l4.9-1.8a2 2 0 0 0 1.3-1.3z" />
    </svg>
  );
}
