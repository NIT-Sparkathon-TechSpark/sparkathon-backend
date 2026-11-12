# 0002. Advice first experiment: does seeing the AI before you think make you miss its mistakes?

**Date**: 2026-11-12
**Status**: In Progress

## Summary

Today every person answers alone first and only then sees the AI. Real office tools show the AI's suggestion straight away. This experiment adds a new set of 12 bank alert cases where half the cases show the AI first (one step) and half work as today (two steps), chosen at random for each person. One new results page compares how many AI mistakes people catch in each form. It runs on its own git branch, its own database branch and a preview link, so `main`, production and the pilot data are not touched.

## Prediction, written down before any data

**Written**: Thursday 12 November 2026, 22:40 CET, before the first participant started. The time of the git commit that adds this section is the proof.

- **Prediction**: People catch fewer AI mistakes when the advice is shown before they answer.
- **Number**: on wrong advice cases in the `alerts` set, the share of right final answers on answer first cases minus the same share on advice first cases (`orderGap`). We expect it to be above zero.
- **Data**: completed sessions labelled `pilot` only. Practice runs do not count.
- **Verdict rule, fixed now**: supported if the whole 95% interval (bootstrap over sessions, 1000 rounds, default seed) is above zero. Opposite if it is all below zero. Otherwise "no clear difference yet". "Too little data" while either form has fewer than 10 wrong advice answers.
- **We report the result whatever it is**, with k, n and the interval.

## Context

> ⚠️ Premise note: This is a simulated queue, not real work, and the sample is small. Each person gives 3 wrong advice cases per form, so 20 people give 60 per form. That shows a large gap (around 30 points) and not a small one. Both forms also sit in one session, so the care people learn on answer first cases may carry over to advice first cases and shrink the gap. Read the result as a hint with an honest interval, and as a lower bound on the real gap, never as proof.

The current flow forces a first answer before any advice (hard rule 2 in `CLAUDE.md`, and the database check `responses_final_after_first`). That is what makes the human alone number possible. It also means the app can only measure reliance in a setup that real tools do not use. Our own strategy doc lists this as the main limit: test behaviour is not work behaviour.

The claim we want to test with our own data: people catch fewer AI mistakes when the advice is on screen before they have formed a view. If true, it answers the brief's guiding question (when does AI make people worse) and gives evidence for the fix we recommend to clients (decide first, then see the AI).

Forces that shape the design:

- The pitch is on Friday 13 November at 13:00. `main` deploys to production and must keep working, and the pilot data must stay clean.
- About 20 participants are realistic, so only a comparison inside each person has enough data (the same reasoning as amendment A2).
- All existing metrics need a first answer. Advice first answers have none.
- The work crosses all four owners' folders, the schema and a hard rule.

## Requirements

**User stories**:
- As a participant, I want to work through a queue of bank alerts, some with the AI's suggestion shown from the start, so that the test feels like using an AI tool at work.
- As the team, we want one number with an honest interval that says whether people catch fewer AI mistakes when the advice comes first, so that we can put a tested claim in the pitch.
- As the owner of `main`, I want all of this kept apart from production, so that the live demo cannot break.

**Acceptance criteria**:
- **AC-1**: `data/tasks/alerts.json` holds 12 tasks with 6 wrong pieces of advice and passes `pnpm tasks:check`.
- **AC-2**: Starting a session on `alerts` creates 12 response rows in shuffled order. Exactly 6 are marked advice first: 3 of the 6 wrong advice tasks and 3 of the 6 right advice tasks. Which tasks get which form is random per session. The explanation is shown on all 12.
- **AC-3**: Sessions on every other set create rows with `advice_first = false` and behave exactly as before.
- **AC-4**: An advice first case shows the question, the AI's pick, its explanation and the four options with the AI's pick marked and nothing selected. One submit stores the final answer, the confidence and the time. The first answer fields stay empty.
- **AC-5**: On an answer first case the AI advice still never reaches the browser before the first answer is stored.
- **AC-6**: The correct answer never reaches the browser before the session is complete, in either form.
- **AC-7**: A double tap, the Back button, a stale form or a forged request cannot store an answer twice, store a first answer on an advice first row, or skip a stage. The database rejects a first answer on an advice first row.
- **AC-8**: A refresh at any point shows the same case in the same form.
- **AC-9**: Every number on the existing results screens, `/live` and the export headline is unchanged. Advice first rows and the `alerts` set are never counted there.
- **AC-10**: `/results/advice-first` shows, for wrong advice cases, the share of final answers that were right in each form (with k and n), the gap in points with a 95% interval, and the number of sessions. It says "too little data" while either form has fewer than 10 wrong advice answers.
- **AC-11**: The same page shows three supporting numbers per form: right answers when the AI was right, share that ended on the AI's wrong answer, and median seconds per case.
- **AC-12**: The personal report for an `alerts` session shows the three scores for the 6 answer first cases and a separate block for the 6 advice first cases, including any case where the person went with wrong advice.
- **AC-13**: The CSV export includes `adviceFirst`, `msFirst` and `msFinal`.
- **AC-14**: The schema change is additive. Existing rows keep every value and get `advice_first = false`. It is applied to the experiment database branch only.
- **AC-15**: The new page sends only computed aggregates to the browser.

