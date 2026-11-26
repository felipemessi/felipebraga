export const WORDS_PER_MINUTE = 200;

const FRONTMATTER = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
const ESM_LINE = /^[ \t]*(?:import|export)\s.*$/gm;
// Tags only: `<Callout type="nota">` and `</Callout>`. A `<` before a space or a
// digit (`a < b`) is text, not a tag.
const JSX_TAG = /<\/?[A-Za-z][^>]*>/g;

export function countWords(body: string): number {
  const text = body
    .replace(FRONTMATTER, '')
    .replace(ESM_LINE, ' ')
    .replace(JSX_TAG, ' ');
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Whole minutes at 200 words per minute, rounded up, never below 1. */
export function readingTime(body: string): number {
  return Math.max(1, Math.ceil(countWords(body) / WORDS_PER_MINUTE));
}
