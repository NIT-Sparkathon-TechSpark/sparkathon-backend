# Pitch deck outline (P4)

Six slides, about 4 minutes, per `docs/plan/team-plan.md` ("Pitch"). **The event brief changes the format:** a 60-second elevator pitch first, then the 4-minute pitch (working demo, live jury test, economics) for teams a judge says yes to. Submission is due Friday 13:30. Word-for-word scripts are in `pitch-script.md`; the LinkedIn plan is in `linkedin-post.md`. Every number comes from `findings.md` (locked 09:30 Friday) and is shown with its n. Placeholders look like `{{name}}`; do not fill them from memory or from the demo screens.

For the business and KPMG framing of slides 5 and 6 (EU AI Act Article 14, "phishing simulation for AI advice", how it runs in an office), see `docs/pitch/product-strategy.md`.

Language rules: "directional evidence from {{n_sessions}} people", never "proves" or "shows that people are". Seeded sessions never appear in a pitch number.

---

## 1. Hook

**On the slide:** one number, very large.

> When the AI was wrong, people switched to its answer **{{over_reliance}}** of the time.

Small line under it: "{{n_over}} disagreements, {{n_sessions}} people, our pilot."

**Say:** "This is what happens when you give people AI advice and the AI is wrong."

Alternative hook if it is stronger in `findings.md`: "{{wrong_and_surer}} of answers ended wrong *and* more confident than before the advice."

## 2. Problem

**On the slide:** the problem statement's 2×2 (followed / ignored × AI right / wrong), with "followed too readily" highlighted.

**Say:** "Pairing people with AI can make them better or worse, and most tools can't tell which. Accuracy alone hides it: you need to measure *reliance*."

## 3. Live demo

**On the slide:** QR code to `https://sparkathon-hazel.vercel.app/s/judge-demo?label=judge`, plus the URL in text.

**Do:** judges scan and answer 3 questions (about a minute). Question 2 has wrong advice. Switch the projector to `/live?set=judge-demo` and let the numbers fill in.

**Say:** "Every question twice: first alone with a confidence rating, then with the AI's advice. Same advice for everyone, recorded ahead of time. The app never calls an AI live."

Fallback if Wi-Fi fails: the backup video (P3).

## 4. Results

**On the slide:** the three-way bar chart (humans alone {{human_alone}}, AI alone {{ai_alone}}, humans + AI {{human_ai}}) and one "helps or hurts" finding.

**Say, in this order:**

1. "Humans with AI scored {{human_ai}}, against {{human_alone}} alone and {{ai_alone}} for the AI: a centaur gain of {{centaur_gain}} points ({{gain_ci}})."
2. "But it depends on whether people can check the reasoning. On logic questions, over-reliance was {{over_logic}}; on facts, where you can't check, it was {{over_facts}}."
3. One more slice only if it has n ≥ 10 and a clear direction (explanation shown vs answer only is the natural one: {{over_explained}} vs {{over_answer_only}}).

Show n next to every number. If an interval crosses zero, say "no clear difference".

## 5. Platform

**On the slide:** a screenshot of `/results/breakdowns` and the Acme refund-policy set.

**Say:** "This isn't one experiment, it's a platform. Any organisation can load its own tasks: here, a fictional company's refund policy. {{nordbank_use_case}}" (one sentence from the team: what Nordbank would test, e.g. advisers checking AI suggestions on loan or fraud cases).

## 6. Next steps

- Larger samples and proper significance tests (deferred today).
- Live model advice, advice styles beyond explanation on/off.
- Researcher upload for custom task sets.

**Close:** "When does AI make people worse? When it's wrong and they can't check it. Now you can measure that for your own tasks."

(Only keep that closing line if `findings.md` supports it.)

---

## Numbers to pull from findings.md

| Placeholder | Metric (from `src/lib/metrics.ts`) |
|---|---|
| `n_sessions` | completed `pilot` sessions |
| `human_alone`, `ai_alone`, `human_ai` | the three accuracies |
| `centaur_gain`, `gain_ci` | centaur gain and its 95% interval |
| `over_reliance`, `n_over` | over-reliance and its denominator |
| `wrong_and_surer` | wrong and surer |
| `over_logic`, `over_facts` | over-reliance sliced by set |
| `over_explained`, `over_answer_only` | over-reliance sliced by explanation shown |

Screenshots of the charts come from P3 at 09:30.
