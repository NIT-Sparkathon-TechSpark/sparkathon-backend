# Q&A sheet (P4)

Short, honest answers for the judges' questions. Numbers only from `findings.md`. If you do not know, say so and say how the platform would find out.

## Method

**How do you measure reliance?**
Every question is answered twice: first alone with a confidence rating, then after seeing the AI's advice. Reliance only shows when the first answer differed from the AI's, so over- and under-reliance are measured on those disagreement trials.

**Isn't "human + AI" just the same people answering twice?**
Yes, deliberately: one person and one question give both the "alone" and the "with AI" result, which removes differences between people. The trade-off is an order effect (the second answer is always the AI one); we name it as a limitation.

**Where does the AI advice come from? Is it real?**
Recorded once ahead of time, so every participant sees identical advice and "AI alone" is fixed. Where a model was genuinely wrong we kept its answer (`recorded`); where no model was wrong we wrote wrong advice in the same confident style (`seeded`). Each task file says which.

**Why not call the AI live?**
Fairness (everyone sees the same advice), cost, and a demo that cannot fail on stage. Live advice is on the roadmap.

**Couldn't people guess when the AI is wrong?**
We checked for that: correct answers and wrong advice are spread evenly over A–D, wrong and right advice state the same confidence, and their explanations are the same length and tone. About a third of advice is wrong, exactly 4 of the 12 questions each person sees.

**Why logic versus facts?**
It is our main hypothesis: on logic questions people can check the reasoning, on facts they cannot. If over-reliance is higher on facts, checkability is one condition under which AI makes people worse.

## Results

**Is this statistically significant?**
No claim of significance. With {{n_sessions}} people this is directional evidence. We show 95% bootstrap intervals that resample whole sessions, and every slice under 10 answers says "too little data" instead of a number.

**What was the most surprising result?**
{{from findings.md}}

**Did the explanation make things worse?**
Each advised question randomly showed either the answer only or the answer with its explanation (within-person). Over-reliance: {{over_explained}} with explanation vs {{over_answer_only}} without.

**Did people become more confident in wrong answers?**
{{wrong_and_surer}} of answers ended wrong with higher confidence than before the advice.

**Who were the participants?**
{{n_sessions}} pilot volunteers recruited at the venue and online, nicknames only. Not a representative sample; that is the next step.

## Platform and product

**Can someone use this for their own tasks?**
Yes: tasks are JSON files checked by a schema, loaded with one command (`pnpm db:seed`). The Acme refund-policy set shows a company's own policy as a test. An upload screen is the next step.

**What about privacy?**
No accounts and no real names. Results pages show aggregates only; one person's answers appear only in their own end-of-session report. The raw export is a script the team runs (`pnpm db:export`), not a public page. (Check before the pitch whether the passcode-protected researcher area got built; if not, don't claim it.)

**What would Nordbank do with it?**
{{one sentence from the team}}

**What's the tech stack?**
One Next.js app on Vercel with Neon Postgres. Results are computed on request from raw responses, refreshing every 5 seconds.

## Limitations to state ourselves

- Small pilot ({{n_sessions}} people), not representative.
- The AI answer always comes second (order effect).
- Seeded wrong advice is written by us, not produced by a model.
- One AI, one advice set; other models or styles may behave differently.
