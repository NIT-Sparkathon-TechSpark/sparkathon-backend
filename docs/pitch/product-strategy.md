# From hackathon demo to product: selling the Centaur Test (with a KPMG lens)

Status: draft for the team, 12 Nov 2026. Facts about regulation and KPMG are cited at the end. Anything marked *hypothesis* is ours to test, not a fact.

## 1. What the platform does today

| Piece | What it does | Where |
|---|---|---|
| Two-stage test | A person answers alone with a confidence rating, then sees the AI's advice and gives a final answer and confidence. Stage order and "advice only after the first answer is stored" are enforced on the server. | `/s/<set>`, `src/actions/session.ts` |
| Recorded advice | The AI's answer, confidence and explanation are recorded once per question, so everyone sees identical advice and "AI alone" is fixed. About a third of advice is wrong, 4 of the 12 questions each person sees, spread so the wrong ones can't be spotted by position, tone or confidence. | `data/tasks/*.json` |
| Task sets as data | Any organisation's cases can be a set: a JSON file checked by a schema and loaded with one command. `acme` (a refund policy) already shows a company's own rules as a test. | `pnpm tasks:check`, `pnpm db:seed` |
| Measurement | Humans alone, AI alone, humans + AI, centaur gain, over-reliance, under-reliance, harmful and helpful switches, confidence shift, "wrong and surer", calibration, with session-level bootstrap intervals. | `src/lib/metrics.ts` |
| Results | Three-way comparison and the reliance grid; "helps or hurts" splits by AI right/wrong, explanation shown, difficulty, category, set, prior confidence and expertise, with "too little data" below 10 answers; confidence analysis; a live projector view. Aggregates only. | `/results`, `/live` |
| Personal report | Each person sees their own three scores, how they used the AI, and the questions where they followed wrong advice or rejected good advice. | end of `/s/<set>` |
| Data controls | Session labels (`pilot`, `practice`, `judge`, `seeded`), reset scripts that can never delete pilot data, CSV export. | `scripts/` |

Not built yet: task upload screen, organisations and sign-in, team-level dashboards, significance tests, live advice from a client's own model.

## 2. The real-world problem

Organisations are putting AI suggestions in front of staff: draft audit findings, tax positions, invoice coding, KYC and AML alerts, credit memos, claims triage, contract review. They measure the AI (benchmarks, model evals) and sometimes the staff (training completion). Almost nobody measures **the human-and-AI system**: when the AI is wrong, do people catch it, or do they sign off faster and more confidently?

That gap is now a compliance question, not only a quality one:

- **EU AI Act, Article 14(4)(b):** high-risk AI must be provided so that the people overseeing it can "remain aware of the possible tendency of automatically relying or over-relying" on its output, which the Act calls *automation bias*. Over-reliance is named in the law, and our platform measures it directly.
- **Timing:** the Digital Omnibus (in force since 27 July 2026) moved the stand-alone high-risk obligations (Annex III: credit, employment, education and similar) to **2 December 2027**. Firms have about a year to build oversight that works and the evidence to show it. AI literacy duties (Article 4) already apply.
- **Frameworks firms already use** (NIST AI RMF "Measure", ISO/IEC 42001) ask for evidence that controls work, and "a human reviews it" is the most common AI control there is.

**One-line problem:** *"Human in the loop" is the control everyone relies on, and nobody tests.*

## 3. Positioning

**For** risk, compliance and AI-governance leaders deploying AI that staff act on, **the Centaur Test is** a reliance assessment that **proves whether human oversight catches AI mistakes**, by running staff through their own real cases with controlled, known-wrong AI advice. **Unlike** model benchmarks (which test the AI alone) or AI training (which tests knowledge), it measures behaviour: followed, ignored, or followed too readily.

The analogy buyers already know: **a phishing simulation, but for AI advice.** Security teams don't ask staff "would you click a bad link?"; they send a safe fake and measure. We seed known AI errors into realistic cases and measure who catches them.

## 4. Why it fits KPMG

KPMG already sells trust in AI:

