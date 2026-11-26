export const DEV_SITE_URL = 'http://localhost:4321';

/**
 * Resolves the site origin from `PUBLIC_SITE_URL`. An empty value falls back to
 * the local dev URL; an invalid one throws, so the build fails.
 */
export function resolveSiteUrl(value?: string): string {
  const raw = value === undefined || value.trim() === '' ? DEV_SITE_URL : value;
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(`PUBLIC_SITE_URL is not a valid URL: ${raw}`);
  }
}
