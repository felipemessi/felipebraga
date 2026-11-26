import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');
const workflows = ['deploy', 'preview', 'infra'] as const;
const roots = ['bootstrap', 'cloudflare', 'github'] as const;

/** Parses a Cloudflare `_headers` file into path -> header name -> value. */
const parseHeaders = (text: string): Map<string, Map<string, string>> => {
  const rules = new Map<string, Map<string, string>>();
  let current: Map<string, string> | undefined;
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      rules.set(line.trim(), current);
      continue;
    }
    const [name, ...value] = line.trim().split(':');
    current?.set(name?.trim().toLowerCase() ?? '', value.join(':').trim());
  }
  return rules;
};

describe('infra and deploy: wrangler config', () => {
  const config = read('wrangler.jsonc');

  it('AC1: serves dist/ as static assets with no Worker script', () => {
    expect(config).toMatch(/"directory":\s*"\.\/dist"/);
    expect(config).toMatch(/"not_found_handling":\s*"404-page"/);
    expect(config).toMatch(/"html_handling":\s*"drop-trailing-slash"/);
    expect(config).toMatch(/"workers_dev":\s*true/);
    expect(config).toMatch(/"preview_urls":\s*true/);
    expect(config).toMatch(/"compatibility_date":\s*"\d{4}-\d{2}-\d{2}"/);
    expect(config).not.toMatch(/"main"\s*:/);
  });
});

