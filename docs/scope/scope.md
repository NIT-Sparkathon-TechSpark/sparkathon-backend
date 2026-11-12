# Scope: The Centaur Test

A platform that runs the same tasks three ways (humans alone, AI alone, humans with AI advice) and shows when working with AI helps people and when it makes them worse. It is for hackathon judges and for anyone who wants to study how people rely on AI. Source brief: `PROBLEM_STATEMENT.md`.

**Build approach:** Skateboard (ship the smallest whole product a real person can use, then grow it release by release).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real app). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but you can skip it when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

**Product decisions already made**

- Tasks are mixed reasoning and knowledge questions, multiple choice, each with one known correct answer, a category and a difficulty level.
- Each task runs in two stages. The person answers alone and rates their confidence. Then they see the AI advice and may keep or change both the answer and the confidence. One person and one task give both the "alone" and the "with AI" result.
- AI advice is real AI output, recorded once ahead of time. Every participant sees the same advice, and the "AI alone" score is fixed.
- The demo uses live participants plus seeded sessions, so the results are readable from the first minute.
- No accounts. A participant enters a nickname and starts.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | planned |
| 3 | Data model | Foundation | planned |
| 4 | Design system & UI foundation | Foundation | planned |
| 5 | Task set with recorded AI answers | Release 1 | planned |
| 6 | Two stage task session | Release 1 | planned |
| 7 | Three way comparison and reliance results | Release 1 | planned |
| 8 | Seeded sessions | Release 2 | planned |
| 9 | Helps or hurts breakdowns | Release 2 | planned |
| 10 | Confidence analysis | Release 2 | planned |
| 11 | AI advice variants | Release 3 | planned |
| 12 | Personal centaur report | Release 3 | planned |
| 13 | Researcher view and data export | Release 4 | planned |

## Foundations

### 1. Stack & architecture · in-progress
Decide the stack and scaffold a project that runs, so every later release builds on real structure. This is the one place tools are chosen.
**Done when:** the stack is recorded in a spec, and the empty scaffold boots on your machine and passes its build.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [ ] Scaffold from the decision: `/develop stack & architecture`
- [ ] Verify it: `/check verify stack & architecture`
Spec [0001](../specs/0001-stack-architecture/index.md)

### 2. Coding standards & tooling
Capture conventions from the real scaffolded project, then install lint, format and commit checks so all later code follows them.
**Done when:** root `AGENTS.md` reflects the real stack, and lint and format run clean.
- [ ] Capture conventions and tooling choices: `/audit`
- [ ] Install the tooling: `/develop tooling`

### 3. Data model · needs a decision
The core records everything else reads: tasks, recorded AI advice, participants, sessions, and one response per task holding both stages (first answer, first confidence, final answer, final confidence, timing).
**Done when:** one stored response is enough to work out all three conditions, the four reliance outcomes and the confidence change, and later releases (advice variants, breakdowns) fit with no breaking change.
- [ ] Design it (spec): `/architect data model`

### 4. Design system & UI foundation · needs a decision
Visual language and base components for two very different surfaces: a calm, focused task screen and a clear, chart heavy results screen.
**Done when:** `design.md` covers type, color, spacing, components and chart styling, and base components handle focus and keyboard use.
- [ ] Design it (spec): `/architect design system & UI foundation`

## Release 1: The smallest usable centaur test

One person can take the test, and the platform shows the three way comparison and the reliance picture. This already answers the brief at its simplest.

### 5. Task set with recorded AI answers · needs a decision
A first set of tasks across a few categories and difficulty levels, each with the AI's recorded answer, stated confidence and short explanation. The set must include enough tasks where the AI is wrong, or over reliance can never show up.
**Done when:** a loaded task set exists where every task has a correct answer, a category, a difficulty and recorded AI advice, and the AI is wrong on a meaningful share of tasks spread across categories.
- [ ] Design it (spec): `/architect task set with recorded AI answers`

