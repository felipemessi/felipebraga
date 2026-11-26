import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT_DIR,
  resolveContentDir,
} from '../../src/lib/content/dir';

describe('AC10: resolveContentDir', () => {
  it('defaults to src/content', () => {
    expect(resolveContentDir({})).toBe(DEFAULT_CONTENT_DIR);
    expect(DEFAULT_CONTENT_DIR).toBe('src/content');
  });

  it('falls back to the default for empty or blank values', () => {
    expect(resolveContentDir({ PUBLIC_CONTENT_DIR: '' })).toBe('src/content');
    expect(resolveContentDir({ PUBLIC_CONTENT_DIR: '   ' })).toBe(
      'src/content',
    );
  });

  it('uses PUBLIC_CONTENT_DIR and strips trailing slashes', () => {
    expect(
      resolveContentDir({ PUBLIC_CONTENT_DIR: 'tests/fixtures/content/' }),
    ).toBe('tests/fixtures/content');
  });
});
