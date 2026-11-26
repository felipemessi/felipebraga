import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FIXTURES = 'tests/fixtures/content';
const INVALID = 'tests/fixtures/invalid';
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function folders(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function frontmatter(slug: string): string {
  const dir = join(FIXTURES, 'posts', slug);
  const file = ['index.md', 'index.mdx']
    .map((name) => join(dir, name))
    .find((candidate) => existsSync(candidate));
  if (file === undefined) throw new Error(`no index file in ${dir}`);
  return readFileSync(file, 'utf8');
}

function run(script: string[], contentDir: string) {
  return spawnSync(process.execPath, script, {
    env: { ...process.env, PUBLIC_CONTENT_DIR: contentDir },
    encoding: 'utf8',
  });
}

describe('AC10: fixtures cover every post kind', () => {
  const slugs = folders(join(FIXTURES, 'posts'));

  it('has one folder per scenario with a kebab-case slug', () => {
    for (const slug of slugs) expect(slug).toMatch(KEBAB);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'primeiro-post',
        'post-mdx',
        'rascunho',
        'agendado',
        'serie-parte-1',
        'com-capa',
      ]),
    );
  });

  it('has both an .md and an .mdx post', () => {
    expect(existsSync(join(FIXTURES, 'posts/primeiro-post/index.md'))).toBe(
      true,
    );
    expect(existsSync(join(FIXTURES, 'posts/post-mdx/index.mdx'))).toBe(true);
  });

  it('has a draft with a past date and a scheduled post in the far future', () => {
    expect(frontmatter('rascunho')).toMatch(/^draft: true$/m);
    expect(frontmatter('agendado')).toMatch(/^publishDate: 2099-/m);
  });

  it('has a series member and a post with a cover and its alt text', () => {
    expect(frontmatter('serie-parte-1')).toMatch(/^series: agentes$/m);
    expect(frontmatter('serie-parte-1')).toMatch(/^seriesOrder: 1$/m);
    expect(frontmatter('com-capa')).toMatch(/^cover: /m);
    expect(frontmatter('com-capa')).toMatch(/^coverAlt: /m);
    expect(existsSync(join(FIXTURES, 'posts/com-capa/cover.png'))).toBe(true);
  });

  it('keeps the invalid cases outside the default content tree', () => {
    expect(folders(INVALID).sort()).toEqual([
      'sem-alt',
      'sem-tag',
      'tag-inexistente',
    ]);
    expect(existsSync(join(FIXTURES, 'posts/ruim'))).toBe(false);
  });
});

describe('AC6: the reference check fails on a dangling reference', () => {
  const script = ['scripts/check-references.ts'];

  it('exits 0 for the fixtures', () => {
    expect(run(script, FIXTURES).status).toBe(0);
  });

  it('exits 0 for an empty real content dir', () => {
    expect(run(script, 'src/content').status).toBe(0);
  });

  it('exits 1 and names the post and the tag', () => {
    const result = run(script, join(INVALID, 'tag-inexistente'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('posts/ruim');
    expect(result.stderr).toContain('"nao-existe"');
  });
});

describe('AC11: an invalid content dir fails the Astro build', () => {
  const build = ['node_modules/astro/bin/astro.mjs', 'build'];

  it.each([
    ['sem-alt', 'coverAlt is required when cover is set'],
    ['sem-tag', 'expected array to have >=1 items'],
  ])('%s exits non-zero for its own rule', (name, message) => {
    const result = run(build, join(INVALID, name));
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain(message);
  });
});
