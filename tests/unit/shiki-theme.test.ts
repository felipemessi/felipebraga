import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CODE_COLORS, felipeLight } from '../../src/lib/markdown/shiki-theme';
import { TONES } from '../../src/lib/tone';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (match?.[1] === undefined) throw new Error(`Missing token ${name}`);
  return match[1].toLowerCase();
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('AC6: the code theme comes from the tokens', () => {
  it('uses the documented token for each kind of token', () => {
    expect(CODE_COLORS).toEqual({
      surface: token('surface'),
      text: token('text'),
      key: token('accent-ceu'),
      string: token('accent-salvia'),
      number: token('accent-pessego'),
      keyword: token('accent-lavanda'),
      comment: token('accent-creme'),
    });
  });

  it('is a light theme on the surface color', () => {
    expect(felipeLight).toMatchObject({
      name: 'felipe-light',
      type: 'light',
      colors: { 'editor.background': token('surface') },
    });
  });

  it('only uses colors from the palette', () => {
    const palette = new Set<string>(Object.values(CODE_COLORS));
    const used = (felipeLight.settings ?? [])
      .map((rule) => rule.settings.foreground)
      .filter((color): color is string => color !== undefined);
    expect(used.length).toBeGreaterThan(5);
    for (const color of used) expect(palette).toContain(color);
  });

  it.each(Object.entries(CODE_COLORS).filter(([name]) => name !== 'surface'))(
    '%s reaches 4.5:1 on --surface',
    (_name, color) => {
      expect(ratio(color, CODE_COLORS.surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(TONES)(
    'every token color reaches 4.5:1 on the %s highlight',
    (tone) => {
      for (const [name, color] of Object.entries(CODE_COLORS)) {
        if (name === 'surface') continue;
        expect(
          ratio(color, token(`bg-${tone}`)),
          `${name} on ${tone}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
