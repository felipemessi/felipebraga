import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import type { AstroUserConfig } from 'astro';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { transformerCodeFrame } from './code-frame';
import rehypeMermaid from 'rehype-mermaid';
import { rehypeHeadingAnchors } from './heading-anchors';
import { mermaidOptions } from './mermaid';
import { rehypeMermaidFigure, rehypeMermaidLabel } from './mermaid-figure';
import { felipeLight } from './shiki-theme';
import { rehypeTableWrap } from './table-wrap';

/** Portuguese labels for GFM footnotes (RN5). */
export const FOOTNOTE_LABELS = {
  footnoteLabel: 'Notas',
  footnoteBackLabel: 'Voltar ao texto',
} as const;

export const markdownConfig: NonNullable<AstroUserConfig['markdown']> = {
  // Mermaid fences are rendered to SVG by rehype-mermaid, not highlighted.
  syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
  shikiConfig: {
    theme: felipeLight,
    transformers: [transformerMetaHighlight(), transformerCodeFrame()],
  },
  processor: unified({
    remarkRehype: {
      ...FOOTNOTE_LABELS,
      footnoteLabelTagName: 'h2',
    },
    // Astro adds heading ids after user plugins, so run its plugin first.
    rehypePlugins: [
      rehypeHeadingIds,
      rehypeHeadingAnchors,
      rehypeTableWrap,
      rehypeMermaidFigure,
      [rehypeMermaid, mermaidOptions()],
      rehypeMermaidLabel,
    ],
  }),
};
