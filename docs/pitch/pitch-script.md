# Pitch script, mapped to the judging criteria

Format (NiT Sparkathon 2026 brief): a **60-second elevator pitch** first. One judge's "yes" earns the **4-minute investor pitch**, which must show a **working demo, a live jury test and economics**. Submission deadline: **Friday 13:30**.

Jury: Benedikt Höck (Partner, Head of AI, KPMG Germany/EMA), Tom-Lucas Säger (KPMG AI Center of Excellence), Petra Vorsteher (AI.FUND, AI.HAMBURG), Prof. Dr. Christian Lüthje (TUHH, innovation marketing). Two of four judges sell AI trust and assurance for a living, so speak their language: control, evidence, oversight, automation bias.

| Criterion | Weight | What earns it |
|---|---|---|
| Innovation & Creativity | ~35% | Not a chatbot. We measure the human response to AI, with controlled wrong advice: a phishing simulation for AI advice. Pre-registered predictions. |
| Technical Execution | ~20% | Live on Vercel + Neon. Stages enforced on the server, advice never sent before the first answer, aggregates only, interval estimates. Judges use it on their own phones. |
| Design & UX | ~15% | Two clean steps on a phone, a personal report with "you followed wrong advice", a projector view that fills up live. |
| Presentation | ~20% | One number, one live moment, one business. Rehearse twice with a timer. |
| Community Engagement | 10% | LinkedIn post likes between 09:00 and 14:00 Friday (see `linkedin-post.md`). |

Numbers in `{{braces}}` come only from `findings.md`. Never round up, always say n.

---

## 60-second elevator pitch (word for word, ~150 words)

> Every company rolling out AI says the same thing: don't worry, there's a human in the loop.
>
> But nobody tests whether that human actually catches the AI's mistakes.
>
> Last night we did. {{n_sessions}} people answered questions alone, then with AI advice that was secretly wrong a third of the time. When the AI was wrong, **{{ended_on_wrong}}** of final answers went with it, and {{ai_induced_errors}} times someone switched away from an answer that was already right.
>
> That's automation bias, and since the EU AI Act it's a legal problem: Article 14 requires that people overseeing high-risk AI are aware of over-reliance.
>
> The Centaur Test is a phishing simulation for AI advice. Companies run their own cases, with known AI errors planted, and get evidence that their human oversight works, or where it fails.
>
> Give us four minutes and we'll test you.

The last line sets up the live jury test, so it doubles as the ask for a "yes".

---

## 4-minute investor pitch

### 0:00–0:30 · Problem (slide: the 2×2)
> "Human in the loop" is the most common AI control in the world, and the least tested. Accuracy dashboards measure the AI. Training measures knowledge. Nobody measures behaviour: when the AI is wrong, do people catch it, or follow it, and feel surer?

### 0:30–1:40 · Live jury test (projector: `/live?set=judge-demo`)
1. "Please take out your phones." The QR code is on screen (and printed on a card as backup).
2. Judges answer 3 questions alone, then see the AI's advice. Question 2's advice is wrong (Sydney as Australia's capital) and comes with a confident explanation.
3. While they answer, narrate: "First you commit, with a confidence. Only then do you see the AI. The server never sends the advice early."
4. The panel updates every 5 seconds: "When the AI was wrong, *k of n* of your final answers went with it."
5. Each judge's phone shows their own report. If anyone switched to Sydney: "That's automation bias, live, in a room of AI experts." If nobody did: "Good! You caught it. Now let's see what happened with {{n_sessions}} people on harder questions."

### 1:40–2:30 · Results (slides: three-way chart, AI-induced errors, predictions card)
- Humans alone {{human_alone}}, AI alone {{ai_alone}}, humans + AI {{human_ai}}: centaur gain {{centaur_gain}} pts ({{gain_ci}}).
- AI-induced errors: {{ai_induced_errors}} times a right answer was switched to the AI's wrong one.
- Our predictions, written down before the pilot: read out each verdict as it stands (supported, no clear difference yet, or too little data). Honesty about the one that failed is worth more than spin.

### 2:30–3:30 · Product and economics (slide: how it runs in an office)
- **Who buys:** heads of AI governance, CROs, chief audit executives deploying AI that staff act on: audit, tax, KYC, claims, credit.
- **Why now:** the AI Act's Article 14 names automation bias. Stand-alone high-risk obligations apply from 2 December 2027, so firms have a year to show their oversight works.
- **How it runs:** 40–60 of the client's own past cases, the client's own AI outputs recorded, known errors planted, a 10-minute link for staff, results by team and case type, a re-test after fixing the process, then quarterly.
- **Economics (illustrative, to validate):**
  - A *reliance assessment* is a fixed-fee engagement for one workflow over 4 weeks, delivered by an assurance team on our platform.
  - Platform cost per assessment is near zero (serverless, one database). The cost is case design, about 3–5 consultant days.
  - The recurring revenue is a quarterly re-test subscription per workflow.
  - **Channel:** assurance providers, because they already sell AI trust engagements and need operating-effectiveness evidence for the human-oversight control.
- **Moat:** method and data. Balanced case design, pre-registered comparisons, and a cross-client benchmark of catch rates that grows with every assessment.

### 3:30–4:00 · Close
> Same engine, any company's cases: today a refund policy, tomorrow a bank's KYC alerts. Human in the loop is the control everyone relies on, and nobody tests. Now you can.

---

## Likely questions (60 seconds of buffer)
See `qa-sheet.md`. The three to rehearse:
1. "Is this significant?" "Directional evidence from {{n_sessions}} people. We show 95% intervals and say 'too little data' below 10 answers."
2. "Couldn't people spot the wrong advice?" "We checked: correct answers and wrong advice are spread evenly over A–D, with the same confidence and explanation length."
3. "Why not use a live model?" "Control. Everyone sees identical advice, and the AI's errors are known in advance. A client's own model outputs are recorded the same way."

## Rehearsal checklist
- [ ] Two timed run-throughs (60 s and 4 min) at 10:00 Friday.
- [ ] `/live?set=judge-demo` open on the projector laptop 10 minutes before. The QR card is printed. Venue Wi-Fi is tested at 07:00.
- [ ] Backup video ready if the network fails.
- [ ] Reset judge sessions *only* with `pnpm db:reset-live` (dry run first) if you need a clean jury panel. It never touches pilot data.
