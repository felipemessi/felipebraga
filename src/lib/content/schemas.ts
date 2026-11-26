import { z } from 'astro/zod';

export const SECTION_COLORS = [
  'salvia',
  'ceu',
  'pessego',
  'manteiga',
  'lavanda',
  'rosa',
  'menta',
] as const;

export interface SchemaHelpers {
  image: () => z.ZodType;
  reference: (collection: 'tags' | 'series') => z.ZodType<EntryRef>;
}

export interface EntryRef {
  collection: string;
  id: string;
}

// A blank YAML value is null, and z.coerce.date() would turn it into 1970-01-01.
const date = z.union([z.date(), z.string().min(1)]).pipe(z.coerce.date());

const title = z.string().trim().min(1).max(70);
const description = z.string().trim().min(50).max(160);

export function postSchema({ image, reference }: SchemaHelpers) {
  return z
    .object({
      title,
      description,
      publishDate: date,
      updatedDate: date.optional(),
      draft: z.boolean().default(false),
      tags: z.array(reference('tags')).min(1),
      series: reference('series').optional(),
      seriesOrder: z.number().int().positive().optional(),
      cover: image().optional(),
      coverAlt: z.string().trim().min(1).optional(),
      sectionColor: z.enum(SECTION_COLORS).optional(),
      canonical: z.url().optional(),
    })
    .superRefine((post, ctx) => {
      if (new Set(post.tags.map((tag) => tag.id)).size !== post.tags.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['tags'],
          message: 'tags must not repeat',
        });
      }
      if (post.series !== undefined && post.seriesOrder === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['seriesOrder'],
          message: 'seriesOrder is required when series is set',
        });
      }
      if (post.series === undefined && post.seriesOrder !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['series'],
          message: 'series is required when seriesOrder is set',
        });
      }
      if (post.cover !== undefined && post.coverAlt === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['coverAlt'],
          message: 'coverAlt is required when cover is set',
        });
      }
      if (post.cover === undefined && post.coverAlt !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['cover'],
          message: 'cover is required when coverAlt is set',
        });
      }
    });
}

const named = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export function tagSchema() {
  return named;
}

export function seriesSchema() {
  return named;
}

export function pageSchema() {
  return z.object({
    title,
    description,
    updatedDate: date.optional(),
    draft: z.boolean().default(false),
  });
}
