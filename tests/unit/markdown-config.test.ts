import { describe, expect, it } from 'vitest';
import { FOOTNOTE_LABELS, markdownConfig } from '../../src/lib/markdown/config';

describe('AC11: footnote labels', () => {
  it('are Portuguese', () => {
    expect(FOOTNOTE_LABELS).toEqual({
      footnoteLabel: 'Notas',
      footnoteBackLabel: 'Voltar ao texto',
    });
  });
});

describe('AC8: markdown config', () => {
  it('lets Shiki skip Mermaid fences', () => {
    expect(markdownConfig.syntaxHighlight).toEqual({
      type: 'shiki',
      excludeLangs: ['mermaid'],
    });
  });

  it('uses the token theme and the code frame', () => {
    const shiki = markdownConfig.shikiConfig;
    expect(shiki?.theme).toMatchObject({ name: 'felipe-light' });
    expect(shiki?.transformers).toHaveLength(2);
  });
});
