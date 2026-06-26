// Learning-summary builder. Pure: turns the player's stealth-evidence log (written by the quest
// system, see docs/curriculum/stealth-assessment-model.md) into a per-competency summary a parent
// or teacher can read, plus a plain-text export. No personal data — understanding is inferred from
// in-game actions only.
const LABELS = {
  'money-change': 'Money & making change',
  estimation: 'Estimation',
  measurement: 'Measurement & length',
  grouping: 'Multiplication (equal groups)',
  comparison: 'Comparing values',
};

export function competencyLabel(id) {
  return LABELS[id] || id;
}

// One row per competency the child has touched.
export function buildReport(player) {
  const ev = (player && player.evidence) || [];
  const by = {};
  for (const e of ev) {
    const id = e.competency || 'other';
    const r = by[id] || (by[id] = {
      competency: id, label: competencyLabel(id),
      rounds: 0, correct: 0, independent: 0, assisted: 0, attempts: 0,
    });
    r.rounds += 1;
    r.attempts += e.attempts || 1;
    if (e.correct) r.correct += 1;
    if (e.assisted) r.assisted += 1;
    else if (e.correct) r.independent += 1;
  }
  return Object.values(by).map((r) => ({
    ...r,
    accuracy: r.rounds ? Math.round((100 * r.correct) / r.rounds) : 0,
    avgTries: r.rounds ? r.attempts / r.rounds : 0,
  }));
}

// A friendly multi-line string for export/printing.
export function reportText(player) {
  const rows = buildReport(player);
  const lines = [
    'Realm of Eldoria — Learning Summary',
    `Hero profile: ${player?.profile || 'unknown'}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
  ];
  if (!rows.length) {
    lines.push('No learning activities recorded yet — play a quest to see progress here.');
  } else {
    for (const r of rows) {
      lines.push(`• ${r.label}`);
      lines.push(`    rounds played: ${r.rounds}    accuracy: ${r.accuracy}%`);
      lines.push(`    solved on their own: ${r.independent}    with help: ${r.assisted}    avg tries: ${r.avgTries.toFixed(1)}`);
    }
  }
  lines.push('', 'No personal data is collected. Progress is inferred from in-game actions only.');
  return lines.join('\n');
}
