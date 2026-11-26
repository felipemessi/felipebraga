import { describe, expect, it } from 'vitest';
import {
  buildToc,
  FOOTNOTE_ID,
  shouldRenderToc,
  type Heading,
} from '../../src/lib/post/toc';

const h = (depth: number, slug: string): Heading => ({
  depth,
  slug,
  text: slug.toUpperCase(),
});

describe('AC13: buildToc', () => {
  it('nests h3 under the previous h2', () => {
    const toc = buildToc([h(2, 'a'), h(3, 'a1'), h(3, 'a2'), h(2, 'b')]);
    expect(toc).toEqual([
      {
        slug: 'a',
        text: 'A',
        children: [
          { slug: 'a1', text: 'A1', children: [] },
          { slug: 'a2', text: 'A2', children: [] },
        ],
      },
      { slug: 'b', text: 'B', children: [] },
    ]);
  });

  it('promotes an h3 that comes before any h2', () => {
    const toc = buildToc([h(3, 'x'), h(3, 'y'), h(2, 'a'), h(3, 'a1')]);
    expect(toc.map((entry) => entry.slug)).toEqual(['x', 'y', 'a']);
    expect(toc[2]?.children.map((entry) => entry.slug)).toEqual(['a1']);
  });

  it('skips the footnote heading and other depths', () => {
    const toc = buildToc([
      h(1, 'titulo'),
      h(2, 'a'),
      h(4, 'fundo'),
      h(2, FOOTNOTE_ID),
    ]);
    expect(toc.map((entry) => entry.slug)).toEqual(['a']);
  });

  it('renders only with at least two entries', () => {
    expect(shouldRenderToc(buildToc([]))).toBe(false);
    expect(shouldRenderToc(buildToc([h(2, 'a')]))).toBe(false);
    expect(shouldRenderToc(buildToc([h(2, 'a'), h(2, 'b')]))).toBe(true);
  });
});
