import Phaser from 'phaser';
import {
  buildGroundTileset, buildCropTextures, buildIcons, registerProps,
} from '../render/textures.js';

// PreloadScene loads the CC0 Ninja Adventure art (vendored in public/assets/ninja),
// composites the 32px ground tileset, generates the tilled-soil + crop sprites the
// pack doesn't ship, registers prop sub-frames, and builds the character walk
// animations. After this, the scenes just place sprites.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 18, 0x88dd44).setOrigin(0.5);
    this.add.rectangle(width / 2, height / 2, 204, 22).setStrokeStyle(2, 0xffffff);
    this.load.on('progress', (p) => { bar.width = 200 * p; });

    const A = 'assets/ninja';
    // Terrain + props (source images; we composite/slice from these).
    this.load.image('floor', `${A}/tileset_floor.png`);
    this.load.image('village', `${A}/tileset_village.png`);
    this.load.image('animated', `${A}/tileset_animated.png`);
    // Character: 16x16 frame grid (4 cols x 7 rows).
    this.load.spritesheet('hero', `${A}/hero.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('pig', `${A}/pig.png`, { frameWidth: 16, frameHeight: 16 });
    // Particles + tufts for juice/ambiance.
    this.load.image('p_grass', `${A}/particle_grass.png`);
    this.load.image('p_leaf', `${A}/particle_leaf.png`);
    this.load.image('p_wood', `${A}/particle_wood.png`);
    this.load.image('grass_tuft', `${A}/grass_tuft.png`);
    this.load.image('heart_full', `${A}/heart_full.png`);
  }

  create() {
    buildGroundTileset(this);
    buildCropTextures(this);
    buildIcons(this);
    registerProps(this);
    this.buildHeroAnims();
    this.scene.start('Title');
  }

  // Ninja Adventure character convention: frames 0-3 down, 4-7 up, 8-11 left,
  // 12-15 right. (Verified/corrected in-game.) Idle = first frame of each dir.
  buildHeroAnims() {
    const dirs = { down: 0, up: 4, left: 8, right: 12 };
    for (const [dir, base] of Object.entries(dirs)) {
      this.anims.create({
        key: `hero-walk-${dir}`,
        frames: this.anims.generateFrameNumbers('hero', { start: base, end: base + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `hero-idle-${dir}`,
        frames: [{ key: 'hero', frame: base }],
        frameRate: 1,
      });
    }
  }
}
