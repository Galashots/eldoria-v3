import Phaser from 'phaser';
import profilesData from '../data/profiles.json';
import { load } from '../state/save.js';
import { getSettings } from '../systems/settings.js';

// Title + profile select. Mirrors the original's two reading-level slots. Picking
// one stores it on the game registry so every scene/system can read the profile.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;

    // Apply the saved sound-effects volume on boot (accessible defaults already on).
    this.sound.volume = getSettings().volSfx;

    this.add.text(width / 2, height * 0.22, 'Realm of Eldoria', {
      fontFamily: 'Georgia, serif',
      fontSize: '44px',
      color: '#ffe9b0',
    }).setOrigin(0.5);

    // Settings (accessibility + parental) reachable before play, too.
    const gear = this.add.rectangle(width - 80, 36, 150, 40, 0x2e2418)
      .setStrokeStyle(2, 0xc9a86a).setInteractive({ useHandCursor: true });
    this.add.text(width - 80, 36, '⚙ Settings', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#ffe9b0' }).setOrigin(0.5);
    gear.on('pointerup', () => {
      if (this.scene.isActive('Settings')) return;
      this.scene.pause('Title');
      this.scene.launch('Settings', { from: 'Title' });
    });

    this.add.text(width / 2, height * 0.34, 'Choose your hero', {
      fontSize: '20px', color: '#cbb890',
    }).setOrigin(0.5);

    const ids = Object.keys(profilesData.profiles);
    ids.forEach((id, i) => {
      const p = profilesData.profiles[id];
      const y = height * 0.5 + i * 96;

      const btn = this.add.rectangle(width / 2, y, 360, 76, 0x2e2418)
        .setStrokeStyle(3, id === 'adventurer' ? 0x6ca0ff : 0xc06cff)
        .setInteractive({ useHandCursor: true });

      this.add.text(width / 2, y - 14, p.label, { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(width / 2, y + 16, p.readingLevel, { fontSize: '15px', color: '#9c8f76' }).setOrigin(0.5);

      const choose = () => {
        this.registry.set('profile', id);

        // Create or load the real player object and put it on the registry so every
        // scene/system shares one source of truth.
        const player = load(id);

        // DEMO SEED (remove once loot drops fill the bag naturally): give the kids a
        // couple of spare items + one equipped weapon so the Character screen isn't
        // empty on a fresh save.
        if (player.inventory.length === 0 && !player.gear.weapon) {
          player.gear.weapon = 'wooden_sword';
          player.inventory.push('leather_cap', 'hero_cape', 'iron_armor');
        }
        this.registry.set('player', player);

        this.scene.start('World');
        this.scene.launch('UI');
      };
      btn.on('pointerup', choose);
    });
  }
}
