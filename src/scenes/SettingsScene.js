import Phaser from 'phaser';
import { getSettings, setSetting, fontPx, speak } from '../systems/settings.js';
import {
  getParental, setParental, minutesPlayedToday, makeParentGate,
} from '../systems/parental.js';
import { buildReport, reportText } from '../curriculum/evidence-report.js';
import { makeOptions } from '../curriculum/options.js';

// Settings overlay. Two views: an always-available Accessibility view, and a Parents view behind
// a quick "ask a grown-up" gate. Large, high-contrast, color-INDEPENDENT controls (every state
// shows text, not just colour), per the guide's kid-UI + accessibility baseline.
const TEXT_SIZES = [
  { v: 1, label: 'Normal' },
  { v: 1.25, label: 'Large' },
  { v: 1.5, label: 'Largest' },
];
const CAP_STEPS = [0, 15, 30, 45, 60, 90];

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(data) {
    this.fromKey = (data && data.from) || this.registry.get('activeScene') || 'Title';
    this.player = this.registry.get('player');
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();

    this.PW = Math.min(660, width - 30);
    this.PH = Math.min(540, height - 30);
    this.px = (width - this.PW) / 2;
    this.py = (height - this.PH) / 2;
    this.add.rectangle(this.px, this.py, this.PW, this.PH, 0x241c12).setOrigin(0).setStrokeStyle(3, 0xc9a86a);

    this.titleText = this.add.text(this.px + 22, this.py + 16, 'Settings', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffe9b0',
    });

    const close = () => this.closeScreen();
    this.add.text(this.px + this.PW - 40, this.py + 14, '✕', { fontSize: '26px', color: '#fff' })
      .setInteractive({ useHandCursor: true }).on('pointerup', close);
    this.input.keyboard.on('keydown-ESC', close);

    this.viewObjs = [];
    this.showAccessibility();
  }

  clearView() {
    for (const o of this.viewObjs) o.destroy();
    this.viewObjs = [];
  }

  track(...objs) { this.viewObjs.push(...objs); return objs[0]; }

  // ── Reusable controls (color-independent: text label always present) ───────
  rowLabel(y, text) {
    return this.track(this.add.text(this.px + 26, y, text, {
      fontFamily: 'Georgia, serif', fontSize: fontPx(16), color: '#f0e6d0', wordWrap: { width: this.PW - 220 },
    }).setOrigin(0, 0.5));
  }

  toggle(y, label, getVal, onSet) {
    this.rowLabel(y, label);
    const x = this.px + this.PW - 110;
    const pill = this.add.rectangle(x, y, 96, 38, 0x2e2418).setStrokeStyle(2, 0xc9a86a)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, '', { fontFamily: 'Georgia, serif', fontSize: fontPx(15), color: '#fff' }).setOrigin(0.5);
    const paint = () => {
      const on = getVal();
      pill.setFillStyle(on ? 0x2f6e2a : 0x5a2a22);
      txt.setText(on ? 'On ✓' : 'Off ✕');
    };
    pill.on('pointerup', () => { onSet(!getVal()); paint(); });
    paint();
    this.track(pill, txt);
  }

  stepper(y, label, getText, onMinus, onPlus) {
    this.rowLabel(y, label);
    const xR = this.px + this.PW - 60;
    const xL = this.px + this.PW - 196;
    const mk = (x, s, fn) => {
      const b = this.add.rectangle(x, y, 40, 38, 0x2e2418).setStrokeStyle(2, 0xc9a86a).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y, s, { fontFamily: 'Georgia, serif', fontSize: fontPx(20), color: '#ffe9b0' }).setOrigin(0.5);
      b.on('pointerup', () => { fn(); val.setText(getText()); });
      this.track(b, t);
    };
    mk(xL, '−', onMinus);
    const val = this.add.text((xL + xR) / 2, y, getText(), {
      fontFamily: 'Georgia, serif', fontSize: fontPx(15), color: '#fff',
    }).setOrigin(0.5);
    mk(xR, '+', onPlus);
    this.track(val);
  }

  bottomButton(cx, label, fill, onUp) {
    const b = this.add.rectangle(cx, this.py + this.PH - 34, 200, 44, fill).setStrokeStyle(2, 0xc9a86a)
      .setInteractive({ useHandCursor: true });
    const t = this.add.text(cx, this.py + this.PH - 34, label, {
      fontFamily: 'Georgia, serif', fontSize: fontPx(16), color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    b.on('pointerup', onUp);
    this.track(b, t);
  }

  // ── Accessibility view ────────────────────────────────────────────────────
  showAccessibility() {
    this.clearView();
    this.titleText.setText('Settings · Accessibility');
    const s = getSettings();
    let y = this.py + 78;
    const gap = 52;

    this.stepper(y, 'Text size', () => TEXT_SIZES.find((t) => t.v === getSettings().textScale)?.label || 'Normal',
      () => this.cycleText(-1), () => this.cycleText(1)); y += gap;

    this.toggle(y, 'Captions / subtitles', () => getSettings().captions, (v) => setSetting('captions', v)); y += gap;

    this.toggle(y, 'Read aloud (speak text)', () => getSettings().readAloud, (v) => {
      setSetting('readAloud', v);
      if (v) speak('Read aloud is on. I will read quests and dialogue for you.');
    }); y += gap;

    this.toggle(y, 'Reduce motion', () => getSettings().reduceMotion, (v) => setSetting('reduceMotion', v)); y += gap;

    this.stepper(y, 'Voice volume', () => `${Math.round(getSettings().volSpeech * 100)}%`,
      () => this.vol('volSpeech', -10), () => this.vol('volSpeech', 10)); y += gap;

    this.stepper(y, 'Music volume', () => `${Math.round(getSettings().volMusic * 100)}%`,
      () => this.vol('volMusic', -10), () => this.vol('volMusic', 10)); y += gap;

    this.stepper(y, 'Sound effects', () => `${Math.round(getSettings().volSfx * 100)}%`,
      () => this.vol('volSfx', -10), () => this.vol('volSfx', 10)); y += gap;

    this.bottomButton(this.px + this.PW - 130, 'For Grown-ups 🔒', 0x4a3a6a, () => this.showGate());
    this.bottomButton(this.px + 130, 'Done', 0x3f7a2a, () => this.closeScreen());
  }

  cycleText(dir) {
    const cur = getSettings().textScale;
    let i = TEXT_SIZES.findIndex((t) => t.v === cur);
    i = Phaser.Math.Clamp(i + dir, 0, TEXT_SIZES.length - 1);
    setSetting('textScale', TEXT_SIZES[i].v);
    // Defer the rebuild to the next tick: rebuilding mid-pointerup would destroy the
    // very controls Phaser is still iterating over (and the stepper's own value text).
    this.time.delayedCall(0, () => this.showAccessibility());
  }

  vol(key, deltaPct) {
    const next = Phaser.Math.Clamp(Math.round((getSettings()[key] * 100 + deltaPct)) / 100, 0, 1);
    setSetting(key, next);
    if (key === 'volSfx') this.sound.volume = next;
    if (key === 'volSpeech') speak('Voice volume.');
  }

  // ── Grown-up gate ─────────────────────────────────────────────────────────
  showGate() {
    this.clearView();
    this.titleText.setText('Settings · Grown-up check');
    const gate = makeParentGate();
    this.gateAnswer = gate.answer; // exposed for automated playtests
    this.track(this.add.text(this.px + this.PW / 2, this.py + 120, 'Ask a grown-up', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(20), color: '#ffe9b0',
    }).setOrigin(0.5));
    this.track(this.add.text(this.px + this.PW / 2, this.py + 168, `${gate.text} = ?`, {
      fontFamily: 'Georgia, serif', fontSize: fontPx(30), color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5));
    const fb = this.track(this.add.text(this.px + this.PW / 2, this.py + 210, '', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(14), color: '#e0a0a0',
    }).setOrigin(0.5));

    const opts = makeOptions(gate.answer);
    opts.forEach((opt, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = this.px + this.PW / 2 + (col ? 70 : -70);
      const yy = this.py + 270 + row * 64;
      const b = this.add.rectangle(x, yy, 120, 52, 0x2e2418).setStrokeStyle(2, 0xc9a86a).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, yy, `${opt}`, { fontFamily: 'Georgia, serif', fontSize: fontPx(20), color: '#fff' }).setOrigin(0.5);
      b.on('pointerup', () => {
        if (opt === gate.answer) this.showParental();
        else { fb.setText('Not quite — try again.'); }
      });
      this.track(b, t);
    });
    this.bottomButton(this.px + 130, 'Back', 0x7a5532, () => this.showAccessibility());
  }

  // ── Parents view ──────────────────────────────────────────────────────────
  showParental() {
    this.clearView();
    this.titleText.setText('Settings · For Grown-ups');
    let y = this.py + 74;
    const gap = 48;

    this.stepper(y, 'Daily time limit', () => {
      const m = getParental().dailyCapMin; return m === 0 ? 'Off' : `${m} min`;
    }, () => this.cycleCap(-1), () => this.cycleCap(1)); y += gap;

    this.track(this.add.text(this.px + 26, y, `Played today: ${minutesPlayedToday()} min`, {
      fontFamily: 'Georgia, serif', fontSize: fontPx(15), color: '#cbb890',
    }).setOrigin(0, 0.5)); y += gap;

    this.toggle(y, 'Lock the shop (adult approval)', () => getParental().commerceLocked,
      (v) => setParental('commerceLocked', v)); y += gap;

    this.toggle(y, 'Always use younger-reader text', () => getParental().forceYoungReader,
      (v) => setParental('forceYoungReader', v)); y += gap + 6;

    // Learning summary
    this.track(this.add.text(this.px + 26, y, 'Learning summary', {
      fontFamily: 'Georgia, serif', fontSize: fontPx(17), color: '#c9a86a',
    }).setOrigin(0, 0.5)); y += 30;

    const rows = buildReport(this.player);
    if (!rows.length) {
      this.track(this.add.text(this.px + 26, y, 'No activities recorded yet — play a quest to see progress.', {
        fontFamily: 'Georgia, serif', fontSize: fontPx(13), color: '#8a7d64', wordWrap: { width: this.PW - 52 },
      }).setOrigin(0, 0)); y += 40;
    } else {
      for (const r of rows) {
        this.track(this.add.text(this.px + 30, y,
          `• ${r.label}: ${r.accuracy}% over ${r.rounds} (alone ${r.independent}, helped ${r.assisted}, avg ${r.avgTries.toFixed(1)} tries)`, {
            fontFamily: 'Georgia, serif', fontSize: fontPx(13), color: '#eaffea', wordWrap: { width: this.PW - 56 },
          }).setOrigin(0, 0));
        y += 30;
      }
    }

    this.bottomButton(this.px + this.PW - 130, 'Export summary', 0x4a3a6a, () => this.downloadReport());
    this.bottomButton(this.px + 130, 'Back', 0x7a5532, () => this.showAccessibility());
  }

  cycleCap(dir) {
    const cur = getParental().dailyCapMin;
    let i = CAP_STEPS.indexOf(cur);
    if (i === -1) i = 0;
    i = Phaser.Math.Clamp(i + dir, 0, CAP_STEPS.length - 1);
    setParental('dailyCapMin', CAP_STEPS[i]);
  }

  downloadReport() {
    const text = reportText(this.player);
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eldoria-learning-summary.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* download unavailable */ }
    // Stash on the registry too so automated tests / future cloud export can read it.
    this.registry.set('lastReport', text);
  }

  closeScreen() {
    if (this.fromKey && this.fromKey !== 'Title') this.scene.resume(this.fromKey);
    else if (this.scene.isPaused('Title')) this.scene.resume('Title');
    this.scene.stop();
  }
}
