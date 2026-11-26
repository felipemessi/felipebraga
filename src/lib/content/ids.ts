const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** File name (or relative path) without its extension: `devops.yaml` -> `devops`. */
export function idFromFile(entry: string): string {
  return entry.replace(/\.[^./]+$/, '');
}

export function isValidId(id: string): boolean {
  return KEBAB.test(id);
}

export function invalidIdProblems(
  collection: string,
  ids: Iterable<string>,
): string[] {
  const problems: string[] = [];
  for (const id of ids) {
    if (!isValidId(id)) {
      problems.push(
        `${collection}/${id}: id must be lowercase kebab-case (letters, digits and single hyphens)`,
      );
    }
  }
  return problems;
}
