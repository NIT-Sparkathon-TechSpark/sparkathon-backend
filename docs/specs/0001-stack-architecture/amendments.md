# 0001. Amendments agreed by the team (2026-11-12, 15:30)

These change spec 0001 where they conflict with it. Everything else in `index.md` stands.

## A1. Question sets

Every task has a `set` (`logic`, `facts`, `acme`, `judge-demo`) and a `position` within its set. A session runs one set, chosen by the link: `/s/<set>`.

Why: `logic` (people can check the reasoning) against `facts` (they cannot) is our main hypothesis, and `acme`, a fictional company's refund policy, shows that any organization can bring its own tasks. The upload screen for custom sets stays deferred, as in the scope; sets are loaded from JSON like all tasks.

## A2. Advice style varies per question, not per session

Scope feature 11 assigned one advice style per session. Instead, each advised question randomly shows either the answer only or the answer with its explanation, stored as `rationale_shown` on the response. With about 15 participants, only a within-person comparison has enough data.

## A3. Session labels replace the seeded flag

`sessions.label` is one of `pilot`, `practice`, `judge`, `seeded`.

- Results count `pilot` and `seeded` by default. `?seeded=off` drops `seeded`.
- The link parameter `?label=practice` or `?label=judge` sets the label; the default is `pilot`.
- `pnpm db:reset-live` deletes only `practice` and `judge` sessions. The original definition (delete everything not seeded) would erase the pilot data that our findings rest on.

## A4. Session composition

- Sets with 16 or more tasks: 12 per session, shuffled, exactly 4 of them with wrong AI advice.
- Sets with fewer: every task, shuffled, keeping the same share of wrong advice where possible.
- `judge-demo` (3 tasks): fixed `position` order, explanation always shown, wrong advice on task 2.
- No control questions. The first answer is the human-alone baseline.

## A5. Demo-day steps (replace the three in index.md)

1. Never run `pnpm db:reset-live` against production without checking it only deletes `practice` and `judge`.
2. Open `/live` 10 minutes before the pitch to warm the database and server.
3. No deploys during pilot waves (23:00–01:00, 07:00–09:00) or while judges take the test.

## A6. Process

Features 3, 4, 5, 7, 9 and 11 are decided in `docs/plan/team-plan.md`; go straight to `/develop`. Run `/check verify` at the 22:00 checkpoint and the 07:00 freeze, not after every feature.
