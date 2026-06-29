// Public curriculum API. Systems import from here, not from the individual files,
// so you can grow the curriculum without touching gameplay code.
//
// TO EXTEND (the whole point of the rebuild — make adding learning cheap):
//   1. Add a generator to questions.js that returns { text, answer, options? }.
//   2. Register it in QUESTIONS there (or export it here).
//   3. Any system can now surface it. Keep the "bonus, never a gate" rule.
//
// Subjects beyond math (spelling, reading, science) fit the same { text, answer }
// shape — a spelling prompt is just text with a typed/selected answer. The modal
// renderer doesn't care what subject it is.

export {
  combatQuestion,
  harvestBonusQuestion,
  questWordProblem,
  doubleBatchQuestion,
  QUESTIONS,
} from './questions.js';

export { makeOptions, tensOptions, roundToTen } from './options.js';
