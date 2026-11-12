# P2 data API: what P1 and P3 call

All in `src/db/`. Server only: call from Server Components and Server Actions, with the session id read from the cookie.

## Participant flow (P1): `src/db/queries/participant.ts`

| Function | Use |
|---|---|
| `startSession({ setSlug, nickname, label?, selfRatedExpertise? })` | Plans the session (`planSession`) and writes the session and its response rows in one transaction. Returns `{ sessionId, total }`, or `null` for an unknown set. Put `sessionId` in the cookie. |
| `getSessionStep(sessionId)` | What to show now, derived from the database: `{ stage: "first", task }`, `{ stage: "final", task, first, advice }` or `{ stage: "done" }`. Call it on every render of the flow. |
| `getStageOneTask(sessionId)` | Stage 1 only: prompt, context and options of the next unanswered question. Never selects the correct answer or the advice. |
| `getStageTwoAdvice(sessionId, taskId)` | Stage 2 only: the advice, and only when that question's first answer is stored and its final answer isn't. `explanation` is `null` when the question shows the answer only. |
| `recordFirstAnswer({ sessionId, taskId, answer, confidence, ms })` | Applies only while the first answer is empty. Returns `false` on a repeat. |
| `recordFinalAnswer({ sessionId, taskId, answer, confidence, ms })` | Applies only after the first answer and only once; marks the session complete when it was the last question. Returns `false` on a repeat. |
| `sessionExists(sessionId)` | For a cookie that points at a deleted session. |
| `getSessionFacts(sessionId)` in `queries/trial-facts.ts` | Feed to `sessionProfile()` from `src/lib/metrics.ts` for the personal report. |

Answers are 0-3, confidence 0-100 (the UI offers 25-100). Validate inputs with Zod in the action before calling these.

## Results (P3)

`getTrialFacts({ sets?, labels?, completedOnly? })` in `src/db/queries/trial-facts.ts`, then `summarize`, `sliceBy` with `SLICES`, and `rateInterval` from `src/lib/metrics.ts`. Defaults: `pilot` and `seeded` labels, completed sessions only. Pass `labels: ["pilot"]` for `?seeded=off`. Send only the computed summaries to the browser.

## Scripts (P2)

| Command | Does |
|---|---|
| `pnpm db:generate` then `pnpm db:migrate` | Create and apply migrations. Development branch first, production before the merge that needs it. Never `drizzle-kit push`. |
| `pnpm tasks:check` | Validate `data/tasks/*.json` without a database. |
| `pnpm db:seed` | Upsert the task files by id. Never deletes. Skips the `dev` test set unless `NEON_BRANCH` is `development` or `preview`. |
| `pnpm db:seed-sessions [--count 30] [--replace]` | Simulated `seeded` sessions for logic and facts. Refuses to run unless `NEON_BRANCH` is `development` or `preview`. |
| `pnpm db:reset-live [--yes]` | Delete only `practice` and `judge` sessions. Dry run without `--yes`. |
| `pnpm db:export [--labels pilot,seeded] [--all]` | CSV of answered trials to `exports/`, plus the headline numbers. |
| `pnpm test:metrics` | Tests for `metrics.ts` and `session-plan.ts`. |
