import { describe, expect, it } from 'vitest';
import {
  assertLinksReady,
  findPlaceholders,
  isLocalSite,
  LINKS,
  mailtoHref,
  sameAs,
} from '../../src/lib/links';

const ready = {
  github: 'https://github.com/someone',
  linkedin: 'https://www.linkedin.com/in/someone',
  email: 'someone@example.com',
};
const pending = { ...ready, linkedin: 'https://www.linkedin.com/in/TODO' };

describe('links', () => {
  it('AC13: builds mailto and sameAs from the single config', () => {
    expect(mailtoHref('a@b.c')).toBe('mailto:a@b.c');
    expect(sameAs()).toEqual([LINKS.github, LINKS.linkedin]);
  });

  it('AC13: detects local sites', () => {
    expect(isLocalSite('http://localhost:4321')).toBe(true);
    expect(isLocalSite('http://127.0.0.1:4321')).toBe(true);
    expect(isLocalSite('https://example.com')).toBe(false);
  });

  it('AC13: lists the placeholder keys', () => {
    expect(findPlaceholders(pending)).toEqual(['linkedin']);
    expect(findPlaceholders(ready)).toEqual([]);
  });

  it('AC13: tolerates placeholders on a local site', () => {
    expect(() => {
      assertLinksReady('http://localhost:4321', pending);
    }).not.toThrow();
  });

  it('AC13: refuses placeholders on a production URL', () => {
    expect(() => {
      assertLinksReady('https://example.com', pending);
    }).toThrow(/Placeholder links left.*linkedin/);
  });

  it('AC13: accepts real links on a production URL', () => {
    expect(() => {
      assertLinksReady('https://example.com', ready);
    }).not.toThrow();
  });
});
