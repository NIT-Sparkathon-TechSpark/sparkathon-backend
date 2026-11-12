# 0001. Stack and architecture for the Centaur Test platform

**Date**: 2026-11-12
**Status**: Proposed

## Summary

The Centaur Test is built as one TypeScript app: Next.js for screens and server logic, Postgres (hosted on Neon) for data, and Vercel for the public demo link. The app never calls an AI. The AI's answers are collected once ahead of time and loaded from a file in the repo. This keeps the build small, free to run, and safe for a live demo where many people take the test at once.

## Decision

**Chosen option**: Option 1: One Next.js app on Vercel with hosted Postgres.

Build the whole product as a single Next.js 16 app (a monolith, meaning one codebase and one deploy) in TypeScript, storing data in Neon Postgres through Drizzle, styled with Tailwind CSS and shadcn/ui, deployed on Vercel.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `neon-postgres` (`neondatabase/agent-skills`, `.claude/skills/neon-postgres/`) · `neon-drizzle` (`neondatabase/ai-rules`, `.claude/skills/neon-drizzle/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Proposed stack

Exact version numbers are resolved at install time (take the current stable release of each, then pin it in the lockfile). The versions named here are what the landscape check showed in November 2026. Where a row names a framework behaviour, the row states the intent; confirm the exact API against the framework's current docs when you build.

### App

| Layer | Choice | Reason |
|---|---|---|
| Architecture pattern | Single app, one deploy (monolith) | Small team and a demo sized audience; nothing here justifies more than one moving part. |
| Language | TypeScript, strict mode | The team's chosen language, one language for screens, server and scripts. |
| Runtime | Node.js, current LTS line (24 as of writing), pinned in `.nvmrc` and `engines`. Every server function runs on the Node runtime; the edge runtime is not used | An LTS line (long term support) is what the host runs; one runtime means one set of limits to know. |
| Package manager | pnpm | Fast, strict about undeclared packages, supported by the host. |
| Framework | Next.js 16, App Router, React 19 | Screens and server logic in one project with the largest pool of examples. |
| Rendering | Server Components (pages that render on the server) read the database directly; Client Components only where the screen is interactive (the task form, the charts) | Least code, no separate API to keep in sync. |
| Caching | None. Every page that reads the database renders fresh on each request, and no page is built ahead of time from database data. The framework's opt in caching features stay off | Results must be current, and the build must not need a database. |
| Writes | Server Actions (typed server functions called from forms) | Every write goes through one. |
| Live results | A small client hook on the results screens asks the server to render the page again every 5 seconds (`router.refresh()`). It pauses while the tab is hidden and stops after about 10 minutes with no input from the viewer. It runs on results screens only, never on the personal report | One render path and no JSON contract to maintain; the idle stop protects the free database plan (runner up: a JSON endpoint polled by the client). |
| HTTP endpoints | One route handler (a plain HTTP endpoint): `GET /api/export`, the raw data download, behind the researcher check | A file download cannot come from a Server Action. Nothing else needs an endpoint. |
| Input validation | Zod at the edge of every Server Action and when loading data files | One schema gives both the runtime check and the TypeScript type (runner up: Valibot). |
| Request interception | Not used (no `proxy.ts`, the file that Next.js 16 uses in place of `middleware.ts`) | Access checks live next to the code they protect, so none can be skipped by a route added later. |

### Data

| Layer | Choice | Reason |
|---|---|---|
| Primary DB | Postgres on Neon (serverless hosted Postgres), free plan | Relational data and group by analysis; wakes fast; database only, nothing unused. |
| Environments | One Neon project with separate branches (a branch is an isolated copy of the database): `production` for the live demo, `development` for local work, and one for preview deploys | Preview links and local work must never write into the demo data. |
| Local development | Each developer points `.env.local` at the `development` branch. No local Postgres | The chosen driver speaks to Neon over HTTP and does not work against a plain local Postgres. |
| DB driver | `@neondatabase/serverless` over HTTP, through `drizzle-orm/neon-http` | Stateless requests suit serverless functions; no connection pool to exhaust (runner up: the WebSocket driver). |
| Transactions | `db.transaction()` is not available on this driver. Every write is a single SQL statement, or a `db.batch([...])` (several statements sent as one all or nothing unit) | Known limit of the HTTP driver; stated here so nobody reaches for the wrong tool. |
| Data access | Drizzle ORM; schema in TypeScript; `drizzle-orm` and `drizzle-kit` pinned to exact, matching versions | Queries read like SQL, which fits the analysis; it is still below 1.0, so no floating version range. |
| Migrations | `drizzle-kit generate` writes SQL files that are committed. `pnpm db:migrate` applies them, run by hand against the target branch before the code that needs them is merged. Never run inside the build. `drizzle.config.ts` uses the direct (unpooled) connection string. `drizzle-kit push` is not used | Reviewable history; a branch build can never change the production schema. |
| Analysis | SQL aggregate queries run at request time, kept in one query module per results screen. A screen's queries go out together in one `db.batch` | Raw responses stay the single source of truth; one round trip per render. |
| Write safety | One response row per session and task (unique on both). Storing the first answer is an insert that does nothing if the row exists. Storing the final answer is an update that only applies while the final answer is empty. The screen always works out which stage to show from the database, never from what the browser remembers. The submit button is disabled while a submit is pending | Double taps and the Back button cannot overwrite a first answer or skip a stage. |
| Timing | The browser measures how long each stage took and sends it with the submit, checked by Zod against sane bounds. The server stamps `created at` times inside actions only. No database write happens while a page renders | Link prefetch and repeat renders must not create or change data. |
| Task set and AI advice | Versioned JSON files under `data/`, checked by Zod, loaded by `pnpm db:seed`. Every task has a stable id in the file; the loader inserts or updates by that id and never deletes and inserts again. Each load is one `db.batch` | No AI service or key in the app; loading twice is safe even after responses exist. |
| Seeded sessions | Same loader, a separate file, every session row flagged as seeded. Results screens include seeded data by default, and a link parameter (`?seeded=off`) leaves it out. `pnpm db:reset-live` deletes sessions that are not seeded | One step fills the results before a demo, and practice runs can be cleared without losing the seed. |
| Scripts | Loader and reset scripts are TypeScript files in `scripts/`, run with `tsx` and an explicit env file (`tsx --env-file=.env.local …`). They import by relative path | Scripts run outside the framework, which does not load `.env.local` or resolve the `@/` alias for them. |

### Identity and access

| Layer | Choice | Reason |
|---|---|---|
| Participant identity | Anonymous session: the server creates a session row and sets its random id in a cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production only, lifetime 7 days). The cookie is set and cleared only inside Server Actions | A refresh resumes the session; nobody can act as someone else by guessing a link. |
| Stale or missing session | If the cookie points to no session, the nickname form is shown, and starting again replaces the cookie. A "start over" action does the same on request | Survives a data reset and lets several people use one laptop. |
| Researcher access | One shared passcode from a server setting, compared in constant time. On success the server sets a signed cookie: an expiry time plus an HMAC SHA 256 signature of it (a keyed checksum, made with `node:crypto`), `HttpOnly`, `SameSite=Lax`, `Secure` in production, lifetime 12 hours. One helper, `requireResearcher()`, verifies it and is called in every researcher page, in the export handler and in every researcher action | No accounts needed; raw data and nicknames are not public. |
| Auth library | None | There are no user accounts, so there is nothing for one to manage. Revisit if participant sign in leaves the deferred list. |

### Interface

| Layer | Choice | Reason |
|---|---|---|
| Styling | Tailwind CSS 4 | Utility styling, the base shadcn/ui expects. |
| Components | shadcn/ui (components copied into the repo) | Accessible by default (focus and keyboard), fully restyleable. |
| Charts | Recharts through the shadcn chart components, on the major version those components expect | Matches the UI theme with no extra work; covers bars, grouped bars and lines. |

### Operations

| Layer | Choice | Reason |
|---|---|---|
| Hosting | Vercel, free plan; deploy on push to `main`, preview link per branch | Made for the framework; zero server upkeep during the demo. |
| Regions | Frankfurt for both: Vercel functions in `fra1`, Neon in `aws-eu-central-1` | The demo is in central Europe, and every page makes database calls. |
| Lint and format | Chosen and installed by feature 2 (coding standards & tooling). The scaffold installs none | One owner for the choice; avoids a default that is replaced a day later. |
| Observability | Host function logs plus structured `console` logging of every failed Server Action | Enough to debug a demo. No error tracking service yet (see Follow-up). |
| Background jobs, cache, file storage, search | Not needed | Nothing in the scope calls for them. |

**Project layout** (the scaffold creates only what the first feature needs; this is the target shape). The scaffold uses TypeScript, Tailwind, the App Router, a `src/` directory and the `@/*` import alias.

| Path | Holds |
|---|---|
| `src/app/` | Routes: the participant flow, the results screens, the researcher area, `api/export` |
| `src/components/ui/` | shadcn/ui components |
| `src/components/` | Shared product components (charts, task card) |
| `src/db/schema.ts` | Drizzle table definitions |
| `src/db/index.ts` | The database client |
| `src/db/queries/` | Read queries, one module per results screen |
| `src/actions/` | Server Actions |
| `src/lib/` | Session and researcher cookie helpers, Zod schemas, small utilities |
| `data/` | Task set, recorded AI advice, seeded sessions (JSON) |
| `scripts/` | Loader and reset scripts |
| `drizzle/` | Generated SQL migrations |

**Configuration required**:

- `DATABASE_URL`: Neon pooled connection string, used by the app. Server only, never exposed to the browser.
- `DATABASE_URL_UNPOOLED`: Neon direct connection string, used by migrations.
- `RESEARCHER_PASSCODE`: the shared passcode for the researcher area.
- `RESEARCHER_COOKIE_SECRET`: random secret used to sign the researcher cookie.

All four live in `.env.local` on a developer machine (never committed, pointing at the `development` branch) and in the host's project settings (production values for production, the preview branch for previews). A committed `.env.example` lists the names with no values.

**Rules the build must honor**:

- The app makes no call to any AI service, at build time or at run time.
- The correct answer and the AI advice for a task never reach the browser before the participant's first answer for that task is stored. This covers page content, values returned by Server Actions, and data passed to Client Components.
- Every Server Action checks its input with Zod and reads the session from the cookie, never from a value the browser sends in the form.
- Results queries return aggregates only. Rows for one person appear in two places: the researcher area, and the participant's own report, found through their own cookie.
- No database write happens during a page render.

**Demo day steps** (they follow from the tradeoffs below):

1. Run `pnpm db:reset-live` against production to clear practice sessions.
2. Open the results screen about 10 minutes before you start. Its refresh keeps the database and the server warm.
3. Do not deploy while people are taking the test.

## Consequences

**Positive**:
- One language, one repo, one deploy. A new teammate runs `pnpm install` and `pnpm dev` and has the whole product.
- Nothing costs money, and nothing needs an AI key.
- The demo has no realtime service and no AI service that could fail on stage.
- Recorded advice is identical for every participant, so the three way comparison is fair.
- Practice data and preview deploys cannot touch the demo data.

**Negative / tradeoffs**:
- Serverless functions have cold starts, and the free database plan sleeps after a few idle minutes. The first request after a quiet period is slow.
- A deploy in the middle of a session can break the forms on phones that loaded the older version. The free plan has no protection against this.
- Every open results screen causes a full set of aggregate queries every 5 seconds. Many idle tabs, or one left open all night, eat the free plan's monthly compute. The idle stop limits this but does not remove it.
- The public results pages have no rate limit, so anyone with the link can drive database load.
- The HTTP database driver has no interactive transactions. A write that must read and then update has to be one SQL statement or one batch.
- Results are up to 5 seconds stale. Aggregates are computed on every request, which stops being cheap somewhere past tens of thousands of responses, and there is no cache to fall back on.
- Local work needs the internet, since the development database is hosted.
- Migrations are a manual step. Forgetting one before a merge breaks the deploy until it is run.
- Drizzle is still below 1.0, so an upgrade can break the code. The version stays pinned.
- A shared passcode cannot say which researcher did what, and changing it means a redeploy.
- Changing the task set or advice means editing a file and loading it again; there is no screen for it.
- The app is tied to the host's way of running Next.js. Moving to another host later is real work.

**Neutral**:
- The remote is named `sparkathon-backend`, but this repo holds the whole app.
- Free plan limits and exact versions change often; check them when you scaffold.

## Follow-up

- [ ] Fix access to the git remote (`git fetch` reports "Repository not found") before the first push, so the host can deploy from it.
- [ ] Create the Neon project (Frankfurt) with its three branches and the Vercel project (Frankfurt), and set the four settings above per environment. Needs your accounts.
- [ ] Decide which AI the recorded advice comes from, and how often it should be wrong. Owned by feature 5 (task set with recorded AI answers).
- [ ] `shadcn`, `neon-postgres`, `neon-drizzle` and `vercel-react-best-practices` are installed but not yet listed in a root `AGENTS.md` `## Agent skills` section. They apply across the project, so they belong at root level.
- [ ] MCP servers (live access for the agent to the database or the host) were not searched for. Worth a look once the Neon and Vercel accounts exist.
- [ ] Add an error tracking service and a rate limit on the results pages if the product lives on past the hackathon.