## Options considered

### Option 1: Mix both forms inside one session, in the existing flow

One new set. Each response row is marked advice first or answer first when the session starts. The existing page, actions and table gain a third stage.

**Pros**:
- Each person is their own control, so differences between people cancel out. Works with 20 people.
- Reuses the cookie session, the write guards, the bootstrap interval and the report.

**Cons**:
- Carry over between forms inside a session can shrink the gap.
- Touches the central table and relaxes a hard rule, so it must stay off `main`.

### Option 2: Assign each whole session to one form

Half the people get all 12 cases advice first, half get all 12 answer first.

**Pros**:
- No carry over. Closest to how a real tool behaves all day.

**Cons**:
- Compares different people, so skill differences add noise. Needs roughly twice the participants for the same certainty.
- The advice first group gives no human alone number at all.

### Option 3: A separate route and table for one step answers

A new page and a new `advised_responses` table. `responses` and hard rule 2 stay as they are.

**Pros**:
- Zero risk to existing constraints. Could merge to `main` without a rule change.

**Cons**:
- Duplicates the session plan, the stage logic, the write guards and the report. A session would span two tables, so ordering and completion need new logic.
- More code to write and verify for a side experiment.

## Decision

**Chosen option**: Option 1: Mix both forms inside one session, in the existing flow.

Add one boolean column to `responses`, one new stage to the flow, one new set and one new results page, all on branch `p1/advice-first-experiment` with its own Neon branch and Vercel preview.

**Implementation skills**: `neon-drizzle` (`.claude/skills/neon-drizzle/`) · `neon-postgres` (`.claude/skills/neon-postgres/`) · `shadcn` (`.claude/skills/shadcn/`) · `vercel-react-best-practices` (`.claude/skills/vercel-react-best-practices/`)

## Rationale

With about 20 people, only a comparison inside each person can show anything, which rules out Option 2. Carry over is the price, and it pushes the result toward no difference, so a gap that survives it is believable. Option 3 buys safety for `main` that the separate branch and database already give, at the cost of building the flow twice the night before a pitch. The existing metrics already ignore any row without a first answer, so adding advice first rows to the same table cannot change a number the demo depends on.

## Feature design

**Data model**:

`responses` gains one column and one check, and one check is loosened. No other table changes. No new session label: experiment sessions use `pilot`, team test runs use `?label=practice`.

| Change | Definition |
|---|---|
| New column | `advice_first boolean not null default false` (Drizzle: `adviceFirst`) |
| Loosened check `responses_final_after_first` | `final_answer is null or first_answer is not null or advice_first` |
| New check `responses_advice_first_no_first` | `not advice_first or (first_answer is null and first_confidence is null)` |

On an advice first row `first_answer`, `first_confidence`, `ms_first` and `first_at` stay null for ever. `ms_final` is the time from the case appearing to the submit.

**The set**: slug `alerts`, name "Bank alerts", file `data/tasks/alerts.json`, ids `alerts-01` to `alerts-12`.

- Every case is one transaction alert. `context` holds the same short rulebook on every case (as the `acme` set does with its policy).
- The same four options on every case, in the same order: `Clear the alert` · `Ask the customer for documents` · `Escalate to compliance` · `Block and report`.
- 6 cases with wrong advice, 6 with right advice. Wrong advice is spread over categories and difficulty, and its explanation and confidence read like the right ones (the balance rules P4 already follows).
- Suggested categories: `cash`, `transfers`, `sanctions`. Every case must be decidable from the rulebook alone.
- The loader prints "aim for about a third" for this set. That note is expected here and can be ignored.

**Which sets mix forms**: `src/lib/sets.ts` exports `MIXED_SETS = ["alerts"]` and adds `alerts` to `PARTICIPANT_SETS`. Nothing from the browser can choose the form.

