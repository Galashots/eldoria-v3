// Accessibility + presentation settings. Pure-ish: state lives in localStorage and a module
// cache; no Phaser. The guide treats accessibility as baseline quality, shipped ON FIRST BOOT —
// so getSettings() returns accessible defaults (captions on, readable text) when nothing is
// stored yet. Settings are device-level (shared across both learner profiles).
const KEY = 'eldoria.settings';

const DEFAULTS = {
  textScale: 1,        // 1 | 1.25 | 1.5  — scalable text
  captions: true,      // subtitles/captions on by default
  readAloud: false,    // speak quest briefings + dialogue aloud (Web Speech)
  reduceMotion: false, // calm the ambient tweens/particles for motion sensitivity
  volMusic: 0.7,       // reserved for when music ships
  volSpeech: 1,        // applied to read-aloud now
  volSfx: 0.8,         // applied to Phaser sound; reserved for when SFX ship
};

let cache = null;

export function getSettings() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode */ }
}

export function setSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  persist();
  return s;
}

export function resetSettings() {
  cache = { ...DEFAULTS };
  persist();
  return cache;
}

// A font size string scaled by the user's text-size preference. Used everywhere reading matters
// so larger text is honoured on the surfaces that carry instructions.
export function fontPx(basePx) {
  return `${Math.round(basePx * getSettings().textScale)}px`;
}

// ── Read-aloud (Web Speech API) ──────────────────────────────────────────────
// Speaks `text` only when the toggle is on. Text is always shown on screen too, so audio is
// never the only channel (the guide: never convey essential info through sound alone).
export function speak(text) {
  const s = getSettings();
  if (!s.readAloud) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[◆←→✓✕]/g, ' '));
    u.volume = s.volSpeech;
    u.rate = 0.95;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch { /* speech unavailable */ }
}

export function stopSpeak() {
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
