#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// extract-level-manifest.mjs
//
// Reads the ORIGINAL single-file build and extracts each area's *identity* — what
// it is, what it connects to, and what lives in it (NPCs, enemies, soil, shop) —
// WITHOUT carrying over the tile geometry. You said the old maps are square and
// boring; this deliberately throws the layout away and keeps only the design
// intent, so you can author fresh, organic maps in Tiled that still hit the same
// progression beats.
//
// Outputs (into maps/ by default):
//   • manifest.json   — machine-readable area graph + contents (for code to read)
//   • LEVEL_BRIEF.md  — a human design brief: what each level must contain & link to
//
// Usage:
//   node tools/extract-level-manifest.mjs [path/to/old/index.html] [outDir]
//   (defaults: ../eldoria/index.html  ->  ./maps)
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';

const srcPath = process.argv[2] || path.resolve('../eldoria/index.html');
const outDir = process.argv[3] || path.resolve('./maps');

if (!fs.existsSync(srcPath)) {
  console.error(`✗ Could not find the original build at: ${srcPath}`);
  console.error('  Pass the path explicitly: node tools/extract-level-manifest.mjs /path/to/index.html');
  process.exit(1);
}
const src = fs.readFileSync(srcPath, 'utf8');

// ── helpers ──────────────────────────────────────────────────────────────────
const grab = (re) => { const m = src.match(re); return m ? m[1] : null; };

function parseArray(literal) {
  // turn "['farm', 'town']" into ["farm","town"] without eval
  if (!literal) return [];
  return [...literal.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
}

// ── 1. Area order (linear connectivity) ──────────────────────────────────────
const areaOrder = parseArray(grab(/AREA_ORDER\s*=\s*(\[[^\]]*\])/));

// ── 2. Friendly labels ───────────────────────────────────────────────────────
const labels = {};
const labelBlock = grab(/AREA_LABEL\s*=\s*\{([\s\S]*?)\}/);
if (labelBlock) {
  for (const m of labelBlock.matchAll(/(\w+)\s*:\s*'([^']*)'/g)) labels[m[1]] = m[2];
}

// ── 3. NPCs (who lives where + their role) ───────────────────────────────────
const npcs = [];
const npcBlock = grab(/NPCS\s*=\s*\[([\s\S]*?)\]/);
if (npcBlock) {
  for (const m of npcBlock.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?name:\s*'([^']+)'[^}]*?area:\s*'([^']+)'[^}]*?role:\s*'([^']+)'/g)) {
    npcs.push({ id: m[1], name: m[2], area: m[3], role: m[4] });
  }
}

// ── 4. Enemy rosters per area ────────────────────────────────────────────────
const areaEnemies = {};
const aeBlock = grab(/AREA_ENEMIES\s*=\s*\{([^}]*)\}/);
const rosterVars = {};
for (const m of src.matchAll(/var\s+(\w+_ENEMIES)\s*=\s*\[([\s\S]*?)\];/g)) {
  rosterVars[m[1]] = [...m[2].matchAll(/type:\s*'([^']+)'/g)].map((x) => x[1]);
}
if (aeBlock) {
  for (const m of aeBlock.matchAll(/(\w+)\s*:\s*(\w+)/g)) {
    areaEnemies[m[1]] = rosterVars[m[2]] || [];
  }
}

// ── 5. Feature detection per area (soil / shop / forge / cookpot) ─────────────
// Inferred from NPC roles + comments in the area builders, not from tile layout.
const builderComments = {};
for (const m of src.matchAll(/function build(\w+?)Map\(\)\s*\{[^\n]*\n\s*\/\/([^\n]*)/g)) {
  builderComments[m[1].toLowerCase()] = m[2].trim();
}

// ── assemble manifest ────────────────────────────────────────────────────────
const areas = areaOrder.map((id, i) => {
  const here = npcs.filter((n) => n.area === id);
  return {
    id,
    label: labels[id] || id,
    connectsLeft: areaOrder[i - 1] || null,
    connectsRight: areaOrder[i + 1] || null,
    npcs: here.map(({ id: nid, name, role }) => ({ id: nid, name, role })),
    enemies: areaEnemies[id] || [],
    hasShop: here.some((n) => n.role === 'shop'),
    hasForge: here.some((n) => n.role === 'forge'),
    hasQuestGiver: here.some((n) => n.role === 'quests'),
    note: builderComments[id] || null,
  };
});

const manifest = {
  source: path.basename(srcPath),
  extractedAt: new Date().toISOString().slice(0, 10),
  geometry: 'INTENTIONALLY OMITTED — design fresh maps in Tiled',
  areaOrder,
  areas,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// ── human-readable design brief ──────────────────────────────────────────────
const lines = [];
lines.push('# Realm of Eldoria — Level Design Brief');
lines.push('');
lines.push('> Extracted from the original build. **The old square layouts were deliberately');
lines.push('> dropped.** This brief is *what each level needs to contain and connect to* —');
lines.push('> the progression, not the shape. Design something more organic in Tiled.');
lines.push('');
lines.push(`Progression (linear): \`${areaOrder.join('  →  ')}\``);
lines.push('');
for (const a of areas) {
  lines.push(`## ${a.label}  \`(${a.id})\``);
  if (a.note) lines.push(`*Original intent: ${a.note}*`);
  lines.push('');
  const conns = [];
  if (a.connectsLeft) conns.push(`← **${a.connectsLeft}** (left edge)`);
  if (a.connectsRight) conns.push(`**${a.connectsRight}** → (right edge)`);
  lines.push(`- **Connections:** ${conns.join('  ·  ') || 'none (terminal area)'}`);
  if (a.npcs.length) {
    lines.push(`- **NPCs:** ${a.npcs.map((n) => `${n.name} (${n.role})`).join(', ')}`);
  }
  const feats = [];
  if (a.hasShop) feats.push('seed/crystal shop');
  if (a.hasForge) feats.push('forge');
  if (a.hasQuestGiver) feats.push('quest giver');
  if (feats.length) lines.push(`- **Features:** ${feats.join(', ')}`);
  if (a.enemies.length) {
    lines.push(`- **Enemy trail (easy → hard):** ${a.enemies.join(' → ')}`);
  } else {
    lines.push('- **Enemies:** none (safe area)');
  }
  lines.push('');
  lines.push('**Design freedom:** keep the connections and contents above; everything else —');
  lines.push('shape, paths, water, decoration, secret corners — is yours to reinvent. Place a');
  lines.push('`spawn` object and edge `exit` objects in Tiled; NPCs/enemies become object markers.');
  lines.push('');
}
fs.writeFileSync(path.join(outDir, 'LEVEL_BRIEF.md'), lines.join('\n'));

console.log('✓ Wrote manifest.json and LEVEL_BRIEF.md to', outDir);
console.log(`  Areas: ${areaOrder.join(' → ')}`);
console.log(`  NPCs:  ${npcs.map((n) => n.name).join(', ') || '(none found)'}`);
