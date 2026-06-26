# Realm of Eldoria — v3 Roadmap

> Living gameplan, rewritten after reviewing the *Design Guide for a Beautiful, Deep,
> Addictive, Immersive, Curriculum-Aligned 2D RPG*. The guide's single loudest lesson:
> **build one cohesive vertical slice, not a sprawling feature list.** Everything below
> serves that.

See also: [vision/pillars.md](vision/pillars.md) ·
[curriculum/stealth-assessment-model.md](curriculum/stealth-assessment-model.md) ·
[design/quest-template.md](design/quest-template.md) ·
[adr/0001-v3-direction.md](adr/0001-v3-direction.md) ·
[../maps/LEVEL_BRIEF.md](../maps/LEVEL_BRIEF.md) (area progression).

---

## 1. Where v3 stands today (audit vs. the guide)

| Area | Status | Notes |
|------|--------|-------|
| Cohesive premium-pixel art + traversal | ✅ Strong | CC0 Ninja Adventure tiles, camera zoom, y-sort, animated hero, day/night tint, particle juice. |
| Two reading-level profiles | ✅ Strong | `adventurer` ≈ Gr5, `mage` ≈ Gr2 — the guide's "two presentation profiles, not one kid-mode." |
| Non-punitive learning ("never a gate") | ✅ Aligned | Wrong answers cost nothing. The pedagogy invariant is intact. |
| Pure systems + tuned data tables | ✅ Strong | `farming`, `inventory`, `combat`, `shop`, `cooking` + JSON tables. Clean separation. |
| Home-base loop (farm) | ✅ Built | Plant → 3 grow stages → ready sparkle → harvest → optional bonus modal. |
| **Learning embedded in play** | ⚠️ Gap | Current harvest bonus is a **quiz in disguise** (`4 × 2 = ?`) — the exact thing the guide warns against. |
| **Village hub + service loops** | ❌ Missing | Town exists only as a brief. No quest board, crafting, or codex in-scene. |
| **Quest architecture** | ❌ Missing | No quest state, log, fiction→evidence→consequence structure. |
| Wilderness + dungeon + combat | ❌ Missing | `combat`/enemy data written but unwired. No scene transitions between areas. |
| One armor family (5–8 slots) | ⚠️ Partial | Gear table + equip screen exist; not yet earned through play. |
| Accessibility defaults on boot | ✅ Built (M2) | Captions on, scalable text, reduce-motion, read-aloud, volumes — accessible from first boot. |
| Parental controls | ✅ Built (M2) | Grown-up-gated time cap, shop lock, young-reader, + exportable learning summary. |
| Stealth-assessment instrumentation | ❌ Missing | No evidence log capturing what the child actually understands. |

**Read:** the *foundations* are excellent and cohesive; the *missing* pieces are the hub,
the quest spine, the embedded-assessment model, and the safety/accessibility baseline.

---

## 2. Confirmed direction (see ADR-0001)

1. **Curriculum — math-first, expand-later.** Build the slice on math (the existing,
   tuned question bank), but tag every quest with a `subject` so science / social / literacy
   slot in later without rework.
2. **Assessment — hybrid.** New quests embed **stealth assessment** (the child's *actions*
   are the evidence — make change at the market, repair a fence with the fewest boards). The
   farm keeps its optional **bonus** modal. Together they cover both styles without throwing
   away working content.
3. **First build — the village hub.** Town + quest board + a Grade-2 quest chain, because the
   hub + quest spine is the largest gap between us and the guide's vertical slice.

---

## 3. Milestone sequence

Each milestone maps to a guide vertical-slice checklist item and ends in a playable,
committed state. **Teach one new verb at a time, then recombine** (the guide's level-design rule).

### M1 — Village hub + quest board + Grade-2 "Market Day" quest  ← *in progress*
- New **TownScene** reachable from the farm's right edge (seamless edge transition, no loading screen).
- **Quest board / Mira** offers *Market Day at Sunmere*: serve 3 customers by **making change**.
  Money math is the *mechanic* (assemble coins to a target), never a modal quiz.
- Non-punitive: a wrong total gives a gentle nudge + retry; the quest always completes.
- **Persistent consequence:** the market stall stocks up and stays stocked on return.
- **Stealth evidence:** every round logs `{needed, given, attempts, correct}` to the save.
- HUD gains a **quest tracker** (one plain sentence + one visual cue — the guide's kid-UI rule).
- _Files:_ `scenes/TownScene.js`, `systems/quests.js`, `data/quests/market-day.json`,
  market overlay in `scenes/UIScene.js`, exit wiring in `scenes/WorldScene.js`, `main.js`.

### M2 — Accessibility + parental baseline + profile polish  ✅ *done*
- First-boot accessible defaults: captions on, scalable text, music/speech/SFX volumes,
  reduce-motion, color-independent cues, large touch targets, read-aloud (Web Speech).
- Parental panel behind a grown-up gate: daily time cap (with gentle break overlay + "+15 min"
  gate), shop lock, forced younger-reader profile, and an exportable learning summary that reads
  the M1 evidence log.
- _Files:_ `scenes/SettingsScene.js`, `systems/settings.js`, `systems/parental.js`,
  `curriculum/evidence-report.js`; see [design/accessibility-and-parental.md](design/accessibility-and-parental.md).

### M3 — Wilds zone + combat (one verb) + first armor family
- Wilderness area east of town with a visible landmark and one optional route (the guide's
  "signal possibility on screen").
- Wire the existing `combat.js` + `enemies.json`: one core combat grammar, escalating
  (slime → bat → goblin). Gear drops route through `inventory.acquire()` (already built).
- Combat math stays a **bonus to land a stronger hit**, never a gate to attack.

### M4 — Dungeon teaching 3 verbs in escalating combination
- One dungeon (deepwoods/mine) that introduces three verbs and recombines them under gentle
  time pressure — the guide's micro-mastery curve.

### M5 — Home-base meta loop
- Town **restoration** (repair districts), **codex** entries, **mastery trail** cosmetics.
- Wire the session→meta loop: every 10–15 min yields permanent progress.

### M6 — Grade-5 quest chain + telemetry export
- A Gr5 chain (e.g. *Climate Caravan* / *Guild Chronicle*) layering planning, comparison,
  and written/structured output on the same world.
- Parent/teacher **learning summary** export from the evidence log.

---

## 4. Guardrails (carry through every milestone)

- **Never a gate.** Math is always a bonus or an embedded action with non-punitive recovery.
- **Scope discipline.** Resist "feature equity" across classes/biomes (Children of Morta's
  documented mistake). One armor family, one combat grammar, one dungeon — done well.
- **Every session yields permanent progress** — world knowledge, cosmetic, codex, town repair,
  armor material, or a mastery marker.
- **Two profiles, real difference.** Younger-reader vs older-reader is content scaling, not a
  cosmetic toggle.
- **Safety by default.** No chat, ESRB E10+ posture, data minimization (COPPA-aware).

## 5. Data & code conventions

- Runtime data imported by the bundle lives under `src/data/` (e.g. `src/data/quests/`).
  The guide's top-level `data/` tree is the aspirational source-of-truth layout; we keep
  runtime JSON in `src/data/` so Vite can import it directly.
- Systems in `src/systems/` stay **pure** (no Phaser) so they're unit-testable and reusable.
- Cross-scene state lives on the Phaser **registry** (`player`, `profile`, `selectedSeed`,
  `activeScene`). Mutate the player object in place, then `save()` and call `ui.refresh()`.
