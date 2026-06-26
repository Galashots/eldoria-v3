import Phaser from 'phaser';

// Boot does almost nothing here — it's the place for any config you need *before*
// the loading bar (e.g. loading a tiny font for the Preload screen).
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}
