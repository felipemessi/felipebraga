import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import { rehypeTableWrap } from '../../src/lib/markdown/table-wrap';

const table = (): Element => ({
  type: 'element',
  tagName: 'table',
  properties: {},
  children: [],
});

describe('AC10: table wrap', () => {
  it('wraps a table in a focusable scrollable region', () => {
    const tree: Root = { type: 'root', children: [table()] };
    rehypeTableWrap()(tree);
    const wrap = tree.children[0] as Element;
    expect(wrap.tagName).toBe('div');
    expect(wrap.properties).toMatchObject({
      className: ['table-wrap'],
      role: 'region',
      ariaLabel: 'Tabela',
      tabIndex: 0,
    });
    expect((wrap.children[0] as Element).tagName).toBe('table');
  });

  it('wraps each table once', () => {
    const tree: Root = { type: 'root', children: [table(), table()] };
    rehypeTableWrap()(tree);
    rehypeTableWrap()(tree);
    for (const node of tree.children as Element[]) {
      expect(node.properties['className']).toEqual(['table-wrap']);
      expect((node.children[0] as Element).children).toEqual([]);
    }
  });

  it('leaves other elements alone', () => {
    const p: Element = {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [],
    };
    const tree: Root = { type: 'root', children: [p] };
    rehypeTableWrap()(tree);
    expect(tree.children[0]).toBe(p);
  });
});
