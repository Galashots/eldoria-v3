// Shop logic. Buy seeds, buy Heart Crystals (a gold sink that grants +Max HP), and
// sell spare gear.
import cropsData from '../data/crops.json';
import economy from '../data/economy.json';
import { getChallengeTemplate, evaluateAction } from '../curriculum/index.js';

const { crops } = cropsData;
const heart = economy.heartCrystal;

export function buySeed(player, type, qty = 1) {
  const price = crops[type].cost * qty;
  if (player.gold < price) return false;
  player.gold -= price;
  player.seeds[type] = (player.seeds[type] || 0) + qty;
  return true;
}

// Heart Crystal price climbs with how many you already own (a real late-game sink).
export function heartCrystalPrice(player) {
  return heart.basePrice + (player.hpUpgrades || 0) * heart.priceStepPerOwned;
}

export function buyHeartCrystal(player) {
  const price = heartCrystalPrice(player);
  if (player.gold < price) return false;
  player.gold -= price;
  player.hpUpgrades = (player.hpUpgrades || 0) + 1;
  player.maxHp += heart.hpPerCrystal;
  player.hp += heart.hpPerCrystal;
  return true;
}

// Get the current challenge for a town quest (word problem).
export function getTownQuestChallenge(player) {
  return getChallengeTemplate(player.profile || 'adventurer', 'math');
}

// Evaluate a town quest word problem attempt.
export function evaluateTownQuest(player, actionValue, challengeDef, timeTaken = 0, currentErrorCount = 0) {
  return evaluateAction(actionValue, challengeDef, timeTaken, currentErrorCount);
  // The scene handles quest rewards (e.g., granting gold) if evaluation.success is true.
}
