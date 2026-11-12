/**
 * The question sets a participant can open at /s/<set> (amendments A1). The slug is the task
 * file name and `tasks.set_slug`. The `dev` test set is deliberately not listed, so it can
 * never be started from a link.
 */
export const PARTICIPANT_SETS = {
  logic: {
    name: "Logic & probability",
    blurb: "Short puzzles. You can work each one out if you take a moment.",
  },
  facts: {
    name: "General knowledge",
    blurb: "History, geography and other things you either know or you don't.",
  },
  acme: {
    name: "Acme refund policy",
    blurb: "Read a company's refund policy, then decide what each customer should get.",
  },
  "judge-demo": {
    name: "Judge demo",
    blurb: "Three quick questions, so you can see how the test works.",
  },
} as const;

export type ParticipantSet = keyof typeof PARTICIPANT_SETS;

export const SET_SLUGS = Object.keys(PARTICIPANT_SETS) as [ParticipantSet, ...ParticipantSet[]];

export function isParticipantSet(value: string): value is ParticipantSet {
  return Object.hasOwn(PARTICIPANT_SETS, value);
}
