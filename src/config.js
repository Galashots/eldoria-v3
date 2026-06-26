// Constants carried over from the original single-file build so the curriculum,
// economy, and systems behave identically. Geometry (MAP_W/H) is only a *default*
// now — real maps come from Tiled and can be any size and shape.

export const TILE = 32;

// Logical render resolution. Phaser's Scale.FIT scales this up to fill the iPad
// while preserving the pixel-art aspect ratio. 800x600 ~ a comfortable viewport.
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Tile type ids — kept identical to the original so saved data and the manifest line up.
// In Tiled these map to tileset indices; see maps/README.md for the convention.
export const TILES = {
  GRASS: 0,
  WATER: 1,
  TREE: 2,
  SOIL: 3,
  PATH: 4,
  HOUSE: 5,
  DOOR: 6,
  EXIT: 7,
};

// Tiles a walking entity cannot enter (collision). Door/Exit stay walkable.
export const BLOCKED = new Set([TILES.WATER, TILES.TREE, TILES.HOUSE]);

// The two learner profiles. These are reading-level slots, NOT child names — the
// original deliberately keyed difficulty to reading level so either kid can use either.
export const PROFILES = ['adventurer', 'mage'];
