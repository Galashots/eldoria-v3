// Cooking logic. Turns crops into food that heals HP.
// After cooking, a stealth assessment challenge offers a free second portion — bonus only.
import recipesData from '../data/recipes.json';
import { getChallengeTemplate, evaluateAction } from '../curriculum/index.js';

const { recipes } = recipesData;

export function canCook(player, recipeId) {
  const r = recipes[recipeId];
  if (!r) return false;
  return Object.entries(r.cost).every(([crop, n]) => (player.crops[crop] || 0) >= n);
}

// Cook one portion: consumes crops, adds the dish. Returns the stealth assessment challenge
// the scene should evaluate for the bonus portion, or null if cooking failed.
export function cook(player, recipeId) {
  if (!canCook(player, recipeId)) return null;
  const r = recipes[recipeId];
  for (const [crop, n] of Object.entries(r.cost)) player.crops[crop] -= n;
  player.food[recipeId] = (player.food[recipeId] || 0) + 1;
  return getChallengeTemplate(player.profile || 'adventurer', 'math');
}

// Evaluate the bonus portion challenge.
export function evaluateBonusPortion(player, recipeId, actionValue, challengeDef, timeTaken = 0, currentErrorCount = 0) {
    const evaluation = evaluateAction(actionValue, challengeDef, timeTaken, currentErrorCount);

    if (evaluation.success) {
        player.food[recipeId] = (player.food[recipeId] || 0) + 1;
    }

    return evaluation;
}

// Eat a dish to heal.
export function eat(player, recipeId) {
  if ((player.food[recipeId] || 0) <= 0) return 0;
  player.food[recipeId] -= 1;
  const heal = recipes[recipeId].heal;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  return heal;
}
