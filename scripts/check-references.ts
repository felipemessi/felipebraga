import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

// Dirent.isDirectory() is false for a symlink, but Astro's glob follows it.
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readPosts(dir: string): {
  posts: PostReferences[];
  problems: string[];
} {
  const posts: PostReferences[] = [];
  const problems: string[] = [];
  if (!existsSync(dir)) return { posts, problems };
  for (const slug of readdirSync(dir, { withFileTypes: true })) {
    if (!isDirectory(join(dir, slug.name))) continue;
    const files = ['index.md', 'index.mdx']
      .map((name) => join(dir, slug.name, name))
      .filter((candidate) => existsSync(candidate));
    if (files.length > 1) {
      problems.push(
        `posts/${slug.name}: has both index.md and index.mdx, keep one`,
      );
      continue;
    }
    for (const file of files) {
      const parsed = parsePostReferences(slug.name, readFileSync(file, 'utf8'));
      if (parsed.references) posts.push(parsed.references);
      else problems.push(parsed.problem);
    }
  }
  return { posts, problems };
}

// Astro reads PUBLIC_ vars from these files too, through Vite, in build mode
// "production". Vite applies .env, .env.local, .env.production and
// .env.production.local with the later one winning. loadEnvFile never
// overrides a variable that is already set, so the first file loaded wins and
// the list below is that order reversed. Not mirrored: `astro build --mode`
// and ${VAR} expansion.
for (const file of [
  '.env.production.local',
  '.env.production',
  '.env.local',
  '.env',
]) {
  if (existsSync(file)) process.loadEnvFile(file);
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
