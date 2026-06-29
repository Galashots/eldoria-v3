// ─────────────────────────────────────────────────────────────────────────────
// Realm of Eldoria — curriculum question bank
//
// Ported faithfully from the original single-file build. The pedagogy is preserved
// exactly: difficulty keys off the learner PROFILE (reading level), never a child's
// name, and every generator returns a plain { text, answer, options? } object so the
// rendering layer (Phaser modal) stays dumb.
//
//   'adventurer'  ≈ older reader, ~grade 5:  multiplication, subtraction, estimation
//   'mage'        ≈ early reader, ~grade 2:  addition / counting, totals kept ≤ 20
//
// DESIGN INVARIANT (do not break): math is always a BONUS, never a gate. A wrong
// answer costs nothing — it only ever withholds an extra reward. Keep new questions
// faithful to that or the whole "learning hidden in play" premise collapses.
// ─────────────────────────────────────────────────────────────────────────────

import { makeOptions, tensOptions, roundToTen } from './options.js';

const rint = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// COMBAT — answer to land an attack. adventurer: subtraction + ~1/3 estimation.
// mage: small subtraction kept ≤ 20.
export function combatQuestion(profile) {
  if (profile === 'adventurer') {
    if (Math.random() < 0.34) {
      const ea = rint(10, 89);
      const eb = rint(10, 89);
      const est = roundToTen(ea) + roundToTen(eb);
      return { text: `About how much? ${ea} + ${eb}`, answer: est, options: tensOptions(est) };
    }
    const x = rint(20, 79);
    const y = rint(1, x - 1);
    return { text: `${x} − ${y} = ?`, answer: x - y, options: makeOptions(x - y) };
  }
  const a = rint(5, 20);
  const b = rint(1, a);
  return { text: `${a} − ${b} = ?`, answer: a - b, options: makeOptions(a - b) };
}

// HARVEST BONUS — one quick question auto-harvests every ready crop in the area.
// adventurer: multiplication. mage: addition ≤ 20.
export function harvestBonusQuestion(profile) {
  if (profile === 'adventurer') {
    const a = rint(2, 9);
    const b = rint(2, 9);
    return { text: `${a} × ${b} = ?`, answer: a * b, options: makeOptions(a * b) };
  }
  const a = rint(1, 10);
  const b = rint(1, Math.min(10, 20 - a));
  return { text: `${a} + ${b} = ?`, answer: a + b, options: makeOptions(a + b) };
}

// TOWN QUEST — a word problem that pays gold. adventurer: multiplication word
// problems. mage: addition word problems, total ≤ 20.
export function questWordProblem(profile) {
  if (profile === 'adventurer') {
    const a = rint(2, 9);
    const b = rint(2, 9);
    const templates = [
      `Each basket holds ${a} carrots. You fill ${b} baskets. How many carrots in all?`,
      `A crate fits ${a} pumpkins. How many pumpkins fit in ${b} crates?`,
      `You plant ${a} rows with ${b} seeds in each row. How many seeds did you plant?`,
    ];
    return { text: pick(templates), answer: a * b, options: makeOptions(a * b) };
  }
  const a = rint(1, 10);
  const b = rint(1, Math.min(10, 20 - a));
  const templates = [
    `You pick ${a} red apples and ${b} green apples. How many apples?`,
    `There are ${a} ducks on the pond and ${b} more on the grass. How many ducks?`,
    `You find ${a} shiny coins, then ${b} more. How many coins?`,
  ];
  return { text: pick(templates), answer: a + b, options: makeOptions(a + b) };
}

// COOKING DOUBLE-BATCH — answer a doubling question for a free second portion.
// Driven by the dish's heal value so the number is always meaningful.
export function doubleBatchQuestion(healValue) {
  return {
    text: `${healValue} × 2 = ?`,
    answer: healValue * 2,
    options: makeOptions(healValue * 2),
  };
}

// Convenience registry so a system can ask for a question by name + profile.
export const QUESTIONS = {
  combat: combatQuestion,
  harvest: harvestBonusQuestion,
  quest: questWordProblem,
};