**Session plan** (`planSession` in `src/db/session-plan.ts`): new option `mixed`. `PlannedResponse` gains `adviceFirst: boolean`.

- `mixed` false (every other set): unchanged, `adviceFirst` false on every row.
- `mixed` true: take every task, shuffle the order. Split the wrong advice tasks at random into two halves and mark one half advice first. Do the same for the right advice tasks. With an odd count the extra task goes to a random side. `rationaleShown` is true on every row, so the explanation is not a second variable.

**Stages** (worked out from the database on every render, as today):

| Row state | Stage | Screen |
|---|---|---|
| answer first, `first_answer` null | `first` | Question alone (unchanged) |
| answer first, `first_answer` set, `final_answer` null | `final` | Advice plus final answer (unchanged) |
| advice first, `final_answer` null | `advised` (new) | Question, advice and one answer |
| `final_answer` set | next row by position | |
| no row with `final_answer` null | `done` | Report |

`getSessionStep` first finds the lowest position whose `final_answer` is null, selecting only `task_id`, `advice_first` and whether `first_answer` is null. It then calls the read for that stage. Advice columns are selected only by `getStageTwoAdvice` (unchanged) and a new `getAdvisedTask`, which requires `advice_first = true` and `final_answer is null` in its `where`.

**Interface surface**:

| Surface | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `submitAdvisedAnswerAction` | Server Action | `setSlug`, `taskId`, `answer`, `confidence`, `ms` (existing `answerSchema`) | `FormState` (error text only), then redirect to `/s/<set>` | Session cookie | Invalid input: error text. No session: redirect to start. Out of step: redirect, nothing written |
| `recordAdvisedAnswer` | Query, `src/db/queries/participant.ts` | session id, task id, answer, confidence, ms | `boolean` (written or not) | Called by the action only | Returns false on a repeat |
| `getAdvisedTask` | Query, same file | session id, task id | position, public task, advice (index, confidence, explanation) | Called by `getSessionStep` | Null when the row is not advice first or is finished |
| `recordFirstAnswer` | Existing query | unchanged | unchanged | unchanged | Adds `advice_first = false` to its `where` |
| `/s/alerts` | Page | cookie | start form, a stage or the report | Session cookie | Unknown set: not found |
| `/results/advice-first` | Page | none | aggregates below | Public, like `/results` | No database or missing column: a notice, not a 500 |

`recordAdvisedAnswer` is one `db.batch`: the update of the response (`where` session, task, `advice_first = true`, `final_answer is null`), then the same "mark session complete" update that `recordFinalAnswer` uses.

**Screens**:

- `AdvisedStage` in `stages.tsx`: the `Question`, then the existing "The AI picked" card with the explanation, then `AnswerForm` with legends "Your answer" and "How sure are you?" and submit label "That's my answer". No "You answered" card.
- `AnswerForm`: `marks.you` becomes optional, so only the AI's pick is tagged.
- `Progress`: accepts stage `advised` and shows a single pill, "With AI advice", as current.
- Start screen for a mixed set: "How it works" says that on some cases you answer first and then see the AI, and on others the AI's suggestion is there from the start. Keep "The AI is wrong sometimes" and "About 8 minutes".

**Metrics** (`src/lib/metrics.ts`). `TrialFact` gains optional `adviceFirst?: boolean`, `msFirst?: number | null`, `msFinal?: number | null`. `isComplete` and every existing function stay as they are. New, all pure:

| Function | Definition |
|---|---|
| `inForm(rows, form)` | `"adviceFirst"`: rows with `adviceFirst` true and a final answer and final confidence. `"answerFirst"`: complete trials with `adviceFirst` not true |
| `catchRate(rows, form)` | Of `inForm` rows where the AI was wrong: share whose final answer is correct. Returns a `Rate` |
| `followedWrongRate(rows, form)` | Same rows: share whose final answer equals the advice |
| `rightWhenAIRight(rows, form)` | Of `inForm` rows where the AI was right: share whose final answer is correct |
| `orderGap(rows)` | `catchRate` answer first minus `catchRate` advice first. Null if either is null |
| `medianSeconds(rows, form)` | Median of `msFinal` (advice first) or `msFirst + msFinal` (answer first), in seconds. Null with no rows or missing times |
| `advisedProfile(rows)` | For the report: answered, right, AI wrong count, caught count, and the items where the final answer equals wrong advice |

