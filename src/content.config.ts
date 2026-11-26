import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { resolveContentDir } from './lib/content/dir';
import { idFromFile } from './lib/content/ids';
import {
  pageSchema,
  postSchema,
  seriesSchema,
  tagSchema,
} from './lib/content/schemas';

const base = resolveContentDir(import.meta.env);

const posts = defineCollection({
  loader: glob({
    base: `${base}/posts`,
    pattern: '*/index.{md,mdx}',
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) => postSchema({ image, reference }),
});

const tags = defineCollection({
  loader: glob({
    base: `${base}/tags`,
    pattern: '*.yaml',
    generateId: ({ entry }) => idFromFile(entry),
  }),
  schema: tagSchema(),
});

const series = defineCollection({
  loader: glob({
    base: `${base}/series`,
    pattern: '*.yaml',
    generateId: ({ entry }) => idFromFile(entry),
  }),
  schema: seriesSchema(),
});

const pages = defineCollection({
  loader: glob({
    base: `${base}/pages`,
    pattern: '*.md',
    generateId: ({ entry }) => idFromFile(entry),
  }),
  schema: pageSchema(),
});

export const collections = { posts, tags, series, pages };
