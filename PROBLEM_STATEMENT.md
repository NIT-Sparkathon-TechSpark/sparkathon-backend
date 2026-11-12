# Problem Statement 4: The Centaur Test

## The statement

**Context**
Pairing people with AI can improve results, or it can lead people to accept wrong answers with more confidence. Most tools are not designed to tell the difference.

**The challenge**
Build a platform that compares humans alone, AI alone and humans working with AI, and shows when collaboration helps and when it hurts.

**Core concept**
Measure reliance as well as performance: when AI advice is followed, ignored, or followed too readily.

**Guiding question**
When does AI assistance make people worse?

## What it means

A "centaur" is a human and a computer working as one team. The term comes from chess.

People often assume that a human working with AI does better than either one alone. The statement says this is not always true. Sometimes the AI helps. Sometimes people accept its wrong answers and feel more sure about them. Today, most tools cannot tell which of the two is happening.

The challenge is to build a platform that can tell.

## What the platform must do

### 1. Compare three conditions

The same tasks are done three ways, and the results are compared:

| Condition | Who answers |
|---|---|
| Humans alone | A person with no AI help |
| AI alone | The AI with no person involved |
| Humans working with AI | A person who has the AI's advice |

### 2. Show when collaboration helps and when it hurts

One overall score is not enough. The platform must show the situations in which working with AI improves results and the situations in which it makes them worse.

### 3. Measure reliance as well as performance

Performance is how many answers are correct. Reliance is how people use the AI's advice. The statement names three behaviours:

| Behaviour | Meaning |
|---|---|
| Followed | The person goes with the AI's advice |
| Ignored | The person does not go with the AI's advice |
| Followed too readily | The person goes with the AI's advice when it is wrong |

Whether each behaviour is good or bad depends on whether the AI was right:

| | AI was right | AI was wrong |
|---|---|---|
| **Person followed the AI** | Good: the AI helped | Bad: followed too readily |
| **Person ignored the AI** | Bad: good advice was lost | Good: the person caught the mistake |

## The guiding question

*When does AI assistance make people worse?*

This is the question the platform has to answer. From the statement, "worse" covers two things:

- **Wrong answers:** a person accepts a wrong answer from the AI.
- **More confidence:** a person feels more sure of an answer that is wrong.

The word "when" matters. The platform should point to the conditions under which this happens, not only report that it happens.
