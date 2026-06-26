# Maps — Tiled workflow

This folder holds your **Tiled** sources and the extracted design reference. The old
square layouts were dropped on purpose; design fresh, organic maps here.

## Files

- `LEVEL_BRIEF.md` — what each level must **contain and connect to** (auto-generated
  from the original build). Your design contract — hit these beats, reinvent the shape.
- `manifest.json` — the same info, machine-readable, for code (area graph, NPCs, enemies).
- `_template.tmj` — a blank map preconfigured with the right layers + tileset name.
  Copy it per area: `cp _template.tmj farm.tmj`.

Re-generate the brief anytime the original changes:
```
npm run extract-manifest -- /path/to/old/index.html ./maps
```

## Conventions (so Phaser loads your maps with no glue code)

1. **Tile size:** 32×32. **Tileset name:** `tiles` (must match `addTilesetImage('tiles', …)`).
2. **Layers, in this order:**
   - `ground` — everything you see (grass, water, paths, decoration).
   - `collision` — paint **any** tile where the hero should be blocked. The rule is
     simply *painted = solid*, so use any visible tile (or a dedicated red marker tile).
   - `objects` — an object layer for markers:
     - a point named `spawn` → where the hero starts,
     - points named `exit` on edges → area travel (the brief says which neighbour),
     - points named after an NPC id (`mira`, `bram`, `gunnar`) or enemy type
       (`slime`, `goblin`…) → the scene places them there.
3. **Export:** File → Export As → `farm.tmj` (JSON). Save tileset image as
   `public/assets/tileset.png` and load both in `PreloadScene`.

## Getting a real tileset

Until you have art, the game generates an 8-colour placeholder tileset at runtime,
so maps render without `tileset.png`. For real pixel art that fits the farming-RPG
look, **Sprout Lands** (Cup Nooble, itch.io) and **Kenney** (kenney.nl, CC0) slice
cleanly to 32×32. Drop the PNG in `public/assets/`, point the Tiled tileset at it,
and the same maps light up with real art.
