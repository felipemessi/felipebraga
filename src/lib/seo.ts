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
  article?: ArticleInput | undefined;
}

export interface ArticleInput {
  publishedTime: Date;
  modifiedTime?: Date | undefined;
  tags: readonly string[];
}

export interface MetaTag {
  property: string;
  content: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string | null;
  openGraph: Record<string, string>;
  twitterCard: string;
  articleMeta: MetaTag[];
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
    articleMeta: articleMeta(input.article),
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

export function articleMeta(article: ArticleInput | undefined): MetaTag[] {
  if (article === undefined) return [];
  const tags: MetaTag[] = [
    {
      property: 'article:published_time',
      content: article.publishedTime.toISOString(),
    },
  ];
  if (article.modifiedTime !== undefined) {
    tags.push({
      property: 'article:modified_time',
      content: article.modifiedTime.toISOString(),
    });
  }
  for (const tag of article.tags) {
    tags.push({ property: 'article:tag', content: tag });
  }
  return tags;
}

function personNode(site: string, image: string) {
  return {
    '@type': 'Person',
    name: SITE.name,
    url: absoluteUrl(site, '/'),
    image: absoluteUrl(site, image),
    sameAs: sameAs(),
  };
}

// Escape "<" so the payload cannot close the script element.
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function personJsonLd(site: string, image: string): string {
  return serialize({
    '@context': 'https://schema.org',
    ...personNode(site, image),
  });
}

export interface BlogPostingInput {
  site: string;
  /** Canonical URL of the post, absolute. */
  url: string;
  title: string;
  description: string;
  publishedTime: Date;
  modifiedTime?: Date | undefined;
  /** Processed cover, absolute or site-relative. */
  image?: string | undefined;
  /** Author photo, for the `Person`. */
  authorImage: string;
}

export function blogPostingNode(input: BlogPostingInput) {
  return {
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedTime.toISOString(),
    dateModified: (input.modifiedTime ?? input.publishedTime).toISOString(),
    author: personNode(input.site, input.authorImage),
    ...(input.image === undefined
      ? {}
      : { image: absoluteUrl(input.site, input.image) }),
    inLanguage: SITE.locale,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
  };
}

export function breadcrumbNode(site: string, title: string, url: string) {
  const items = [
    { name: 'Início', item: absoluteUrl(site, '/') },
    { name: 'Artigos', item: absoluteUrl(site, '/blog') },
    { name: title, item: url },
  ];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      ...entry,
    })),
  };
}

/** One `@graph` with the `BlogPosting` and its `BreadcrumbList`. */
export function articleJsonLd(input: BlogPostingInput): string {
  return serialize({
    '@context': 'https://schema.org',
    '@graph': [
      blogPostingNode(input),
      breadcrumbNode(input.site, input.title, input.url),
    ],
  });
}
