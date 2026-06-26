import Phaser from 'phaser';
import { TILE, TILES, BLOCKED } from '../config.js';

// WorldScene renders the explorable map and moves the hero.
//
// Two paths, by design:
//   • If a Tiled map for the area is in the cache → build from it (the real pipeline).
//   • Otherwise → build a small generated demo arena so the project runs with no
//     map files yet. As soon as you export farm.tmj from Tiled and load it in
//     PreloadScene, this scene uses it automatically.
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

    // ── Input: keyboard (desktop) + tap-to-move (iPad) ──────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchTarget = null;
    this.input.on('pointerdown', (p) => {
      this.touchTarget = this.cameras.main.getWorldPoint(p.x, p.y);
    });
    this.input.on('pointerup', () => { this.touchTarget = null; });

    this.speed = 150; // px/sec (the original's 2.4px/frame ≈ 144px/s at 60fps)
  }

  update() {
    if (!this.player) return;
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
    } else if (this.touchTarget) {
      // Tap-to-move: walk toward the last touch point until close.
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - this.player.y;
      if (Math.hypot(dx, dy) > 4) {
        const a = Math.atan2(dy, dx);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        this.touchTarget = null;
      }
    }

    this.checkExitTile();
  }

  // ── Build from a Tiled export (the real pipeline) ──────────────────────────
  buildFromTiled(key) {
    const map = this.make.tilemap({ key });
    // Tileset name here must match the tileset name inside the .tmj (see maps/README.md).
    const tileset = map.addTilesetImage('tiles', 'tiles');
    const ground = map.createLayer('ground', tileset, 0, 0);
    // Convention: a separate "collision" layer where ANY painted tile blocks.
    // setCollisionByExclusion([-1]) = every non-empty tile collides. This avoids
    // fiddly per-id/GID math — you just paint walls on the collision layer in Tiled.
    this.collisionLayer = map.createLayer('collision', tileset, 0, 0) || ground;
    this.collisionLayer.setCollisionByExclusion([-1]);

    // Object layer "objects": read spawn + exit points + npc markers placed in Tiled.
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
    // A couple of soil plots + a pond so it reads as "a farm", not a void.
    for (let y = 5; y < 8; y++) for (let x = 4; x < 9; x++) data[y][x] = TILES.SOIL;
    for (let y = 4; y < 7; y++) for (let x = 14; x < 18; x++) data[y][x] = TILES.WATER;
    data[9][W - 1] = TILES.EXIT; // a way out on the right edge

    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles');
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollisionByExclusion([
      TILES.GRASS, TILES.SOIL, TILES.PATH, TILES.DOOR, TILES.EXIT,
    ]);

    this.collisionLayer = layer;
    this.exitTiles = [{ x: W - 1, y: 9 }];
    this.mapPixelW = W * TILE;
    this.mapPixelH = H * TILE;
    this.spawnPoint = { x: 5 * TILE, y: 8 * TILE };

    this.add.text(8, 8, 'DEMO ARENA — export a Tiled map to maps/ to replace this',
      { fontSize: '12px', color: '#ffffff', backgroundColor: '#00000066' }).setScrollFactor(0).setDepth(50);
  }

  // Stub: stepping on an EXIT tile travels to the adjacent area in AREA_ORDER.
  // Wire this to your real area-travel + save logic; manifest.json has the graph.
  checkExitTile() {
    if (!this.exitTiles) return;
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    const onExit = this.exitTiles.some((t) => t.x === tx && t.y === ty);
    if (onExit && !this._traveling) {
      this._traveling = true;
      this.cameras.main.flash(200);
      // TODO: look up neighbour in data, save, this.scene.restart({ area: dest })
      this.time.delayedCall(400, () => { this._traveling = false; });
    }
  }
}
