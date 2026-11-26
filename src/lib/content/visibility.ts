export interface Publishable {
  draft: boolean;
  publishDate?: Date;
}

export function isPublished(entry: Publishable, now: Date): boolean {
  if (entry.draft) return false;
  if (entry.publishDate === undefined) return true;
  return entry.publishDate.getTime() <= now.getTime();
}

export function filterPublished<T extends { data: Publishable }>(
  entries: readonly T[],
  now: Date,
): T[] {
  return entries.filter((entry) => isPublished(entry.data, now));
}
