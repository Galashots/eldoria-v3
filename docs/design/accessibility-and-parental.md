# Accessibility & Parental Baseline (M2)

The design guide treats accessibility as **baseline ship quality, active on first boot** — not an
optional menu — and asks for a parent-trust layer (time limits, read-aloud, no social, an
exportable learning summary). M2 delivers that foundation.

## Accessibility (shipped on first boot)

Defaults live in `src/systems/settings.js`; `getSettings()` returns accessible values when nothing
is stored yet, so a brand-new install is already accessible.

| Setting | Default | Effect |
|---------|---------|--------|
| Text size | Normal | `fontPx(base)` scales reading-critical text (Normal / Large / Largest). |
| Captions / subtitles | **On** | All speech is shown as on-screen text (the game is text-first). |
| Read aloud | Off | Speaks quest briefings, dialogue, and the bonus question via the Web Speech API. |
| Reduce motion | Off | Skips ambient leaf particles + the day/night tween for motion sensitivity. |
| Voice / Music / Effects volume | 100 / 70 / 80% | Voice applies to read-aloud now; Music/Effects are wired to Phaser's sound bus for when audio ships. |

Other guide requirements already satisfied by design: large high-contrast touch targets,
**colour-independent** controls (every toggle shows `On ✓` / `Off ✕` text, never colour alone),
icon **+** text labels, and no essential audio-only information (read-aloud is always additive to
on-screen text).

Settings are device-level (shared by both learner profiles) and reachable from the **⚙ button**
on the Title screen and in the in-game HUD (or the `O` key).

## Parental controls (`src/systems/parental.js`)

Behind a quick **"ask a grown-up" gate** (a two-digit multiplication children can't shortcut):

- **Daily time limit** — Off / 15 / 30 / 45 / 60 / 90 min. When reached, a calm *"Time for a
  break"* overlay pauses play; a grown-up can grant +15 min (gated) or stop for the day.
- **Lock the shop** — routes purchases behind adult approval (flag respected as commerce lands).
- **Always use younger-reader text** — forces the `mage` (Grade-2) difficulty regardless of the
  chosen hero, so a parent can pin the easier path.

Play-time is a per-day millisecond counter that **resets each calendar day**. No names, no free
text, no network — COPPA-aware data minimization.

## Learning summary export (`src/curriculum/evidence-report.js`)

`buildReport(player)` aggregates the stealth-evidence log (written by quests in M1) into one row
per competency: rounds played, accuracy, solved-independently vs. with-help, and average tries.
The parental panel renders it, and **Export summary** downloads a plain-text file (and stashes it
on the registry for future cloud/teacher export). Understanding is inferred from in-game actions
only — there is no quiz score and no personal data.

## What's deliberately deferred
Remappable controls UI, bedtime/curfew scheduling, and real per-channel audio mixing arrive with
the audio pass; the settings schema already reserves the fields so they slot in without rework.
