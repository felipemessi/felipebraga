import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { FOOTNOTE_ID } from '../post/toc';

interface VFileLike {
  path?: string | undefined;
  history?: string[] | undefined;
}

export function textOf(nodes: readonly ElementContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'element') return textOf(node.children);
      return '';
    })
    .join('');
}

/** Name of the post being processed, for error messages. */
export function postName(file: VFileLike): string {
  const path = file.path ?? file.history?.[0] ?? 'unknown';
  return /posts\/([^/]+)\//.exec(path.replaceAll('\\', '/'))?.[1] ?? path;
}

/**
 * Adds a `#` link beside every h2 and h3 (the id comes from `rehypeHeadingIds`,
 * which must run first) and fails the build on an h1 in the body: the page
 * already has one. The link sits next to the heading, not inside it, so it
 * does not become part of the heading's accessible name.
 */
export function rehypeHeadingAnchors() {
  return (tree: Root, file: VFileLike) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'h1') {
        throw new Error(
          `posts/${postName(file)}: a post body cannot contain an h1 ("# ..."); the title is the h1. Use "##" for sections.`,
        );
      }
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties['id'];
      if (typeof id !== 'string' || id === FOOTNOTE_ID) return;
      if (parent === undefined || index === undefined) return;
      const anchor: Element = {
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['heading-anchor'],
          href: `#${id}`,
          ariaLabel: `Link para a seção ${textOf(node.children)}`,
        },
        children: [{ type: 'text', value: '#' }],
      };
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['heading'] },
        children: [node, anchor],
      };
      // The wrapper holds the heading already; do not visit it again.
      return 'skip';
    });
  };
}
