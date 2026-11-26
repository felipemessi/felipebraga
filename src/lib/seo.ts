import { LINKS, sameAs } from './links';
import { SITE } from './site';

export interface SeoInput {
  title?: string | undefined;
  description?: string | undefined;
  path: string;
  site: string;
  /** Overrides the canonical URL, for posts republished from elsewhere. */
  canonical?: string | undefined;
  image?: string | undefined;
  type?: 'website' | 'article' | undefined;
  noindex?: boolean | undefined;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string | null;
  openGraph: Record<string, string>;
  twitterCard: string;
  alternates: { type: string; title: string; href: string }[];
}

// A loop instead of /\/+$/, which backtracks in quadratic time on long runs of slashes.
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

export function absoluteUrl(site: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = new URL(site).origin;
  // `build.format: 'file'` exposes `/index.html` and `/x.html` as pathnames.
  const clean = trimTrailingSlashes(path.replace(/(\/index)?\.html$/, ''));
  return clean === '' || clean === '/'
    ? origin
    : `${origin}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

export function buildTitle(title?: string): string {
  return title === undefined || title === ''
    ? SITE.name
    : `${title} · ${SITE.name}`;
}

export function buildSeo(input: SeoInput): SeoMeta {
  const title = buildTitle(input.title);
  const description = input.description ?? SITE.tagline;
  const canonical = absoluteUrl(input.site, input.canonical ?? input.path);
  const openGraph: Record<string, string> = {
    'og:title': title,
    'og:description': description,
    'og:url': canonical,
    'og:type': input.type ?? 'website',
    'og:site_name': SITE.name,
    'og:locale': 'pt_BR',
  };
  if (input.image !== undefined) {
    openGraph['og:image'] = absoluteUrl(input.site, input.image);
  }
  return {
    title,
    description,
    canonical,
    robots: input.noindex === true ? 'noindex' : null,
    openGraph,
    twitterCard: 'summary_large_image',
    alternates: [
      {
        type: 'application/rss+xml',
        title: SITE.name,
        href: absoluteUrl(input.site, LINKS.rss),
      },
      {
        type: 'application/feed+json',
        title: SITE.name,
        href: absoluteUrl(input.site, LINKS.feed),
      },
    ],
  };
}

export function personJsonLd(site: string, image: string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.name,
    url: absoluteUrl(site, '/'),
    image: absoluteUrl(site, image),
    sameAs: sameAs(),
  };
  // Escape "<" so the payload cannot close the script element.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