The interval is `bootstrap(rows, orderGap)`, which resamples whole sessions. The verdict reuses the rule on the predictions card: supported when the whole interval is above zero, opposite when it is all below, otherwise no clear difference yet.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Start session | `advice_first` per row | `planSession` with `mixed` set from `MIXED_SETS.includes(setSlug)` |
| Start session | `rationale_shown` per row | `planSession`: always true when `mixed` |
| `advised` screen | AI pick, confidence, explanation | `tasks.advice_index`, `advice_confidence`, `advice_explanation`, read by `getAdvisedTask` |
| `advised` screen | Question, rulebook, options | `tasks.prompt`, `context`, `options` |
| `submitAdvisedAnswerAction` | Session id | Cookie, via `readSessionId()` |
| `submitAdvisedAnswerAction` | `ms_final` | Browser timer in `AnswerForm`, checked by `answerSchema` |
| `submitAdvisedAnswerAction` | `final_at` | `now()` in the update |
| Results page | Rows | `getTrialFacts({ sets: ["alerts"], labels: ["pilot"] })`, completed sessions only |
| Results page | Catch rates, k, n | `catchRate` per form |
| Results page | Gap and interval | `orderGap`, `bootstrap` with its default seed and 1000 rounds |
| Results page | Sessions | Count of distinct `sessionId` in the rows |
| Results page | "Too little data" | Either `catchRate(...).n` below `MIN_TRIALS_PER_SLICE` (10) |
| Results page | Supporting numbers | `rightWhenAIRight`, `followedWrongRate`, `medianSeconds` per form |
| Results page | Prediction text | Fixed copy: "People catch fewer AI mistakes when the advice is shown before they answer." |
| Report | Three scores | Existing `sessionProfile` (counts the answer first cases only) |
| Report | Advice first block | `advisedProfile` on `getSessionFacts`, question text from `getReportTasks` |
| Existing screens, no set chosen | Which sets count | `loadFacts` passes the `SETS` list from `filters.ts`, which does not contain `alerts` |

**Key invariants**:
- A row's form is fixed when the session starts and never changes.
- An advice first row never has a first answer (database check).
- An answer first row never has a final answer without a first answer (database check, as today).
- Every answer write applies at most once.
- The `alerts` set and advice first rows never enter an existing metric.

**Security model**:
- The form of a case comes from the database only. The action checks stage and task against `getSessionStep` before writing, as the other two actions do.
- Hard rule 2 on this branch only (the proposed wording is in the Build plan). The correct answer is still withheld until the report in both forms.
- Rules 1, 3, 4, 5, 6 and 7 are unchanged. The new page passes only aggregates to Client Components.
- No personal data beyond a nickname. Session ids stay random.

