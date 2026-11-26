import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { RehypeMermaidOptions } from 'rehype-mermaid';

/** Colors of the diagrams; copies of `tokens.css` (the ceu band and the text). */
export const MERMAID_COLORS = {
  fill: '#dfe9f4', // --bg-ceu
  border: '#2f5f8f', // --accent-ceu
  text: '#1f2328', // --text
  line: '#4f555c', // --text-muted
  surface: '#fbfaf8', // --surface
} as const;

export const MERMAID_FONT = "'Instrument Sans', system-ui, sans-serif";

export function mermaidConfig() {
  return {
    theme: 'base' as const,
    themeVariables: {
      fontFamily: MERMAID_FONT,
      fontSize: '15px',
      background: MERMAID_COLORS.surface,
      primaryColor: MERMAID_COLORS.fill,
      primaryBorderColor: MERMAID_COLORS.border,
      primaryTextColor: MERMAID_COLORS.text,
      secondaryColor: MERMAID_COLORS.surface,
      tertiaryColor: MERMAID_COLORS.surface,
      lineColor: MERMAID_COLORS.line,
      textColor: MERMAID_COLORS.text,
    },
  };
}

/**
 * CSS for the headless page, as a data URL: the real font, so the label boxes
 * Mermaid measures fit the text the reader sees. Nothing is written to disk.
 */
export function fontCss(woff2: Uint8Array): URL {
  const css = `@font-face{font-family:'Instrument Sans';font-weight:400 700;font-style:normal;src:url(data:font/woff2;base64,${Buffer.from(woff2).toString('base64')}) format('woff2')}`;
  return new URL(`data:text/css;base64,${Buffer.from(css).toString('base64')}`);
}

function loadFont(): Uint8Array {
  const require = createRequire(import.meta.url);
  return readFileSync(
    require.resolve('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2'),
  );
}

export function mermaidOptions(): RehypeMermaidOptions {
  return {
    strategy: 'inline-svg',
    mermaidConfig: mermaidConfig(),
    css: fontCss(loadFont()),
  };
}
