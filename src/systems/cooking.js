// Cooking logic. Turns crops into food that heals HP. Hidden math = ratio/efficiency
// (HP healed per crop spent). After cooking, a doubling question offers a free second
// portion — bonus only, the first portion is never at risk.
import recipesData from '../data/recipes.json';
import { doubleBatchQuestion } from '../curriculum/index.js';

const { recipes } = recipesData;

export function canCook(player, recipeId) {
  const r = recipes[recipeId];
  if (!r) return false;
  return Object.entries(r.cost).every(([crop, n]) => (player.crops[crop] || 0) >= n);
}

// Cook one portion: consumes crops, adds the dish. Returns the doubling question
// the scene should pose for the bonus portion, or null if cooking failed.
export function cook(player, recipeId) {
  if (!canCook(player, recipeId)) return null;
  const r = recipes[recipeId];
  for (const [crop, n] of Object.entries(r.cost)) player.crops[crop] -= n;
  player.food[recipeId] = (player.food[recipeId] || 0) + 1;
  return doubleBatchQuestion(r.heal);
}

// Grant the free bonus portion when the doubling question is answered correctly.
export function grantBonusPortion(player, recipeId) {
  player.food[recipeId] = (player.food[recipeId] || 0) + 1;
}

// Eat a dish to heal.
export function eat(player, recipeId) {
  if ((player.food[recipeId] || 0) <= 0) return 0;
  player.food[recipeId] -= 1;
  const heal = recipes[recipeId].heal;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  return heal;
}
