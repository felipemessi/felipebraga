import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Prettier rewrites quotes, spacing and `.14` as `0.14`; compare the rest.
const normalize = (css: string): string =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/['"\s;]/g, '')
    .replace(/(?<![\d])\.(\d)/g, '0.$1');

describe('layout shell config', () => {
  it('AC1: keeps the design token values unchanged', () => {
    expect(normalize(read('src/styles/tokens.css'))).toBe(
      normalize(read('design/tokens.css')),
    );
  });

  it('AC1: shell styles have no gradients or shadows', () => {
    const styled = walk('src').filter((p) => /\.(css|astro)$/.test(p));
    for (const path of styled) {
      const code = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, path).not.toMatch(/gradient\(|box-shadow\s*:/);
    }
  });

  it('AC1: imports tokens and global styles once, in the base layout', () => {
    const importers = walk('src').filter((p) =>
      /import\s+'[^']*styles\/(tokens|global)\.css'/.test(read(p)),
    );
    expect(importers).toEqual(['src/layouts/Base.astro']);
  });

  it('AC2: serves all three families through the Astro Fonts API', () => {
    const config = read('astro.config.ts');
    for (const family of ['Fraunces', 'Instrument Sans', 'JetBrains Mono']) {
      expect(config).toContain(`name: '${family}'`);
    }
    expect(config.match(/display: 'swap'/g)).toHaveLength(3);
    expect(read('src/layouts/Base.astro')).not.toContain('fonts.googleapis');
  });

  it('AC12: reads the site origin from PUBLIC_SITE_URL with a local fallback', () => {
    const config = read('astro.config.ts');
    expect(config).toContain('PUBLIC_SITE_URL');
    expect(config).toContain('http://localhost:4321');
    expect(read('.env.example')).toMatch(/^PUBLIC_SITE_URL=/m);
  });

  it('AC13: only links.ts holds the outbound profile URLs', () => {
    const holders = walk('src').filter((p) =>
      /github\.com|linkedin\.com/.test(read(p)),
    );
    expect(holders).toEqual(['src/lib/links.ts']);
  });

  it('AC9/AC16: keeps logic out of .astro files and ships no client script tags', () => {
    for (const path of walk('src').filter((p) => p.endsWith('.astro'))) {
      expect(read(path), path).not.toMatch(/<script(?![^>]*ld\+json)/);
    }
  });
});
