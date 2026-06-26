// Texture builders: composite a 32px-per-tile ground tileset out of the 16px
// Ninja Adventure source tiles (drawn 2x, nearest-neighbour), and generate the
// art the pack doesn't ship — tilled-soil tiles and multi-stage crop sprites —
// procedurally, in a palette that matches the pack.
//
// Everything renders at a consistent pixel density: source pixels are scaled 2x
// into 32px tiles, and the player sprite is drawn at 2x too. The camera then
// zooms ~2x for the chunky, cozy Stardew-family look.
import cropsData from '../data/crops.json';

export const TILE_SRC = 16; // native tile size in the source atlases

// Hand-picked SOLID tiles from tileset_floor.png (verified by pixel analysis).
// [col, row] in 16px units.
const FLOOR = {
  grass: [11, 12],
  grassAlt: [0, 12],
  water: [1, 22],
  dirt: [12, 15],
  sand: [1, 1],
};

// Logical tile indices used by the tilemap. 0..7 keep the original meanings so
// nothing breaks; 8+ are new richer tiles.
export const T = {
  GRASS: 0,
  WATER: 1,
  HEDGE: 2, // (was TREE) dark grass filler; real trees are props
  SOIL: 3, // tilled, dry
  PATH: 4, // sand path
  HOUSE: 5, // dirt filler under buildings
  DOOR: 6,
  EXIT: 7,
  SOIL_WET: 8,
  DIRT: 9,
  GRASS_FLOWER: 10,
};
export const TILE_COUNT = 11;

// Draw one 16px source tile into a 32px destination cell (2x, crisp).
function blit(ctx, srcImg, colRow, destIndex) {
  const [c, r] = colRow;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(srcImg, c * TILE_SRC, r * TILE_SRC, TILE_SRC, TILE_SRC,
    destIndex * 32, 0, 32, 32);
}

// Soft value noise for organic texture.
function speckle(ctx, x, y, w, h, colors, density) {
  for (let i = 0; i < w * h * density; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const px = x + ((Math.random() * w) | 0);
    const py = y + ((Math.random() * h) | 0);
    ctx.fillRect(px, py, 1, 1);
  }
}

// Tilled soil: warm dark earth with raised ridges + shadowed furrows. `wet`
// darkens and saturates it (just-watered look).
function drawTilledSoil(ctx, x0, wet) {
  const base = wet ? '#4a2f1c' : '#6b4a30';
  const ridge = wet ? '#5d3c25' : '#8a6240';
  const groove = wet ? '#321f12' : '#4f3722';
  ctx.fillStyle = base;
  ctx.fillRect(x0, 0, 32, 32);
  // four furrow rows
  for (let i = 0; i < 4; i++) {
    const y = 3 + i * 8;
    ctx.fillStyle = ridge;
    ctx.fillRect(x0 + 1, y, 30, 3);
    ctx.fillStyle = groove;
    ctx.fillRect(x0 + 1, y + 3, 30, 2);
  }
  speckle(ctx, x0, 0, 32, 32, [ridge, groove, base], 0.06);
  // subtle tile border so adjacent beds read as separate plots
  ctx.strokeStyle = wet ? '#26160c' : '#3c2a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, 0.5, 31, 31);
}

// Build the composited 'tiles' texture (TILE_COUNT cells, 32px each, one row).
export function buildGroundTileset(scene) {
  const floor = scene.textures.get('floor').getSourceImage();
  const tex = scene.textures.createCanvas('tiles', TILE_COUNT * 32, 32);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  blit(ctx, floor, FLOOR.grass, T.GRASS);
  blit(ctx, floor, FLOOR.water, T.WATER);
  blit(ctx, floor, FLOOR.grassAlt, T.HEDGE);
  blit(ctx, floor, FLOOR.sand, T.PATH);
  blit(ctx, floor, FLOOR.dirt, T.HOUSE);
  blit(ctx, floor, FLOOR.dirt, T.DIRT);
  blit(ctx, floor, FLOOR.sand, T.DOOR);
  blit(ctx, floor, FLOOR.sand, T.EXIT);
  blit(ctx, floor, FLOOR.grass, T.GRASS_FLOWER);

  drawTilledSoil(ctx, T.SOIL * 32, false);
  drawTilledSoil(ctx, T.SOIL_WET * 32, true);

  // a few flower dots on the flower-grass variant
  const fx = T.GRASS_FLOWER * 32;
  const flowers = ['#e8d44d', '#e86a6a', '#d98ae0', '#ffffff'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = flowers[(Math.random() * flowers.length) | 0];
    const px = fx + 4 + ((Math.random() * 24) | 0);
    const py = 4 + ((Math.random() * 24) | 0);
    ctx.fillRect(px, py, 2, 2);
    ctx.fillStyle = '#3f6e2a';
    ctx.fillRect(px, py + 2, 1, 2);
  }

  tex.refresh();
}

