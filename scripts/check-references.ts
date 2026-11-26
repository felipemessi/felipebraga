import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { resolveContentDir } from '../src/lib/content/dir.ts';
import {
  findBrokenReferences,
  type PostReferences,
} from '../src/lib/content/references.ts';

function entryIds(dir: string, extension: string): Set<string> {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith(extension))
      .map((file) => file.slice(0, -extension.length)),
  );
}

function readFrontmatter(file: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'));
  const data: unknown = match?.[1] === undefined ? {} : parse(match[1]);
  return typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)
    : {};
}

function readPosts(dir: string): PostReferences[] {
  if (!existsSync(dir)) return [];
  const posts: PostReferences[] = [];
  for (const slug of readdirSync(dir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const file = ['index.md', 'index.mdx']
      .map((name) => join(dir, slug.name, name))
      .find((candidate) => existsSync(candidate));
    if (file === undefined) continue;
    const data = readFrontmatter(file);
    posts.push({
      id: slug.name,
      tags: Array.isArray(data['tags']) ? data['tags'].map(String) : [],
      series: typeof data['series'] === 'string' ? data['series'] : undefined,
    });
  }
  return posts;
}

const base = resolveContentDir(process.env);
const problems = findBrokenReferences(
  readPosts(join(base, 'posts')),
  entryIds(join(base, 'tags'), '.yaml'),
  entryIds(join(base, 'series'), '.yaml'),
);

if (problems.length > 0) {
  console.error(`Broken content references in ${base}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
