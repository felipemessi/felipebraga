import type { Element, ElementContent, Root } from 'hast';

export interface FenceMeta {
  title?: string | undefined;
}

/** Reads `title="…"` from a fence meta string; line ranges are handled by Shiki. */
export function parseFenceMeta(raw: string | undefined): FenceMeta {
  if (raw === undefined) return {};
  const match = /(?:^|\s)title=(?:"([^"]*)"|'([^']*)')/.exec(raw);
  const title = match?.[1] ?? match?.[2];
  return title === undefined || title === '' ? {} : { title };
}

const PLAIN = new Set(['', 'text', 'txt', 'plain', 'plaintext']);

/** Language shown in the header, or `undefined` for plain text. */
export function languageLabel(lang: string | undefined): string | undefined {
  const value = (lang ?? '').trim().toLowerCase();
  return PLAIN.has(value) ? undefined : value;
}

function el(
  tagName: string,
  properties: Element['properties'],
  children: ElementContent[] = [],
): Element {
  return { type: 'element', tagName, properties, children };
}

const text = (value: string): ElementContent => ({ type: 'text', value });

const COPY_ICON = [
  el('rect', { x: '9', y: '9', width: '12', height: '12', rx: '2' }),
  el('path', { d: 'M5 15V5a2 2 0 0 1 2-2h10' }),
];

/** The `<figure class="code">` around a highlighted `<pre>`. */
export function buildCodeFrame(
  pre: Element,
  meta: FenceMeta,
  lang: string | undefined,
): Element {
  const label = languageLabel(lang);
  const actions = el('span', { className: ['code-actions'] }, [
    ...(label === undefined
      ? []
      : [el('span', { className: ['code-lang'] }, [text(label)])]),
    el(
      'button',
      {
        type: 'button',
        className: ['code-copy'],
        hidden: true,
        'data-copy': '',
        ariaLabel: 'Copiar código',
      },
      [
        el(
          'svg',
          {
            width: '14',
            height: '14',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '1.8',
            ariaHidden: 'true',
          },
          COPY_ICON,
        ),
        el('span', { className: ['code-copy-label'] }, [text('Copiar')]),
      ],
    ),
  ]);
  return el('figure', { className: ['code'] }, [
    el('div', { className: ['code-header'] }, [
      el(
        'span',
        { className: ['code-title'] },
        meta.title === undefined ? [] : [text(meta.title)],
      ),
      actions,
    ]),
    pre,
    el('span', {
      className: ['sr-only'],
      role: 'status',
      ariaLive: 'polite',
      'data-copy-status': '',
    }),
  ]);
}

/** Shiki puts its own background on the `<pre>`; the frame draws the surface. */
function stripBackground(pre: Element): void {
  const style = pre.properties['style'];
  if (typeof style === 'string') {
    pre.properties['style'] = style.replace(/background-color:[^;]+;?/g, '');
  }
}

/** Shiki transformer: wraps each block in the code frame. */
export function transformerCodeFrame() {
  return {
    name: 'felipe-code-frame',
    root(
      this: { options: { lang?: string; meta?: { __raw?: string } } },
      root: Root,
    ) {
      const pre = root.children.find(
        (node): node is Element =>
          node.type === 'element' && node.tagName === 'pre',
      );
      if (pre === undefined) return;
      stripBackground(pre);
      const meta = parseFenceMeta(this.options.meta?.__raw);
      root.children = [buildCodeFrame(pre, meta, this.options.lang)];
    },
  };
}
