// Save/load. Per-profile slots in localStorage, plus export/import strings so a save
// can move between the iPad and a PC (the original's "save tools" did this).
//
// NOTE: localStorage works fine in a normal Vite app like this. (The restriction you
// may have seen only applies to sandboxed preview artifacts, which this isn't.)
import economy from '../data/economy.json';

const KEY = (profile) => `eldoria.save.${profile}`;

export function newPlayer(profile) {
  return {
    profile,
    ...structuredClone(economy.startingPlayer),
    hpUpgrades: 0,
    atkUpgrades: 0,
    questsDone: 0,
  };
}

export function save(player) {
  try {
    localStorage.setItem(KEY(player.profile), JSON.stringify(player));
    return true;
  } catch {
    return false;
  }
}

export function load(profile) {
  try {
    const raw = localStorage.getItem(KEY(profile));
    return raw ? JSON.parse(raw) : newPlayer(profile);
  } catch {
    return newPlayer(profile);
  }
}

// Portable save string (base64 of JSON) for cross-device transfer.
export function exportSave(player) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(player))));
}

export function importSave(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch {
    return null;
  }
}
