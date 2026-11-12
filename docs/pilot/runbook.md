# Pilot runbook (P4)

Everything needed to run the two pilot waves. Rules come from `docs/plan/team-plan.md` ("Pilot") and amendments A3 and A4.

## Targets

| Wave | Clock | Sessions | Sets |
|---|---|---|---|
| 1 | Thu 23:00–01:00 | 10 completed | alternate `logic` and `facts` (5 each) |
| 2 | Fri 07:00–09:00 | 5 more completed, plus 4 on `acme` | alternate `logic` and `facts`; `acme` for the 4 extra |

Total: at least 15 completed `pilot` sessions on logic and facts, plus 4 on acme. No merges to `main` during either wave.

## Links

Live app: `https://sparkathon-hazel.vercel.app`

| Who | Link |
|---|---|
| Pilot participant, logic | `/s/logic` |
| Pilot participant, facts | `/s/facts` |
| Pilot participant, acme (wave 2 only) | `/s/acme` |
| Team member testing | `/s/logic?label=practice` (never count these) |
| Judge, during the pitch | `/s/judge-demo?label=judge` |
| Watch results | `/results`, `/results?seeded=off` for pilot only |
| Projector | `/live`, or `/live?set=judge-demo` during the pitch |

The participant routes (`/s/<set>`) come with P1's flow. Check that a full session works on a phone before wave 1 (22:00 checkpoint).

## Before each wave

1. P1's flow is merged to `main` and the 22:00 checkpoint passed: each of us finished one session on a phone and it shows in `/results`.
2. P2 has run the migration and `pnpm db:seed` against **production**, so all four sets are loaded.
3. Open `/results?seeded=off` and note the current number of sessions.
4. Have the tracker below ready.
5. If practice sessions need clearing: `pnpm db:reset-live` first as a dry run, check it lists only `practice` and `judge`, then `--yes`. Never anything else.

## The brief (say exactly this, every time)

> Answer honestly, no searching. AI advice will sometimes be wrong. It takes about 8 minutes.

Then: "Use a nickname, not your real name." Nothing else: no hints about how often the AI is wrong, which questions are tricky, or what we are measuring.

## Assigning sets

Alternate by arrival: 1st person `logic`, 2nd `facts`, 3rd `logic`, and so on. Note it in the tracker. In wave 2, the last 4 people take `acme`.

Do not let someone take a second set; their first session is the one that counts.

## Recruitment message

> Hi! We're running a short study for our hackathon project: you answer 12 multiple-choice questions, first on your own, then with an AI's advice. It takes about 8 minutes on your phone, no sign-up, just a nickname. Could you do it tonight between 23:00 and 01:00, or tomorrow 07:00–09:00? I'll send you the link.

Aim for 20 people to reach 15 completed sessions. Avoid anyone who has seen the task files or the results screens.

## Tracker

| # | Wave | Set | Nickname | Started | Completed | Notes |
|---|---|---|---|---|---|---|
| 1 | 1 | logic | | | | |
| 2 | 1 | facts | | | | |
| 3 | 1 | logic | | | | |
| 4 | 1 | facts | | | | |
| 5 | 1 | logic | | | | |
| 6 | 1 | facts | | | | |
| 7 | 1 | logic | | | | |
| 8 | 1 | facts | | | | |
| 9 | 1 | logic | | | | |
| 10 | 1 | facts | | | | |
| 11 | 2 | logic | | | | |
| 12 | 2 | facts | | | | |
| 13 | 2 | logic | | | | |
| 14 | 2 | facts | | | | |
| 15 | 2 | logic | | | | |
| 16 | 2 | acme | | | | |
| 17 | 2 | acme | | | | |
| 18 | 2 | acme | | | | |
| 19 | 2 | acme | | | | |

Keep the tracker off the repo once real nicknames are in it (a shared sheet is fine). Nicknames only, never real names.

## During a wave: data quality (with P2)

- After every few sessions, `/results?seeded=off` should show the count going up.
- Flag a session if it finished in under 2 minutes, every answer is the same letter, or every confidence is the same. Tell P2; do not delete anything (hard rule 6).
- If someone gets stuck, note the time and question number for P1. Do not restart them on a new session unless the first one never stored an answer.

## After wave 2

- P2 locks numbers in `findings.md` by 09:30, from `pilot` sessions only.
- Only numbers from `findings.md` go into the deck (`docs/pitch/deck-outline.md`).

## Task content status

| Set | Tasks | Wrong advice | Session |
|---|---|---|---|
| logic | 20 | 7 | 12 shuffled, exactly 4 wrong |
| facts | 20 | 7 | 12 shuffled, exactly 4 wrong |
| acme | 10 | 3 | all 10 shuffled, 3 wrong |
| judge-demo | 3 | 1 (question 2) | fixed order, explanation always shown |

Correct answers and wrong advice are spread evenly over A–D in logic and facts, wrong and right advice have the same mean confidence, and every explanation argues for the option its advice picks (`answer_text` is checked by `pnpm tasks:check`). Tasks marked `"verified_by": "claude-checked"` had their answers checked by hand calculation or reference facts; a human second look is welcome before wave 1.

Never delete or re-add a task once anyone has answered; edit it in place by its `id`.
