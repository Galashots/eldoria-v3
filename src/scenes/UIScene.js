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

    // ── Feedback Modal ───────────────────────────────────────────────────────
    this.feedbackModal = this.add.container(0, 0).setDepth(200).setVisible(false);

    // Dark background overlay
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    ).setInteractive(); // Blocks clicks to layers below
    this.feedbackModal.add(overlay);

    // Dialog Box
    const dialogBg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      440,
      250,
      0x2e2418
    ).setStrokeStyle(4, 0xc9a86a);
    this.feedbackModal.add(dialogBg);

    // Hint Text
    this.hintText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 30,
      '',
      {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 400, useAdvancedWrap: true }
      }
    ).setOrigin(0.5);
    this.feedbackModal.add(this.hintText);

    // Dismiss Button
    const dismissBtn = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2 + 70,
      220,
      40,
      0x4a3a2a
    ).setStrokeStyle(2, 0xc9a86a).setInteractive({ useHandCursor: true });
    this.feedbackModal.add(dismissBtn);

    const dismissText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 70,
      'Understood - Try Again',
      {
        fontSize: '16px',
        color: '#ffe9b0'
      }
    ).setOrigin(0.5);
    this.feedbackModal.add(dismissText);

    // Dismiss logic
    dismissBtn.on('pointerup', () => {
      this.feedbackModal.setVisible(false);
      this.hintText.setText('');
      this.scene.resume('World');
    });

    // ── Stealth Assessment Trigger Logic ─────────────────────────────────────
    this.onStealthAssessment = (payload) => {
      if (payload.success === false) {
        this.scene.pause('World');
        this.hintText.setText(payload.scaffolding_hint);
        this.feedbackModal.setVisible(true);
      }
    };
    this.registry.events.on('stealth_assessment_event', this.onStealthAssessment);

    // Keep the HUD in sync whenever the player object changes.
    this.onPlayerChange = () => this.refresh();
    this.registry.events.on('changedata-player', this.onPlayerChange);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('stealth_assessment_event', this.onStealthAssessment);
      this.registry.events.off('changedata-player', this.onPlayerChange);
    });
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
