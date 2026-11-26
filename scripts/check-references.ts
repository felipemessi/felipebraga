import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveContentDir } from '../src/lib/content/dir.ts';
import { idFromFile, invalidIdProblems } from '../src/lib/content/ids.ts';
import {
  findBrokenReferences,
  parsePostReferences,
  type PostReferences,
} from '../src/lib/content/references.ts';

function fileIds(dir: string, extension: string): Set<string> {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith(extension))
      .map((file) => idFromFile(file)),
  );
}

function readPosts(dir: string): {
  posts: PostReferences[];
  problems: string[];
} {
  const posts: PostReferences[] = [];
  const problems: string[] = [];
  if (!existsSync(dir)) return { posts, problems };
  for (const slug of readdirSync(dir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const files = ['index.md', 'index.mdx']
      .map((name) => join(dir, slug.name, name))
      .filter((candidate) => existsSync(candidate));
    for (const file of files) {
      const parsed = parsePostReferences(slug.name, readFileSync(file, 'utf8'));
      if (parsed.references) posts.push(parsed.references);
      else problems.push(parsed.problem);
    }
  }
  return { posts, problems };
}

const base = resolveContentDir(process.env);
const tagIds = fileIds(join(base, 'tags'), '.yaml');
const seriesIds = fileIds(join(base, 'series'), '.yaml');
const pageIds = fileIds(join(base, 'pages'), '.md');
const { posts, problems: postProblems } = readPosts(join(base, 'posts'));

const problems = [
  ...invalidIdProblems(
    'posts',
    posts.map((post) => post.id),
  ),
  ...invalidIdProblems('tags', tagIds),
  ...invalidIdProblems('series', seriesIds),
  ...invalidIdProblems('pages', pageIds),
  ...postProblems,
  ...findBrokenReferences(posts, tagIds, seriesIds),
];

if (problems.length > 0) {
  console.error(`Broken content in ${base}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
