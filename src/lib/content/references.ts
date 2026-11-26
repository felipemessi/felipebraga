import { parse } from 'yaml';

export interface PostReferences {
  id: string;
  tags: readonly string[];
  series?: string | undefined;
}

export type ParsedPost =
  | { references: PostReferences; problem?: undefined }
  | { references?: undefined; problem: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** A reference is an id string or the `{ collection, id }` object form. */
function referenceId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const { id } = value;
    if (typeof id === 'string') return id;
  }
  return String(value);
}

export function parsePostReferences(id: string, source: string): ParsedPost {
  const text = source.startsWith('\uFEFF') ? source.slice(1) : source;
  const block = FRONTMATTER.exec(text)?.[1];
  if (block === undefined) {
    return { problem: `posts/${id}: missing frontmatter` };
  }
  let data: unknown;
  try {
    // Astro parses frontmatter with merge keys (<<) on; match it.
    data = parse(block, { merge: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      problem: `posts/${id}: invalid frontmatter (${reason.split('\n')[0] ?? reason})`,
    };
  }
  const record =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {};
  const tags = record['tags'];
  const series = record['series'];
  return {
    references: {
      id,
      tags: Array.isArray(tags) ? tags.map(referenceId) : [],
      series:
        series === undefined || series === null
          ? undefined
          : referenceId(series),
    },
  };
}

export function findBrokenReferences(
  posts: readonly PostReferences[],
  tagIds: ReadonlySet<string>,
  seriesIds: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagIds.has(tag)) {
        problems.push(
          `posts/${post.id}: tag "${tag}" does not exist in the tags collection`,
        );
      }
    }
    if (post.series !== undefined && !seriesIds.has(post.series)) {
      problems.push(
        `posts/${post.id}: series "${post.series}" does not exist in the series collection`,
      );
    }
  }
  return problems;
}
