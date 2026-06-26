import Phaser from 'phaser';
import { equippedDamage } from '../systems/inventory.js';
import { harvestBonusQuestion } from '../curriculum/questions.js';
import cropsData from '../data/crops.json';

const BASE_ATTACK = 4;
const HUD_H = 40;
const HOTBAR_H = 52;
const BTN_SIZE = 80;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const { width, height } = this.scale;

    // ── Top HUD bar ────────────────────────────────────────────────────────
    this.hudBg = this.add.rectangle(width / 2, 0, width, HUD_H, 0x1a1008)
      .setOrigin(0.5, 0).setAlpha(0.82).setDepth(100);
    this.add.rectangle(width / 2, HUD_H, width, 2, 0xc9a86a)
      .setOrigin(0.5, 0).setDepth(100);

    // Hearts
    this.hearts = [];
    for (let i = 0; i < 5; i++) {
      const h = this.add.image(14 + i * 28, 20, 'heart_full').setScale(2)
        .setOrigin(0, 0.5).setDepth(101);
      this.hearts.push(h);
    }

    // Gold
    this.goldIcon = this.add.image(166, 20, 'icon_coin').setScale(1.6)
      .setOrigin(0, 0.5).setDepth(101);
    this.goldText = this.add.text(188, 20, '0g', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#f4d75a',
      stroke: '#1a1008', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(101);

    // Day label
    this.dayText = this.add.text(width / 2, 20, 'Day 1', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#e8d8b8',
      stroke: '#1a1008', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(101);

    // Character / Inventory button
    const openChar = () => {
      if (this.scene.isActive('Character')) return;
      this.scene.pause('World');
      this.scene.launch('Character');
    };
    this.add.rectangle(width - 60, 20, 100, 28, 0x2e2418)
      .setStrokeStyle(2, 0xc9a86a).setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', openChar);
    this.add.text(width - 60, 20, 'Hero', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#ffe9b0',
    }).setOrigin(0.5).setDepth(101);
    this.input.keyboard.on('keydown-I', openChar);

    // ── Bottom seed hotbar ─────────────────────────────────────────────────
    this.hotbarBg = this.add.rectangle(width / 2, height, width, HOTBAR_H, 0x1a1008)
      .setOrigin(0.5, 1).setAlpha(0.82).setDepth(100);
    this.add.rectangle(width / 2, height - HOTBAR_H, width, 2, 0xc9a86a)
      .setOrigin(0.5, 1).setDepth(100);

    this.hotbarSlots = [];
    const order = cropsData.order;
    const slotW = 64;
    const totalW = order.length * slotW;
    const startX = (width - totalW) / 2 + slotW / 2;
    const slotY = height - HOTBAR_H / 2;

    for (let i = 0; i < order.length; i++) {
      const type = order[i];
      const x = startX + i * slotW;

      const bg = this.add.rectangle(x, slotY, 54, 42, 0x2e2418)
        .setStrokeStyle(2, 0x5a4a2e).setDepth(100)
        .setInteractive({ useHandCursor: true });

      const icon = this.add.image(x, slotY - 6, `crop_${type}`, 3).setScale(2.4)
        .setDepth(101);

      const count = this.add.text(x, slotY + 14, '0', {
        fontFamily: 'Georgia, serif', fontSize: '11px', color: '#d0c0a0',
        stroke: '#1a1008', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(101);

      bg.on('pointerup', () => {
        this.registry.set('selectedSeed', type);
        this.refreshHotbar();
      });

      this.hotbarSlots.push({ type, bg, icon, count });
    }

    this.refresh();
    this.registry.events.on('changedata-player', () => this.refresh());
  }

  refresh() {
    const p = this.registry.get('player');
    if (!p) return;

    // Hearts: each heart = 4hp
    const maxHearts = Math.ceil(p.maxHp / 4);
    const fullHearts = Math.floor(p.hp / 4);
    for (let i = 0; i < this.hearts.length; i++) {
      if (i < maxHearts) {
        this.hearts[i].setVisible(true);
        this.hearts[i].setAlpha(i < fullHearts ? 1 : 0.25);
      } else {
        this.hearts[i].setVisible(false);
      }
    }

    // Gold
    this.goldText.setText(`${p.gold}g`);

    this.refreshHotbar();
  }

  refreshHotbar() {
    const p = this.registry.get('player');
    if (!p) return;
    const selected = this.registry.get('selectedSeed') || 'turnip';

    for (const slot of this.hotbarSlots) {
      const seeds = p.seeds[slot.type] || 0;
      slot.count.setText(`${seeds}`);
      const isSelected = slot.type === selected;
      slot.bg.setStrokeStyle(2, isSelected ? 0xf4d75a : 0x5a4a2e);
      slot.bg.setFillStyle(isSelected ? 0x3e3218 : 0x2e2418);
      slot.icon.setAlpha(seeds > 0 ? 1 : 0.35);
    }
  }

  // ── Harvest bonus modal (parchment skin) ─────────────────────────────────
  showHarvestModal(crop, callback) {
    const { width, height } = this.scale;
    const profile = this.registry.get('profile') || 'adventurer';
    const q = harvestBonusQuestion(profile);
    const def = cropsData.crops[crop.type];

    // Dim overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
      .setDepth(200).setInteractive();

    // Parchment panel
    const panelW = 340;
    const panelH = 260;
    const px = width / 2;
    const py = height / 2;

    const panel = this.add.rectangle(px, py, panelW, panelH, 0xd4be8a)
      .setStrokeStyle(3, 0x6b4a2a).setDepth(201);
    // Inner border for parchment feel
    const inner = this.add.rectangle(px, py, panelW - 10, panelH - 10)
      .setStrokeStyle(1, 0xb09a6a).setFillStyle(0xd4be8a).setDepth(201);

    // Title
    const title = this.add.text(px, py - 100, `Bonus! ${def.name} Harvest`, {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3e2a10',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    // Question
    const question = this.add.text(px, py - 60, q.text, {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#2a1c10',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    // 2x2 answer buttons
    const buttons = [];
    const opts = q.options;
    const bx = [px - BTN_SIZE / 2 - 8, px + BTN_SIZE / 2 + 8];
    const by = [py - 6, py + BTN_SIZE / 2 + 22];

    const modalElements = [overlay, panel, inner, title, question];

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = bx[col];
      const y = by[row];

      const bg = this.add.rectangle(x, y, BTN_SIZE - 4, 38, 0x4a3622)
        .setStrokeStyle(2, 0x8a7a5a).setDepth(202)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, `${opts[i]}`, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#ffe9b0',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(203);

      bg.on('pointerover', () => bg.setFillStyle(0x6a5232));
      bg.on('pointerout', () => bg.setFillStyle(0x4a3622));

      bg.on('pointerup', () => {
        const correct = opts[i] === q.answer;
        this.showModalFeedback(correct, q.answer, def, px, py, modalElements, buttons, callback);
      });

      buttons.push(bg, label);
      modalElements.push(bg, label);
    }
  }

  showModalFeedback(correct, answer, def, px, py, elements, buttons, callback) {
    // Disable all buttons
    for (const el of buttons) {
      if (el.input) el.removeInteractive();
    }

    // Feedback text
    const msg = correct
      ? `Correct! +${def.sell}g bonus!`
      : `The answer was ${answer}. Harvest kept!`;
    const color = correct ? '#2a6e1a' : '#8a2a1a';

    const feedback = this.add.text(px, py + 88, msg, {
      fontFamily: 'Georgia, serif', fontSize: '14px', color,
      fontStyle: 'bold', stroke: '#d4be8a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(203);
    elements.push(feedback);

    // Flash effect
    if (correct) {
      this.cameras.main.flash(200, 255, 255, 150);
    }

    // Auto-close after delay
    this.time.delayedCall(correct ? 1200 : 1800, () => {
      for (const el of elements) el.destroy();
      callback(correct, answer);
    });
  }
}
