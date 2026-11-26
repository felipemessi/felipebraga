import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TONE, isTone, TONES, toneVars } from '../../src/lib/tone';

describe('tone', () => {
  it('AC3: lists exactly the tones declared in tokens.css', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const declared = [...css.matchAll(/\[data-tone=["'](\w+)["']\]\s*\{/g)].map(
      (m) => m[1],
    );
    expect([...TONES].sort()).toEqual(declared.sort());
  });

  it('AC3: defaults to creme', () => {
    expect(DEFAULT_TONE).toBe('creme');
  });

  it('AC3: guards unknown values', () => {
    expect(isTone('ceu')).toBe(true);
    expect(isTone('azul')).toBe(false);
    expect(isTone(undefined)).toBe(false);
  });
});

describe('toneVars', () => {
  it('maps a tone to its accent and pastel fill', () => {
    expect(toneVars('ceu')).toBe(
      '--accent: var(--accent-ceu); --post-bg: var(--bg-ceu)',
    );
  });
});
