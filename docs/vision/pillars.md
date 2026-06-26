# Design Pillars

Five pillars distilled from the benchmark games in the design guide (Sea of Stars, Octopath
Traveler II, CrossCode, Eastward, Children of Morta, Terraria). When a feature is in doubt,
it must serve one of these — or it is cut.

## 1. Beauty from coherence, not detail
A small, consistent visual language reads as "beautiful" more reliably than maximal pixel
detail: one silhouette family, restrained palettes, lighting that supports mood **and**
affordance, animation that communicates state.
- **Today:** ✅ CC0 Ninja Adventure tiles, 2× density everywhere, y-sort, day/night tint,
  consistent particle juice. Keep all new art inside this palette and pixel density.

## 2. Low-friction, seamless traversal
The world stays legible and inviting: no battle transitions, no grid-lock, possibility
signalled *on screen* before it's explained (treasure, routes, NPC states, lighting).
- **Today:** ✅ tap-to-walk + WASD, camera follow, zoom. **Next:** seamless edge transitions
  between areas (M1 farm→town), visible landmarks and optional routes (M3).

## 3. One combat grammar, one home-base loop
Depth comes from recombining a *few* verbs, not from many shallow systems. Children of Morta's
post-mortem is explicit: too many playable characters / unfocused systems raised cost without
raising quality.
- **Today:** ✅ one home-base loop (farm). **Next:** one combat grammar wired in M3; resist
  adding a second before the first is excellent.

## 4. Every session yields permanent progress
A 10–15 minute play session must bank at least one of: world knowledge, cosmetic progress, a
codex entry, town restoration, an armor material, or a curriculum mastery marker. No long runs
that yield nothing (Children of Morta's named risk).
- **Today:** ⚠️ farming banks gold/crops. **Next:** quests bank persistent world change +
  mastery markers (M1), meta-loop restoration/codex (M5).

## 5. Learning is invisible
The child should rarely *see* a test. They repair a fence with the fewest boards, make change
at a market, pack the right supplies — and the game infers understanding from the action
(evidence-centered design). Explicit questions are reserved for clearly-optional bonuses.
- **Today:** ⚠️ farm bonus modal is an explicit quiz (kept, but framed as optional bonus).
  **Next:** quests use embedded/stealth assessment (M1 onward). See
  [../curriculum/stealth-assessment-model.md](../curriculum/stealth-assessment-model.md).

---

### Non-negotiable invariants
- **Math is never a gate.** Wrong answers only ever withhold a bonus; they never block play.
- **Two reading-level profiles** (`adventurer` ≈ Gr5, `mage` ≈ Gr2) scale real difficulty.
- **Safety by default:** no open chat/voice, ESRB E10+ posture, data minimization.
- **Accessibility is baseline quality,** shipped on first boot — not an option buried in menus.
