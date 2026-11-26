export interface PostReferences {
  id: string;
  tags: readonly string[];
  series?: string | undefined;
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
