// Farming logic. Pure functions over a `player` object + the crop data table.
// No Phaser, no canvas — the scene calls these and reflects the result visually.
import cropsData from '../data/crops.json';
import { getChallengeTemplate, evaluateAction } from '../curriculum/index.js';

const { crops } = cropsData;

export function canPlant(player, type) {
  return player.seeds[type] > 0;
}

// Plant: consumes a seed, returns a crop record the scene can place on a soil tile.
export function plant(player, type, key, now = Date.now()) {
  if (!canPlant(player, type)) return null;
  player.seeds[type] -= 1;
  return { key, type, plantedAt: now, status: 'growing' };
}

// Has a growing crop ripened?
export function isReady(crop, now = Date.now()) {
  return now - crop.plantedAt >= crops[crop.type].grow;
}

// Harvest one ready crop → adds to the player's crop stash.
export function harvest(player, crop) {
  if (crop.status !== 'ready') return false;
  player.crops[crop.type] = (player.crops[crop.type] || 0) + 1;
  crop.status = 'harvested';
  return true;
}

// Get the current challenge for auto-harvesting an area (bonus).
export function getHarvestBonusChallenge(player) {
  return getChallengeTemplate(player.profile || 'adventurer', 'math');
}

// Evaluate a harvest bonus attempt.
export function evaluateHarvestBonus(player, actionValue, challengeDef, timeTaken = 0, currentErrorCount = 0) {
  return evaluateAction(actionValue, challengeDef, timeTaken, currentErrorCount);
  // The scene handles auto-harvesting all crops if evaluation.success is true.
}

// Sell crops at the shop. Returns gold earned.
export function sellCrop(player, type, qty = 1) {
  const have = player.crops[type] || 0;
  const n = Math.min(have, qty);
  player.crops[type] -= n;
  const gold = n * crops[type].sell;
  player.gold += gold;
  return gold;
}
