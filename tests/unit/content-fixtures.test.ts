import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

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

function withoutContentDir(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env['PUBLIC_CONTENT_DIR'];
  return env;
}

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  tempDirs.push(dir);
  return dir;
}

function contentDir(files: Record<string, string>): string {
  const dir = tempDir();
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const TAG = 'name: DevOps\ndescription: Tag.\n';
const POST = (tags: string, prefix = '') =>
  `${prefix}---\ntitle: x\ntags: [${tags}]\n---\n`;

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

  it('still checks a file that starts with a byte order mark', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('ghost', '\uFEFF'),
    });
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"ghost"');
  });

  it('fails on a post file without frontmatter', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': 'no frontmatter here\n',
    });
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('posts/x: missing frontmatter');
  });

  it('rejects a tag file whose id is not lowercase kebab-case', () => {
    const dir = contentDir({
      'tags/DevOps.yaml': TAG,
      'posts/x/index.md': POST('DevOps'),
    });
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('tags/DevOps: id must be lowercase');
  });

  it('fails when a post folder has both index.md and index.mdx', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('devops'),
      'posts/x/index.mdx': POST('devops'),
    });
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('posts/x: has both index.md and index.mdx');
  });

  it('accepts the object form of a reference', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md':
        '---\ntags: [{ collection: tags, id: devops }]\n---\n',
    });
    expect(run(script, dir).status).toBe(0);
  });

  it('reads PUBLIC_CONTENT_DIR from a .env file like Astro does', () => {
    const bad = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('ghost'),
    });
    const project = contentDir({ '.env': `PUBLIC_CONTENT_DIR=${bad}\n` });
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/check-references.ts')],
      { cwd: project, env: withoutContentDir(), encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"ghost"');
  });

  it('lets a real environment variable win over .env', () => {
    const bad = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('ghost'),
    });
    const good = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('devops'),
    });
    const project = contentDir({ '.env': `PUBLIC_CONTENT_DIR=${bad}\n` });
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/check-references.ts')],
      {
        cwd: project,
        env: { ...withoutContentDir(), PUBLIC_CONTENT_DIR: good },
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(0);
  });

  it('follows a symlinked post folder, as Astro does', () => {
    const outside = contentDir({
      'evil/index.md': POST('ghost'),
    });
    const dir = contentDir({ 'tags/devops.yaml': TAG });
    mkdirSync(join(dir, 'posts'));
    symlinkSync(join(outside, 'evil'), join(dir, 'posts/evil'));
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('posts/evil');
    expect(result.stderr).toContain('"ghost"');
  });

  it('resolves merge keys in frontmatter like Astro', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': '---\nbase: &b { tags: [ghost] }\n<<: *b\n---\n',
    });
    const result = run(script, dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"ghost"');
  });

  describe('.env precedence matches Vite in production mode', () => {
    const bad = () =>
      contentDir({
        'tags/devops.yaml': TAG,
        'posts/x/index.md': POST('ghost'),
      });
    const good = () =>
      contentDir({
        'tags/devops.yaml': TAG,
        'posts/x/index.md': POST('devops'),
      });
    const exitWith = (files: Record<string, string>) =>
      spawnSync(
        process.execPath,
        [join(process.cwd(), 'scripts/check-references.ts')],
        { cwd: contentDir(files), env: withoutContentDir(), encoding: 'utf8' },
      ).status;
    const line = (dir: string) => `PUBLIC_CONTENT_DIR=${dir}\n`;

    it('.env.production beats .env.local', () => {
      expect(
        exitWith({
          '.env.local': line(good()),
          '.env.production': line(bad()),
        }),
      ).toBe(1);
      expect(
        exitWith({
          '.env.local': line(bad()),
          '.env.production': line(good()),
        }),
      ).toBe(0);
    });

    it('.env.production.local beats everything', () => {
      expect(
        exitWith({
          '.env': line(good()),
          '.env.local': line(good()),
          '.env.production': line(good()),
          '.env.production.local': line(bad()),
        }),
      ).toBe(1);
    });

    it('.env.local beats .env', () => {
      expect(
        exitWith({ '.env': line(good()), '.env.local': line(bad()) }),
      ).toBe(1);
    });
  });

  it('accepts a valid lowercase tag and post', () => {
    const dir = contentDir({
      'tags/devops.yaml': TAG,
      'posts/x/index.md': POST('devops'),
    });
    expect(run(script, dir).status).toBe(0);
  });
});

describe('AC6: pnpm build runs the reference check first', () => {
  it('wires the check as the prebuild script', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['prebuild']).toBe('node scripts/check-references.ts');
  });

  it('makes pnpm build exit non-zero on a dangling reference', () => {
    const result = spawnSync('pnpm', ['build'], {
      env: {
        ...process.env,
        PUBLIC_CONTENT_DIR: join(INVALID, 'tag-inexistente'),
      },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain(
      'tag "nao-existe" does not exist',
    );
  });
});

describe('AC11: an invalid content dir fails the Astro build', () => {
  const build = ['node_modules/astro/bin/astro.mjs', 'build'];

  it.each([
    ['sem-alt', 'coverAlt is required when cover is set'],
    ['sem-tag', 'expected array to have >=1 items'],
  ])('%s exits non-zero for its own rule', (name, message) => {
    const outDir = join(tempDir(), 'dist');
    const result = run([...build, '--outDir', outDir], join(INVALID, name));
    expect(result.status).not.toBe(0);
    expect(existsSync(outDir)).toBe(false);
    expect(result.stdout + result.stderr).toContain(message);
  });
});
