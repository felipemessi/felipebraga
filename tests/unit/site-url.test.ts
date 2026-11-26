import { describe, expect, it } from 'vitest';
import { DEV_SITE_URL, resolveSiteUrl } from '../../src/lib/site-url';

describe('resolveSiteUrl', () => {
  it('AC12: falls back to the local dev URL when unset or blank', () => {
    expect(resolveSiteUrl()).toBe(DEV_SITE_URL);
    expect(resolveSiteUrl('')).toBe(DEV_SITE_URL);
    expect(resolveSiteUrl('   ')).toBe(DEV_SITE_URL);
  });

  it('AC12: keeps only the origin of a valid URL', () => {
    expect(resolveSiteUrl('https://example.com/blog/')).toBe(
      'https://example.com',
    );
  });

  it('AC12: throws on an invalid URL so the build fails', () => {
    expect(() => resolveSiteUrl('nope')).toThrow(/PUBLIC_SITE_URL/);
  });
});
