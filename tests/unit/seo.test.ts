import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  articleJsonLd,
  articleMeta,
  blogPostingNode,
  buildSeo,
  buildTitle,
  personJsonLd,
} from '../../src/lib/seo';

const site = 'https://example.com';

describe('seo', () => {
  it('AC10: builds absolute canonical URLs without trailing slash', () => {
    expect(absoluteUrl(site, '/')).toBe(site);
    expect(absoluteUrl(site, '/blog/')).toBe(`${site}/blog`);
    expect(absoluteUrl(site, 'blog')).toBe(`${site}/blog`);
    expect(absoluteUrl(site, '/index.html')).toBe(site);
    expect(absoluteUrl(site, '/blog/x.html')).toBe(`${site}/blog/x`);
    expect(absoluteUrl(site, '/blog///')).toBe(`${site}/blog`);
    expect(absoluteUrl(site, '///')).toBe(site);
    expect(absoluteUrl(site, `/a${'/'.repeat(50_000)}`)).toBe(`${site}/a`);
  });

  it('AC10: keeps absolute URLs untouched', () => {
    expect(absoluteUrl(site, 'https://cdn.example.net/a.png')).toBe(
      'https://cdn.example.net/a.png',
    );
  });

  it('AC9: a canonical override replaces the page path', () => {
    const seo = buildSeo({
      path: '/blog/x',
      site,
      canonical: 'https://origin.example.org/post',
    });
    expect(seo.canonical).toBe('https://origin.example.org/post');
    expect(seo.openGraph['og:url']).toBe('https://origin.example.org/post');
  });

  it('AC10: titles carry the site name', () => {
    expect(buildTitle()).toBe('Felipe Braga');
    expect(buildTitle('')).toBe('Felipe Braga');
    expect(buildTitle('Helm')).toBe('Helm · Felipe Braga');
  });

  it('AC10: emits open graph, twitter card and feed autodiscovery', () => {
    const seo = buildSeo({
      path: '/blog/x',
      site,
      title: 'X',
      image: '/img.png',
      type: 'article',
    });
    expect(seo.canonical).toBe(`${site}/blog/x`);
    expect(seo.openGraph['og:locale']).toBe('pt_BR');
    expect(seo.openGraph['og:type']).toBe('article');
    expect(seo.openGraph['og:image']).toBe(`${site}/img.png`);
    expect(seo.twitterCard).toBe('summary_large_image');
    expect(seo.alternates.map((a) => a.href)).toEqual([
      `${site}/rss.xml`,
      `${site}/feed.json`,
    ]);
    expect(seo.robots).toBeNull();
  });

  it('AC10: falls back to the tagline and omits og:image without one', () => {
    const seo = buildSeo({ path: '/', site });
    expect(seo.description).toContain('DevOps');
    expect(seo.openGraph['og:type']).toBe('website');
    expect(seo.openGraph).not.toHaveProperty('og:image');
  });

  it('AC10: noindex adds the robots directive', () => {
    expect(buildSeo({ path: '/admin', site, noindex: true }).robots).toBe(
      'noindex',
    );
  });

  it('AC11: serializes the Person JSON-LD safely', () => {
    const json = personJsonLd(site, '/a.jpg');
    const data = JSON.parse(json) as Record<string, unknown>;
    expect(data['@type']).toBe('Person');
    expect(data['image']).toBe(`${site}/a.jpg`);
    expect(data['sameAs']).toHaveLength(2);
    expect(json).not.toContain('<');
  });
});

describe('AC16: article SEO', () => {
  const published = new Date('2026-11-12T12:00:00Z');
  const modified = new Date('2026-11-18T12:00:00Z');

  it('adds article meta with one article:tag per tag', () => {
    const seo = buildSeo({
      path: '/blog/x',
      site,
      type: 'article',
      article: {
        publishedTime: published,
        modifiedTime: modified,
        tags: ['Plataforma', 'helm'],
      },
    });
    expect(seo.articleMeta).toEqual([
      { property: 'article:published_time', content: published.toISOString() },
      { property: 'article:modified_time', content: modified.toISOString() },
      { property: 'article:tag', content: 'Plataforma' },
      { property: 'article:tag', content: 'helm' },
    ]);
  });

  it('omits modified_time without updatedDate and article meta outside articles', () => {
    expect(
      articleMeta({ publishedTime: published, tags: [] }).map(
        (tag) => tag.property,
      ),
    ).toEqual(['article:published_time']);
    expect(articleMeta(undefined)).toEqual([]);
  });

  const input = {
    site,
    url: `${site}/blog/x`,
    title: 'Helm',
    description: 'Descrição',
    publishedTime: published,
    authorImage: '/avatar.jpg',
  };

  it('builds one @graph with BlogPosting and BreadcrumbList', () => {
    const data = JSON.parse(
      articleJsonLd({ ...input, modifiedTime: modified, image: '/capa.jpg' }),
    ) as { '@context': string; '@graph': Record<string, unknown>[] };
    expect(data['@context']).toBe('https://schema.org');
    const [post, crumbs] = data['@graph'];
    expect(post).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Helm',
      description: 'Descrição',
      datePublished: published.toISOString(),
      dateModified: modified.toISOString(),
      image: `${site}/capa.jpg`,
      inLanguage: 'pt-BR',
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${site}/blog/x` },
      author: { '@type': 'Person', name: 'Felipe Braga', url: site },
    });
    expect(crumbs).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Início', item: site },
        { position: 2, name: 'Artigos', item: `${site}/blog` },
        { position: 3, name: 'Helm', item: `${site}/blog/x` },
      ],
    });
  });

  it('falls back to publishDate for dateModified and omits a missing image', () => {
    const node = blogPostingNode(input);
    expect(node.dateModified).toBe(published.toISOString());
    expect('image' in node).toBe(false);
  });

  it('cannot close the script element', () => {
    expect(articleJsonLd({ ...input, title: '</script><b>' })).not.toContain(
      '<',
    );
  });
});
