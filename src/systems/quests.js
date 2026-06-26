// Quest logic. Pure functions over a `player` object + the quest data tables — no Phaser.
// Mirrors the framework-agnostic style of farming.js / inventory.js so the scene calls these
// and reflects the result visually. State machine: available → active → done.
//
// player.quests   = { [id]: { status, step } }   // step = customers served so far
// player.evidence = [ { quest, subject, competency, signal, ..., t } ]  // stealth-assessment log
//
// The evidence log is deliberately subject-agnostic so science/social/literacy quests added
// later emit the same way (see docs/curriculum/stealth-assessment-model.md).
import marketDay from '../data/quests/market-day.json';

const QUESTS = {
  'market-day': marketDay,
};

export function getQuest(id) {
  return QUESTS[id] || null;
}

// Tolerate older saves that predate quests/evidence (newPlayer doesn't seed them).
export function ensureQuestState(player) {
  if (!player.quests) player.quests = {};
  if (!player.evidence) player.evidence = [];
  return player;
}

export function questStatus(player, id) {
  ensureQuestState(player);
  return player.quests[id]?.status || 'available';
}

// Begin a quest (idempotent). Returns the quest's player-state record.
export function startQuest(player, id) {
  ensureQuestState(player);
  if (!player.quests[id]) player.quests[id] = { status: 'active', step: 0 };
  return player.quests[id];
}

// The profile-scaled round list for a quest.
export function roundsFor(quest, profile) {
  return quest.rounds[profile] || quest.rounds.adventurer;
}

// Total quantity the player must assemble for a round, regardless of mode.
//   pay    → the target itself
//   change → the difference the customer is owed (paid − price)
export function roundTarget(round) {
  return round.mode === 'change' ? round.paid - round.price : round.target;
}

// The fewest number of coins that can make `amount` from a denomination set (greedy works for
// these canonical coin systems). Used to award the optional fewest-coins bonus signal.
export function fewestCoins(amount, coins) {
  let left = amount;
  let n = 0;
  for (const c of [...coins].sort((a, b) => b - a)) {
    n += Math.floor(left / c);
    left %= c;
  }
  return left === 0 ? n : Infinity;
}

// Append one stealth-evidence entry. `entry` carries the signal fields; quest/subject/competency
// are stamped from the quest def so callers stay terse.
export function recordEvidence(player, quest, entry) {
  ensureQuestState(player);
  player.evidence.push({
    quest: quest.id,
    subject: quest.subject,
    competency: quest.competency,
    t: Date.now(),
    ...entry,
  });
}

// Advance to the next customer. Returns true once every round is served.
export function advanceRound(player, quest) {
  const st = startQuest(player, quest.id);
  st.step += 1;
  const total = Object.values(quest.rounds)[0].length; // all profiles share round count
  return st.step >= total;
}

// Mark a quest finished + grant its reward (gold, quest tally). Idempotent.
export function completeQuest(player, quest) {
  const st = startQuest(player, quest.id);
  if (st.status === 'done') return st;
  st.status = 'done';
  player.gold += quest.reward?.gold || 0;
  player.questsDone = (player.questsDone || 0) + 1;
  return st;
}

// The single active quest to surface in the HUD tracker (first active one wins).
export function activeQuestTracker(player) {
  ensureQuestState(player);
  for (const [id, st] of Object.entries(player.quests)) {
    if (st.status === 'active') {
      const def = QUESTS[id];
      const total = Object.values(def.rounds)[0].length;
      return { id, def, step: st.step, total, text: def.tracker };
    }
  }
  return null;
}
