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
