// Curly vs straight apostrophes (iOS smart punctuation) shouldn't split one
// source into two - used to build the source dropdown, match against it, and
// group sources in charts.
export function normalizeSource(s: string) {
  return s.replace(/[‘’]/g, "'");
}
