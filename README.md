# Realm of Eldoria — Phaser 4 + Vite rebuild

A clean scaffold for rebuilding your educational farming RPG on Phaser 4, with the
hard-won, framework-agnostic parts of the original already carried over: the
curriculum, the tuned economy/enemy/gear tables, and a level **design brief**
(not the old square geometry — that was dropped on purpose).

It **runs immediately with zero art** (placeholder textures are generated at
runtime), so you can `npm run dev` before migrating a single PNG.

---

## What came over, and what didn't

**Lifted (pure logic / data / intent — the expensive stuff):**
- `src/curriculum/` — your exact question generators, profile-aware (`adventurer` ≈ grade 5, `mage` ≈ grade 2), preserving "math is a bonus, never a gate."
- `src/data/*.json` — crops, recipes, enemies, gear, kill-quests, economy, profiles, tuned to the original values.
- `maps/LEVEL_BRIEF.md` + `manifest.json` — each area's identity, connections, NPCs, and enemy trails.

**Left behind (rebuilt clean, never pasted):**
- All raw-canvas drawing and the manual game loop → Phaser owns rendering now.
- The single global-`var` scope → ES modules + Phaser Scenes.
- The square `fillRect` map layouts → fresh maps in Tiled.

---

## Character & Inventory screen

Tap the **⚔ Hero** button (top-right) or press **I** to open it. Kids can:
- see live stats (HP, level, XP, gold, total attack = base + gear),
- tap a **bag** item to equip it (auto-swaps the old item back to the bag),
- tap an **equipped** slot to take it off.

Logic lives in `src/systems/inventory.js` (pure); the popup is `src/scenes/CharacterScene.js`.
Loot drops route through `acquire()` — equip-if-better, else into the bag. A fresh save
is seeded with a few demo items (in `TitleScene.js`) so the screen isn't empty; delete
that block once real drops are flowing.

---

## Getting it into your `eldoria-v3` repo

From the unzipped folder:
```bash
cd eldoria-phaser
git init
git add .
git commit -m "Phaser 4 + Vite scaffold: curriculum, data, systems, character screen, Tiled pipeline"
git branch -M main
git remote add origin https://github.com/Galashots/eldoria-v3.git
git push -u origin main
```
The repo is empty, so this is a clean first push. (`node_modules/` and `dist/` are
git-ignored — collaborators just run `npm install`.)

---

## Step by step

### 1. Run it (2 min)
```bash
npm install
npm run dev
```
Open the printed `http://localhost:5173`. Pick a hero → you're walking a demo arena.
To test on the **actual iPad**: same Wi-Fi, open the `Network:` URL Vite prints
(your PC's LAN IP). That's your real target environment — test there often.

### 2. Bring your assets over (10 min)
```bash
cp ../eldoria/assets/*.png  public/assets/
cp ../eldoria/assets/*.mp3  public/assets/
cp ../eldoria/tools/*.mjs ../eldoria/tools/SPRITE_PIPELINE.md  tools/
```
Then in `src/scenes/PreloadScene.js`, replace the placeholder-texture TODO blocks
with real `this.load.spritesheet(...)` / `this.load.image(...)` / `this.load.audio(...)`
calls. Your existing sprite-slicing pipeline still works unchanged.

### 3. Regenerate the level brief (whenever the old build changes)
```bash
npm run extract-manifest -- /path/to/old/index.html ./maps
```
Read `maps/LEVEL_BRIEF.md`. It's your design contract: keep each area's connections,
NPCs, and enemy trail; reinvent everything about the **shape**.

### 4. Design real maps in Tiled (the fun part)
- Install Tiled (free, mapeditor.org).
- `cp maps/_template.tmj maps/farm.tmj`, open it, design something organic.
- Conventions are in `maps/README.md` (tileset `tiles`, layers `ground` + `collision`,
  an `objects` layer with a `spawn` point + edge `exit` points).
- Export as JSON (`.tmj`), then load it in `PreloadScene`:
  `this.load.tilemapTiledJSON('farm', 'maps/farm.tmj')`. WorldScene uses it automatically.

### 5. Wire systems to scenes (incremental — one "slice" at a time)
The logic is already written and tested-by-construction in `src/systems/`
(`farming`, `combat`, `cooking`, `shop`) and `src/state/save.js`. Each is pure logic
over a `player` object. Remaining work is the thin visual layer: show a question
modal in `UIScene`, call the system function, animate the result. Suggested order
mirrors your original slices: **farming → shop → combat → cooking → quests**.

### 6. Deploy
```bash
npm run build      # outputs dist/ — static files, relative paths
```
`dist/` runs from any static host (GitHub Pages) or straight off the iPad. Same
"just open it" property your kids' build had.

---

## Handing this to Claude Code
Commit this as your starting point, then point Claude Code at one slice at a time,
e.g. *"wire the farming system in `src/systems/farming.js` into WorldScene: tap a
soil tile to plant the selected seed, show growth, tap to harvest."* The clean module
boundaries mean each task is self-contained — far easier for an agent than the old
4,000-line single file.

## Accessibility
The original's a11y work (modal focus management, aria labels) is noted as TODO in
`UIScene.js`. Porting those patterns into the Phaser modal host is your path back
toward the 0.90 Lighthouse target.
