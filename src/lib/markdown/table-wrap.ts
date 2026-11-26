import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Wraps every table in a focusable, scrollable region so a wide table scrolls
 * on its own instead of the page (axe `scrollable-region-focusable`).
 */
export function rehypeTableWrap() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (
        node.tagName !== 'table' ||
        parent === undefined ||
        index === undefined
      ) {
        return;
      }
      if (
        parent.type === 'element' &&
        Array.isArray(parent.properties['className']) &&
        parent.properties['className'].includes('table-wrap')
      ) {
        return;
      }
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-wrap'],
          role: 'region',
          ariaLabel: 'Tabela',
          tabIndex: 0,
        },
        children: [node],
      };
      return 'skip';
    });
  };
}
