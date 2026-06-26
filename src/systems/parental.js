// Parental controls. Pure: state in localStorage + a module cache; no Phaser. Implements the
// guide's parent-trust baseline — a daily play-time cap, a commerce lock, a forced younger-reader
// profile, and a simple "ask a grown-up" gate so children can't change these themselves.
//
// Privacy: nothing here is personal data. Play-time is a per-day millisecond counter that resets
// each calendar day; there is no network, no names, no free text (COPPA-aware).
const KEY = 'eldoria.parental';

const DEFAULTS = {
  dailyCapMin: 0,        // 0 = no limit
  commerceLocked: false, // route purchases behind adult approval
  forceYoungReader: false,
  date: '',              // yyyy-mm-dd the counter below belongs to
  playTodayMs: 0,
};

let cache = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode */ }
}

export function getParental() {
  if (!cache) {
    try { cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { cache = { ...DEFAULTS }; }
  }
  if (cache.date !== today()) { // new day → reset the counter
    cache.date = today();
    cache.playTodayMs = 0;
    persist();
  }
  return cache;
}

export function setParental(key, value) {
  const p = getParental();
  p[key] = value;
  persist();
  return p;
}

export function addPlaytime(ms) {
  const p = getParental();
  p.playTodayMs += ms;
  persist();
  return p;
}

export function minutesPlayedToday() {
  return Math.floor(getParental().playTodayMs / 60000);
}

export function capReached() {
  const p = getParental();
  return p.dailyCapMin > 0 && p.playTodayMs >= p.dailyCapMin * 60000;
}

// Grown-up gate: a two-digit multiplication that's quick for an adult but blocks young children
// from changing parental settings or extending time. Returns { text, answer }.
export function makeParentGate() {
  const a = 11 + Math.floor(Math.random() * 8); // 11–18
  const b = 11 + Math.floor(Math.random() * 8);
  return { text: `${a} × ${b}`, answer: a * b };
}
