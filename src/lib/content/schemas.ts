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

// Strings must be an ISO date (read as UTC midnight) or an ISO datetime with an
// offset or Z. Anything looser goes through the machine's timezone or the JS
// Date fallback: "1" becomes 2001, "2026-02-30" becomes March 2, and
// "2026-12-01 09:00" shifts by the build machine's offset. A blank YAML value is
// null, which z.coerce.date() would turn into 1970-01-01.
const isoString = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
const date = z.union([z.date(), isoString]).pipe(z.coerce.date());

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
      canonical: z.url({ protocol: /^https?$/ }).optional(),
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
