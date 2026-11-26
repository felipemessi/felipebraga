export const TONES = [
  'creme',
  'salvia',
  'ceu',
  'pessego',
  'manteiga',
  'lavanda',
  'rosa',
  'menta',
] as const;

export type Tone = (typeof TONES)[number];

export const DEFAULT_TONE: Tone = 'creme';

export function isTone(value: unknown): value is Tone {
  return (
    typeof value === 'string' && (TONES as readonly string[]).includes(value)
  );
}

/**
 * Inline custom properties that bring a post tone into a creme band: the accent
 * for links and borders, and the pastel fill for boxes (`--post-bg`).
 */
export function toneVars(tone: Tone): string {
  return `--accent: var(--accent-${tone}); --post-bg: var(--bg-${tone})`;
}
