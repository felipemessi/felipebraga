import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  packageManager: string;
  engines: { node: string };
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};

describe('project scaffold config', () => {
  it('AC1: pins pnpm, requires Node 26 and enforces engines', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    expect(pkg.engines.node).toBe('>=26');
    expect(read('pnpm-workspace.yaml')).toMatch(/^engineStrict: true$/m);
    expect(read('.nvmrc').trim()).toBe('26');
  });

  it('AC2: does not approve install scripts for any dependency', () => {
    expect(read('pnpm-workspace.yaml')).not.toMatch(
      /allowBuilds|onlyBuiltDependencies/,
    );
  });

  it('AC3: pins TypeScript to 6.0.x and uses the strictest preset', () => {
    expect(pkg.devDependencies['typescript']).toMatch(/^~6\.0\./);
    expect(read('tsconfig.json')).toContain('astro/tsconfigs/strictest');
  });

  it('AC11: serves slash-free URLs from file-format pages', () => {
    const config = read('astro.config.ts');
    expect(config).toContain("trailingSlash: 'never'");
    expect(config).toContain("format: 'file'");
  });

  it('AC12: ignores secrets, state and build output but keeps .env.example', () => {
    const ignored = (path: string): boolean => {
      try {
        execFileSync('git', ['check-ignore', '-q', path]);
        return true;
      } catch {
        return false;
      }
    };
    for (const path of [
      '.env',
      '.env.local',
      '.dev.vars',
      '.wrangler/x',
      '.terraform/x',
      'a.tfstate',
      'a.tfstate.backup',
      'node_modules/x',
      'dist/x',
      '.astro/x',
      'coverage/x',
      'playwright-report/x',
      'test-results/x',
      '.lighthouseci/x',
    ]) {
      expect(ignored(path), path).toBe(true);
    }
    expect(ignored('.env.example')).toBe(false);
  });

  it('AC13: licenses the code under Apache-2.0 and reserves the brand', () => {
    expect(read('LICENSE')).toContain('Copyright 2026 Felipe Braga');
    expect(read('LICENSE')).toContain('Apache License');
    const brand = read('BRAND.md');
    expect(brand).toContain('Todos os direitos reservados');
    expect(brand).toContain('design/assets/');
  });

  it('AC8: exposes the documented scripts', () => {
    expect(Object.keys(pkg.scripts)).toEqual(
      expect.arrayContaining([
        'dev',
        'build',
        'preview',
        'check',
        'lint',
        'format',
        'test',
        'test:coverage',
        'test:e2e',
      ]),
    );
  });
});
