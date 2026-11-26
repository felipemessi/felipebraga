// Single place for every outbound link of the site. Header, footer and the
// JSON-LD `Person` read only from here. Fill the TODO values before launch.
export const LINKS = {
  github: 'https://github.com/TODO',
  linkedin: 'https://www.linkedin.com/in/TODO',
  email: 'TODO@example.invalid',
  rss: '/rss.xml',
  feed: '/feed.json',
} as const;

const PLACEHOLDER = /TODO/;

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

/** Social profiles for the JSON-LD `Person` `sameAs`. */
export function sameAs(): string[] {
  return [LINKS.github, LINKS.linkedin];
}

export function findPlaceholders(): string[] {
  return Object.entries(LINKS)
    .filter(([, value]) => PLACEHOLDER.test(value))
    .map(([key]) => key);
}

export function isLocalSite(siteUrl: string): boolean {
  const { hostname } = new URL(siteUrl);
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Throws when a production URL would ship with placeholder links. */
export function assertLinksReady(siteUrl: string): void {
  if (isLocalSite(siteUrl)) return;
  const pending = findPlaceholders();
  if (pending.length > 0) {
    throw new Error(
      `Placeholder links left in src/lib/links.ts: ${pending.join(', ')}`,
    );
  }
}