// ── Crop growth sprites ─────────────────────────────────────────────────────
// Four stages per crop, 16px native (rendered at 2x). Bottom-anchored so the
// plant "sits" on the soil. Stage 3 shows ripe produce in the crop's colour.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawCropStage(ctx, x0, stage, cropDef) {
  const stem = '#4f8a35';
  const stemDark = '#3a6627';
  const leaf = '#67b03f';
  const cx = x0 + 8;
  if (stage === 0) {
    // seed mound + tiny sprout
    ctx.fillStyle = '#3a6627';
    ctx.fillRect(cx - 1, 13, 3, 2);
    ctx.fillStyle = leaf;
    ctx.fillRect(cx, 11, 1, 2);
  } else if (stage === 1) {
    ctx.fillStyle = stem;
    ctx.fillRect(cx, 9, 1, 5);
    ctx.fillStyle = leaf;
    ctx.fillRect(cx - 2, 9, 2, 1);
    ctx.fillRect(cx + 1, 8, 2, 1);
  } else if (stage === 2) {
    ctx.fillStyle = stemDark;
    ctx.fillRect(cx, 6, 1, 8);
    ctx.fillStyle = stem;
    ctx.fillRect(cx - 1, 6, 1, 8);
    ctx.fillStyle = leaf;
    ctx.fillRect(cx - 3, 7, 3, 2);
    ctx.fillRect(cx + 1, 5, 3, 2);
    ctx.fillRect(cx - 2, 10, 2, 2);
  } else {
    // mature: leafy bush + ripe produce
    ctx.fillStyle = stemDark;
    ctx.fillRect(cx - 1, 7, 2, 7);
    ctx.fillStyle = leaf;
    ctx.fillRect(cx - 4, 6, 3, 3);
    ctx.fillRect(cx + 1, 5, 4, 3);
    ctx.fillRect(cx - 3, 9, 3, 2);
    const ripe = cropDef.readyColor;
    ctx.fillStyle = ripe;
    ctx.fillRect(cx - 2, 3, 4, 4);
    ctx.fillStyle = shade(ripe, -40);
    ctx.fillRect(cx - 2, 6, 4, 1);
    ctx.fillStyle = shade(ripe, 60);
    ctx.fillRect(cx - 1, 3, 1, 1);
  }
}

export function buildCropTextures(scene) {
  for (const type of cropsData.order) {
    const def = cropsData.crops[type];
    const tex = scene.textures.createCanvas(`crop_${type}`, 16 * 4, 16);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    for (let s = 0; s < 4; s++) drawCropStage(ctx, s * 16, s, def);
    // register the four 16px frames
    for (let s = 0; s < 4; s++) tex.add(s, 0, s * 16, 0, 16, 16);
    tex.refresh();
  }
}

// ── Village props ───────────────────────────────────────────────────────────
// Register named sub-frames (in px) of tileset_village.png so each multi-tile
// prop can be placed as a single image with its own depth (for y-sorting).
// Boxes are tuned against the atlas; origin is bottom-centre at use sites.
export const PROPS = {
  tree:   { x: 0,   y: 96,  w: 64, h: 64 },
  bush:   { x: 64,  y: 96,  w: 32, h: 32 },
  stump:  { x: 96,  y: 128, w: 16, h: 16 },
  house:  { x: 176, y: 80,  w: 64, h: 96 },
  fence:  { x: 256, y: 80,  w: 16, h: 16 },
};

export function registerProps(scene) {
  const tex = scene.textures.get('village');
  for (const [name, b] of Object.entries(PROPS)) {
    tex.add(name, 0, b.x, b.y, b.w, b.h);
  }
}

// ── Town props (generated, in the pack's palette) ───────────────────────────
// The village atlas ships no market stall or quest board, so we generate them —
// same approach as the tilled soil + crops. Bottom-centre anchored at use sites.
// A `stocked` variant draws produce on the table (the persistent Market-Day
// consequence).
export function buildTownTextures(scene) {
  const makeStall = (key, stocked) => {
    const tex = scene.textures.createCanvas(key, 48, 44);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    // posts
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(3, 6, 3, 36);
    ctx.fillRect(42, 6, 3, 36);
    // awning (red/cream stripes)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#e8d9b0' : '#b8412f';
      ctx.fillRect(2 + i * 7.5, 4, 8, 10);
    }
    ctx.fillStyle = '#8a2e22';
    ctx.fillRect(2, 13, 44, 2);
    // table top + apron
    ctx.fillStyle = '#7a5532';
    ctx.fillRect(4, 28, 40, 5);
    ctx.fillStyle = '#5e4026';
    ctx.fillRect(4, 33, 40, 9);
    if (stocked) {
      const goods = ['#d97b2b', '#e8c33a', '#cc4444', '#7ab84a', '#cc66bb'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = goods[i];
        ctx.fillRect(7 + i * 7, 23, 5, 5);
        ctx.fillStyle = shade(goods[i], -40);
        ctx.fillRect(7 + i * 7, 27, 5, 1);
      }
    }
    tex.refresh();
  };
  makeStall('market_stall', false);
  makeStall('market_stall_full', true);

  // Quest board: posts + plank board + a pinned parchment with text lines.
  const board = scene.textures.createCanvas('quest_board', 34, 44);
  const ctx = board.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#5e4026';
  ctx.fillRect(4, 18, 3, 24);
  ctx.fillRect(27, 18, 3, 24);
  ctx.fillStyle = '#7a5532';
  ctx.fillRect(2, 6, 30, 18);
  ctx.fillStyle = '#5e4026';
  ctx.fillRect(2, 6, 30, 2);
  ctx.fillRect(2, 22, 30, 2);
  ctx.fillStyle = '#e8dcb5';
  ctx.fillRect(8, 9, 18, 12);
  ctx.fillStyle = '#9c8a5a';
  for (let i = 0; i < 4; i++) ctx.fillRect(10, 11 + i * 2.5, 14, 1);
  board.refresh();
}

// ── Small generated UI bits ─────────────────────────────────────────────────
// A gold coin icon and a simple seed-pouch icon, for the HUD/hotbar.
export function buildIcons(scene) {
  const coin = scene.textures.createCanvas('icon_coin', 16, 16);
  let ctx = coin.getContext();
  ctx.fillStyle = '#caa12e'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4d75a'; ctx.beginPath(); ctx.arc(8, 8, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#caa12e'; ctx.font = '8px monospace'; ctx.fillText('$', 5, 11);
  coin.refresh();
}
