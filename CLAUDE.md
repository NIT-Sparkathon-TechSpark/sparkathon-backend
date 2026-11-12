# Centaur Test: rules for every Claude Code session

This repo is the whole hackathon app (the name says "backend", but it holds everything).
Read these before changing anything.

## Sources of truth

| What | Where |
|---|---|
| Stack and architecture | `docs/specs/0001-stack-architecture/index.md` plus its `amendments.md` (amendments win) |
| Team plan: owners, timeline, data model, metrics, task format | `docs/plan/team-plan.md` |
| The brief | `PROBLEM_STATEMENT.md` |
| Feature list | `docs/scope/scope.md` (features 3, 4, 5, 7, 9 and 11 are already decided in the team plan: go straight to `/develop`, no `/architect`) |

## Stack (no additions without Jay's yes in the team channel)

Next.js 16 (App Router, Server Components, Server Actions), TypeScript strict, pnpm, Neon Postgres through Drizzle (`neon-http`), Zod, Tailwind 4, shadcn/ui, Recharts via the shadcn chart components, Vercel. No Lovable, no Supabase, no other backend.

Skills installed in `.claude/skills/`: `shadcn`, `neon-postgres`, `neon-drizzle`, `vercel-react-best-practices`, plus the workflow skills (`develop`, `check`, `debug`, `document`, `audit`, `scope`, `architect`, `sync`).

## Hard rules

1. The app never calls an AI service, at build time or at run time. AI advice comes from `data/tasks/*.json`.
2. The correct answer and the AI advice for a task never reach the browser before the participant's first answer for that task is stored. That covers page content, Server Action return values and props passed to Client Components.
3. Every Server Action validates its input with Zod and reads the session from the cookie, never from a form value.
4. Results queries return aggregates only. One person's rows appear only in their own report and the researcher area.
5. No database write during a page render.
6. Pilot data is never deleted. Reset scripts may delete only sessions labelled `practice` or `judge`.
7. Tasks are updated by their stable `id`. Once anyone has answered, never delete and reinsert tasks.

## Who owns which folder

| Owner | Folders |
|---|---|
| P1: participant flow (Jay leads the scaffold) | `src/app/(participant)/`, `src/actions/`, `src/lib/session.ts` |
| P2: data, metrics, analysis | `src/db/` (schema, queries), `scripts/`, `drizzle/`, `src/lib/metrics.ts` |
| P3: results screens and design | `src/app/results/`, `src/app/live/`, `src/components/`, theme |
| P4: task content | `data/tasks/*.json` only |

Changing someone else's folder, `package.json`, `next.config.*` or the root layout: say so in the channel first.

## Git and deploys

- Pull before you start. One short branch per task (`p1/two-stage-flow`).
- Run `pnpm build` locally before every push. Merge to `main` yourself once the Vercel preview for your branch loads.
- `main` deploys to production automatically and must work at all times.
- No merges to `main` during a pilot wave (23:00–01:00 and 07:00–09:00) or the live demo.
- Schema changes only by P2: `drizzle-kit generate`, commit the SQL, `pnpm db:migrate` on the development branch, then production. Never `drizzle-kit push`.
- `.env.local` points at the Neon `development` branch and is never committed. Only Jay sets production values in Vercel.
