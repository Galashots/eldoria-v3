// Multiple-choice option builders, ported from the original build.
// These are pure functions — no canvas, no globals — so they move over untouched.

// Round to the nearest ten (used by the estimation questions).
export function roundToTen(n) {
  return Math.round(n / 10) * 10;
}

// Shuffle in place (Fisher–Yates).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Four answer choices: the correct one plus three nearby distractors.
export function makeOptions(answer) {
  const set = new Set([answer]);
  while (set.size < 4) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0) set.add(candidate);
  }
  return shuffle([...set]);
}

// Estimation options: multiples of ten bracketing the rounded answer.
export function tensOptions(answer) {
  const set = new Set([answer]);
  let step = 10;
  while (set.size < 4) {
    const candidate = answer + step * (Math.random() < 0.5 ? -1 : 1);
    if (candidate >= 0) set.add(candidate);
    step += 10;
  }
  return shuffle([...set]);
}
