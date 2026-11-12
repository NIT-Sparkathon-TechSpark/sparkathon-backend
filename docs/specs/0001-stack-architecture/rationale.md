# 0001. Stack and architecture: decision record

The build spec is [index.md](index.md). This file holds the reasoning, and a build does not need to read it.

## Context

The Centaur Test (see `PROBLEM_STATEMENT.md` and `docs/scope/scope.md`) is a new product with no code yet. It has two halves. One is a task flow where a person answers alone, then sees AI advice and may change the answer. The other is a set of results screens that compare humans alone, AI alone and humans with AI, and break the comparison down by condition.

The forces that shape the stack:

- **Team and language.** A small hackathon team that chose TypeScript for everything.
- **Demo shape.** Judges and participants open a public link on many phones and laptops at the same time, and the results should visibly move while they do. A failure on stage costs more than any missing feature.
- **Money.** No paid services and no AI API key.
- **Data shape.** Tasks, advice, sessions and responses relate to each other, and the product's value is grouping and counting responses along several dimensions.
- **Fairness of the experiment.** Every participant must see the same AI advice for a task, or the conditions cannot be compared.
- **No accounts.** A participant enters a nickname and starts. Raw data still should not be public.
- **Build approach.** Skateboard (from the scope header): the thinnest whole product first, so the scaffold installs only what the first release needs.

If this is not decided, every feature would pick its own tools and the first slice could not be scaffolded.

## Options considered

### Option 1: One Next.js app on Vercel with hosted Postgres

Next.js 16 with Server Actions, Drizzle on Neon Postgres, Tailwind and shadcn/ui with Recharts, deployed on Vercel. AI advice loaded from files. (basis: monolith first for a small team)

**Pros**:
- One project and one deploy; the largest ecosystem of examples and components.
- SQL group by queries map directly onto the reliance and breakdown analysis.
- Free at this size, and nothing external is called during a session.

**Cons**:
- Cold starts and a sleeping free database make the first request slow.
- No push style realtime without adding a service; results are polled.
- Server Components and Server Actions take some learning, and the app leans on one host.

### Option 2: Next.js frontend with a Python API

A TypeScript frontend, plus a Python service (for example FastAPI) that owns the data and computes the statistics with data science libraries.

**Pros**:
- Python has the strongest tools for statistics, useful if significance testing leaves the deferred list.
- A clear API boundary that other tools could call.

**Cons**:
- Two languages, two deploys and an API contract to keep in sync, for analysis that is counting and grouping.
- Goes against the team's stated language choice.

### Option 3: Backend platform with built in realtime

A React app on a backend platform such as Supabase, using its hosted Postgres, realtime channels and auth.

**Pros**:
- Results can update the instant someone answers, with no polling.
- Auth is ready if participant sign in is ever wanted.

**Cons**:
- Free projects pause after about a week idle, a real risk between building and demo day.
- Data rules move into database policies, which is one more model to learn and to get wrong.
- Carries auth and storage features this product does not use.

### Option 4: TanStack Start or React Router 7 on a container host

A newer React framework on a long running server (a container host), with Postgres alongside.

**Pros**:
- Simpler mental model than Server Components; strong end to end types.
- A long running server makes true realtime and interactive transactions easy.

**Cons**:
- Fewer examples and ready answers when the team is stuck under time pressure.
- Free container plans are thinner and can sleep; more deploy setup to own.

## Rationale

The team is small, writes TypeScript, and has to show a working product on a public link. That points to one app and one deploy, and Option 1 is the most proven way to get there. (basis: boring technology for a deadline)

The data is relational and the analysis is aggregation, so Postgres is the right store, and a data layer that stays close to SQL fits better than a heavy abstraction. Because the hosting is serverless, the database is reached over stateless HTTP so that a burst of participants cannot exhaust connections. (basis: `neon-drizzle` skill, adapter guide, HTTP adapter for serverless hosts)

Polling was chosen over realtime on purpose. An audience cannot tell 5 seconds from instant, and every added service is one more thing that can break during a demo. The same reasoning removes the AI call from the app entirely: recorded advice is cheaper, and it is also the only way to make the three conditions comparable. (basis: fixed advice across participants as an experimental control)

Option 2 would be right if the product's core were heavy statistics, and Option 3 if instant updates or accounts were required. Neither is true today. Both stay open as later moves, since the data lives in plain Postgres either way.