**Configuration required** (no new names, new values for this branch's preview only):
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`: the Neon branch `experiment-advice-first`.
- `NEON_BRANCH`: `preview` (the script guard accepts only `development` or `preview`).

**Critical test scenarios**:
- Happy path: finish an `alerts` session on a phone, 6 cases in each form, report appears, verifies **AC-2**, **AC-4**, **AC-12**
- Plan balance: 200 generated plans each have 3 wrong and 3 right advice tasks in each form, verifies **AC-2**
- Leak check: load an answer first case in `alerts` and confirm the page payload holds no advice before the first answer; confirm no payload holds a correct answer before the report, verifies **AC-5**, **AC-6**
- Replay: submit the advised form twice, and post the first answer action for an advice first task; one write, no first answer stored, verifies **AC-7**
- Refresh: reload on each of the three stages, same screen each time, verifies **AC-8**
- Regression: a `logic` session works as before; `/results` and `/live` show the same numbers before and after the migration on a copy of development data, verifies **AC-3**, **AC-9**, **AC-14**
- Metrics by hand: a small fixed list of rows gives the expected catch rates, gap and "too little data", verifies **AC-10**, **AC-11**

## Build plan

Order follows the Skateboard approach: first one person can finish a mixed session, then the numbers, then the screen. The owner is in brackets. Everything happens on `p1/advice-first-experiment`.

1. [Jay] Create Neon branch `experiment-advice-first` from `development`. Set the three values above in Vercel for this git branch's preview only. Check whether the preview link is protected by a Vercel login and open it up for participants if so, satisfies **AC-14**
2. [Jay] Edit hard rule 2 in `CLAUDE.md` on this branch to: "The correct answer for a task never reaches the browser before the session is complete. The AI advice never reaches the browser before the participant's first answer for that task is stored, except on responses marked `advice_first` (spec 0002), where the advice is shown with the question by design." Satisfies **AC-5**, **AC-6**
3. [P2] Schema: add the column and the two checks in `src/db/schema.ts`, run `drizzle-kit generate`, commit the SQL, run `pnpm db:migrate` against the experiment branch only, satisfies **AC-14**
4. [P2] `planSession` `mixed` option and `adviceFirst` on `PlannedResponse`; `startSession` passes `mixed` and writes `adviceFirst`; `MIXED_SETS` and the `alerts` entry in `src/lib/sets.ts`; plan balance test in `scripts/test-participant.mjs`, satisfies **AC-2**, **AC-3**
5. [P4] Write `data/tasks/alerts.json` (3 cases are enough to unblock task 6, all 12 before recruiting), run `pnpm tasks:check`, then `pnpm db:seed` on the experiment branch, satisfies **AC-1**
6. [P1] Stage logic: `getSessionStep` rewrite, `getAdvisedTask`, `recordAdvisedAnswer`, the guard in `recordFirstAnswer`, `submitAdvisedAnswerAction`, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
7. [P1] Screens: `AdvisedStage`, optional `marks.you`, `Progress` for `advised`, start screen copy for mixed sets, the page branch for the new stage, satisfies **AC-4**, **AC-8**
8. [P2] Metrics: the new `TrialFact` fields, the seven functions, tests in `scripts/test-metrics.mjs`; `adviceFirst`, `msFirst`, `msFinal` in `factColumns` and in the export columns, satisfies **AC-10**, **AC-11**, **AC-13**
9. [P3] `loadFacts` passes the `SETS` list when no set is chosen, so `alerts` never reaches existing screens, satisfies **AC-9**
10. [P1] Report: the advice first block and the changed wording for mixed sets, satisfies **AC-12**
11. [P3] Page `/results/advice-first` with its own loader, two stat tiles, the gap with interval and verdict, the supporting table, a short method and limits note, the existing auto refresh, and a tab in the results header, satisfies **AC-10**, **AC-11**, **AC-15**
12. [All] `pnpm build`, `pnpm test:metrics`, then each team member completes one `?label=practice` session on a phone through the preview link, satisfies **AC-3**, **AC-7**, **AC-8**
13. [All] Recruit 20 or more people with the link `<preview>/s/alerts`, same briefing words as the pilot. Export with `pnpm db:export` before anyone touches the Neon branch, satisfies **AC-10**, **AC-13**

## Migration plan

**Strategy**: feature flagged by set, on an isolated database branch.

**Phases**:
1. Apply the migration to `experiment-advice-first` only. Never to `development` or `production` while the branch is unmerged.
2. Run the experiment on the preview. Export the data.
3. Only if you decide to keep it after the pitch: P2 applies the same migration to `development`, then `production`, then the branch merges. Existing rows get `advice_first = false` and satisfy both checks, so no backfill is needed.

**Rollback**: before a merge, do nothing: the branch and the Neon branch are simply left. After a merge, revert the code first; the column and checks can stay, since old code never writes `advice_first` and the loosened check accepts every old row.

**Risks**:
- A teammate points `.env.local` at the experiment branch and forgets to switch back. Harmless for data, since the change is additive, but their local numbers will include test sessions.
- The preview is redeployed while someone is in a session, which can break their form. Do not push during recruiting.

## Consequences

**Positive**:
- A tested answer, from our own data, to "when does AI make people worse".
- The app can show the one step flow that real tools use, which the pitch can point at.
- Existing numbers cannot move: old metrics skip rows without a first answer, and the set is kept off existing screens.

**Negative / tradeoffs**:
- Hard rule 2 has an exception on this branch. Anyone reading the participant queries must now know which form a row has.
- The result may be unclear with 20 people, or show no gap because of carry over. That outcome still has to be reported honestly.
- Four owners must each do a piece on one branch on the night before the pitch.
- The data lives in a Neon branch that is not production. If it is deleted before an export, the result is gone.
- This branch must not merge to `main` before the pitch, which departs from the usual "merge once the preview loads".

**Neutral**:
- `alerts` has 50% wrong advice, above the usual third. People may trust the AI less as the session goes on, in both forms alike.
- Seeded sessions and the demo data generator do not cover the new set. The new page shows a notice when there is no database.

## Follow-up

- [ ] Agree in the team channel before work starts: the hard rule exception, the schema change and the folders each owner touches (required by `CLAUDE.md`).
- [ ] Decide who recruits the 20 people and when, so it does not compete with pilot wave 2 (07:00 to 09:00) for the same people.
- [ ] Write the prediction into the deck or `findings.md` with a timestamp before the first participant starts, so it counts as written down ahead of the data.
- [ ] After the pitch: decide whether to merge, and whether a version with whole sessions per form (Option 2) is worth running with more people.
