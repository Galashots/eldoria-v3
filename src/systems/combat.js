// Combat logic. A turn is driven by a curriculum question: a correct answer lands
// the hero's attack; a wrong answer just misses. Losing is penalty-free (respawn at
// full HP) — preserve that, it's why the math never feels like a punishment.
import enemiesData from '../data/enemies.json';
import { combatQuestion } from '../curriculum/index.js';
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

// Ask for this turn's question (the scene shows it; pass the player's profile).
export function nextQuestion(player) {
  return combatQuestion(player.profile || 'adventurer');
}

// Resolve a turn given whether the player's answer was correct.
// Returns an outcome the scene can narrate + animate.
export function resolveTurn(player, enemy, correct) {
  const out = { hit: false, enemyDefeated: false, playerDown: false, loot: null };

  if (correct) {
    const dmg = 4 + gearDamage(player); // base swing + gear; tune freely
    enemy.hp -= dmg;
    out.hit = true;
    if (enemy.hp <= 0) {
      out.enemyDefeated = true;
      player.xp += enemies[enemy.type].xpReward;
      out.loot = rollLoot(enemy.type);
      return out;
    }
  }

  // Enemy always strikes back after the player's turn.
  player.hp -= enemy.attack;
  if (player.hp <= 0) {
    out.playerDown = true;
    player.hp = player.maxHp; // penalty-free respawn
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
