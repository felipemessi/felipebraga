import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import {
  postName,
  rehypeHeadingAnchors,
  textOf,
} from '../../src/lib/markdown/heading-anchors';

const heading = (
  tagName: string,
  id: string | undefined,
  text: string,
): Element => ({
  type: 'element',
  tagName,
  properties: id === undefined ? {} : { id },
  children: [{ type: 'text', value: text }],
});

const run = (children: Element[], path = '/x/posts/helm/index.mdx') => {
  const tree: Root = { type: 'root', children };
  rehypeHeadingAnchors()(tree, { path });
  return tree;
};

describe('AC12: heading anchors', () => {
  it('adds a # link to h2 and h3 with the id and a Portuguese label', () => {
    const tree = run([
      heading('h2', 'um-values', 'Um values'),
      heading('h3', 'sub', 'Sub'),
    ]);
    const [h2, h3] = tree.children as Element[];
    const anchor = h2?.children[0] as Element;
    expect(anchor.tagName).toBe('a');
    expect(anchor.properties).toMatchObject({
      className: ['heading-anchor'],
      href: '#um-values',
      ariaLabel: 'Link para a seção Um values',
    });
    expect(anchor.children).toEqual([{ type: 'text', value: '#' }]);
    expect((h3?.children[0] as Element).properties['href']).toBe('#sub');
  });

  it('keeps the id on the heading', () => {
    const tree = run([heading('h2', 'a', 'A')]);
    expect((tree.children[0] as Element).properties['id']).toBe('a');
  });

  it('uses the text of nested elements in the label', () => {
    const h2: Element = {
      type: 'element',
      tagName: 'h2',
      properties: { id: 'a' },
      children: [
        { type: 'text', value: 'Usando ' },
        {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: [{ type: 'text', value: 'helm' }],
        },
        { type: 'comment', value: 'x' },
      ],
    };
    run([h2]);
    expect((h2.children[0] as Element).properties['ariaLabel']).toBe(
      'Link para a seção Usando helm',
    );
  });

  it('skips the footnote heading, other tags and headings without an id', () => {
    const tree = run([
      heading('h2', 'footnote-label', 'Notas'),
      heading('h4', 'x', 'Fundo'),
      heading('h2', undefined, 'Sem id'),
    ]);
    for (const node of tree.children as Element[]) {
      expect(node.children).toHaveLength(1);
    }
  });

  it('fails on an h1 and names the post', () => {
    expect(() => run([heading('h1', 'x', 'Título')])).toThrow(
      /posts\/helm: a post body cannot contain an h1/,
    );
  });

  it('names the file when it is not in a post folder', () => {
    expect(() => run([heading('h1', 'x', 'T')], '/tmp/outro.md')).toThrow(
      '/tmp/outro.md',
    );
    expect(postName({ history: ['C:\\a\\posts\\win\\index.md'] })).toBe('win');
    expect(postName({})).toBe('unknown');
  });

  it('textOf ignores non-text nodes', () => {
    expect(textOf([{ type: 'comment', value: 'x' }])).toBe('');
  });
});
