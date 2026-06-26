import Phaser from 'phaser';
import { equippedDamage } from '../systems/inventory.js';
import cropsData from '../data/crops.json';

const BASE_ATTACK = 4;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.hud = this.add.text(12, 12, '', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(100);

    // ── Seed selector (tap to cycle) ────────────────────────────────────────
    this.seedLabel = this.add.text(12, 48, '', {
      fontSize: '14px',
      color: '#88dd44',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    this.seedLabel.on('pointerup', () => this.cycleSeed());

    // ── Character / Inventory button (tap or press I) ────────────────────────
    const openChar = () => {
      if (this.scene.isActive('Character')) return;
      this.scene.pause('World');
      this.scene.launch('Character');
    };
    const btn = this.add.rectangle(this.scale.width - 70, 26, 120, 36, 0x2e2418)
      .setScrollFactor(0).setDepth(100)
      .setStrokeStyle(2, 0xc9a86a)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 70, 26, '⚔ Hero', {
      fontSize: '16px', color: '#ffe9b0',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btn.on('pointerup', openChar);
    this.input.keyboard.on('keydown-I', openChar);

    this.refresh();

    this.registry.events.on('changedata-player', () => this.refresh());
  }

  refresh() {
    const p = this.registry.get('player');
    if (!p) return;
    const atk = BASE_ATTACK + equippedDamage(p);
    this.hud.setText(
      `${p.profile}    ♥ ${p.hp}/${p.maxHp}    ⚔ ${atk}    ◎ ${p.gold}g    Lvl ${p.level}`
    );
    this.refreshSeed();
  }

  refreshSeed() {
    const p = this.registry.get('player');
    if (!p || !this.seedLabel) return;
    const selected = this.registry.get('selectedSeed') || 'turnip';
    const count = p.seeds[selected] || 0;
    const name = cropsData.crops[selected]?.name || selected;
    this.seedLabel.setText(`Seed: ${name} (${count})  ▸`);
  }

  cycleSeed() {
    const player = this.registry.get('player');
    if (!player) return;
    const order = cropsData.order;
    const current = this.registry.get('selectedSeed') || 'turnip';
    const idx = order.indexOf(current);
    for (let i = 1; i <= order.length; i++) {
      const next = order[(idx + i) % order.length];
      if (player.seeds[next] > 0) {
        this.registry.set('selectedSeed', next);
        this.refreshSeed();
        return;
      }
    }
    this.refreshSeed();
  }
}