**Calls made by the architect** (not asked, each with its runner up):

| Call | Pick | Runner up | Why |
|---|---|---|---|
| Hosted Postgres product | Neon | Supabase, database only | Wakes quickly from idle and does not pause a project after a week. |
| Database driver | HTTP (`neon-http`) | WebSocket driver | Stateless, fits serverless; this product's writes are single statements. |
| Input validation | Zod | Valibot | Most widely used, works with Server Actions and file loading alike. |
| Live refresh | The page renders itself again on a timer | A JSON endpoint polled by the client | One render path, no second data shape to define or keep uncached. Raised by the cross check and accepted by the engineer. |
| Researcher gate | Shared passcode plus signed cookie | An auth library | No accounts exist; a library would be the only user of itself. |
| Migrations | Generated SQL files, committed, applied by hand | Applying them inside the build | A branch build must never be able to change the production schema. |
| Environments | Database branches per environment | One shared database | Preview links and local work would otherwise write into the demo data. |
| Local database | Hosted development branch | Local Postgres in a container | The HTTP driver does not speak to a plain local Postgres. |
| Access checks | Beside the code they protect | Request interception (`proxy.ts`) | A route added later cannot slip past a check it calls itself. |
| Test runner | None in the scaffold | Vitest | The project runs at the Alpha tier, which checks the real app and adds no test suite. |

## Cross check (2026-11-12)

A second model read the draft, read only. Verdict: sound for a 20 to 100 person demo, with about a dozen build decisions left open. The engineer chose to apply every recommended fix. What changed as a result: database branches per environment, manual migrations, a hosted development database, no caching of database pages, the export endpoint, the script runner and safe reloading, the seeded data switch and reset script, the cookie details, the timing source, the write safety rules, the idle stop on refresh, and the demo day steps. The JSON results endpoint was dropped in favour of the page rendering itself again.

Some of those points rest on Next.js 16 details stated from memory by the reviewer. The spec records them as intent, to be confirmed against current docs at build time.

## Landscape check (November 2026)

One round of web searches, read as search summaries, not fetched page by page. Most sources were blogs and disagreed on details, so version numbers and free plan limits should be checked again at install time.

- **Next.js**: version 16 has been stable since October 2025; 16.2.x was the latest stable line found, with 16.3 in preview.
- **Challengers**: TanStack Start and React Router 7 are the main React alternatives. Sources disagreed on whether TanStack Start had reached 1.0.
- **Hosted Postgres**: Neon and Supabase lead. Reported Neon free plan: about 0.5 GB per project with scale to zero. Supabase free projects pause after about a week idle. Turso has the most generous free plan but is SQLite, not Postgres.
- **Data access**: Prisma 7 is stable with 8 in release candidate; Drizzle is at 0.45.x with 1.0 in beta.
- **Charts**: the shadcn chart components are built on Recharts.

## References

**Project sources** (verifiable, in this repo):
- `PROBLEM_STATEMENT.md`: the three conditions and the reliance grid the data must support.
- `docs/scope/scope.md`: build approach (Skateboard), workflow tier (Alpha), and the product decisions already made.
- `.claude/skills/neon-drizzle/references/adapters.md`: HTTP adapter for serverless hosts.

**Practices & standards**:
- Monolith first for a small team.
- Boring technology for a deadline.
- Fixed advice across participants as an experimental control.
- Raw records as the single source of truth, aggregates derived on read.

**Links** (returned by the landscape search; not fetched again):
- Next.js 16 release post: https://nextjs.org/blog/next-16
- Next.js support policy: https://nextjs.org/support-policy
- TanStack Start comparison with Next.js and React Router: https://tanstack.com/start/latest/docs/framework/react/comparison
- Neon vs Supabase (Bytebase): https://www.bytebase.com/blog/neon-vs-supabase/
- Drizzle vs Prisma in 2026 (MakerKit): https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- Skill, shadcn: https://skills.sh/shadcn-ui/ui/shadcn
- Skill, neon-postgres: https://skills.sh/neondatabase/agent-skills/neon-postgres
- Skill, neon-drizzle: https://skills.sh/neondatabase/ai-rules/neon-drizzle
- Skill, vercel-react-best-practices: https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
