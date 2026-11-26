import type { ShikiConfig } from 'astro';

type Theme = Exclude<NonNullable<ShikiConfig['theme']>, string>;

/**
 * Token palette for code. The values are copies of `tokens.css`; a unit test
 * keeps them in sync and checks contrast on `--surface` and on every band.
 */
export const CODE_COLORS = {
  surface: '#fbfaf8',
  text: '#1f2328',
  key: '#2f5f8f', // --accent-ceu
  string: '#3f6b48', // --accent-salvia
  number: '#9a4a24', // --accent-pessego
  keyword: '#5e4a8c', // --accent-lavanda
  comment: '#6b5f52', // --accent-creme
} as const;

export const felipeLight: Theme = {
  name: 'felipe-light',
  type: 'light',
  colors: {
    'editor.background': CODE_COLORS.surface,
    'editor.foreground': CODE_COLORS.text,
  },
  settings: [
    { settings: { foreground: CODE_COLORS.text } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: CODE_COLORS.comment, fontStyle: 'italic' },
    },
    {
      scope: [
        'entity.name.tag.yaml',
        'support.type.property-name',
        'meta.object-literal.key',
        'variable.other.property',
        'variable.other.object.property',
        'entity.name.function',
        'support.function',
        'variable.parameter',
        'entity.name.type',
        'support.type',
        'support.class',
      ],
      settings: { foreground: CODE_COLORS.key },
    },
    {
      scope: [
        'string',
        'punctuation.definition.string',
        'string.quoted',
        'markup.inserted',
      ],
      settings: { foreground: CODE_COLORS.string },
    },
    {
      scope: [
        'constant.numeric',
        'constant.character',
        'constant.other',
        'markup.deleted',
      ],
      settings: { foreground: CODE_COLORS.number },
    },
    {
      scope: [
        'keyword',
        'storage',
        'constant.language',
        'constant.language.boolean',
        'variable.language',
        'entity.name.tag',
        'meta.tag',
      ],
      settings: { foreground: CODE_COLORS.keyword },
    },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator'],
      settings: { foreground: CODE_COLORS.text },
    },
  ],
};
