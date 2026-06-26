import Phaser from 'phaser';
import { TILE, TILES, BLOCKED } from '../config.js';
import { canPlant, plant, isReady, harvest } from '../systems/farming.js';
import { harvestBonusQuestion } from '../curriculum/questions.js';
import { save } from '../state/save.js';
import cropsData from '../data/crops.json';

const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    this.profile = this.registry.get('profile') || 'adventurer';
    this.currentArea = this.registry.get('area') || 'farm';

    if (this.cache.tilemap.exists(this.currentArea)) {
      this.buildFromTiled(this.currentArea);
    } else {
      this.buildDemoArena();
    }

    // ── Farming state ───────────────────────────────────────────────────────
    this.plantedCrops = new Map();
    this.cropSprites = new Map();
    this.modalOpen = false;
    this.modalElements = [];
    if (!this.registry.get('selectedSeed')) {
      this.registry.set('selectedSeed', 'turnip');
    }

    // ── Player ──────────────────────────────────────────────────────────────
    const spawn = this.spawnPoint || { x: 5 * TILE, y: 8 * TILE };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 20).setOffset(6, 10);
    if (this.collisionLayer) this.physics.add.collider(this.player, this.collisionLayer);

    // ── Camera ──────────────────────────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.mapPixelW, this.mapPixelH);
    this.physics.world.setBounds(0, 0, this.mapPixelW, this.mapPixelH);

    // ── Input: keyboard (desktop) + tap-to-move/farm (iPad) ─────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchTarget = null;
    this.pendingFarmTile = null;

    this.input.on('pointerdown', (p) => {
      if (this.modalOpen) return;
      const worldPt = this.cameras.main.getWorldPoint(p.x, p.y);
      const tx = Math.floor(worldPt.x / TILE);
      const ty = Math.floor(worldPt.y / TILE);

      if (this.isSoilTile(tx, ty)) {
        const tileCX = tx * TILE + TILE / 2;
        const tileCY = ty * TILE + TILE / 2;
        const dist = Math.hypot(tileCX - this.player.x, tileCY - this.player.y);

        if (dist < TILE * 1.8) {
          this.tryFarmAction(tx, ty);
          return;
        }
        this.pendingFarmTile = { x: tx, y: ty };
        this.touchTarget = { x: tileCX, y: tileCY };
        return;
      }

      this.pendingFarmTile = null;
      this.touchTarget = { x: worldPt.x, y: worldPt.y };
    });

    this.input.on('pointerup', () => {
      if (!this.pendingFarmTile) this.touchTarget = null;
    });

    this.speed = 150;
  }

  update() {
    if (!this.player) return;

    if (this.modalOpen) {
      this.player.body.setVelocity(0);
      this.updateCropGrowth();
      return;
    }

    const body = this.player.body;
    body.setVelocity(0);

    // Keyboard
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    if (vx || vy) {
      body.setVelocity(vx * this.speed, vy * this.speed);
      body.velocity.normalize().scale(this.speed);
      this.touchTarget = null;
      this.pendingFarmTile = null;
    } else if (this.touchTarget) {
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - this.player.y;
      if (Math.hypot(dx, dy) > 4) {
        const a = Math.atan2(dy, dx);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        this.touchTarget = null;
        if (this.pendingFarmTile) {
          const { x, y } = this.pendingFarmTile;
          this.pendingFarmTile = null;
          this.tryFarmAction(x, y);
        }
      }
    }

    this.updateCropGrowth();
    this.checkExitTile();
  }

  // ── Farming ────────────────────────────────────────────────────────────────

  isSoilTile(tx, ty) {
    const tile = this.groundLayer.getTileAt(tx, ty);
    return tile && tile.index === TILES.SOIL;
  }

  tryFarmAction(tx, ty) {
    const key = `${tx},${ty}`;
    const crop = this.plantedCrops.get(key);

    if (!crop) {
      this.plantCrop(tx, ty, key);
    } else if (crop.status === 'ready' || (crop.status === 'growing' && isReady(crop))) {
      crop.status = 'ready';
      this.harvestCrop(key, crop);
    } else if (crop.status === 'growing') {
      const remaining = cropsData.crops[crop.type].grow - (Date.now() - crop.plantedAt);
      this.showToast(`Growing... ${Math.ceil(remaining / 1000)}s`);
    }
  }

  plantCrop(tx, ty, key) {
    const player = this.registry.get('player');
    const selectedSeed = this.registry.get('selectedSeed') || 'turnip';

    if (!canPlant(player, selectedSeed)) {
      this.showToast(`No ${selectedSeed} seeds!`);
      return;
    }

    const crop = plant(player, selectedSeed, key);
    this.plantedCrops.set(key, crop);
    save(player);
    const ui = this.scene.get('UI');
    if (ui?.refresh) ui.refresh();

    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    const color = hexToInt(cropsData.crops[selectedSeed].color);
    const sprite = this.add.rectangle(px, py, 10, 10, color).setDepth(5).setScale(0);
    this.cropSprites.set(key, sprite);
    this.tweens.add({
      targets: sprite,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.showToast(`Planted ${cropsData.crops[selectedSeed].name}!`);
  }

  harvestCrop(key, crop) {
    const player = this.registry.get('player');
    harvest(player, crop);
    save(player);
    const ui = this.scene.get('UI');
    if (ui?.refresh) ui.refresh();

    const sprite = this.cropSprites.get(key);
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.cropSprites.delete(key);
    this.plantedCrops.delete(key);

    this.showHarvestModal(crop);
  }

  updateCropGrowth() {
    const now = Date.now();
    for (const [key, crop] of this.plantedCrops) {
      if (crop.status === 'growing' && isReady(crop, now)) {
        crop.status = 'ready';
        const oldSprite = this.cropSprites.get(key);
        if (oldSprite) {
          this.tweens.killTweensOf(oldSprite);
          oldSprite.destroy();
        }
        const [tx, ty] = key.split(',').map(Number);
        const px = tx * TILE + TILE / 2;
        const py = ty * TILE + TILE / 2;
        const readyColor = hexToInt(cropsData.crops[crop.type].readyColor);
        const newSprite = this.add.rectangle(px, py, 20, 20, readyColor).setDepth(5);
        this.cropSprites.set(key, newSprite);
        this.tweens.add({
          targets: newSprite,
          scaleX: 1.3,
          scaleY: 1.3,
          yoyo: true,
          repeat: -1,
          duration: 800,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  // ── Harvest bonus question modal ──────────────────────────────────────────

  showHarvestModal(crop) {
    this.modalOpen = true;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const cropDef = cropsData.crops[crop.type];
    const q = harvestBonusQuestion(this.profile);
    const els = [];

    const dim = this.add.rectangle(cx, cy, width, height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(200).setInteractive();
    els.push(dim);

    els.push(this.add.rectangle(cx, cy, 420, 320, 0x241c12)
      .setStrokeStyle(3, 0xc9a86a).setScrollFactor(0).setDepth(201));

    els.push(this.add.text(cx, cy - 130, 'HARVEST BONUS', {
      fontSize: '20px', color: '#ffe9b0', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202));

    els.push(this.add.text(cx, cy - 95, `Harvested 1 ${cropDef.name}!`, {
      fontSize: '16px', color: '#88dd44',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202));

    els.push(this.add.text(cx, cy - 68, `Answer for +${cropDef.sell}g bonus gold`, {
      fontSize: '14px', color: '#cbb890',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202));

    els.push(this.add.text(cx, cy - 25, q.text, {
      fontSize: '32px', color: '#ffffff', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202));

    q.options.forEach((opt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ox = cx - 95 + col * 190;
      const oy = cy + 35 + row * 56;

      const btn = this.add.rectangle(ox, oy, 160, 44, 0x4a3a28)
        .setStrokeStyle(2, 0xc9a86a).setScrollFactor(0).setDepth(202)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(ox, oy, `${opt}`, {
        fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(203);

      btn.on('pointerup', () => {
        this.resolveHarvestAnswer(opt === q.answer, q.answer, cropDef, els);
      });

      els.push(btn, txt);
    });

    this.modalElements = els;
  }

  resolveHarvestAnswer(correct, correctAnswer, cropDef, els) {
    els.forEach((el) => el.disableInteractive?.());

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    let msg, color;

    if (correct) {
      const player = this.registry.get('player');
      player.gold += cropDef.sell;
      save(player);
      const ui = this.scene.get('UI');
      if (ui?.refresh) ui.refresh();
      msg = `Correct! +${cropDef.sell}g bonus!`;
      color = '#88dd44';
    } else {
      msg = `Not quite! Answer: ${correctAnswer}`;
      color = '#dd8844';
    }

    const result = this.add.text(cx, cy + 135, msg, {
      fontSize: '18px', color, backgroundColor: '#00000088',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204);
    els.push(result);

    this.time.delayedCall(1800, () => this.dismissModal(els));
  }

  dismissModal(els) {
    els.forEach((el) => el.destroy());
    this.modalElements = [];
    this.modalOpen = false;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  showToast(msg) {
    const { width } = this.scale;
    const txt = this.add.text(width / 2, 80, msg, {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#00000099',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ── Build from a Tiled export (the real pipeline) ──────────────────────────
  buildFromTiled(key) {
    const map = this.make.tilemap({ key });
    const tileset = map.addTilesetImage('tiles', 'tiles');
    const ground = map.createLayer('ground', tileset, 0, 0);
    this.groundLayer = ground;
    this.collisionLayer = map.createLayer('collision', tileset, 0, 0) || ground;
    this.collisionLayer.setCollisionByExclusion([-1]);

    const objects = map.getObjectLayer('objects');
    if (objects) {
      objects.objects.forEach((o) => {
        if (o.name === 'spawn') this.spawnPoint = { x: o.x, y: o.y };
      });
    }
    this.mapPixelW = map.widthInPixels;
    this.mapPixelH = map.heightInPixels;
  }

  // ── Generated demo arena (no asset files needed) ──────────────────────────
  buildDemoArena() {
    const W = 25;
    const H = 19;
    const G = TILES.GRASS;
    const data = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        row.push(edge ? TILES.TREE : G);
      }
      data.push(row);
    }
    for (let y = 5; y < 8; y++) for (let x = 4; x < 9; x++) data[y][x] = TILES.SOIL;
    for (let y = 4; y < 7; y++) for (let x = 14; x < 18; x++) data[y][x] = TILES.WATER;
    data[9][W - 1] = TILES.EXIT;

    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles');
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollisionByExclusion([
      TILES.GRASS, TILES.SOIL, TILES.PATH, TILES.DOOR, TILES.EXIT,
    ]);

    this.collisionLayer = layer;
    this.groundLayer = layer;
    this.exitTiles = [{ x: W - 1, y: 9 }];
    this.mapPixelW = W * TILE;
    this.mapPixelH = H * TILE;
    this.spawnPoint = { x: 5 * TILE, y: 8 * TILE };

    this.add.text(8, 8, 'DEMO ARENA — tap brown soil tiles to farm!',
      { fontSize: '12px', color: '#ffffff', backgroundColor: '#00000066' }).setScrollFactor(0).setDepth(50);
  }

  checkExitTile() {
    if (!this.exitTiles) return;
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    const onExit = this.exitTiles.some((t) => t.x === tx && t.y === ty);
    if (onExit && !this._traveling) {
      this._traveling = true;
      this.cameras.main.flash(200);
      this.time.delayedCall(400, () => { this._traveling = false; });
    }
  }
}
