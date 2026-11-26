import { describe, expect, it } from 'vitest';
import {
  assertLinksReady,
  findPlaceholders,
  isLocalSite,
  LINKS,
  mailtoHref,
  sameAs,
} from '../../src/lib/links';

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

  it('AC13: tolerates placeholders locally', () => {
    expect(() => {
      assertLinksReady('http://localhost:4321');
    }).not.toThrow();
  });

  it('AC13: refuses placeholders on a production URL', () => {
    const pending = findPlaceholders();
    if (pending.length > 0) {
      expect(() => {
        assertLinksReady('https://example.com');
      }).toThrow(/Placeholder links/);
    } else {
      expect(() => {
        assertLinksReady('https://example.com');
      }).not.toThrow();
    }
  });

  it('AC13: fails a production build while TODOs remain', () => {
    const site = process.env['PUBLIC_SITE_URL'];
    if (site !== undefined) {
      expect(() => {
        assertLinksReady(site);
      }).not.toThrow();
    }
  });
});
