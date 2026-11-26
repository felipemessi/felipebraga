import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import {
  fenceMeta,
  rehypeMermaidFigure,
  rehypeMermaidLabel,
} from '../../src/lib/markdown/mermaid-figure';

type Code = Element & { data?: { meta?: string } };

const fence = (
  meta: Record<string, unknown>,
  data?: { meta?: string },
): Element => {
  const code: Code = {
    type: 'element',
    tagName: 'code',
    properties: { className: ['language-mermaid'], ...meta },
    children: [{ type: 'text', value: 'A --> B' }],
  };
  if (data !== undefined) code.data = data;
  return { type: 'element', tagName: 'pre', properties: {}, children: [code] };
};

const run = (pre: Element, path = '/x/posts/helm/index.mdx') => {
  const tree: Root = { type: 'root', children: [pre] };
  rehypeMermaidFigure()(tree, { path });
  return tree;
};

describe('AC8: mermaid figure', () => {
  it('wraps the fence in a figure with the title as caption', () => {
    const tree = run(fence({ metastring: 'title="As camadas"' }));
    const figure = tree.children[0] as Element;
    expect(figure.tagName).toBe('figure');
    expect(figure.properties['className']).toEqual(['diagram']);
    expect((figure.children[0] as Element).tagName).toBe('pre');
    const caption = figure.children[1] as Element;
    expect(caption.tagName).toBe('figcaption');
    expect(caption.children).toEqual([{ type: 'text', value: 'As camadas' }]);
  });

  it('reads the meta from data.meta too', () => {
    const tree = run(fence({}, { meta: 'title="Outro"' }));
    expect(
      ((tree.children[0] as Element).children[1] as Element).children,
    ).toEqual([{ type: 'text', value: 'Outro' }]);
    expect(fenceMeta(fence({}) as never)).toBeUndefined();
  });

  it('fails without a title and names the post', () => {
    expect(() => run(fence({}))).toThrow(
      /posts\/helm: a mermaid fence needs a title/,
    );
    expect(() => run(fence({ metastring: '{2}' }))).toThrow('needs a title');
  });

  it('leaves other code blocks and other elements alone', () => {
    const other: Element = {
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['language-yaml'] },
          children: [],
        },
      ],
    };
    const tree = run(other);
    expect(tree.children[0]).toBe(other);
    const text: Root = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'p', properties: {}, children: [] },
      ],
    };
    expect(() => {
      rehypeMermaidFigure()(text, {});
    }).not.toThrow();
  });

  it('names the inline SVG after the caption', () => {
    const svg: Element = {
      type: 'element',
      tagName: 'svg',
      properties: {},
      children: [],
    };
    const figure: Element = {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['diagram'] },
      children: [
        { type: 'element', tagName: 'div', properties: {}, children: [svg] },
        {
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: 'As camadas' }],
        },
      ],
    };
    rehypeMermaidLabel()({ type: 'root', children: [figure] });
    expect(svg.properties).toMatchObject({
      role: 'img',
      ariaLabel: 'As camadas',
    });
  });

  it('does not touch figures that are not diagrams or have no svg', () => {
    const plain: Element = {
      type: 'element',
      tagName: 'figure',
      properties: {},
      children: [],
    };
    const noSvg: Element = {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['diagram'] },
      children: [{ type: 'text', value: 'x' }],
    };
    expect(() => {
      rehypeMermaidLabel()({ type: 'root', children: [plain, noSvg] });
    }).not.toThrow();
  });
});
