import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
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
