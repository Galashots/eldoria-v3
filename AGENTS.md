# Realm of Eldoria — AI Agent Guidelines

## Architecture Overview
This is a 2D top-down educational RPG built with Phaser 4 and bundled with Vite. The game relies on a strict separation of concerns to keep the curriculum and gameplay scalable.
* Curriculum Design: Refer to docs/pedagogy-architecture.md for all decisions regarding stealth assessment, Grade 2 and Grade 5 literacy profiles, and non-punitive feedback structures.

## Core Rules for Code Modifications
1. **Scene Separation:** UI and Gameplay run in parallel. `WorldScene` handles movement and map logic. `UIScene` and `CharacterScene` handle overlays. Do not tightly couple them; use the Phaser global `registry` (e.g., `this.registry.events.on`) to broadcast state changes between scenes.
2. **Pure Systems (`src/systems/`):** Files in this directory (combat, farming, inventory, etc.) MUST remain pure JavaScript functions. Do not import `Phaser` into these files. They take a `player` state object, mutate it, and return a result.
3. **Data-Driven:** Enemy stats, item definitions, and crop math live in `src/data/*.json`. Do not hardcode economy or combat math into the JavaScript logic.
4. **Curriculum Independence:** Math and educational questions are generated in `src/curriculum/`. Do not treat them as gates; failing a question should never punish the player (e.g., losing a turn is fine, but do not deduct HP or gold for wrong answers).

## Development Environment
- Node version: 18+
- Install dependencies: `npm install`
- Local dev server: `npm run dev`
