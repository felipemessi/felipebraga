import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import {
  pageSchema,
  postSchema,
  seriesSchema,
  tagSchema,
} from '../../src/lib/content/schemas';

const post = postSchema({
  image: () => z.string(),
  reference: (collection) => z.string().transform((id) => ({ collection, id })),
});

const valid = {
  title: 'Pipelines com agentes de IA',
  description:
    'Como usar agentes de IA dentro de pipelines de CI sem perder o controle do que vai para produção.',
  publishDate: '2026-12-01T09:00:00-03:00',
  tags: ['devops'],
};

function issuePaths(input: unknown): string[] {
  const result = post.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('postSchema', () => {
  it('accepts the minimal valid post and applies defaults', () => {
    const result = post.parse(valid);
    expect(result.draft).toBe(false);
    expect(result.publishDate).toBeInstanceOf(Date);
    expect(result.tags).toEqual([{ collection: 'tags', id: 'devops' }]);
    expect(result.series).toBeUndefined();
    expect(result.cover).toBeUndefined();
  });

  it('accepts every optional field', () => {
    const result = post.safeParse({
      ...valid,
      updatedDate: '2026-12-02T09:00:00-03:00',
      draft: true,
      series: 'agentes',
      seriesOrder: 2,
      cover: './cover.png',
      coverAlt: 'Diagrama do pipeline',
      sectionColor: 'lavanda',
      canonical: 'https://example.com/original',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing or empty title', () => {
    expect(issuePaths({ ...valid, title: undefined })).toContain('title');
    expect(issuePaths({ ...valid, title: '   ' })).toContain('title');
  });

  it('rejects a title over 70 characters and accepts exactly 70', () => {
    expect(issuePaths({ ...valid, title: 'a'.repeat(71) })).toContain('title');
    expect(issuePaths({ ...valid, title: 'a'.repeat(70) })).toEqual([]);
  });

  it('enforces the 50 to 160 character description', () => {
    expect(issuePaths({ ...valid, description: 'a'.repeat(49) })).toContain(
      'description',
    );
    expect(issuePaths({ ...valid, description: 'a'.repeat(161) })).toContain(
      'description',
    );
    expect(issuePaths({ ...valid, description: 'a'.repeat(50) })).toEqual([]);
    expect(issuePaths({ ...valid, description: 'a'.repeat(160) })).toEqual([]);
  });

  it('rejects a missing or invalid publishDate', () => {
    expect(issuePaths({ ...valid, publishDate: undefined })).toContain(
      'publishDate',
    );
    expect(issuePaths({ ...valid, publishDate: 'not a date' })).toContain(
      'publishDate',
    );
  });

  it('requires at least one tag and rejects duplicates', () => {
    expect(issuePaths({ ...valid, tags: [] })).toContain('tags');
    expect(issuePaths({ ...valid, tags: undefined })).toContain('tags');
    expect(issuePaths({ ...valid, tags: ['devops', 'devops'] })).toContain(
      'tags',
    );
  });

  it('rejects a sectionColor outside the allowed ids', () => {
    expect(issuePaths({ ...valid, sectionColor: 'creme' })).toContain(
      'sectionColor',
    );
    expect(issuePaths({ ...valid, sectionColor: 'sálvia' })).toContain(
      'sectionColor',
    );
  });

  it('rejects a canonical that is not an absolute URL', () => {
    expect(issuePaths({ ...valid, canonical: '/relative' })).toContain(
      'canonical',
    );
  });

  it('requires coverAlt with cover, and cover with coverAlt (RN1)', () => {
    expect(issuePaths({ ...valid, cover: './c.png' })).toContain('coverAlt');
    expect(
      issuePaths({ ...valid, cover: './c.png', coverAlt: '  ' }),
    ).toContain('coverAlt');
    expect(issuePaths({ ...valid, coverAlt: 'texto' })).toContain('cover');
  });

  it('ties series and seriesOrder together', () => {
    expect(issuePaths({ ...valid, series: 'agentes' })).toContain(
      'seriesOrder',
    );
    expect(issuePaths({ ...valid, seriesOrder: 1 })).toContain('series');
  });

  it('requires seriesOrder to be a positive integer', () => {
    const base = { ...valid, series: 'agentes' };
    expect(issuePaths({ ...base, seriesOrder: 0 })).toContain('seriesOrder');
    expect(issuePaths({ ...base, seriesOrder: 1.5 })).toContain('seriesOrder');
    expect(issuePaths({ ...base, seriesOrder: 1 })).toEqual([]);
  });
});

describe('tagSchema and seriesSchema', () => {
  it.each([
    ['tag', tagSchema()],
    ['series', seriesSchema()],
  ])('%s requires a non-empty name and description', (_label, schema) => {
    expect(
      schema.safeParse({ name: 'DevOps', description: 'Tudo' }).success,
    ).toBe(true);
    expect(schema.safeParse({ name: '', description: 'Tudo' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ name: 'DevOps' }).success).toBe(false);
  });
});

describe('pageSchema', () => {
  const page = {
    title: 'Me contrate',
    description: 'a'.repeat(60),
  };

  it('accepts a page and defaults draft to false', () => {
    expect(pageSchema().parse(page).draft).toBe(false);
  });

  it('applies the title and description limits', () => {
    expect(
      pageSchema().safeParse({ ...page, title: 'a'.repeat(71) }).success,
    ).toBe(false);
    expect(
      pageSchema().safeParse({ ...page, description: 'curta' }).success,
    ).toBe(false);
  });
});
