import Phaser from 'phaser';
import { TILE, TILES } from '../config.js';

// PreloadScene loads art. CRUCIAL for a clean handoff: it works with ZERO binary
// assets by generating placeholder textures at runtime, so `npm run dev` runs
// immediately. As you drop real PNGs into public/assets, switch the TODO blocks
// below from generated placeholders to this.load.image(...) / spritesheet(...).
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // A simple loading bar so large real assets later don't look like a freeze.
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 18, 0x88dd44).setOrigin(0.5);
    const frame = this.add.rectangle(width / 2, height / 2, 204, 22).setStrokeStyle(2, 0xffffff);
    this.load.on('progress', (p) => { bar.width = 200 * p; });

    // ── TODO (real art): once your sprites are in public/assets, load them here, e.g.
    //   this.load.image('shop_building', 'assets/shop_building.png');
    //   this.load.spritesheet('adventurer-walk', 'assets/adventurer-down-walk.png',
    //     { frameWidth: 32, frameHeight: 32 });
    //   this.load.audio('music-town', 'assets/music-town.mp3');
    // Your original /tools sprite pipeline produces frames already sized for this.

    // ── TODO (real maps): load Tiled exports here, e.g.
    //   this.load.tilemapTiledJSON('farm', 'maps/farm.tmj');
    //   this.load.image('tiles', 'assets/tileset.png');
    // For now WorldScene builds a demo arena from the generated 'tiles' below.

    frame.setDepth(0);
  }

  create() {
    this.makePlaceholderTileset();
    this.makePlaceholderPlayer();
    this.scene.start('Title');
  }

  // Generates an 8-tile tileset texture keyed 'tiles', one 32px cell per TILES id,
  // so both the demo arena AND a real Tiled map (tileset named "tiles") render with
  // no image file present. Replace by loading a real tileset PNG in preload().
  makePlaceholderTileset() {
    const colors = {
      [TILES.GRASS]: 0x4f8a35,
      [TILES.WATER]: 0x2a6cc0,
      [TILES.TREE]: 0x1f5c1f,
      [TILES.SOIL]: 0x6b4226,
      [TILES.PATH]: 0xc9a86a,
      [TILES.HOUSE]: 0x8a8a8a,
      [TILES.DOOR]: 0x7a4a1a,
      [TILES.EXIT]: 0xd4b483,
    };
    const ids = Object.keys(colors).map(Number).sort((a, b) => a - b);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    ids.forEach((id, i) => {
      g.fillStyle(colors[id], 1);
      g.fillRect(i * TILE, 0, TILE, TILE);
      g.lineStyle(1, 0x000000, 0.15);
      g.strokeRect(i * TILE + 0.5, 0.5, TILE - 1, TILE - 1);
    });
    g.generateTexture('tiles', ids.length * TILE, TILE);
    g.destroy();
  }

  makePlaceholderPlayer() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffd166, 1);
    g.fillRoundedRect(5, 4, 22, 26, 5);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(11, 12, 4, 4);
    g.fillRect(19, 12, 4, 4);
    g.generateTexture('player', TILE, TILE);
    g.destroy();
  }
}