describe('infra and deploy: _headers', () => {
  const rules = parseHeaders(read('public/_headers'));

  it('AC3: sets the security headers on every path', () => {
    const all = rules.get('/*');
    expect(all?.get('strict-transport-security')).toMatch(/max-age=\d+/);
    expect(all?.get('x-content-type-options')).toBe('nosniff');
    expect(all?.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(all?.has('permissions-policy')).toBe(true);
  });

  it('AC3: never sets Cache-Control on the catch-all, so HTML keeps the platform default', () => {
    expect(rules.get('/*')?.has('cache-control')).toBe(false);
  });

  it('AC3: caches hashed assets and fonts as immutable for a year', () => {
    const immutable = 'public, max-age=31536000, immutable';
    expect(rules.get('/_astro/*')?.get('cache-control')).toBe(immutable);
    expect(rules.get('/fonts/*')?.get('cache-control')).toBe(immutable);
  });

  it('AC3: caches the search index for an hour', () => {
    expect(rules.get('/pagefind/*')?.get('cache-control')).toBe(
      'public, max-age=3600',
    );
  });

  it('AC3: keeps every rule to one Cache-Control value (no merged duplicates)', () => {
    for (const headers of rules.values()) {
      expect(headers.get('cache-control') ?? '').not.toMatch(
        /,.*must-revalidate/,
      );
    }
  });
});

describe('infra and deploy: lighthouse budgets', () => {
  const rc = JSON.parse(read('lighthouserc.json')) as {
    ci: {
      collect: { staticDistDir: string };
      assert: { assertions: Record<string, [string, Record<string, number>]> };
    };
  };
  const a = rc.ci.assert.assertions;

  it('AC6: runs against the built dist/', () => {
    expect(rc.ci.collect.staticDistDir).toBe('./dist');
  });

  it('AC6: fails on the RNF1 and RNF4 category scores', () => {
    expect(a['categories:performance']).toEqual(['error', { minScore: 0.95 }]);
    expect(a['categories:accessibility']).toEqual([
      'error',
      { minScore: 0.95 },
    ]);
  });

  it('AC6: keeps SEO as a warning until 1.3 adds <SEO>', () => {
    expect(a['categories:seo']).toEqual(['warn', { minScore: 1 }]);
  });

  it('AC6: enforces the Core Web Vitals budgets', () => {
    expect(a['largest-contentful-paint']?.[1]).toEqual({
      maxNumericValue: 1500,
    });
    expect(a['cumulative-layout-shift']?.[1]).toEqual({
      maxNumericValue: 0.05,
    });
    expect(a['total-blocking-time']?.[1]).toEqual({ maxNumericValue: 200 });
  });

  it('AC6: allows no script and at most 150 KB of document, CSS and fonts', () => {
    expect(a['resource-summary:script:size']?.[1]).toEqual({
      maxNumericValue: 0,
    });
    const kb = (key: string): number =>
      (a[key]?.[1]?.['maxNumericValue'] ?? Infinity) / 1024;
    const total =
      kb('resource-summary:document:size') +
      kb('resource-summary:stylesheet:size') +
      kb('resource-summary:font:size');
    expect(total).toBeLessThanOrEqual(150);
    for (const key of [
      'resource-summary:document:size',
      'resource-summary:stylesheet:size',
      'resource-summary:font:size',
    ]) {
      expect(a[key]?.[0]).toBe('error');
    }
  });
});

describe('infra and deploy: workflows', () => {
  const text = Object.fromEntries(
    workflows.map((name) => [name, read(`.github/workflows/${name}.yml`)]),
  ) as Record<(typeof workflows)[number], string>;

  it('AC4/AC11: pins every third-party action by commit SHA', () => {
    const files = [
      ...workflows.map((name) => `.github/workflows/${name}.yml`),
      '.github/actions/setup/action.yml',
    ];
    for (const file of files) {
      const uses = [...read(file).matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map(
        (m) => m[1] ?? '',
      );
      expect(uses.length, file).toBeGreaterThan(0);
      for (const ref of uses) {
        if (ref.startsWith('./')) continue;
        expect(ref, `${file}: ${ref}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it('AC4/AC5/AC11: defaults to read-only contents permissions', () => {
    for (const name of workflows) {
      expect(text[name]).toMatch(/^permissions:\n {2}contents: read$/m);
    }
  });

  it('AC4: deploys main and on demand, only after the build job, in production', () => {
    const deploy = text.deploy;
    expect(deploy).toMatch(/branches: \[main\]/);
    expect(deploy).toContain('workflow_dispatch:');
    expect(deploy).toMatch(/needs: build/);
    expect(deploy).toMatch(/environment: production/);
    expect(deploy).toMatch(/pnpm exec wrangler deploy\b/);
  });

  it('AC4: runs the checks and Lighthouse before deploying and never cancels a deploy', () => {
    const deploy = text.deploy;
    const order = ['pnpm lint', 'pnpm check', 'pnpm build', 'pnpm lighthouse'];
    const positions = order.map((step) => deploy.indexOf(`run: ${step}`));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
    expect(deploy).toMatch(/cancel-in-progress: false/);
    expect(deploy).toContain('uses: ./.github/actions/setup');
    expect(read('.github/actions/setup/action.yml')).toContain(
      'pnpm install --frozen-lockfile',
    );
  });

  it('AC5: shows drafts only in the preview build', () => {
    expect(text.preview).toMatch(/SHOW_DRAFTS: 'true'/);
    expect(text.deploy).not.toContain('SHOW_DRAFTS');
    expect(text.infra).not.toContain('SHOW_DRAFTS');
  });

  it('AC5: marks previews noindex and uploads a version without deploying', () => {
    const preview = text.preview;
    expect(preview).toContain('X-Robots-Tag: noindex');
    expect(preview).toMatch(/wrangler versions upload/);
    expect(preview).not.toMatch(/wrangler deploy\b/);
    expect(preview).toMatch(/environment: preview/);
    expect(preview).toMatch(/branches: \[develop, 'feature\/\*\*'\]/);
  });

  it('AC11: gates applies behind the infra environment and never runs the bootstrap root', () => {
    const infra = text.infra;
    expect(infra).toMatch(/environment: infra/);
    expect(infra).not.toMatch(/environment: production/);
    expect(infra).toMatch(/schedule:\n\s+- cron:/);
    expect(infra).toContain('-detailed-exitcode');
    expect(infra).toMatch(/fmt -check/);
    expect(infra).toMatch(/tflint/);
    expect(infra).toMatch(/trivy-action/);
    const matrices = [...infra.matchAll(/root: \[([^\]]+)\]/g)].map(
      (m) => m[1] ?? '',
    );
    const mutating = matrices.slice(1);
    expect(mutating.length).toBeGreaterThan(0);
    for (const matrix of mutating) expect(matrix).not.toContain('bootstrap');
  });

  it('AC12: reads secrets only from the secrets context', () => {
    for (const name of workflows) {
      expect(text[name]).not.toMatch(
        /(TOKEN|SECRET|KEY|ACCOUNT_ID):\s*(?!\$\{\{)[^\s#]/,
      );
    }
  });
});

describe('infra and deploy: terraform roots', () => {
  it('AC7: has the bootstrap, cloudflare, github and modules folders', () => {
    for (const dir of [...roots, 'modules']) {
      expect(existsSync(`infra/${dir}`), dir).toBe(true);
    }
  });

  it('AC7: pins Terraform and provider versions and commits the lock file', () => {
    for (const root of roots) {
      const versions = read(`infra/${root}/versions.tf`);
      expect(versions, root).toMatch(/required_version = "~> 1\.\d+"/);
      expect(versions, root).toMatch(/version\s+= "~> \d+\.\d+"/);
      const lock = read(`infra/${root}/.terraform.lock.hcl`);
      expect(lock, root).toMatch(/h1:/);
      expect(lock, root).toMatch(/zh:/);
    }
  });

  it('AC8: keeps the bootstrap state local and the other roots in R2 with a lockfile', () => {
    expect(read('infra/bootstrap/versions.tf')).not.toContain('backend');
    const keys = new Set<string>();
    for (const root of ['cloudflare', 'github'] as const) {
      const versions = read(`infra/${root}/versions.tf`);
      expect(versions, root).toContain('backend "s3"');
      expect(versions, root).toContain('use_lockfile = true');
      expect(versions, root).toContain('bucket       = "felipebraga-tfstate"');
      const key = /key\s+= "([^"]+)"/.exec(versions)?.[1];
      expect(key, root).toBe(`${root}/terraform.tfstate`);
      keys.add(key ?? '');
    }
    expect(keys.size).toBe(2);
  });

  it('AC8: documents the one-time setup and the R2 lock check', () => {
    const readme = read('infra/README.md');
    expect(readme).toMatch(/bootstrap/i);
    expect(readme).toMatch(/lockfile/i);
    expect(readme).toMatch(/workers\.dev/);
  });

  it('AC9: creates no domain resource while the domain is null', () => {
    expect(read('infra/cloudflare/variables.tf')).toMatch(
      /variable "domain" \{[^}]*default\s+= null/s,
    );
    const main = read('infra/cloudflare/main.tf');
    expect(main).toMatch(/has_domain = var\.domain != null/);
    for (const resource of [
      'cloudflare_zone',
      'cloudflare_workers_custom_domain',
    ]) {
      expect(main).toMatch(
        new RegExp(
          `resource "${resource}" "site" \\{\\s+count = local\\.has_domain \\? 1 : 0`,
        ),
      );
    }
  });

  it('AC10: protects main and develop and gives infra applies their own approval', () => {
    const main = read('infra/github/main.tf');
    expect(main).toContain('toset(["main", "develop"])');
    expect(main).toMatch(/deletion\s+= true/);
    expect(main).toMatch(/non_fast_forward\s+= true/);
    expect(main).toMatch(/pull_request \{/);
    expect(main).toMatch(/environment = "preview"/);
    expect(main).toMatch(/environment = "production"/);
    expect(main).toMatch(/environment = "infra"/);
    const production =
      /resource "github_repository_environment" "production" \{[\s\S]*?\n\}/.exec(
        main,
      )?.[0] ?? '';
    expect(production).not.toContain('reviewers');
    const infra =
      /resource "github_repository_environment" "infra" \{[\s\S]*?\n\}/.exec(
        main,
      )?.[0] ?? '';
    expect(infra).toContain('reviewers');
  });

  it('AC10: takes required status checks from a variable, empty by default', () => {
    expect(read('infra/github/variables.tf')).toMatch(
      /variable "required_status_checks" \{[^}]*default\s+= \[\]/s,
    );
  });

  it('AC10/AC12: keeps secret values out of Terraform and its tfvars', () => {
    expect(read('infra/github/main.tf')).not.toMatch(
      /resource "github_actions(_environment)?_secret"/,
    );
    for (const root of roots) {
      const files = readdirSync(`infra/${root}`).filter((f) =>
        f.endsWith('.tfvars'),
      );
      for (const file of files) {
        const assignments = read(`infra/${root}/${file}`)
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('#'))
          .join('\n');
        expect(assignments, file).not.toMatch(/token|secret|password|key\s*=/i);
      }
    }
  });

  it('AC12: never commits state or plan files', () => {
    const ignore = read('.gitignore');
    expect(ignore).toContain('.terraform/');
    expect(ignore).toMatch(/\*\.tfstate/);
  });
});

describe('infra and deploy: dependencies and site url', () => {
  const pkg = JSON.parse(read('package.json')) as {
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };

  it('AC13: pins wrangler and the Lighthouse CLI to exact versions', () => {
    for (const name of ['wrangler', '@lhci/cli']) {
      expect(pkg.devDependencies[name], name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('AC6: exposes the Lighthouse run as a script', () => {
    expect(pkg.scripts['lighthouse']).toBe('lhci autorun');
  });

  it('AC15: documents the workers.dev production address and the site url variable', () => {
    const readme = read('README.md');
    expect(readme).toContain('workers.dev');
    expect(readme).toContain('PUBLIC_SITE_URL');
  });

  it('AC15: exposes only PUBLIC_ variables in .env.example', () => {
    const names = read('.env.example')
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => line.split('=')[0] ?? '');
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/^PUBLIC_/);
  });
});
