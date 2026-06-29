import Phaser from 'phaser';
import { SLOTS, equippedDamage, equip, unequip, listInventory, itemDef } from '../systems/inventory.js';
import { save } from '../state/save.js';

// Character & Inventory popup. Launched as an overlay (it pauses World). Kids tap a
// bag item to equip it, or tap an equipped slot to take it off. Everything is big
// touch targets and re-renders live. Closes with the X, Esc, or the I key.
const BASE_ATTACK = 4; // hero's base swing before gear (matches combat.js)

const SLOT_LABEL = { weapon: 'Weapon', head: 'Head', body: 'Body', cape: 'Cape' };
const SLOT_ICON = { weapon: '\u2694', head: '\u26d1', body: '\ud83d\udee1', cape: '\ud83e\udde3' };

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  create() {
    this.player = this.registry.get('player');
    const { width, height } = this.scale;

    // Dim the world behind the panel and swallow taps so they don't reach the game.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0).setInteractive();

    const PW = Math.min(640, width - 40);
    const PH = Math.min(520, height - 40);
    this.px = (width - PW) / 2;
    this.py = (height - PH) / 2;

    this.add.rectangle(this.px, this.py, PW, PH, 0x241c12)
      .setOrigin(0).setStrokeStyle(3, 0xc9a86a);
    this.add.text(this.px + 20, this.py + 16, 'Character', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffe9b0',
    });

    // Close affordances
    const close = () => this.closeScreen();
    this.add.text(this.px + PW - 38, this.py + 14, '\u2715', {
      fontSize: '26px', color: '#ffffff',
    }).setInteractive({ useHandCursor: true }).on('pointerup', close);
    this.input.keyboard.on('keydown-ESC', close);
    this.input.keyboard.on('keydown-I', close);

    // Two columns: left = stats + equipped, right = bag.
    this.colLeftX = this.px + 20;
    this.colRightX = this.px + PW / 2 + 10;
    this.colWidth = PW / 2 - 30;

    this.dynamic = this.add.container(0, 0); // everything that re-renders lives here
    this.render();
  }

  render() {
    this.dynamic.removeAll(true);
    const p = this.player;
    let y = this.py + 64;

    // ── Stats ────────────────────────────────────────────────────────────────
    const atk = BASE_ATTACK + equippedDamage(p);
    const stats = [
      `Hero:  ${p.profile}`,
      `\u2665 HP:  ${p.hp} / ${p.maxHp}`,
      `Level: ${p.level}   XP: ${p.xp}`,
      `\u2694 Attack: ${atk}   (base ${BASE_ATTACK} + gear ${equippedDamage(p)})`,
      `\u25ce Gold:  ${p.gold}`,
    ];
    stats.forEach((s, i) => {
      this.dynamic.add(this.add.text(this.colLeftX, y + i * 24, s, {
        fontSize: '16px', color: '#f0e6d0',
      }));
    });
    y += stats.length * 24 + 14;

    // ── Equipped slots (tap to remove) ───────────────────────────────────────
    this.dynamic.add(this.add.text(this.colLeftX, y, 'Equipped', {
      fontSize: '18px', color: '#c9a86a',
    }));
    y += 28;
    for (const slot of SLOTS) {
      const id = p.gear[slot];
      const def = itemDef(id);
      const rowY = y;
      const row = this.add.rectangle(this.colLeftX, rowY, this.colWidth, 40, 0x342a1c)
        .setOrigin(0, 0).setStrokeStyle(1, 0x5a4a30);
      const label = def
        ? `${SLOT_ICON[slot]} ${def.name}  +${def.damage}`
        : `${SLOT_ICON[slot]} ${SLOT_LABEL[slot]} — empty`;
      const txt = this.add.text(this.colLeftX + 10, rowY + 11, label, {
        fontSize: '15px', color: def ? '#ffffff' : '#8a7d64',
      });
      if (def) {
        row.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          unequip(p, slot);
          this.persistAndRefresh();
        });
        this.add.text(this.colLeftX + this.colWidth - 64, rowY + 12, 'remove', {
          fontSize: '12px', color: '#d98a8a',
        }).setName('hint');
      }
      this.dynamic.add(row);
      this.dynamic.add(txt);
      y += 46;
    }

    // ── Bag / inventory (tap to equip) ───────────────────────────────────────
    let ry = this.py + 64;
    this.dynamic.add(this.add.text(this.colRightX, ry, 'Bag', {
      fontSize: '18px', color: '#c9a86a',
    }));
    ry += 28;
    const bag = listInventory(p);
    if (bag.length === 0) {
      this.dynamic.add(this.add.text(this.colRightX, ry, 'Empty — defeat enemies to find gear!', {
        fontSize: '14px', color: '#8a7d64', wordWrap: { width: this.colWidth },
      }));
    } else {
      bag.forEach((item) => {
        const rowY = ry;
        const row = this.add.rectangle(this.colRightX, rowY, this.colWidth, 40, 0x2a3420)
          .setOrigin(0, 0).setStrokeStyle(1, 0x4a5a30)
          .setInteractive({ useHandCursor: true });
        const txt = this.add.text(this.colRightX + 10, rowY + 6,
          `${SLOT_ICON[item.slot]} ${item.name}\n   +${item.damage} ${item.slot}`, {
            fontSize: '13px', color: '#eaffea', lineSpacing: 0,
          });
        row.on('pointerup', () => {
          equip(p, item.id);
          this.persistAndRefresh();
        });
        this.dynamic.add(row);
        this.dynamic.add(txt);
        ry += 46;
      });
    }

    this.dynamic.add(this.add.text(this.px + 20, this.py + this.scaleWith(), 'Tap a bag item to equip it. Tap an equipped item to take it off.', {
      fontSize: '12px', color: '#8a7d64',
    }));
  }

  scaleWith() {
    return Math.min(520, this.scale.height - 40) - 34;
  }

  persistAndRefresh() {
    save(this.player);
    this.render();
    this.events.emit('inventory-changed');
    this.registry.set('player', this.player);
  }

  closeScreen() {
    this.scene.resume('World');
    this.scene.stop();
  }
}
