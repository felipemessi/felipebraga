import { LINKS, sameAs } from './links';
import { SITE } from './site';

export interface SeoInput {
  title?: string | undefined;
  description?: string | undefined;
  path: string;
  site: string;
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

export function absoluteUrl(site: string, path: string): string {
  const origin = new URL(site).origin;
  // `build.format: 'file'` exposes `/index.html` and `/x.html` as pathnames.
  const clean = path.replace(/(\/index)?\.html$/, '').replace(/\/+$/, '');
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
  const canonical = absoluteUrl(input.site, input.path);
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
