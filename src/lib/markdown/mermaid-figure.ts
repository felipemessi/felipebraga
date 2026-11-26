import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { parseFenceMeta } from './code-frame';
import { postName, textOf } from './heading-anchors';

interface VFileLike {
  path?: string | undefined;
  history?: string[] | undefined;
}

type CodeNode = Element & { data?: { meta?: string } };

function classes(node: Element): string[] {
  const value = node.properties['className'];
  return Array.isArray(value) ? value.map(String) : [];
}

/** The fence meta lives in `data.meta` or, from Astro's pipeline, `metastring`. */
export function fenceMeta(code: CodeNode): string | undefined {
  const fromProperty = code.properties['metastring'];
  if (typeof fromProperty === 'string') return fromProperty;
  return code.data?.meta;
}

function mermaidCode(pre: Element): CodeNode | undefined {
  return pre.children.find(
    (child): child is CodeNode =>
      child.type === 'element' &&
      child.tagName === 'code' &&
      classes(child).includes('language-mermaid'),
  );
}

const isDiagram = (node: Element): boolean =>
  node.tagName === 'figure' && classes(node).includes('diagram');

/**
 * Runs before `rehype-mermaid`: wraps each Mermaid fence in a figure whose
 * caption is the fence title. The title is the accessible name of the diagram,
 * so a fence without one fails the build.
 */
export function rehypeMermaidFigure() {
  return (tree: Root, file: VFileLike) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (
        node.tagName !== 'pre' ||
        parent === undefined ||
        index === undefined
      ) {
        return;
      }
      const code = mermaidCode(node);
      if (code === undefined) return;
      const title = parseFenceMeta(fenceMeta(code)).title;
      if (title === undefined) {
        throw new Error(
          `posts/${postName(file)}: a mermaid fence needs a title, as in \`\`\`mermaid title="Descrição do diagrama"`,
        );
      }
      const caption: ElementContent = {
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [{ type: 'text', value: title }],
      };
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'] },
        children: [node, caption],
      };
      return 'skip';
    });
  };
}

function findSvg(node: Element): Element | undefined {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'svg') return child;
    const nested = findSvg(child);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

/** Runs after `rehype-mermaid`: names the inline SVG after the caption. */
export function rehypeMermaidLabel() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!isDiagram(node)) return;
      const caption = node.children.find(
        (child): child is Element =>
          child.type === 'element' && child.tagName === 'figcaption',
      );
      const svg = findSvg(node);
      if (caption === undefined || svg === undefined) return;
      svg.properties['role'] = 'img';
      svg.properties['ariaLabel'] = textOf(caption.children);
    });
  };
}
