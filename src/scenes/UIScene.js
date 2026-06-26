import Phaser from 'phaser';
import { equippedDamage } from '../systems/inventory.js';

// UIScene runs in PARALLEL with WorldScene (launched, not started) so the HUD never
// blocks gameplay. It also hosts the button that opens the Character & Inventory
// popup, and is where the question modals will live.
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
    this.add.text(this.scale.width - 70, 26, '\u2694 Hero', {
      fontSize: '16px', color: '#ffe9b0',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btn.on('pointerup', openChar);
    this.input.keyboard.on('keydown-I', openChar);

    this.refresh();

    // Keep the HUD in sync whenever the player object changes.
    this.registry.events.on('changedata-player', () => this.refresh());
  }

  refresh() {
    const p = this.registry.get('player');
    if (!p) return;
    const atk = BASE_ATTACK + equippedDamage(p);
    this.hud.setText(
      `${p.profile}    \u2665 ${p.hp}/${p.maxHp}    \u2694 ${atk}    \u25ce ${p.gold}g    Lvl ${p.level}`
    );
  }
}
