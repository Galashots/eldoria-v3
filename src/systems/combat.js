// Combat logic. A turn is driven by a stealth assessment validation: a correct action lands
// the hero's attack; a wrong answer triggers scaffolding but does not punish.
import enemiesData from '../data/enemies.json';
import { getChallengeTemplate, evaluateAction } from '../curriculum/index.js';
import { equippedDamage } from './inventory.js';

const { enemies } = enemiesData;

export function spawnEnemy(type) {
  const def = enemies[type];
  return { type, name: def.name, hp: def.hp, maxHp: def.hp, attack: def.attack };
}

// Total bonus damage from equipped gear (shared with the character screen).
export function gearDamage(player) {
  return equippedDamage(player);
}

// Get the current challenge for this turn's action.
export function getCombatChallenge(player) {
  return getChallengeTemplate(player.profile || 'adventurer', 'math');
}

// Resolve a turn by evaluating the player's action against the challenge.
// Returns an outcome the scene can narrate + animate.
export function resolveTurn(player, enemy, actionValue, challengeDef, timeTaken = 0, currentErrorCount = 0) {
  const evaluation = evaluateAction(actionValue, challengeDef, timeTaken, currentErrorCount);

  const out = {
    hit: false,
    enemyDefeated: false,
    playerDown: false,
    loot: null,
    evaluation
  };

  if (evaluation.success) {
    const dmg = 4 + gearDamage(player); // base swing + gear; tune freely
    enemy.hp -= dmg;
    out.hit = true;
    if (enemy.hp <= 0) {
      out.enemyDefeated = true;
      player.xp += enemies[enemy.type].xpReward;
      out.loot = rollLoot(enemy.type);
      return out;
    }

    // Enemy strikes back after successful hit unless defeated
    player.hp -= enemy.attack;
    if (player.hp <= 0) {
      out.playerDown = true;
      player.hp = player.maxHp; // penalty-free respawn
    }
  } else {
    // If not successful, we just return the evaluation for scaffolding,
    // enemy does NOT attack (non-punitive), preserving player HP/state.
  }

  return out;
}

function rollLoot(type) {
  const table = enemies[type].loot || [];
  for (const drop of table) {
    if (Math.random() < drop.chance) return drop.item;
  }
  return null;
}
