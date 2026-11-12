# Centaur Test: team plan

Built on spec 0001 plus `docs/specs/0001-stack-architecture/amendments.md`. Clock times assume we started Thursday 13:00 and submit Friday 13:00.

## What exists at the end

- One live app on Vercel: participant flow on phones (via QR code), results screens, a `/live` projector view, a personal report.
- Task sets: `logic` (20), `facts` (20), `acme` (10), `judge-demo` (3).
- Real pilot data from at least 15 completed `pilot` sessions, plus a few on `acme`.
- `findings.md` with every number, its n and its interval; a 6-slide deck; a 2-minute backup video.

## Owners

| Person | Owns | Scope features |
|---|---|---|
| P1 (Jay leads the scaffold) | Scaffold, Neon and Vercel setup, participant flow, Server Actions, personal report, judge flow | 1, 6, 12 |
| P2 | Drizzle schema, loader and reset scripts, results queries, `metrics.ts`, seeded sessions, analysis, export | 3, 8, 13 |
| P3 | Theme, results screens, breakdowns, confidence charts, `/live`, backup video | 4, 7, 9, 10 |
| P4 | Task content and AI advice, verification with Gemini, pilot, deck, Q&A | 5 |

## Data model (P2, target 17:00)

- **tasks**: `id` (text, stable, from JSON), `set`, `position`, `category`, `difficulty` (1–3), `prompt`, `context` (nullable), `options` (4 strings), `correct_index`, `advice_index`, `advice_confidence` (0–100, nullable), `advice_explanation`, `advice_source` (`recorded` or `seeded`), `advice_model`, `verified_by`.
- **sessions**: `id` (uuid, in the cookie), `set`, `nickname`, `label` (`pilot`, `practice`, `judge`, `seeded`), `self_rated_expertise` (1–5, nullable), `created_at`, `completed_at`.
- **responses**: one row per session and task (unique on both): `position`, `rationale_shown`, `first_answer`, `first_confidence` (25–100), `final_answer`, `final_confidence`, `ms_first`, `ms_final`, `first_at`, `final_at`.

## Task file format (P4 writes, P2 loads)

One file per set: `data/tasks/<set>.json`.

```json
{
  "set": "logic",
  "name": "Logic & Probability",
  "tasks": [
    {
      "id": "logic-01",
      "position": 1,
      "category": "probability",
      "difficulty": 3,
      "prompt": "A disease affects 1 in 1000 people. A test for it is 99% accurate. A random person tests positive. How likely is it they have the disease?",
      "context": null,
      "options": ["About 99%", "About 50%", "About 9%", "About 1%"],
      "correct_index": 2,
      "advice": {
        "index": 0,
        "confidence": 90,
        "explanation": "The test is 99% accurate, so a positive result means a 99% chance the person has the disease.",
        "source": "seeded",
        "model": null
      },
      "verified_by": "gemini+human"
    }
  ]
}
```

Rules for content: four options, exactly one correct. Wrong and right explanations look alike (same length, same confident tone, 1–2 sentences). Prefer real model errors (`recorded`); seed only where no model was wrong. About a third of tasks per set have wrong advice. Categories: `probability`, `traps`, `comparison`, `deduction` (logic); `geography`, `history` (facts); `refunds` (acme).

## Metrics (P2 in `src/lib/metrics.ts`, used by every screen)

Reliance is measured on disagreement trials: the first answer differs from the AI's.

| Metric | Definition |
|---|---|
| Human alone | Share of first answers that are correct |
| AI alone | Share of the same tasks where the advice is correct |
| Human + AI | Share of final answers that are correct |
| Centaur gain | Human + AI minus the better of the two, in points |
| Over-reliance | AI wrong, disagreement: share switching to the AI's answer |
| Under-reliance | AI right, disagreement: share keeping their own answer |
| Harmful switch | First answer correct: share ending wrong |
| Helpful switch | First answer wrong: share ending correct |
| Confidence shift | Final minus first confidence, split by AI right or wrong |
| Wrong and surer | Share of responses that end wrong with higher confidence than before |

Slices: AI right or wrong, explanation shown or not, difficulty, category, set (logic vs facts), self-rated expertise. Every slice shows n and says "too little data" below 10 responses.

## Timeline

| Clock | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 15:30–16:30 | Scaffold, Neon, Vercel, live URL | Schema draft, loader skeleton | Theme in shadcn, results layout on mock data | Logic tasks in JSON, Gemini answers |
| 16:30–19:00 | Two-stage flow with cookie session | Migrations, loader, `metrics.ts` with tests, record Claude's answers | Three-way comparison and reliance grid on real queries | Facts tasks, resolve disagreements, choose advice |
| 19:00–22:00 | Personal report, judge flow, error states | Seeded sessions, reset script fix, imports of all sets | Breakdowns, confidence charts, `/live` | Acme policy and tasks, judge-demo, recruit 20 people |
| 22:00 | **Checkpoint, all four:** each completes a session on a phone; it shows in results. `/check verify` | | | |
| 23:00–01:00 | Fix bugs (no merges to main) | Watch data quality | Polish on branches | **Pilot wave 1**, 10 sessions |
| 01:00–03:00 | Report wording | Provisional findings by 02:00 | Slide template | Draft deck |
| 03:00–07:00 | Sleep 03–05, polish | Polish, sleep 05–07 | Sleep 03–05, polish | Q&A sheet, sleep 05–07 |
| 07:00 | **Feature freeze**, `/check verify` | | | |
| 07:00–09:00 | Judge link test on venue Wi-Fi | Watch wave 2 | Record backup video | **Pilot wave 2**, reach 15 + 4 on acme |
| 09:30 | | **Numbers locked in `findings.md`** | Chart screenshots | Numbers into slides |
| 10:00–11:00 | **Two timed rehearsals and Q&A drill, all four** | | | |
| 11:00–13:00 | Submission: URL, repo, video, deck | | | |

## Pilot

Target 15 completed `pilot` sessions over two waves, alternating `logic` and `facts`, plus 4 on `acme` in wave 2. Brief, same words each time: "Answer honestly, no searching. AI advice will sometimes be wrong. It takes about 8 minutes." Use a nickname, never a real name. Team members use `?label=practice`; judges use `/s/judge-demo?label=judge`.

## Pitch

Six slides: hook (one real number), problem, live demo (QR to `judge-demo`), results, platform (Acme set, the Nordbank use case), next steps. Only numbers from `findings.md`. Say "directional evidence from 15 people", never "proves".
