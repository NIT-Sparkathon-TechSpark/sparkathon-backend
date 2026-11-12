# Organization accounts

Decided 2026-11-12, 20:30. Amends scope ("No accounts"): participants still need no account; organizations get one shared passcode each.

## What it does

- An organization signs up at `/org` with a name and a passcode. Its ID (`nordbank-risk`) is made from the name.
- Signed in, it uploads its own questions as a CSV or JSON file at `/org/<id>` and gets a **private set**.
- Each private set has a participant link `/t/<share token>`. The token is 22 random characters: the set can't be found, guessed or listed without it. Participants enter a nickname, as on the public sets.
- `/org/<id>/results` shows that organization's results only: its own sets, finished `pilot` sessions, aggregates, plus plain-language recommendations. "Try it yourself" runs use `?label=practice` and are left out.
- The public sets (logic, facts, acme, judge-demo) are unchanged at `/s/<set>`. Public `/results`, `/live` and `pnpm db:export` read only the public sets, never an organization's.

## Data

- `organizations`: `id`, `slug` (unique), `name`, `passcode_hash` (scrypt), `created_at`.
- `task_sets`: `slug` (`o-` plus 10 random characters, primary key), `org_id`, `name`, `description`, `share_token` (unique), `created_at`.
- Uploaded tasks go into `tasks` with `set_slug` = the private set's slug and ids `o-xxxxxxxxxx-01`, `-02`... Sessions point at it through `sessions.set_slug`, like public sets. No existing table or row changes.
- Public sets have no `task_sets` row; they stay the list in `src/lib/sets.ts`. So `tasks.set_slug` has no foreign key to `task_sets`.

## Sign-in

Built like the researcher passcode in spec 0001: no auth library. Passcodes are stored as scrypt hashes and checked in constant time, also when the ID doesn't exist. Sign-in sets an HttpOnly cookie, `centaur_org`, naming one organization, signed with HMAC-SHA256 and valid for 12 hours. Secret: `ORG_COOKIE_SECRET`, or `RESEARCHER_COOKIE_SECRET` if that's the only one set. Every organization page and action takes the organization from the cookie, never from a form or link, and checks it matches the ID in the address.

Known limits for the hackathon: no rate limit on sign-in attempts, one shared passcode per organization, no passcode reset, no deleting sets.

## Upload format

CSV (comma, semicolon or tab, as Excel exports it) with a header row, or JSON (a list with the same fields, or a task file in the repo's format).

| Column | Required | Notes |
|---|---|---|
| `prompt` | yes | The case, up to 2,000 characters |
| `option_a` … `option_d` | yes | Four different options |
| `correct` | yes | A, B, C or D |
| `ai_answer` | yes | What the organization's AI answered, A–D |
| `ai_explanation` | yes | The AI's reasoning, shown on half the questions |
| `context` | no | Policy text or background, up to 6,000 characters |
| `ai_confidence` | no | 0–100 |
| `category` | no | Used for the "by category" breakdown; default `general` |
| `difficulty` | no | 1–3; default 2 |
| `ai_source` | no | `recorded` (the AI's real answer, default) or `seeded` |
| `ai_model` | no | Which model gave the answer |

Samples linked from the dashboard: `public/samples/centaur-cases-template.csv` (blank template) and `public/samples/kyc-alerts-demo.csv` (12 fictional bank KYC alerts, AI wrong on 4, balanced over A–D; for the live demo). `pnpm test:org-upload` checks that both upload cleanly.

3–200 questions, at least one where the AI is wrong. Nothing is saved if any row has a problem; the person gets the row numbers. Warnings (saved anyway) when the AI is wrong on fewer than 20% or more than 50%, or when most correct answers sit in one position.

## Files

| File | What |
|---|---|
| `src/db/schema.ts` | `organizations`, `task_sets` |
| `src/db/queries/orgs.ts` | Create, find, list sets with counts, create a private set, results facts, share tokens |
| `src/lib/org-auth.ts` | Passcode hashing, signed cookie, `requireOrg()` |
| `src/lib/org-schemas.ts`, `src/lib/org-upload.ts` | Form validation, CSV/JSON parsing (tested in `scripts/test-org-upload.mjs`) |
| `src/actions/org.ts` | Create, sign in, sign out, upload |
| `src/app/org/` | `/org`, `/org/[slug]`, `/org/[slug]/results` |
| `src/app/(participant)/t/[token]/` | Private set page; the flow is shared with `/s/[set]` in `_components/set-flow.tsx` |

## Rollout

1. `pnpm db:generate` creates the migration for the two new tables. Review it: it must only `CREATE TABLE` (plus indexes and constraints) and change nothing else. Commit it.
2. `pnpm db:migrate` on development, then production, before merging.
3. Set `ORG_COOKIE_SECRET` in Vercel (production and preview).
4. Merge outside pilot waves (not 23:00–01:00 or 07:00–09:00).
