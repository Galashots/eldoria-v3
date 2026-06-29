import literacyRules from '../data/literacy_rules.json';

export function formatDialogue(text, profile) {
  if (profile !== 'mage') {
    // Older reader: return text unchanged
    return text;
  }

  // Younger reader: apply morphological highlighting via BBCode
  let highlightedText = text;

  // Process digraphs
  for (const digraph of literacyRules.digraphs) {
    const regex = new RegExp(`(${digraph.pattern})`, 'gi');
    highlightedText = highlightedText.replace(regex, `[color=${digraph.color}]$1[/color]`);
  }

  // Process blends
  for (const blend of literacyRules.blends) {
    const regex = new RegExp(`(${blend.pattern})`, 'gi');
    // Ensure we don't accidentally double-tag something if it overlaps,
    // although with this simple replace it might happen.
    // For this context, sequential replacement is acceptable.
    highlightedText = highlightedText.replace(regex, `[color=${blend.color}]$1[/color]`);
  }

  return highlightedText;
}
