import { describe, expect, it } from 'vitest';
import {
  assertAlt,
  findPostImage,
  slugFromPath,
} from '../../src/lib/mdx/figure';

describe('AC9: figure', () => {
  it('reads the post slug from the page path', () => {
    expect(slugFromPath('/blog/helm')).toBe('helm');
    expect(slugFromPath('/blog/helm.html')).toBe('helm');
    expect(slugFromPath('/blog')).toBeUndefined();
    expect(slugFromPath('/blog/a/b')).toBeUndefined();
    expect(slugFromPath('/')).toBeUndefined();
  });

  it('requires a non-empty alt', () => {
    expect(assertAlt('texto', './a.png')).toBe('texto');
    expect(() => assertAlt('', './a.png')).toThrow('alt is required');
    expect(() => assertAlt('   ', './a.png')).toThrow('alt is required');
    expect(() => assertAlt(undefined, './a.png')).toThrow('./a.png');
  });

  const keys = [
    '/src/content/posts/helm/diff.png',
    '/tests/fixtures/content/posts/outro/diff.png',
  ];

  it('finds an image in the post folder', () => {
    expect(findPostImage(keys, 'helm', './diff.png')).toBe(keys[0]);
    expect(findPostImage(keys, 'outro', 'diff.png')).toBe(keys[1]);
  });

  it('fails when the image is not in that post', () => {
    expect(() => findPostImage(keys, 'helm', './nada.png')).toThrow(
      'no such image in posts/helm',
    );
    expect(() => findPostImage(keys, 'terceiro', './diff.png')).toThrow();
  });
});