### 6. Two stage task session
The participant flow: enter a nickname, then for each task answer alone with a confidence rating, see the AI advice, and give a final answer and confidence. The correct answer stays hidden until the session ends.
**Done when:** a participant can finish a full session start to end, every response stores both stages, a refresh in the middle does not lose progress, and the advice is never visible before the first answer is locked.
- [ ] Build it: `/develop two stage task session`

### 7. Three way comparison and reliance results · needs a decision
The core results screen. It shows accuracy for humans alone, AI alone and humans with AI side by side, plus the reliance grid: followed when the AI was right, followed when it was wrong (followed too readily), ignored when it was right (good advice lost), ignored when it was wrong (caught the mistake).
**Done when:** the screen shows the three accuracy figures and the four reliance outcomes from real stored responses, the numbers match a hand count, and it reads sensibly with one session or with many.
- [ ] Design it (spec): `/architect three way comparison and reliance results`

## Release 2: Answer the "when"

The platform stops reporting one overall score and points to the conditions where AI help turns harmful.

### 8. Seeded sessions
A believable set of earlier sessions loaded ahead of time, clearly marked as seeded, so patterns are visible before live participants arrive.
**Done when:** a fresh install can load the seeded sessions with one step, the results screens fill up, and seeded data can be told apart from live data and switched off.
- [ ] Build it: `/develop seeded sessions`

### 9. Helps or hurts breakdowns · needs a decision
Split the comparison by condition: task category, difficulty, how confident the AI sounded, and how confident the person was before seeing advice. Each slice is marked as "AI helps here" or "AI hurts here".
**Done when:** a viewer can pick a dimension and see, per slice, alone versus with AI accuracy and the over reliance rate, slices where people got worse with AI are called out plainly, and slices with too little data say so instead of showing a misleading number.
- [ ] Design it (spec): `/architect helps or hurts breakdowns`

### 10. Confidence analysis
The second meaning of "worse": people feeling more sure of a wrong answer. Shows how confidence moves after advice, split by whether the final answer was right or wrong.
**Done when:** the results show the confidence change after advice for right and wrong final answers, and the share of cases where a person ended both wrong and more confident is its own headline number.
- [ ] Build it: `/develop confidence analysis`

## Release 3: Sharper findings and a reason to take part

### 11. AI advice variants · needs a decision
Show the same advice in different styles (answer only, answer with stated confidence, answer with explanation), assigned per session, so the platform can show which style leads people to follow wrong advice more.
**Done when:** each session is assigned one style, the style is stored on every response, and the breakdowns can compare over reliance across styles.
- [ ] Design it (spec): `/architect AI advice variants`

### 12. Personal centaur report
At the end of a session the participant sees their own result: their three scores, where the AI helped them, where it hurt them, and their reliance pattern in plain words.
**Done when:** a participant who finishes sees a report built from their own responses, including at least one concrete task where they switched to a wrong AI answer or rejected a right one, if any happened.
- [ ] Build it: `/develop personal centaur report`

## Release 4: For the person running the study

### 13. Researcher view and data export
A simple view of all sessions with the option to download the raw responses for outside analysis.
**Done when:** a viewer can list sessions, filter live from seeded, and download every response with both stages and the advice shown.
- [ ] Build it: `/develop researcher view and data export`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Participant sign in**: accounts so people can return and be tracked over time · needs a decision
- **Custom task sets**: let a researcher upload their own tasks and advice · needs a decision
- **Live AI advice**: the AI answers fresh during the session · needs a decision
- **Statistical significance**: tests and intervals on each comparison · needs a decision
- **Separate group studies**: assign whole sessions to alone or with AI · needs a decision
- **More languages**: tasks and interface in more than one language · needs a decision

## Legend

**The decision box.** Every feature carries at most one, the box whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise go straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Detailed build tasks live in the spec's `## Build plan`, not here**: the scope carries only a short milestone rollup, filled in by `/architect` when the spec is captured.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (removed from scope, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag means it inherits the default.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link is added by `/architect`, the code path by `/develop`.
