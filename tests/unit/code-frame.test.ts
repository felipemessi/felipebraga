import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import {
  buildCodeFrame,
  languageLabel,
  parseFenceMeta,
  transformerCodeFrame,
} from '../../src/lib/markdown/code-frame';

const pre = (style?: string): Element => ({
  type: 'element',
  tagName: 'pre',
  properties: style === undefined ? {} : { style },
  children: [],
});

function find(
  node: Element,
  predicate: (el: Element) => boolean,
): Element | undefined {
  if (predicate(node)) return node;
  for (const child of node.children) {
    if (child.type === 'element') {
      const found = find(child, predicate);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

const has = (el: Element, name: string) =>
  Array.isArray(el.properties['className']) &&
  el.properties['className'].includes(name);

describe('AC6: fence meta', () => {
  it('reads the title in double or single quotes', () => {
    expect(parseFenceMeta('title="a/b.yaml" {4}')).toEqual({
      title: 'a/b.yaml',
    });
    expect(parseFenceMeta("{4} title='x y'")).toEqual({ title: 'x y' });
  });

  it('returns nothing without a title', () => {
    expect(parseFenceMeta(undefined)).toEqual({});
    expect(parseFenceMeta('{2-3,7}')).toEqual({});
    expect(parseFenceMeta('title=""')).toEqual({});
    expect(parseFenceMeta('subtitle="x"')).toEqual({});
  });

  it('hides the label for plain text', () => {
    expect(languageLabel('YAML')).toBe('yaml');
    for (const lang of [undefined, '', 'text', 'plaintext']) {
      expect(languageLabel(lang)).toBeUndefined();
    }
  });
});

describe('AC6/AC7: the code frame', () => {
  it('builds figure > header, pre, status', () => {
    const frame = buildCodeFrame(pre(), { title: 'values.yaml' }, 'yaml');
    expect(frame.tagName).toBe('figure');
    expect(has(frame, 'code')).toBe(true);
    const title = find(frame, (el) => has(el, 'code-title'));
    expect(title?.children).toEqual([{ type: 'text', value: 'values.yaml' }]);
    expect(find(frame, (el) => has(el, 'code-lang'))?.children).toEqual([
      { type: 'text', value: 'yaml' },
    ]);
    expect(find(frame, (el) => el.tagName === 'pre')).toBeDefined();
  });

  it('ships the copy button hidden, labelled, with a polite status region', () => {
    const frame = buildCodeFrame(pre(), {}, 'yaml');
    const button = find(frame, (el) => el.tagName === 'button');
    expect(button?.properties).toMatchObject({
      type: 'button',
      hidden: true,
      ariaLabel: 'Copiar código',
    });
    expect(button?.properties).toHaveProperty('data-copy');
    const status = find(frame, (el) => 'data-copy-status' in el.properties);
    expect(status?.properties).toMatchObject({ ariaLive: 'polite' });
  });

  it('has an empty title and no language label when neither exists', () => {
    const frame = buildCodeFrame(pre(), {}, 'text');
    expect(find(frame, (el) => has(el, 'code-title'))?.children).toEqual([]);
    expect(find(frame, (el) => has(el, 'code-lang'))).toBeUndefined();
  });

  it('the transformer wraps the pre and drops the Shiki background', () => {
    const root: Root = {
      type: 'root',
      children: [pre('background-color:#fff;color:#000')],
    };
    const transformer = transformerCodeFrame();
    transformer.root.call(
      { options: { lang: 'yaml', meta: { __raw: 'title="x.yaml"' } } },
      root,
    );
    const figure = root.children[0] as Element;
    expect(figure.tagName).toBe('figure');
    const inner = find(figure, (el) => el.tagName === 'pre');
    expect(inner?.properties['style']).toBe('color:#000');
    expect(find(figure, (el) => has(el, 'code-title'))?.children).toEqual([
      { type: 'text', value: 'x.yaml' },
    ]);
  });

  it('the transformer leaves a tree without a pre alone', () => {
    const root: Root = { type: 'root', children: [] };
    transformerCodeFrame().root.call({ options: {} }, root);
    expect(root.children).toEqual([]);
  });

  it('the transformer copes with a pre that has no style', () => {
    const root: Root = { type: 'root', children: [pre()] };
    transformerCodeFrame().root.call({ options: {} }, root);
    expect((root.children[0] as Element).tagName).toBe('figure');
  });
});
