import { describe, expect, it } from 'vitest';
import {
  postPath,
  toPostView,
  type PostViewInput,
} from '../../src/lib/post/view';

const base: PostViewInput = {
  slug: 'helm',
  data: {
    title: 'Helm',
    description: 'Descrição',
    publishDate: new Date('2026-11-12T12:00:00Z'),
    tags: [{ id: 'plataforma' }, { id: 'helm' }],
  },
  body: 'um dois três',
  tagNames: new Map([
    ['plataforma', 'Plataforma'],
    ['helm', 'Helm'],
  ]),
  site: 'https://example.com',
  authorImage: '/avatar.jpg',
};

describe('AC3: the post view', () => {
  it('builds the path and tag pills in frontmatter order', () => {
    const view = toPostView(base);
    expect(postPath('helm')).toBe('/blog/helm');
    expect(view.path).toBe('/blog/helm');
    expect(view.tags).toEqual([
      {
        id: 'plataforma',
        name: 'Plataforma',
        href: '/tags/plataforma',
        primary: true,
      },
      { id: 'helm', name: 'Helm', href: '/tags/helm', primary: false },
    ]);
    expect(view.tagLabels).toEqual(['Plataforma', 'Helm']);
  });

  it('falls back to the tag id when the tag has no name', () => {
    const view = toPostView({ ...base, tagNames: new Map() });
    expect(view.tags[0]?.name).toBe('plataforma');
  });

  it('uses the section color, or creme', () => {
    expect(toPostView(base).tone).toBe('creme');
    expect(
      toPostView({ ...base, data: { ...base.data, sectionColor: 'ceu' } }).tone,
    ).toBe('ceu');
    expect(
      toPostView({ ...base, data: { ...base.data, sectionColor: 'nope' } })
        .tone,
    ).toBe('creme');
  });

  it('writes the meta lines', () => {
    const view = toPostView(base);
    expect(view.minutes).toBe(1);
    expect(view.metaLong).toBe('12 nov 2026 · 1 min de leitura');
    expect(view.metaShort).toBe('12 nov 2026 · 1 min');
  });

  it('adds "atualizado" only for a later day', () => {
    const later = toPostView({
      ...base,
      data: { ...base.data, updatedDate: new Date('2026-11-18T12:00:00Z') },
    });
    expect(later.metaLong).toBe(
      '12 nov 2026 · 1 min de leitura · atualizado 18 nov',
    );
    expect(later.metaShort).toBe('12 nov 2026 · 1 min');
    const sameDay = toPostView({
      ...base,
      data: { ...base.data, updatedDate: new Date('2026-11-12T13:00:00Z') },
    });
    expect(sameDay.metaLong).not.toContain('atualizado');
  });

  it('uses the cover as og:image, or the author photo', () => {
    expect(toPostView(base).ogImage).toBe('/avatar.jpg');
    expect(toPostView({ ...base, coverSrc: '/capa.jpg' }).ogImage).toBe(
      '/capa.jpg',
    );
  });

  it('puts the canonical override in the JSON-LD url', () => {
    const view = toPostView({
      ...base,
      data: { ...base.data, canonical: 'https://origin.example.org/p' },
    });
    expect(view.canonical).toBe('https://origin.example.org/p');
    expect(view.jsonLd).toContain('https://origin.example.org/p');
    expect(toPostView(base).jsonLd).toContain('https://example.com/blog/helm');
  });

  it('keeps the breadcrumb on this site for a republished post', () => {
    const view = toPostView({
      ...base,
      data: { ...base.data, canonical: 'https://origin.example.org/p' },
    });
    const graph = (
      JSON.parse(view.jsonLd) as {
        '@graph': {
          '@type': string;
          mainEntityOfPage?: { '@id': string };
          itemListElement?: { item: string }[];
        }[];
      }
    )['@graph'];
    expect(graph[0]?.mainEntityOfPage?.['@id']).toBe(
      'https://origin.example.org/p',
    );
    expect(graph[1]?.itemListElement?.at(-1)?.item).toBe(
      'https://example.com/blog/helm',
    );
  });
});
