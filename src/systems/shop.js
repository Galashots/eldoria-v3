// Shop logic. Buy seeds, buy Heart Crystals (a gold sink that grants +Max HP), and
// sell spare gear. Bram's shop also poses a word problem for a discount in the
// original — surface that via curriculum/questWordProblem from the scene.
import cropsData from '../data/crops.json';
import economy from '../data/economy.json';

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
