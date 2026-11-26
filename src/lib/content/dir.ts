export const DEFAULT_CONTENT_DIR = 'src/content';

export function resolveContentDir(
  env: Record<string, string | undefined>,
): string {
  const value = env['PUBLIC_CONTENT_DIR']?.trim();
  if (!value) return DEFAULT_CONTENT_DIR;
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
}
