import { describe, expect, it } from 'vitest';
import {
  fontCss,
  MERMAID_COLORS,
  mermaidConfig,
  mermaidOptions,
} from '../../src/lib/markdown/mermaid';

describe('AC8: mermaid theme and font', () => {
  it('uses the base theme with the token palette and Instrument Sans', () => {
    const config = mermaidConfig();
    expect(config.theme).toBe('base');
    expect(config.themeVariables).toMatchObject({
      primaryColor: MERMAID_COLORS.fill,
      primaryBorderColor: MERMAID_COLORS.border,
      primaryTextColor: MERMAID_COLORS.text,
    });
    expect(config.themeVariables.fontFamily).toContain('Instrument Sans');
  });

  it('wraps the font in a data-URL stylesheet', () => {
    const url = fontCss(new Uint8Array([1, 2, 3]));
    expect(url.protocol).toBe('data:');
    const css = Buffer.from(url.href.split(',')[1] ?? '', 'base64').toString();
    expect(css).toContain("font-family:'Instrument Sans'");
    expect(css).toContain('base64,AQID');
  });

  it('renders inline SVG with the real font file loaded', () => {
    const options = mermaidOptions();
    expect(options.strategy).toBe('inline-svg');
    expect((options.css as URL).href).toMatch(/^data:text\/css;base64,/);
  });
});
