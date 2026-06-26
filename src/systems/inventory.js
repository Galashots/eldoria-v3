// Inventory + equipment logic. Pure functions over a `player` object and the gear
// table — no Phaser. The CharacterScene calls these and reflects the result.
//
// player.gear      = { weapon, head, body, cape }  // equipped item id or null
// player.inventory = [itemId, ...]                  // spare (un-equipped) items
import gearData from '../data/gear.json';

const { gear } = gearData;
export const SLOTS = ['weapon', 'head', 'body', 'cape'];

export function itemDef(id) {
  return id ? gear[id] : null;
}

// Total bonus damage from everything currently equipped.
export function equippedDamage(player) {
  let dmg = 0;
  for (const slot of SLOTS) {
    const id = player.gear[slot];
    if (id && gear[id]) dmg += gear[id].damage;
  }
  return dmg;
}

// Equip an item from inventory. If something is already in that slot, it swaps back
// into inventory. Returns true on success.
export function equip(player, itemId) {
  const def = gear[itemId];
  if (!def) return false;
  const idx = player.inventory.indexOf(itemId);
  if (idx === -1) return false;            // not actually held
  player.inventory.splice(idx, 1);         // take it out of the bag
  const current = player.gear[def.slot];
  if (current) player.inventory.push(current); // old item goes back to the bag
  player.gear[def.slot] = itemId;
  return true;
}

// Unequip whatever is in a slot back into inventory.
export function unequip(player, slot) {
  const id = player.gear[slot];
  if (!id) return false;
  player.gear[slot] = null;
  player.inventory.push(id);
  return true;
}

// Pick up loot: equip immediately if the slot is empty or the drop is strictly
// better; otherwise it just goes to the bag. Mirrors the original's auto-equip.
export function acquire(player, itemId) {
  const def = gear[itemId];
  if (!def) return { equipped: false };
  const current = player.gear[def.slot];
  if (!current || gear[current].damage < def.damage) {
    if (current) player.inventory.push(current);
    player.gear[def.slot] = itemId;
    return { equipped: true };
  }
  player.inventory.push(itemId);
  return { equipped: false };
}

// Inventory item ids grouped with their defs, for display.
export function listInventory(player) {
  return player.inventory.map((id) => ({ id, ...gear[id] }));
}
