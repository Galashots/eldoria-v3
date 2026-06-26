# ADR-0001 — v3 Direction after the Design-Guide review

- **Status:** Accepted
- **Date:** 2026-06-26
- **Context:** A commissioned Deep-Research design guide benchmarked successful 2D RPGs and
  recommended a single cohesive vertical slice with embedded ("stealth") assessment, two
  reading-level UX profiles, and a safety/accessibility baseline. v3 today is a polished but
  mechanically narrow farm slice whose only learning hook is an explicit math modal — which the
  guide explicitly flags as a "quiz in disguise" to avoid.

Three decisions were taken (with the project owner) to reconcile the build with the guide.

## Decision 1 — Curriculum: math-first, expand-later
Build the slice on the existing, tuned **math** question bank, but architect for breadth: every
quest carries a `subject` tag and emits subject-agnostic evidence, so science / social studies /
literacy content can be added later without reworking the quest system or the evidence log.

**Why:** the guide leaves subject choice to the owner and warns against scope sprawl. Math is
where we already have tuned, profile-aware content; tagging keeps the door open cheaply.

## Decision 2 — Assessment: hybrid (embed in quests, keep the farm bonus)
New quests use **embedded stealth assessment** (the child's action is the evidence — e.g. making
change at the market). The farm retains its **optional bonus** modal, reframed clearly as a
bonus, not a gate.

**Why:** full stealth everywhere would throw away working content for little M1 gain; keeping
only explicit modals would ignore the guide's core pedagogy. The hybrid captures both and lets
us migrate gradually.

## Decision 3 — First build: the village hub
The first build push is **Town + quest board + a Grade-2 quest chain** ("Market Day at
Sunmere"), not combat or the accessibility menus.

**Why:** the hub + quest spine is the single largest gap between the current build and the
guide's vertical slice, and it's the foundation every later milestone (quests, restoration,
Gr5 chain) hangs from.

## Consequences
- New: `src/systems/quests.js` (pure), `src/data/quests/`, `src/scenes/TownScene.js`, a market
  overlay in `UIScene`, and an evidence log on the player save (`player.evidence`).
- The "never a gate" invariant is preserved, now expressed as non-punitive embedded actions.
- Accessibility/parental work is deferred to M2 but explicitly scheduled, not dropped.
- Future sessions should treat these three decisions as settled unless new evidence overturns
  them — see [../ROADMAP.md](../ROADMAP.md).
