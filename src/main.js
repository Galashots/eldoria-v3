import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import WorldScene from './scenes/WorldScene.js';
import UIScene from './scenes/UIScene.js';
import CharacterScene from './scenes/CharacterScene.js';

const config = {
  type: Phaser.AUTO,            // WebGL where available (Phaser 4's new renderer), Canvas fallback
  parent: 'game',
  backgroundColor: '#1a1410',
  pixelArt: true,              // nearest-neighbour scaling — crisp 32px sprites, no blur
  scale: {
    mode: Phaser.Scale.FIT,    // scale up to fill the iPad, letterbox to keep aspect
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // Arcade physics is plenty for a top-down farming RPG (tile collision, overlaps).
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  // Order matters: Boot → Preload → Title. World + UI start on demand.
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, UIScene, CharacterScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
