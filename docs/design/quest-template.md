# Quest Template

Every quest in Eldoria must satisfy the five-part contract from the design guide. If a quest is
missing any part, it isn't ready.

## The five-part contract

1. **One fiction goal** the child cares about ("Mira's market is swamped — help her serve
   customers").
2. **One observable, evidence-producing action** (assemble coins to make change) — the
   stealth-assessment hook, *not* a quiz.
3. **One optional branch** for a different play style (serve customers in any order; take the
   fewest-coins challenge or not).
4. **One non-punitive recovery loop** (wrong total → gentle nudge → retry → optional "show me").
5. **One persistent world consequence** (the market stall stocks up and stays stocked).

A quest also yields **permanent progress** (gold, a codex/mastery tick) so the session-loop
pillar holds.

## Data shape

Runtime quest data lives in `src/data/quests/*.json` (imported by the bundle). The pure state
machine that reads it is `src/systems/quests.js`. Authored to the contract above:

```jsonc
{
  "id": "market-day",
  "title": "Market Day at Sunmere",
  "subject": "math",              // math today; science/social/literacy later
  "competency": "money-change",   // see stealth-assessment-model.md
  "giver": "mira",                // NPC id (matches maps/manifest.json)
  "fiction": "Mira's market is swamped. Help her make change for three customers.",
  "tracker": "Help 3 customers at the market",   // one plain HUD sentence
  "consequence": "marketStocked", // a flag the scene reads to change the world
  "reward": { "gold": 12 },
  "rounds": {                     // profile-scaled; one entry per customer
    "mage":       [ { "mode": "pay",    "target": 12, "coins": [1, 5] },        ... ],
    "adventurer": [ { "mode": "change", "price": 15, "paid": 20, "coins": [1,5,10,25] }, ... ]
  }
}
```

### Round modes (the make-change mechanic)

- **`pay`** — assemble coins to equal `target` (early-reader: counting/addition to a target).
- **`change`** — the customer pays `paid` for a `price` basket; assemble the difference
  (`paid − price`). Older-reader: compute the value first, then decompose efficiently.

The scene presents large coin buttons (`coins`), a running tally, undo/reset, and a confirm.
Correctness compares the tally to the target; **fewest-coins** is tracked as a bonus signal,
never a requirement.

## Evidence emitted

Each round appends to `player.evidence` (see stealth-assessment model):

```jsonc
{ "quest": "market-day", "subject": "math", "competency": "money-change",
  "signal": "round", "needed": 5, "given": 5, "attempts": 1,
  "correct": true, "assisted": false, "fewestCoins": true, "t": 1719446400000 }
```

## Authoring checklist (from the guide)

- [ ] fiction goal, mechanic goal, `subject` tag, `competency` tag
- [ ] one optional branch
- [ ] failed attempts give feedback without hard punishment
- [ ] completing the quest changes something visible in the world
- [ ] younger-reader prompt has a plain-language, read-aloud-ready summary
