// Public curriculum API. Systems import from here, not from the individual files,
// so you can grow the curriculum without touching gameplay code.

export {
  getChallengeTemplate,
  evaluateAction
} from './questions.js';

export { formatDialogue } from './literacy.js';
