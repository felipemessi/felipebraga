export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocEntry {
  slug: string;
  text: string;
  children: TocEntry[];
}

/** Heading id Astro gives the footnote section; it is not part of the Toc. */
export const FOOTNOTE_ID = 'footnote-label';

/** Minimum number of entries for the Toc to render. */
export const MIN_TOC_ENTRIES = 2;

/**
 * h2 entries with their h3 children. An h3 before any h2 is promoted to the top
 * level; other depths and the footnote heading are ignored.
 */
export function buildToc(headings: readonly Heading[]): TocEntry[] {
  const toc: TocEntry[] = [];
  let current: TocEntry | undefined;
  for (const heading of headings) {
    if (heading.slug === FOOTNOTE_ID) continue;
    if (heading.depth === 2) {
      current = { slug: heading.slug, text: heading.text, children: [] };
      toc.push(current);
    } else if (heading.depth === 3) {
      const entry = { slug: heading.slug, text: heading.text, children: [] };
      if (current === undefined) toc.push(entry);
      else current.children.push(entry);
    }
  }
  return toc;
}

export function shouldRenderToc(toc: readonly TocEntry[]): boolean {
  return toc.length >= MIN_TOC_ENTRIES;
}
