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
  it('puts a # link beside each h2 and h3, not inside it', () => {
    const tree = run([
      heading('h2', 'um-values', 'Um values'),
      heading('h3', 'sub', 'Sub'),
    ]);
    const [first, second] = tree.children as Element[];
    expect(first?.tagName).toBe('div');
    expect(first?.properties['className']).toEqual(['heading']);
    const [h2, anchor] = first?.children as Element[];
    expect(h2?.tagName).toBe('h2');
    expect(h2?.children).toEqual([{ type: 'text', value: 'Um values' }]);
    expect(anchor?.tagName).toBe('a');
    expect(anchor?.properties).toMatchObject({
      className: ['heading-anchor'],
      href: '#um-values',
      ariaLabel: 'Link para a seção Um values',
    });
    expect(anchor?.children).toEqual([{ type: 'text', value: '#' }]);
    const [h3, anchor3] = second?.children as Element[];
    expect(h3?.tagName).toBe('h3');
    expect(anchor3?.properties['href']).toBe('#sub');
  });

  it('keeps the id on the heading and wraps it once', () => {
    const tree = run([heading('h2', 'a', 'A')]);
    const wrapper = tree.children[0] as Element;
    expect((wrapper.children[0] as Element).properties['id']).toBe('a');
    expect(wrapper.children).toHaveLength(2);
    rehypeHeadingAnchors()(tree, { path: '/x/posts/helm/index.mdx' });
    expect(tree.children).toHaveLength(1);
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
    const tree = run([h2]);
    const anchor = (tree.children[0] as Element).children[1] as Element;
    expect(anchor.properties['ariaLabel']).toBe(
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
      expect(node.tagName).not.toBe('div');
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
