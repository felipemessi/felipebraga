/** Slug of the post a page URL belongs to: `/blog/helm` -> `helm`. */
export function slugFromPath(pathname: string): string | undefined {
  return /^\/blog\/([^/]+)$/.exec(pathname.replace(/\.html$/, ''))?.[1];
}

/** The `alt` of a figure is required: an empty one fails the build. */
export function assertAlt(alt: unknown, src: string): string {
  if (typeof alt !== 'string' || alt.trim() === '') {
    throw new Error(
      `<Figure src="${src}">: alt is required and cannot be empty`,
    );
  }
  return alt;
}

/**
 * Finds the glob key of an image that lives in a post folder. `src` is a path
 * relative to the post, such as `./helm-diff.png`.
 */
export function findPostImage(
  keys: readonly string[],
  slug: string,
  src: string,
): string {
  const file = src.replace(/^\.\//, '');
  const key = keys.find((candidate) =>
    candidate.endsWith(`/posts/${slug}/${file}`),
  );
  if (key === undefined) {
    throw new Error(`<Figure src="${src}">: no such image in posts/${slug}`);
  }
  return key;
}