- **Trusted AI framework** (3 principles, 10 pillars) and an illustrative risk-and-controls guide built on it.
- **Trusted AI Assurance**, launched May 2026, an evidence-based assessment of governance, compliance, security and operational readiness, mapped to the EU AI Act, NIST AI RMF and ISO 42001.
- **Independent assurance over AI governance and controls** (KPMG UK), using controls-assurance and SOC principles.

What those engagements need, and what is hardest to produce, is **evidence that a human-oversight control operates effectively**. Documents show the control exists; our test shows whether it works:

| KPMG engagement step | What the Centaur Test adds |
|---|---|
| Control design review ("a reviewer approves every AI output") | A test of operating effectiveness: the reviewer's catch rate on seeded AI errors |
| Risk assessment | Where reliance fails: which teams, case types, difficulty, advice styles |
| Remediation advice | A/B evidence: does showing confidence, hiding the answer until the person commits, or adding an explanation reduce over-reliance? |
| Ongoing monitoring | The same test each quarter, with the trend as audit evidence |

Three ways KPMG could use it (*hypotheses*, ordered by ease):

1. **Inside its own practice.** Before rolling an AI assistant out to an audit or tax team, run the test on real (anonymised) past cases. Result: a go/no-go plus the screen design that keeps reviewers sharp.
2. **As a module of AI assurance engagements.** A fixed-scope "reliance assessment" for one client workflow, ending in an evidence pack for the audit committee or regulator.
3. **As a managed, recurring service.** Quarterly re-tests across a client's AI-assisted workflows, benchmarked across clients (anonymised): "your claims team catches 62% of seeded AI errors; peers in insurance average X".

## 5. How it works live, in an office

A worked example: a bank's KYC team uses an AI that suggests "clear" or "escalate" on alerts.

**Week 1, design (KPMG + client risk team).**
- Pick one workflow and the decision people make.
- Pull 40 to 60 past cases with a known correct outcome.
- Record the client's own AI tool's suggestion on each (the platform never calls the AI live, exactly as today).
- Choose where the AI is wrong: its real mistakes first, then seeded ones, about a third, spread so they can't be spotted (what we already enforce for P4's sets).

**Week 2, run.**
- Staff get a link: 12 cases, about 10 minutes, in a training slot or as a Teams/LMS task.
- Pseudonymous: a nickname or an HR-system ID that never appears in results.
- The works council or employee reps approve the design up front: the purpose is testing the control, not grading individuals.
- Every person gets their own report straight away, which doubles as AI-literacy training (Article 4).

**Week 3, results.**
- Dashboards by team, case type and advice style, showing aggregates only, with a minimum group size so no one is identifiable.
- Headline numbers for the control owner:
  - **AI-error catch rate:** when the AI was wrong, the share of final answers that were still right.
  - **Over-reliance:** of the people who first disagreed with wrong advice, the share who switched to it.
  - **Wrong and surer:** the share of answers that ended wrong with higher confidence than before the advice.
  - **Centaur gain:** whether human plus AI beats the better of the two.
- Breakdowns show where it fails: "on cross-border alerts with an explanation shown, over-reliance doubles".

**Week 4, act and evidence.**
- Change the control: show the AI's confidence, make reviewers commit before they see the AI, route hard case types to two reviewers, retrain.
- Re-test the changed setup on a fresh set.
- The before/after numbers, with n and intervals, go into the assurance file.

**Then quarterly.**
- Same workflow, new cases, trend line.
- A drop in catch rate after a model update or a staffing change is an early warning.

Later (*hypothesis*), an in-the-flow mode: occasionally insert a known-wrong suggestion into the live tool, the way some banks plant test transactions, then measure catch rates in real work. This needs strong consent and governance, and it comes after the assessment product proves itself.

## 6. Business model (*hypotheses*)

| Offer | Scope | Who pays | Shape |
|---|---|---|---|
| Reliance assessment | One workflow, 4 weeks, up to ~200 staff, evidence pack | Client CRO, Head of AI governance, Chief Audit Executive | Fixed-fee engagement, delivered by KPMG on the platform |
| Assurance subscription | Quarterly re-tests, several workflows, trend dashboard, peer benchmark | Same, renewed yearly | Platform licence plus KPMG service hours |
| Internal enablement | KPMG's own teams before and after AI rollouts | KPMG (internal) | Cost of running the platform |

