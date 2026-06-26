# Stealth-Assessment Model

How Eldoria teaches and measures without interrupting play. Based on the design guide's
**evidence-centered design** recommendation: in-game tasks should produce performance evidence
without intrusive tests.

## The mapping workflow

Every educational quest is authored along this chain:

```
Alberta topic/outcome
  → Player fantasy            (why the child cares)
  → Quest fiction             (the story wrapper)
  → Core mechanic             (the verb they perform)
  → Observable action         (the specific tappable choice that produces evidence)
  → Stealth evidence signal   (logged: attempts, choices, correctness, efficiency)
  → Adaptive feedback         (non-punitive: nudge, retry, hint, partial credit)
  → Mastery unlock / support  (cosmetic, codex, town repair, or extra scaffolding)
```

The child should **not** be asked "What is 20 − 13?" unless explicit assessment is the intent.
Instead they *make change for a customer*, and the game infers subtraction fluency from how
they assemble the coins, how many attempts they take, and whether they reach for the
fewest-coins solution.

## Math-first, expand-later architecture

We commit to math content now but build so other subjects slot in without rework:

- Every quest record carries a **`subject`** tag (`"math"` today; `"science"`, `"social"`,
  `"literacy"` later) and a **`competency`** id.
- The evidence log is subject-agnostic: `{ quest, subject, competency, signal, value, t }`.
- The quest state machine (`src/systems/quests.js`) and the evidence log do not hard-code math;
  a future science quest ("pack supplies for the climate caravan") emits evidence the same way.

## The five competencies we instrument first (all Gr2/Gr5 math)

| Competency id | What it measures | First quest |
|---------------|------------------|-------------|
| `money-change` | counting to a target / making change (subtraction, decomposition) | Market Day at Sunmere (M1) |
| `estimation` | rounding, "about how much" | (combat bonus / future market) |
| `measurement` | length, comparing, fewest-units | The Broken Bridge (future) |
| `grouping` | multiplication as equal groups | farm harvest bonus / future |
| `comparison` | comparing quantities / values | future market haggling |

## Profile scaling

The same fiction is reachable by both readers; only the cognitive load changes (the guide's
"same story world, layered difficulty" — better than two unrelated games).

- **`mage` (≈ Gr2, 6–8):** fewer variables, totals ≤ 20, visual scaffolds, read-aloud-ready
  prompts, exact-count interactions. *Market example:* "Tap coins to pay **12**."
- **`adventurer` (≈ Gr5, 9–12):** multi-step, computing the value first, efficiency rewarded.
  *Market example:* "The basket costs **15**, the customer pays **20** — give the change," and
  the fewest-coins answer earns a small bonus.

## Non-punitive feedback (the invariant)

- A wrong action never ends the interaction or loses progress.
- Feedback states the gap plainly ("That's 14 — they need 12") and invites a retry.
- After repeated misses, a gentle **"Show me"** assist completes the round and logs the
  assistance (`correct:false, assisted:true`) so the report stays honest without punishing.

## What the evidence log feeds (later milestones)

- **Adaptive difficulty** (M5+): nudge round parameters toward the child's edge.
- **Parent/teacher learning summary** (M2 export, M6 polish): per-competency mastery, attempt
  trends, and assisted-vs-independent ratio — built from `player.evidence`, never from
  personal data (COPPA-aware: no names, no free text, no network).
