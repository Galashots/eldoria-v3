// ─────────────────────────────────────────────────────────────────────────────
// Realm of Eldoria — curriculum question bank
// Refactored for Stealth Assessment & Dynamic Literacy Profiles
// ─────────────────────────────────────────────────────────────────────────────

import mathGrade2 from '../data/curriculum/math_grade2.json';
import mathGrade5 from '../data/curriculum/math_grade5.json';

const rint = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const OPERATIONS = {
  'add': (a, b) => a + b,
  'subtract': (a, b) => a - b,
  'multiply': (a, b) => a * b,
  'divide': (a, b) => a / b,
};

export function getChallengeTemplate(profile, subject = 'math') {
  const bank = profile === 'mage' ? mathGrade2 : mathGrade5;
  // Filter by subject
  const subjectBank = bank.filter(q => q.subject === subject);
  if (!subjectBank.length) return null;

  const templateDef = pick(subjectBank);

  // Resolve variables
  const vars = {};
  for (const [key, range] of Object.entries(templateDef.variables)) {
    vars[key] = rint(range.min, range.max);
  }

  // Determine correct answer
  const opFunc = OPERATIONS[templateDef.operation];
  // In a real implementation we'd dynamically pass variables based on operation definition.
  // Assuming a and b for simplicity for standard math operations.
  const answer = opFunc(vars.a, vars.b);

  // Substitute variables in template string
  let text = templateDef.template;
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp(`{${key}}`, 'g'), val);
  }

  return {
    id: templateDef.id,
    kusp_tag: templateDef.kusp_tag,
    text,
    answer,
    scaffolding_tiers: templateDef.scaffolding_tiers,
    vars
  };
}

export function evaluateAction(playerActionValue, challengeDef, timeTaken = 0, currentErrorCount = 0) {
  const isCorrect = playerActionValue === challengeDef.answer;
  const errorCount = isCorrect ? currentErrorCount : currentErrorCount + 1;
  const scaffolding_hint = isCorrect ? null : challengeDef.scaffolding_tiers[Math.min(errorCount - 1, challengeDef.scaffolding_tiers.length - 1)] || "Try again.";

  return {
    success: isCorrect,
    kusp_tag: challengeDef.kusp_tag,
    error_count: errorCount,
    scaffolding_hint,
    trigger_fallback: false,
    telemetry: {
      session_id: "SESSION_" + Date.now(), // Placeholder for actual session
      kusp_tag: challengeDef.kusp_tag,
      time_to_completion: timeTaken,
      error_count: errorCount,
      action_value: playerActionValue
    }
  };
}
