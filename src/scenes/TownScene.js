import Phaser from 'phaser';
import { TILE } from '../config.js';
import { T } from '../render/textures.js';
import { save } from '../state/save.js';
import {
  getQuest, questStatus, startQuest, advanceRound, completeQuest, roundsFor,
} from '../systems/quests.js';
import { getSettings, speak } from '../systems/settings.js';
import { getParental } from '../systems/parental.js';

// Town hub. Built in the same idiom as WorldScene (procedural tilemap via the T enum,
// y-sorted props, pointer/WASD movement) but the interactables are NPCs + a market stall
// rather than soil. Reachable from the farm's right edge; the left edge returns to the farm.
//
// Quest spine (M1): Mira offers "Market Day at Sunmere"; the player serves customers at the
// stall via the make-change overlay in UIScene; finishing stocks the stall (persistent
// consequence) and pays the reward.
const MAP_W = 25;
const MAP_H = 19;
const ZOOM = 2;
const WALKABLE = new Set([T.GRASS, T.SOIL, T.PATH, T.DOOR, T.EXIT, T.SOIL_WET, T.DIRT, T.GRASS_FLOWER]);
const QUEST_ID = 'market-day';

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('Town');
  }

  create() {
    this.profile = this.registry.get('profile') || 'adventurer';
    this.modalOpen = false;
    this.transitioning = false;
    this.registry.set('activeScene', 'Town');

    this.buildTown();

    // ── Player (arrives at the left edge from the farm) ──────────────────────
    const spawn = this.spawnPoint;
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'hero', 0).setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(10, 8).setOffset(3, 8);
    this.facing = 'right';
    this.player.play('hero-idle-right');
    this.physics.add.collider(this.player, this.collisionLayer);
    if (this.solids) this.physics.add.collider(this.player, this.solids);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, this.mapPixelW, this.mapPixelH);
    this.physics.world.setBounds(0, 0, this.mapPixelW, this.mapPixelH);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // Left-edge exit zone back to the farm (symmetric with the farm's right-edge exit).
    this.farmExit = this.add.zone(8, this.mapPixelH / 2, 20, this.mapPixelH);
    this.physics.add.existing(this.farmExit, true);
    this.physics.add.overlap(this.player, this.farmExit, () => this.exitToFarm());

    // ── Input ────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchTarget = null;
    this.pendingInteract = null;

    this.input.on('pointerdown', (p) => {
      if (this.modalOpen) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const near = this.interactableNear(w.x, w.y);
      if (near) {
        if (Math.hypot(near.x - this.player.x, near.y - this.player.y) < TILE * 1.9) {
          this.interact(near);
        } else {
          this.pendingInteract = near;
          this.touchTarget = { x: near.standX, y: near.standY };
        }
        return;
      }
      this.pendingInteract = null;
      this.touchTarget = { x: w.x, y: w.y };
    });
    this.input.on('pointerup', () => { if (!this.pendingInteract) this.touchTarget = null; });
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.modalOpen) return;
      const near = this.nearestInteractable();
      if (near && Math.hypot(near.x - this.player.x, near.y - this.player.y) < TILE * 1.9) this.interact(near);
    });

    // refresh the HUD tracker for whatever quest state we arrive in
    this.scene.get('UI')?.refresh?.();
    this.spawnAmbiance();
  }

  update() {
    if (!this.player) return;
    if (this.modalOpen) { this.player.body.setVelocity(0); return; }

    const body = this.player.body;
    body.setVelocity(0);
    const speed = 130;
    let vx = 0; let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    if (vx || vy) { this.touchTarget = null; this.pendingInteract = null; }
    else if (this.touchTarget) {
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - this.player.y;
      if (Math.hypot(dx, dy) > 4) { vx = dx; vy = dy; }
      else {
        this.touchTarget = null;
        if (this.pendingInteract) { const it = this.pendingInteract; this.pendingInteract = null; this.interact(it); }
      }
    }

    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? 'left' : 'right';
      else this.facing = vy < 0 ? 'up' : 'down';
      const key = `hero-walk-${this.facing}`;
      if (this.player.anims.currentAnim?.key !== key) this.player.play(key);
    } else {
      const key = `hero-idle-${this.facing}`;
      if (this.player.anims.currentAnim?.key !== key) this.player.play(key);
    }

    this.player.setDepth(this.player.y);
  }

  // ── Map build ────────────────────────────────────────────────────────────────
  buildTown() {
    const data = [];
    for (let y = 0; y < MAP_H; y++) {
      const row = [];
      for (let x = 0; x < MAP_W; x++) row.push(Math.random() < 0.05 ? T.GRASS_FLOWER : T.GRASS);
      data.push(row);
    }
    // Main street (horizontal) + a plaza apron of sand around the stalls.
    for (let x = 1; x < MAP_W - 1; x++) data[12][x] = T.PATH;
    for (let x = 6; x <= 16; x++) for (let y = 11; y <= 13; y++) data[y][x] = T.PATH;
    // a short path up to the quest board
    for (let y = 11; y >= 9; y--) data[y][8] = T.PATH;

    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles');
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollisionByExclusion([...WALKABLE]);
    layer.setDepth(-10);
    this.groundLayer = layer;
    this.collisionLayer = layer;

    this.mapPixelW = MAP_W * TILE;
    this.mapPixelH = MAP_H * TILE;
    this.spawnPoint = { x: 1.5 * TILE, y: 12 * TILE };

    this.placeProps();
  }

  prop(name, tx, ty, opts = {}) {
    const px = tx * TILE + (opts.ox ?? TILE / 2);
    const py = ty * TILE + (opts.oy ?? TILE);
    const img = this.add.image(px, py, opts.tex || 'village', name).setOrigin(0.5, 1).setScale(2);
    img.setDepth(opts.flat ? -5 : py);
    return img;
  }

  placeProps() {
    this.solids = this.physics.add.staticGroup();
    this.interactables = [];

    // Houses along the back row + a few trees framing the town.
    [[3, 5], [12, 4], [20, 5]].forEach(([x, y]) => {
      const h = this.prop('house', x, y);
      const c = this.solids.create(h.x, h.y - 18, null).setVisible(false);
      c.body.setSize(96, 56).setOffset(-48, -40);
    });
    [[1, 2], [6, 2], [9, 2], [16, 2], [23, 2], [1, 9], [23, 9], [1, 16], [23, 16], [18, 15]].forEach(([x, y]) => {
      const t = this.prop('tree', x, y);
      const trunk = this.solids.create(t.x, t.y - 6, null).setVisible(false);
      trunk.body.setSize(14, 10).setOffset(-7, -5);
    });
    [[5, 15], [11, 16], [15, 15]].forEach(([x, y]) => this.prop('bush', x, y));

    // Quest board (top of the short path) with Mira standing beside it.
    this.boardImg = this.add.image(8 * TILE + TILE / 2, 9 * TILE + TILE, 'quest_board')
      .setOrigin(0.5, 1).setScale(2);
    this.boardImg.setDepth(this.boardImg.y);
    this.mira = this.add.sprite(9 * TILE + 4, 9 * TILE + TILE - 4, 'hero', 0)
      .setScale(2).setTint(0xffc2cf);
    this.mira.play('hero-idle-down');
    this.mira.setDepth(this.mira.y);
    this.miraMark = this.add.text(this.mira.x, this.mira.y - 40, '', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffe066', stroke: '#2a1c10', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100000);
    this.tweens.add({ targets: this.miraMark, y: this.miraMark.y - 5, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
    this.interactables.push({
      name: 'mira', x: this.mira.x, y: this.mira.y - 16,
      standX: this.mira.x, standY: this.mira.y + TILE * 0.6,
    });

    // Market stall (plaza centre). Stocked look persists once the quest is done.
    const stocked = questStatus(this.registry.get('player'), QUEST_ID) === 'done';
    this.stall = this.add.image(13 * TILE + TILE / 2, 10 * TILE + TILE, stocked ? 'market_stall_full' : 'market_stall')
      .setOrigin(0.5, 1).setScale(2);
    this.stall.setDepth(this.stall.y);
    const sc = this.solids.create(this.stall.x, this.stall.y - 8, null).setVisible(false);
    sc.body.setSize(70, 16).setOffset(-35, -8);
    this.interactables.push({
      name: 'stall', x: this.stall.x, y: this.stall.y - 20,
      standX: this.stall.x, standY: this.stall.y + TILE * 0.7,
    });

    // Signpost back to the farm at the left edge.
    this.add.text(2 * TILE, 11 * TILE, '← Farm', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ffe9b0', stroke: '#2a1c10', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.refreshMiraMark();
  }

  spawnAmbiance() {
    if (getSettings().reduceMotion) return; // calmer screen for motion sensitivity
    this.leaves = this.add.particles(0, 0, 'p_leaf', {
      x: { min: 0, max: this.mapPixelW }, y: -10, lifespan: 8000,
      speedY: { min: 8, max: 22 }, speedX: { min: -14, max: 6 }, scale: 2,
      rotate: { min: 0, max: 360 }, alpha: { start: 0.9, end: 0.5 }, frequency: 1100, quantity: 1,
    });
    this.leaves.setDepth(99999);
  }

  // ── Interactables ────────────────────────────────────────────────────────────
  interactableNear(wx, wy) {
    for (const it of this.interactables) {
      if (Math.hypot(it.x - wx, it.y - wy) < TILE * 1.3) return it;
    }
    return null;
  }

  nearestInteractable() {
    let best = null; let bd = Infinity;
    for (const it of this.interactables) {
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  interact(it) {
    if (it.name === 'mira') this.talkToMira();
    else if (it.name === 'stall') this.useStall();
  }

  refreshMiraMark() {
    if (!this.miraMark) return;
    const status = questStatus(this.registry.get('player'), QUEST_ID);
    this.miraMark.setText(status === 'available' ? '!' : status === 'done' ? '✓' : '…');
    this.miraMark.setColor(status === 'done' ? '#9be88a' : '#ffe066');
  }

  talkToMira() {
    const player = this.registry.get('player');
    const status = questStatus(player, QUEST_ID);
    const quest = getQuest(QUEST_ID);
    if (status === 'available') {
      startQuest(player, QUEST_ID);
      save(player);
      this.refreshMiraMark();
      this.scene.get('UI')?.refresh?.();
      this.showDialog('Mira', `${quest.fiction}\nThe stall is just down the path — tap it to help!`);
    } else if (status === 'active') {
      this.showDialog('Mira', 'Customers are waiting at the stall. Tap it to make their change!');
    } else {
      this.showDialog('Mira', 'You saved market day! The stall has never looked so full. Thank you!');
    }
  }

  useStall() {
    const player = this.registry.get('player');
    const status = questStatus(player, QUEST_ID);
    if (status === 'available') { this.showDialog('Stall', 'Talk to Mira by the quest board first.'); return; }
    if (status === 'done') { this.showDialog('Stall', 'Fresh produce, all stocked up. Lovely!'); return; }

    const quest = getQuest(QUEST_ID);
    const profile = getParental().forceYoungReader ? 'mage' : this.profile;
    const rounds = roundsFor(quest, profile);
    const step = startQuest(player, QUEST_ID).step;
    const round = rounds[step];

    this.modalOpen = true;
    const ui = this.scene.get('UI');
    ui.showMarketStall(quest, round, step, rounds.length, profile, () => {
      // round served
      const done = advanceRound(player, quest);
      save(player);
      if (done) {
        completeQuest(player, quest);
        save(player);
        this.stall.setTexture('market_stall_full');
        this.refreshMiraMark();
        this.celebrate();
        this.showDialog('Mira', `Wonderful! Here's ${quest.reward.gold} gold for your help. ✕ +${quest.reward.gold}g`);
      }
      ui.refresh();
      this.modalOpen = false;
    });
  }

  celebrate() {
    this.cameras.main.flash(250, 255, 240, 180);
    const e = this.add.particles(this.stall.x, this.stall.y - 30, 'p_leaf', {
      speed: { min: 50, max: 120 }, scale: { start: 2.4, end: 0 }, lifespan: 800, quantity: 16, emitting: false,
    }).setDepth(100000);
    e.explode(16);
    this.time.delayedCall(900, () => e.destroy());
  }

  // ── Dialog (screen-space, tap to dismiss) ────────────────────────────────────
  showDialog(speaker, text) {
    speak(`${speaker} says. ${text}`);
    if (this._dialog) this._dialog.destroy();
    const w = this.scale.width;
    const h = this.scale.height;
    const box = this.add.container(0, 0).setDepth(100002).setScrollFactor(0);
    const panel = this.add.rectangle(w / 2, h - 70, Math.min(620, w - 40), 96, 0xd4be8a)
      .setStrokeStyle(3, 0x6b4a2a).setScrollFactor(0);
    const name = this.add.text(w / 2 - Math.min(620, w - 40) / 2 + 16, h - 108, speaker, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#7a2e1a', fontStyle: 'bold',
    }).setScrollFactor(0);
    const body = this.add.text(w / 2, h - 64, text, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2a1c10', align: 'center',
      wordWrap: { width: Math.min(620, w - 40) - 36 },
    }).setOrigin(0.5).setScrollFactor(0);
    const hint = this.add.text(w / 2, h - 30, 'tap to continue', {
      fontFamily: 'Georgia, serif', fontSize: '11px', color: '#6b5436',
    }).setOrigin(0.5).setScrollFactor(0);
    box.add([panel, name, body, hint]);
    this._dialog = box;
    panel.setInteractive().on('pointerup', () => { box.destroy(); if (this._dialog === box) this._dialog = null; });
    this.time.delayedCall(6000, () => { if (this._dialog === box) { box.destroy(); this._dialog = null; } });
  }

  // ── Transition back to the farm ──────────────────────────────────────────────
  exitToFarm() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.registry.set('worldSpawn', { x: 23 * TILE, y: 12 * TILE }); // arrive at farm's right edge
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('World');
    });
  }
}
