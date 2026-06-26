import Phaser from 'phaser';
import { equippedDamage } from '../systems/inventory.js';
import { harvestBonusQuestion } from '../curriculum/questions.js';
import { roundTarget, recordEvidence, fewestCoins, activeQuestTracker } from '../systems/quests.js';
import { save } from '../state/save.js';
import { getSettings, fontPx, speak } from '../systems/settings.js';
import { getParental, addPlaytime, capReached, makeParentGate } from '../systems/parental.js';
import { makeOptions } from '../curriculum/options.js';
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

    // Quest tracker — one plain sentence + a visual cue (the guide's kid-UI rule).
    this.questText = this.add.text(12, HUD_H + 8, '', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(13), color: '#ffe9b0',
      stroke: '#1a1008', strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(101).setVisible(false);

    // Daily play-time tracking (parental). Counts only while a gameplay scene is active.
    this.capShown = false;
    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.tickPlaytime() });

    // Character / Inventory button
    const openChar = () => {
      if (this.scene.isActive('Character')) return;
      this.scene.pause(this.registry.get('activeScene') || 'World');
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

    // Settings (gear) — accessibility + parental controls.
    const openSettings = () => {
      if (this.scene.isActive('Settings')) return;
      const active = this.registry.get('activeScene') || 'World';
      this.scene.pause(active);
      this.scene.launch('Settings', { from: active });
    };
    this.add.rectangle(width - 130, 20, 36, 28, 0x2e2418)
      .setStrokeStyle(2, 0xc9a86a).setDepth(100)
      .setInteractive({ useHandCursor: true }).on('pointerup', openSettings);
    this.add.text(width - 130, 20, '⚙', { fontSize: '18px', color: '#ffe9b0' }).setOrigin(0.5).setDepth(101);
    this.input.keyboard.on('keydown-O', openSettings);

    // ── Bottom seed hotbar ─────────────────────────────────────────────────
    this.hotbarBg = this.add.rectangle(width / 2, height, width, HOTBAR_H, 0x1a1008)
      .setOrigin(0.5, 1).setAlpha(0.82).setDepth(100);
    this.hotbarBorder = this.add.rectangle(width / 2, height - HOTBAR_H, width, 2, 0xc9a86a)
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
    if (!p || !this.hearts) return; // tolerate calls before create() finishes

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
    this.updateTracker();
  }

  // Quest tracker line + seed-hotbar visibility (hotbar is a farm tool, hidden in town).
  updateTracker() {
    const p = this.registry.get('player');
    const onFarm = (this.registry.get('activeScene') || 'World') === 'World';

    const t = p ? activeQuestTracker(p) : null;
    if (this.questText) {
      if (t) this.questText.setText(`◆ ${t.text}  (${t.step}/${t.total})`).setVisible(true);
      else this.questText.setVisible(false);
    }

    const showHotbar = onFarm;
    this.hotbarBg?.setVisible(showHotbar);
    this.hotbarBorder?.setVisible(showHotbar);
    for (const slot of this.hotbarSlots || []) {
      slot.bg.setVisible(showHotbar);
      slot.icon.setVisible(showHotbar);
      slot.count.setVisible(showHotbar);
    }
  }

  // ── Daily play-time cap (parental) ────────────────────────────────────────
  tickPlaytime() {
    const active = this.registry.get('activeScene');
    if (active !== 'World' && active !== 'Town') return; // only count active play
    if (this.scene.isPaused(active)) return;               // not while a menu is open
    addPlaytime(5000);
    if (!this.capShown && capReached()) this.showTimeUp();
  }

  showTimeUp() {
    this.capShown = true;
    const active = this.registry.get('activeScene');
    if (active) this.scene.pause(active);
    const { width, height } = this.scale;

    const els = [];
    const reg = (o) => { els.push(o); return o; };
    reg(this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a14, 0.9).setDepth(300).setInteractive());
    reg(this.add.text(width / 2, height / 2 - 70, '🌙  Time for a break', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(26), color: '#ffe9b0',
    }).setOrigin(0.5).setDepth(301));
    reg(this.add.text(width / 2, height / 2 - 26, "That's your play time for today.\nAsk a grown-up if you'd like a little more.", {
      fontFamily: 'Georgia, serif', fontSize: fontPx(15), color: '#cbb890', align: 'center',
    }).setOrigin(0.5).setDepth(301));
    speak("Time for a break. That's your play time for today.");

    const close = () => { for (const o of els) o.destroy(); };

    // Grown-up "more time" gate (+15 min).
    const gateBtn = reg(this.add.rectangle(width / 2 - 110, height / 2 + 60, 200, 46, 0x4a3a6a)
      .setStrokeStyle(2, 0xc9a86a).setDepth(301).setInteractive({ useHandCursor: true }));
    reg(this.add.text(width / 2 - 110, height / 2 + 60, 'Grown-up: +15 min', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(14), color: '#fff',
    }).setOrigin(0.5).setDepth(301));
    gateBtn.on('pointerup', () => { close(); this.moreTimeGate(active); });

    const stopBtn = reg(this.add.rectangle(width / 2 + 110, height / 2 + 60, 200, 46, 0x5a2a22)
      .setStrokeStyle(2, 0xc9a86a).setDepth(301).setInteractive({ useHandCursor: true }));
    reg(this.add.text(width / 2 + 110, height / 2 + 60, 'Stop for today', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(14), color: '#fff',
    }).setOrigin(0.5).setDepth(301));
    stopBtn.on('pointerup', () => { close(); this.scene.stop('Settings'); this.scene.stop('Character'); this.scene.start('Title'); });
  }

  moreTimeGate(active) {
    const { width, height } = this.scale;
    const gate = makeParentGate();
    const els = [];
    const reg = (o) => { els.push(o); return o; };
    reg(this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a14, 0.9).setDepth(310).setInteractive());
    reg(this.add.text(width / 2, height / 2 - 90, 'Ask a grown-up', { fontFamily: 'Georgia, serif', fontSize: fontPx(20), color: '#ffe9b0' }).setOrigin(0.5).setDepth(311));
    reg(this.add.text(width / 2, height / 2 - 50, `${gate.text} = ?`, { fontFamily: 'Georgia, serif', fontSize: fontPx(28), color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(311));
    const close = () => { for (const o of els) o.destroy(); };
    const grant = () => {
      addPlaytime(-15 * 60000); // give back 15 minutes
      this.capShown = false;
      close();
      if (active) this.scene.resume(active);
    };
    makeOptions(gate.answer).forEach((opt, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = width / 2 + (col ? 70 : -70);
      const y = height / 2 + 10 + row * 60;
      const b = reg(this.add.rectangle(x, y, 120, 50, 0x2e2418).setStrokeStyle(2, 0xc9a86a).setDepth(311).setInteractive({ useHandCursor: true }));
      reg(this.add.text(x, y, `${opt}`, { fontFamily: 'Georgia, serif', fontSize: fontPx(20), color: '#fff' }).setOrigin(0.5).setDepth(311));
      b.on('pointerup', () => { if (opt === gate.answer) grant(); });
    });
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
    const profile = getParental().forceYoungReader ? 'mage' : (this.registry.get('profile') || 'adventurer');
    const q = harvestBonusQuestion(profile);
    const def = cropsData.crops[crop.type];
    speak(`Bonus. ${q.text.replace('×', 'times').replace('=', 'equals')}`);

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

  // ── Make-change market stall (embedded/stealth assessment) ────────────────
  // The child assembles coins to a target — money math AS the mechanic, not a quiz.
  // Non-punitive: a wrong total nudges + lets them retry; a "Show me" assist always
  // completes the round. Every round writes a stealth-evidence entry to the save.
  showMarketStall(quest, round, step, total, profile, onComplete) {
    const { width, height } = this.scale;
    const player = this.registry.get('player');
    const target = roundTarget(round);
    const coins = round.coins;

    const px = width / 2;
    const py = height / 2;
    const panelW = 480;
    const panelH = 340;

    const overlay = this.add.rectangle(px, py, width, height, 0x000000, 0.55).setDepth(200).setInteractive();
    const panel = this.add.rectangle(px, py, panelW, panelH, 0xd4be8a).setStrokeStyle(3, 0x6b4a2a).setDepth(201);
    const inner = this.add.rectangle(px, py, panelW - 10, panelH - 10).setStrokeStyle(1, 0xb09a6a).setFillStyle(0xd4be8a).setDepth(201);
    const els = [overlay, panel, inner];
    const reg = (o) => { els.push(o); return o; };

    reg(this.add.text(px, py - 138, `Customer ${step + 1} of ${total}`, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#7a2e1a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202));

    const prompt = round.mode === 'change'
      ? `The basket costs ${round.price}.\nThe customer pays with ${round.paid}. Give the right change!`
      : `Fill the basket — tap coins to pay exactly ${target}.`;
    reg(this.add.text(px, py - 98, prompt, {
      fontFamily: 'Georgia, serif', fontSize: fontPx(16), color: '#2a1c10', align: 'center',
      wordWrap: { width: panelW - 50 },
    }).setOrigin(0.5).setDepth(202));
    speak(prompt);

    const tallyText = reg(this.add.text(px, py - 44, 'You gave: 0', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#2a1c10', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202));
    const feedback = reg(this.add.text(px, py - 14, 'Tap coins, then press Give.', {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#6b5436',
    }).setOrigin(0.5).setDepth(202));

    let tapped = [];
    let attempts = 0;
    let done = false;
    const sum = () => tapped.reduce((a, b) => a + b, 0);
    const refreshTally = () => tallyText.setText(`You gave: ${sum()}`);

    // ── Coin buttons (large touch targets, colour-coded denominations) ────────
    const coinColor = { 1: 0xc8843a, 5: 0xb8b8c2, 10: 0xe8c33a, 25: 0xcfe0e8 };
    const bw = 74;
    const gap = 12;
    const rowW = coins.length * bw + (coins.length - 1) * gap;
    const startX = px - rowW / 2 + bw / 2;
    const by = py + 40;
    coins.forEach((c, i) => {
      const x = startX + i * (bw + gap);
      const b = this.add.rectangle(x, by, bw, 58, 0x4a3622).setStrokeStyle(2, 0x8a7a5a)
        .setDepth(202).setInteractive({ useHandCursor: true });
      const disc = this.add.circle(x, by - 6, 13, coinColor[c] ?? 0xe8c33a).setDepth(203)
        .setStrokeStyle(2, 0x6b4a2a);
      const lbl = this.add.text(x, by - 6, `${c}`, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a2a14', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(204);
      const sub = this.add.text(x, by + 18, 'coin', {
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#e8d9b0',
      }).setOrigin(0.5).setDepth(204);
      b.on('pointerover', () => b.setFillStyle(0x6a5232));
      b.on('pointerout', () => b.setFillStyle(0x4a3622));
      b.on('pointerup', () => {
        if (done) return;
        tapped.push(c);
        refreshTally();
        feedback.setText('').setColor('#6b5436');
      });
      els.push(b, disc, lbl, sub);
    });

    // ── Controls: Undo + Give (+ Show me after misses) ────────────────────────
    const mkBtn = (x, label, fill, onUp) => {
      const b = this.add.rectangle(x, py + 118, 120, 40, fill).setStrokeStyle(2, 0x6b4a2a)
        .setDepth(202).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, py + 118, label, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(203);
      b.on('pointerup', onUp);
      els.push(b, t);
      return { b, t };
    };

    mkBtn(px - 130, 'Undo', 0x7a5532, () => {
      if (done) return;
      tapped.pop();
      refreshTally();
    });

    let showMe = null;
    const finish = (correct, assisted) => {
      if (done) return;
      done = true;
      const given = assisted ? target : sum();
      recordEvidence(player, quest, {
        signal: 'round', mode: round.mode, needed: target, given,
        attempts: attempts + 1, correct, assisted,
        fewestCoins: !assisted && correct && tapped.length === fewestCoins(target, coins),
      });
      save(player);
      feedback.setColor(correct ? '#2a6e1a' : '#7a4a1a');
      feedback.setText(assisted
        ? `The change is ${target}. Here's how it looks!`
        : 'Perfect change — thank you!');
      this.cameras.main.flash(180, 255, 245, 190);
      this.time.delayedCall(950, () => {
        for (const el of els) el.destroy();
        onComplete();
      });
    };

    mkBtn(px + 130, 'Give', 0x3f7a2a, () => {
      if (done) return;
      if (sum() === target) {
        finish(true, false);
      } else {
        attempts += 1;
        feedback.setColor('#8a2a1a');
        feedback.setText(`That's ${sum()} — they need ${target}. Try again!`);
        tapped = [];
        refreshTally();
        if (attempts >= 2 && !showMe) {
          showMe = mkBtn(px, 'Show me', 0x8a6a2a, () => finish(false, true));
          showMe.b.y = py + 118; // already positioned; keep center
        }
      }
    });
  }
}