The platform makes delivery repeatable. The case design and the opinion stay with the people who sell assurance.

**Buyers:** heads of AI governance and model risk, chief risk officers, chief audit executives. **Champions:** AI product owners who want proof their tool is used safely. **Users:** the staff who take the test (10 minutes, a useful personal report) and the analysts reading the results.

## 7. What it would take to be office-ready

From what exists today, in order of what blocks a first paid pilot:

1. **Case authoring and upload** for client sets, with the balance checks we already run on P4's files built in (wrong-advice share, answer-position spread, explanation length, confidence parity).
2. **Organisations, sign-in (SSO) and cohorts.** Today there is one shared space and a nickname. Needed: per-client separation, team tags, and a minimum group size before any number shows.
3. **Evidence pack export:** a PDF or report with method, n, intervals and before/after, in the language of a controls test.
4. **Significance tests and pre-registration** of what is compared (deferred in our scope; required for an opinion).
5. **Advice-style experiments** beyond explanation on/off: showing confidence, committing before seeing the AI, a second reviewer.
6. **Integrations:** an LMS link (SCORM/xAPI), Teams or Slack invites, and an import of the client's own AI outputs.
7. **Security and data residency:** EU hosting (we already run in Frankfurt), ISO 27001 and SOC 2 for the hosted service, a DPIA template.

## 8. Risks and honest limits

- **Test behaviour isn't work behaviour.** People may be more careful when they know it's a test, so these numbers are a lower bound on real over-reliance. Say so; the in-the-flow mode is the long-term answer.
- **Surveillance worries.** Aggregates only, a minimum group size, employee-rep approval, and a personal report that benefits the person. Never rank individuals.
- **Seeded errors.** Debrief everyone afterwards: "some advice was deliberately wrong".
- **Small samples.** The hackathon pilot is directional evidence from about 15 people. A client assessment needs a planned sample size per comparison.

## 9. How to say it in the pitch

- **Slide 5 (platform):** "Every firm says there's a human in the loop. We test whether the loop works. Same engine, your cases: here's a company's refund policy; tomorrow it's a bank's KYC alerts."
- **Slide 6 (next steps):** "The EU AI Act names automation bias in Article 14 and gives high-risk systems until December 2027. That's a year to prove oversight works. We're the test, and assurance providers like KPMG are the natural channel."
- **Closing line:** "*Human in the loop* is the control everyone relies on, and nobody tests. Now you can."

## Sources

- [AI Act Service Desk, Article 14 (European Commission)](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14)
- [IAPP: EU AI Act shines light on human oversight needs](https://iapp.org/news/a/eu-ai-act-shines-light-on-human-oversight-needs)
- [Orrick: Digital Omnibus finalizes 8 compliance changes (July 2026)](https://www.orrick.com/en/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes)
- [artificialintelligenceact.eu: Digital Omnibus on AI](https://artificialintelligenceact.eu/ai-act-explorer/digital-omnibus/)
- [Technology.org: AI Act deadlines after the Digital Omnibus](https://www.technology.org/2026/10/13/eu-ai-act-deadlines-after-the-digital-omnibus-what-applies-from-december-2026-to-august-2028/)
- [KPMG Trusted AI framework (PDF, 2026)](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/2026/06/kpmg-trusted-ai-framework.pdf.coredownload.inline.pdf)
- [KPMG launches Trusted AI Centre of Excellence, Singapore (May 2026)](https://kpmg.com/sg/en/media/press-releases/2026/05/kpmg-launches-trusted-ai-centre-of-excellence-to-strengthen-singapore-position-as-a-globally-trusted-ai-hub.html)
- [KPMG UK: Independent confidence in how you govern AI](https://kpmg.com/uk/en/insights/audit/independent-confidence-in-how-you-govern-ai.html)
- [KPMG: Deploying trustworthy AI, risk and controls guide (PDF)](https://assets.kpmg.com/content/dam/kpmgsites/uk/pdf/2026/04/deploying-trustworthy-ai-risk-and-controls-guide.pdf.coredownload.inline.pdf)

Regulatory dates come from secondary commentary on Regulation (EU) 2026/1744; check the Official Journal text before quoting them on stage.
