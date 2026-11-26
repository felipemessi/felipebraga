import { absoluteUrl, articleJsonLd } from '../seo';
import { isTone, type Tone } from '../tone';
import { formatDate, formatUpdated, isUpdatedLater } from './dates';
import { readingTime } from './reading-time';

export interface PostData {
  title: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date | undefined;
  tags: readonly { id: string }[];
  sectionColor?: string | undefined;
  canonical?: string | undefined;
  coverAlt?: string | undefined;
}

export interface PostViewInput {
  slug: string;
  data: PostData;
  body: string;
  /** Tag id -> display name, from the tags collection. */
  tagNames: ReadonlyMap<string, string>;
  site: string;
  /** Processed cover URL, when the post has one. */
  coverSrc?: string | undefined;
  /** Photo used for the author and as the default `og:image`. */
  authorImage: string;
}

export interface TagPill {
  id: string;
  name: string;
  href: string;
  primary: boolean;
}

export interface PostView {
  tone: Tone;
  path: string;
  tags: TagPill[];
  minutes: number;
  /** Desktop: `12 nov 2026 · 9 min de leitura · atualizado 18 nov`. */
  metaLong: string;
  /** Mobile: `12 nov 2026 · 9 min`. */
  metaShort: string;
  canonical: string | undefined;
  ogImage: string;
  modifiedTime: Date | undefined;
  tagLabels: string[];
  jsonLd: string;
}

export function postPath(slug: string): string {
  return `/blog/${slug}`;
}

export function toPostView(input: PostViewInput): PostView {
  const { slug, data, tagNames } = input;
  const minutes = readingTime(input.body);
  const published = formatDate(data.publishDate);
  const updated = isUpdatedLater(data.publishDate, data.updatedDate)
    ? formatUpdated(data.publishDate, data.updatedDate)
    : undefined;
  const long = [published, `${String(minutes)} min de leitura`];
  if (updated !== undefined) long.push(`atualizado ${updated}`);

  const tags = data.tags.map((tag, index) => ({
    id: tag.id,
    name: tagNames.get(tag.id) ?? tag.id,
    href: `/tags/${tag.id}`,
    primary: index === 0,
  }));
  const path = postPath(slug);
  const pageUrl = absoluteUrl(input.site, path);
  const url = data.canonical ?? pageUrl;
  const ogImage = input.coverSrc ?? input.authorImage;

  return {
    tone: isTone(data.sectionColor) ? data.sectionColor : 'creme',
    path,
    tags,
    minutes,
    metaLong: long.join(' · '),
    metaShort: `${published} · ${String(minutes)} min`,
    canonical: data.canonical,
    ogImage,
    modifiedTime: data.updatedDate,
    tagLabels: tags.map((tag) => tag.name),
    jsonLd: articleJsonLd({
      site: input.site,
      url,
      pageUrl,
      title: data.title,
      description: data.description,
      publishedTime: data.publishDate,
      modifiedTime: data.updatedDate,
      image: input.coverSrc,
      authorImage: input.authorImage,
    }),
  };
}
