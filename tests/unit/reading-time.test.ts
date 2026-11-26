import { describe, expect, it } from 'vitest';
import { countWords, readingTime } from '../../src/lib/post/reading-time';

const words = (count: number) =>
  Array.from({ length: count }, () => 'palavra').join(' ');

describe('AC5: reading time', () => {
  it('is at least one minute, even for an empty body', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('oi')).toBe(1);
  });

  it('is 200 words per minute rounded up', () => {
    expect(readingTime(words(200))).toBe(1);
    expect(readingTime(words(201))).toBe(2);
    expect(readingTime(words(1800))).toBe(9);
  });

  it('ignores frontmatter, import/export lines and JSX tags', () => {
    const body = [
      '---',
      'title: Um dois três quatro cinco seis',
      '---',
      "import Foo from './foo.astro';",
      'export const meta = {};',
      '<Callout type="nota">',
      'um dois',
      '</Callout>',
      '<Figure src="./a.png" alt="muitas palavras aqui dentro" />',
    ].join('\n');
    expect(countWords(body)).toBe(2);
  });

  it('counts code', () => {
    expect(countWords('```yaml\nreplicaCount: 3\n```')).toBe(3);
  });

  it('does not treat a comparison as a tag', () => {
    expect(countWords('se a < b então b > a')).toBe(6);
  });

  it('does not count punctuation-only tokens', () => {
    expect(countWords('um — dois | três')).toBe(3);
  });

  it('keeps a body without frontmatter intact', () => {
    expect(countWords('--- não é frontmatter')).toBe(3);
  });
});
