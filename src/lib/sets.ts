/**
 * The question sets a participant can open at /s/<set> (amendments A1). The slug is the task
 * file name and `tasks.set_slug`. The `dev` test set is deliberately not listed, so it can
 * never be started from a link.
 */
export const PARTICIPANT_SETS = {
  logic: {
    name: "Logic & probability",
    blurb: "Puzzles where you can work out the answer if you think it through.",
  },
  facts: {
    name: "General knowledge",
    blurb: "Questions about history, geography and the world.",
  },
  acme: {
    name: "Acme refund policy",
    blurb: "Apply a company's refund and warranty policy to real customer cases.",
  },
  "judge-demo": {
    name: "Judge demo",
    blurb: "Three quick questions to see how the test works.",
  },
} as const;

export type ParticipantSet = keyof typeof PARTICIPANT_SETS;

export const SET_SLUGS = Object.keys(PARTICIPANT_SETS) as [ParticipantSet, ...ParticipantSet[]];

export function isParticipantSet(value: string): value is ParticipantSet {
  return Object.hasOwn(PARTICIPANT_SETS, value);
}
