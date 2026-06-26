import Phaser from 'phaser';
import { TILE } from '../config.js';
import { T } from '../render/textures.js';
import { canPlant, plant, isReady, harvest } from '../systems/farming.js';
import { harvestBonusQuestion } from '../curriculum/questions.js';
import { save } from '../state/save.js';
import cropsData from '../data/crops.json';

const MAP_W = 25;
const MAP_H = 19;
const ZOOM = 2;
const WALKABLE = new Set([T.GRASS, T.SOIL, T.PATH, T.DOOR, T.EXIT, T.SOIL_WET, T.DIRT, T.GRASS_FLOWER]);

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    this.profile = this.registry.get('profile') || 'adventurer';
    this.modalOpen = false;
    this.transitioning = false;
    this.registry.set('activeScene', 'World');
    this.plantedCrops = new Map();
    this.cropSprites = new Map();
    if (!this.registry.get('selectedSeed')) this.registry.set('selectedSeed', 'turnip');

    this.buildFarm();

    // ── Player (animated, 2x, y-sorted) ──────────────────────────────────────
    const spawn = this.spawnPoint;
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'hero', 0).setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(10, 8).setOffset(3, 8);
    this.facing = 'down';
    this.player.play('hero-idle-down');
    this.physics.add.collider(this.player, this.collisionLayer);
    if (this.solids) this.physics.add.collider(this.player, this.solids);

    // ── Camera ──────────────────────────────────────────────────────────────
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, this.mapPixelW, this.mapPixelH);
    this.physics.world.setBounds(0, 0, this.mapPixelW, this.mapPixelH);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // ── Right-edge exit to Town ───────────────────────────────────────────────
    this.add.text((MAP_W - 1) * TILE, 12 * TILE, 'Town →', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ffe9b0', stroke: '#2a1c10', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.townExit = this.add.zone(this.mapPixelW - 10, this.mapPixelH / 2, 24, this.mapPixelH);
    this.physics.add.existing(this.townExit, true);
    this.physics.add.overlap(this.player, this.townExit, () => this.exitToTown());

    // ── Input ────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchTarget = null;
    this.pendingFarmTile = null;

    this.input.on('pointerdown', (p) => {
      if (this.modalOpen) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const tx = Math.floor(w.x / TILE);
      const ty = Math.floor(w.y / TILE);
      if (this.isSoilTile(tx, ty)) {
        const cxp = tx * TILE + TILE / 2;
        const cyp = ty * TILE + TILE / 2;
        if (Math.hypot(cxp - this.player.x, cyp - this.player.y) < TILE * 1.8) {
          this.tryFarmAction(tx, ty);
        } else {
          this.pendingFarmTile = { x: tx, y: ty };
          this.touchTarget = { x: cxp, y: cyp };
        }
        return;
      }
      this.pendingFarmTile = null;
      this.touchTarget = { x: w.x, y: w.y };
    });
    this.input.on('pointerup', () => { if (!this.pendingFarmTile) this.touchTarget = null; });

    this.spawnAmbiance();
    // Keep the HUD quest tracker correct when arriving back from town.
    this.scene.get('UI')?.refresh?.();
  }

  update() {
    if (!this.player) return;
    if (this.modalOpen) { this.player.body.setVelocity(0); this.updateCropGrowth(); return; }

    const body = this.player.body;
    body.setVelocity(0);
    const speed = 130;
    let vx = 0; let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    if (vx || vy) { this.touchTarget = null; this.pendingFarmTile = null; }
    else if (this.touchTarget) {
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - this.player.y;
      if (Math.hypot(dx, dy) > 4) { vx = dx; vy = dy; }
      else {
        this.touchTarget = null;
        if (this.pendingFarmTile) {
          const { x, y } = this.pendingFarmTile; this.pendingFarmTile = null;
          this.tryFarmAction(x, y);
        }
      }
    }

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
      // facing: dominant axis
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? 'left' : 'right';
      else this.facing = vy < 0 ? 'up' : 'down';
      const key = `hero-walk-${this.facing}`;
      if (this.player.anims.currentAnim?.key !== key) this.player.play(key);
    } else {
      const key = `hero-idle-${this.facing}`;
      if (this.player.anims.currentAnim?.key !== key) this.player.play(key);
    }

    this.player.setDepth(this.player.y);
    this.updateCropGrowth();
  }

  // ── Transition to town ───────────────────────────────────────────────────────
  exitToTown() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Town'));
  }

  // ── Farm build ──────────────────────────────────────────────────────────────
  buildFarm() {
    const G = T.GRASS;
    const data = [];
    for (let y = 0; y < MAP_H; y++) {
      const row = [];
      for (let x = 0; x < MAP_W; x++) {
        row.push(Math.random() < 0.06 ? T.GRASS_FLOWER : G);
      }
      data.push(row);
    }
    // Tilled soil field (left-centre)
    this.soilRect = { x0: 4, y0: 7, x1: 9, y1: 11 };
    for (let y = this.soilRect.y0; y <= this.soilRect.y1; y++)
      for (let x = this.soilRect.x0; x <= this.soilRect.x1; x++) data[y][x] = T.SOIL;
    // A rounded pond (right side)
    const pond = [[16, 5], [17, 5], [18, 5], [16, 6], [17, 6], [18, 6], [19, 6],
      [16, 7], [17, 7], [18, 7], [19, 7], [17, 8], [18, 8]];
    pond.forEach(([x, y]) => { data[y][x] = T.WATER; });
    // A sand path down the middle
    for (let y = 2; y < MAP_H - 1; y++) data[y][12] = T.PATH;
    for (let x = 10; x < 14; x++) data[14][x] = T.PATH;

    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles');
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollisionByExclusion([...WALKABLE]);
    layer.setDepth(-10);
    this.groundLayer = layer;
    this.collisionLayer = layer;

    this.mapPixelW = MAP_W * TILE;
    this.mapPixelH = MAP_H * TILE;
    // Returning from town drops the player at the right edge; a fresh entry uses the
    // default spot near the farmhouse.
    const ws = this.registry.get('worldSpawn');
    this.spawnPoint = ws || { x: 7 * TILE, y: 13 * TILE };
    if (ws) this.registry.set('worldSpawn', null);

    this.placeProps();
  }

  // Place y-sorted props. Origin bottom-centre so depth = y reads as "feet".
  prop(name, tx, ty, opts = {}) {
    const px = tx * TILE + (opts.ox ?? TILE / 2);
    const py = ty * TILE + (opts.oy ?? TILE);
    const img = this.add.image(px, py, 'village', name).setOrigin(0.5, 1).setScale(2);
    img.setDepth(opts.flat ? -5 : py);
    return img;
  }

  placeProps() {
    this.solids = this.physics.add.staticGroup();

    // Tree line along top + left/right edges (decorative forest border)
    const treeSpots = [
      [1, 2], [4, 1], [7, 2], [10, 1], [15, 1], [18, 2], [21, 1], [23, 2],
      [1, 6], [1, 10], [1, 14], [23, 6], [23, 10], [23, 15],
      [3, 16], [20, 12], [15, 15],
    ];
    treeSpots.forEach(([x, y]) => {
      const t = this.prop('tree', x, y);
      // slim trunk collider
      const trunk = this.solids.create(t.x, t.y - 6, null).setVisible(false);
      trunk.body.setSize(14, 10).setOffset(-7, -5);
    });

    // Farmhouse near top-centre-left
    const house = this.prop('house', 8, 4);
    const hc = this.solids.create(house.x, house.y - 18, null).setVisible(false);
    hc.body.setSize(96, 56).setOffset(-48, -40);

    // Fences framing the soil field
    const { x0, y0, x1, y1 } = this.soilRect;
    for (let x = x0 - 1; x <= x1 + 1; x++) { this.prop('fence', x, y0 - 1); this.prop('fence', x, y1 + 1); }
    for (let y = y0; y <= y1; y++) { this.prop('fence', x0 - 1, y); this.prop('fence', x1 + 1, y); }

    // Bushes + a pig for life
    [[14, 9], [20, 9], [6, 15], [19, 16], [2, 12]].forEach(([x, y]) => this.prop('bush', x, y));

    // Scatter grass tufts for detail
    for (let i = 0; i < 18; i++) {
      const gx = (2 + Math.random() * (MAP_W - 4)) * TILE;
      const gy = (2 + Math.random() * (MAP_H - 4)) * TILE;
      const tx = Math.floor(gx / TILE);
      const ty = Math.floor(gy / TILE);
      const tile = this.groundLayer.getTileAt(tx, ty);
      if (tile && (tile.index === T.GRASS || tile.index === T.GRASS_FLOWER)) {
        this.add.image(gx, gy, 'grass_tuft').setScale(2).setAlpha(0.7).setDepth(-4);
      }
    }

    this.pig = this.add.sprite(15 * TILE, 11 * TILE, 'pig', 0).setScale(2);
    this.tweens.add({ targets: this.pig, x: this.pig.x + 40, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  spawnAmbiance() {
    // Drifting leaves across the view (cosmetic, screen-space via scrollFactor 0
    // would detach from world; instead emit in world space above the camera).
    this.leaves = this.add.particles(0, 0, 'p_leaf', {
      x: { min: 0, max: this.mapPixelW },
      y: -10,
      lifespan: 8000,
      speedY: { min: 8, max: 22 },
      speedX: { min: -14, max: 6 },
      scale: 2,
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.9, end: 0.5 },
      frequency: 900,
      quantity: 1,
    });
    this.leaves.setDepth(99999);

    // Day/night tint: gentle color cycle (full cycle = 120s).
    this.dayTint = this.add.rectangle(
      this.mapPixelW / 2, this.mapPixelH / 2,
      this.mapPixelW + 200, this.mapPixelH + 200,
      0x1a2a55,
    ).setAlpha(0).setDepth(99998).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.tweens.add({
      targets: this.dayTint,
      alpha: { from: 0, to: 0.18 },
      duration: 60000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Farming ──────────────────────────────────────────────────────────────
  isSoilTile(tx, ty) {
    const tile = this.groundLayer.getTileAt(tx, ty);
    return tile && (tile.index === T.SOIL || tile.index === T.SOIL_WET);
  }

  tryFarmAction(tx, ty) {
    const key = `${tx},${ty}`;
    const crop = this.plantedCrops.get(key);
    if (!crop) { this.plantCrop(tx, ty, key); return; }
    if (crop.status === 'ready' || (crop.status === 'growing' && isReady(crop))) {
      crop.status = 'ready';
      this.harvestCrop(key, crop);
    } else {
      const remaining = cropsData.crops[crop.type].grow - (Date.now() - crop.plantedAt);
      this.showToast(`Growing… ${Math.ceil(remaining / 1000)}s`);
    }
  }

  plantCrop(tx, ty, key) {
    const player = this.registry.get('player');
    const seed = this.registry.get('selectedSeed') || 'turnip';
    if (!canPlant(player, seed)) { this.showToast(`No ${seed} seeds!`); return; }

    const crop = plant(player, seed, key);
    this.plantedCrops.set(key, crop);
    save(player);
    this.scene.get('UI')?.refresh?.();
    this.groundLayer.putTileAt(T.SOIL_WET, tx, ty); // watered look

    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE - 2;
    const spr = this.add.image(px, py, `crop_${seed}`, 0).setOrigin(0.5, 1).setScale(2).setDepth(py);
    this.cropSprites.set(key, spr);
    spr.setScale(0); this.tweens.add({ targets: spr, scale: 2, duration: 250, ease: 'Back.easeOut' });

    this.dustPuff(px, py);
    this.showToast(`Planted ${cropsData.crops[seed].name}!`);
  }

  harvestCrop(key, crop) {
    const player = this.registry.get('player');
    harvest(player, crop);
    save(player);
    this.scene.get('UI')?.refresh?.();

    const [tx, ty] = key.split(',').map(Number);
    this.groundLayer.putTileAt(T.SOIL, tx, ty);
    const spr = this.cropSprites.get(key);
    const def = cropsData.crops[crop.type];
    if (spr) {
      this.tweens.killTweensOf(spr);
      this.tweens.add({ targets: spr, y: spr.y - 14, alpha: 0, scale: 2.6, duration: 360, ease: 'Power2', onComplete: () => spr.destroy() });
    }
    this.cropSprites.delete(key);
    this.plantedCrops.delete(key);

    this.harvestBurst(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    this.floatText(tx * TILE + TILE / 2, ty * TILE, `+1 ${def.name}`, '#cdeb8b');
    this.showHarvestModal(crop);
  }

  // Advance crop stage sprites + ready shimmer.
  updateCropGrowth() {
    const now = Date.now();
    for (const [key, crop] of this.plantedCrops) {
      const def = cropsData.crops[crop.type];
      const spr = this.cropSprites.get(key);
      if (!spr) continue;
      const progress = Math.min(1, (now - crop.plantedAt) / def.grow);
      const stage = progress >= 1 ? 3 : Math.min(2, Math.floor(progress * 3));
      if (spr.frame.name != stage) spr.setFrame(stage);
      if (progress >= 1 && crop.status === 'growing') {
        crop.status = 'ready';
        this.tweens.add({ targets: spr, y: spr.y - 2, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
        this.readySparkle(spr.x, spr.y - 16);
      }
    }
  }

  // ── Juice ──────────────────────────────────────────────────────────────────
  dustPuff(x, y) {
    const e = this.add.particles(x, y, 'p_grass', {
      speed: { min: 20, max: 50 }, angle: { min: 200, max: 340 }, scale: { start: 2, end: 0 },
      lifespan: 400, quantity: 6, emitting: false,
    }).setDepth(y + 1);
    e.explode(6); this.time.delayedCall(500, () => e.destroy());
  }

  harvestBurst(x, y) {
    const e = this.add.particles(x, y, 'p_leaf', {
      speed: { min: 40, max: 90 }, scale: { start: 2.2, end: 0 }, lifespan: 600,
      quantity: 10, emitting: false,
    }).setDepth(y + 1);
    e.explode(10); this.time.delayedCall(700, () => e.destroy());
  }

  readySparkle(x, y) {
    const e = this.add.particles(x, y, 'p_grass', {
      speed: { min: 6, max: 18 }, scale: { start: 1.6, end: 0 }, lifespan: 700,
      frequency: 500, quantity: 1, tint: 0xfff3a0,
    }).setDepth(y + 1);
    this.time.delayedCall(60000, () => e.destroy());
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '13px', color, stroke: '#2a1c10', strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(100000);
    this.tweens.add({ targets: t, y: y - 24, alpha: 0, duration: 1100, ease: 'Power1', onComplete: () => t.destroy() });
  }

  showToast(msg) {
    if (this._toast) this._toast.destroy();
    this._toast = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 120, msg, {
      fontFamily: 'Georgia, serif', fontSize: '12px', color: '#fff', backgroundColor: '#000000aa', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(100001).setScrollFactor(0);
    // place in screen space
    this._toast.setScrollFactor(0).setPosition(this.scale.width / 2, 70);
    const tref = this._toast;
    this.tweens.add({ targets: tref, alpha: 0, duration: 1800, delay: 400, onComplete: () => { tref.destroy(); if (this._toast === tref) this._toast = null; } });
  }

  // ── Harvest bonus modal (functional skin; restyled in UI pass) ────────────
  showHarvestModal(crop) {
    this.modalOpen = true;
    const ui = this.scene.get('UI');
    ui.showHarvestModal(crop, (correct, answer) => {
      if (correct) {
        const player = this.registry.get('player');
        player.gold += cropsData.crops[crop.type].sell;
        save(player);
        ui.refresh();
      }
      this.modalOpen = false;
    });
  }
}
