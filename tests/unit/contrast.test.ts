import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TONES } from '../../src/lib/tone';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (match?.[1] === undefined) throw new Error(`Missing token ${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('band contrast', () => {
  it.each(TONES)('AC15: %s accent is >= 5:1 on its own background', (tone) => {
    expect(
      ratio(token(`accent-${tone}`), token(`bg-${tone}`)),
    ).toBeGreaterThanOrEqual(5);
  });

  it.each(TONES)('AC15: body text is >= 7:1 on the %s band', (tone) => {
    expect(ratio(token('text'), token(`bg-${tone}`))).toBeGreaterThanOrEqual(7);
  });

  it('AC15: muted text is AA on creme', () => {
    expect(
      ratio(token('text-muted'), token('bg-creme')),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
