import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');
const workflows = ['deploy', 'preview', 'infra'] as const;
type Workflow = (typeof workflows)[number];
const roots = ['bootstrap', 'cloudflare', 'github'] as const;

const text = Object.fromEntries(
  workflows.map((name) => [name, read(`.github/workflows/${name}.yml`)]),
) as Record<Workflow, string>;

/** The body of one job, so an assertion cannot pass by matching another job. */
const job = (workflow: Workflow, name: string): string => {
  const source = text[workflow];
  const jobs = source.slice(source.indexOf('\njobs:\n'));
  const match = new RegExp(
    `^ {2}${name}:\\n([\\s\\S]*?)(?=^ {2}[a-z-]+:\\n|(?![\\s\\S]))`,
    'm',
  ).exec(jobs);
  expect(match, `${workflow}.yml has no job "${name}"`).not.toBeNull();
  return match?.[1] ?? '';
};

/** The part of a workflow that precedes `jobs:` (triggers, permissions, env). */
const header = (workflow: Workflow): string =>
  text[workflow].slice(0, text[workflow].indexOf('\njobs:\n'));

/** Parses a Cloudflare `_headers` file into path -> header name -> all values. */
const parseHeaders = (source: string): Map<string, Map<string, string[]>> => {
  const rules = new Map<string, Map<string, string[]>>();
  let current: Map<string, string[]> | undefined;
  for (const line of source.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = new Map();
      rules.set(line.trim(), current);
      continue;
    }
    const [name, ...value] = line.trim().split(':');
    const key = name?.trim().toLowerCase() ?? '';
    current?.set(key, [...(current.get(key) ?? []), value.join(':').trim()]);
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
    expect(all?.get('strict-transport-security')?.[0]).toMatch(/max-age=\d+/);
    expect(all?.get('x-content-type-options')).toEqual(['nosniff']);
    expect(all?.get('referrer-policy')).toEqual([
      'strict-origin-when-cross-origin',
    ]);
    expect(all?.has('permissions-policy')).toBe(true);
  });

  it('AC3: never sets Cache-Control on the catch-all, so HTML keeps the platform default', () => {
    expect(rules.get('/*')?.has('cache-control')).toBe(false);
  });

  it('AC3: caches hashed assets and fonts as immutable for a year', () => {
    const immutable = ['public, max-age=31536000, immutable'];
    expect(rules.get('/_astro/*')?.get('cache-control')).toEqual(immutable);
    expect(rules.get('/fonts/*')?.get('cache-control')).toEqual(immutable);
  });

  it('AC3: caches the search index for an hour', () => {
    expect(rules.get('/pagefind/*')?.get('cache-control')).toEqual([
      'public, max-age=3600',
    ]);
  });

  it('AC3: gives every rule at most one Cache-Control value', () => {
    for (const [path, headers] of rules) {
      expect(headers.get('cache-control')?.length ?? 0, path).toBeLessThan(2);
    }
  });

  it('AC3: no two rules that can match the same path both set Cache-Control', () => {
    // "/*" matches everything, so no other rule may overlap a Cache-Control on it.
    const withCache = [...rules].filter(([, h]) => h.has('cache-control'));
    expect(withCache.map(([path]) => path)).not.toContain('/*');
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

  it('AC6: fails the build when SEO drops below 1.0', () => {
    expect(a['categories:seo']).toEqual(['error', { minScore: 1 }]);
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
    const keys = [
      'resource-summary:document:size',
      'resource-summary:stylesheet:size',
      'resource-summary:font:size',
    ];
    const total = keys
      .map((key) => (a[key]?.[1]?.['maxNumericValue'] ?? Infinity) / 1024)
      .reduce((sum, kb) => sum + kb, 0);
    expect(total).toBeLessThanOrEqual(150);
    for (const key of keys) expect(a[key]?.[0], key).toBe('error');
  });
});

describe('infra and deploy: workflows', () => {
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
      expect(header(name)).toMatch(/^permissions:\n {2}contents: read$/m);
    }
  });

  it('AC12: never sets a secret at workflow level', () => {
    for (const name of workflows) {
      expect(header(name), name).not.toContain('secrets.');
    }
  });

  it('AC12: reads secrets only from the secrets context', () => {
    for (const name of workflows) {
      expect(text[name]).not.toMatch(
        /(TOKEN|SECRET|KEY|ACCOUNT_ID):\s*(?!\$\{\{)[^\s#]/,
      );
    }
  });

  describe('deploy.yml', () => {
    it('AC4: deploys main and on demand', () => {
      expect(header('deploy')).toMatch(/branches: \[main\]/);
      expect(header('deploy')).toContain('workflow_dispatch:');
    });

    it('AC4/AC12: builds without secrets, then deploys in production only after the build', () => {
      const build = job('deploy', 'build');
      expect(build).not.toContain('secrets.');
      expect(build).not.toContain('environment:');
      const deploy = job('deploy', 'deploy');
      expect(deploy).toMatch(/needs: build/);
      expect(deploy).toMatch(/environment: production/);
      expect(deploy).toContain('secrets.CLOUDFLARE_API_TOKEN');
      expect(deploy).toMatch(/pnpm exec wrangler deploy\b/);
    });

    it('AC4: runs the checks and Lighthouse in order and installs from the lockfile', () => {
      const build = job('deploy', 'build');
      const order = [
        'pnpm lint',
        'pnpm check',
        'pnpm test',
        'pnpm build',
        'pnpm lighthouse',
      ];
      const positions = order.map((step) => build.indexOf(`run: ${step}`));
      expect(positions.every((p) => p > -1)).toBe(true);
      expect([...positions].sort((x, y) => x - y)).toEqual(positions);
      expect(build).toContain('uses: ./.github/actions/setup');
      const lychee = build.indexOf('lycheeverse/lychee-action@');
      expect(lychee).toBeGreaterThan(build.indexOf('run: pnpm build'));
      expect(lychee).toBeLessThan(build.indexOf('run: pnpm lighthouse'));
      expect(build).toContain('--config lychee.toml');
      expect(build).toContain('fail: true');
      expect(read('.github/actions/setup/action.yml')).toContain(
        'pnpm install --frozen-lockfile',
      );
    });

    it('AC4: never cancels a deploy that is already running', () => {
      expect(header('deploy')).toMatch(/cancel-in-progress: false/);
    });

    it('AC5: never builds with drafts', () => {
      expect(text.deploy).not.toContain('SHOW_DRAFTS');
    });
  });

  describe('preview.yml', () => {
    it('AC5: shows drafts only in the secret-free build job', () => {
      expect(job('preview', 'build')).toMatch(/SHOW_DRAFTS: 'true'/);
      expect(job('preview', 'upload')).not.toContain('SHOW_DRAFTS');
      expect(text.infra).not.toContain('SHOW_DRAFTS');
    });

    it('AC5/AC12: builds without secrets and uploads from the preview environment', () => {
      const build = job('preview', 'build');
      expect(build).not.toContain('secrets.');
      expect(build).not.toContain('environment:');
      const upload = job('preview', 'upload');
      expect(upload).toMatch(/needs: build/);
      expect(upload).toMatch(/environment: preview/);
      expect(upload).toContain('secrets.CLOUDFLARE_API_TOKEN');
      expect(upload).toMatch(/wrangler versions upload/);
      expect(text.preview).not.toMatch(/wrangler deploy\b/);
    });

    it('AC5: marks the preview noindex before it is uploaded', () => {
      expect(job('preview', 'build')).toContain('X-Robots-Tag: noindex');
    });

    it('AC5: runs for develop, feature branches and PRs, one group per branch', () => {
      expect(header('preview')).toMatch(
        /branches: \[develop, 'feature\/\*\*'\]/,
      );
      expect(header('preview')).toMatch(
        /group: preview-\$\{\{ github\.head_ref \|\| github\.ref_name \}\}/,
      );
    });

    it('AC5/AC12: skips the upload for fork and Dependabot PRs, which get no secrets', () => {
      const upload = job('preview', 'upload');
      expect(upload).toContain(
        'github.event.pull_request.head.repo.full_name == github.repository',
      );
      expect(upload).toContain("github.actor != 'dependabot[bot]'");
    });

    it('AC5: fails instead of posting an empty preview URL', () => {
      expect(job('preview', 'upload')).toMatch(/if \[ -z "\$url" \]/);
    });
  });

  describe('infra.yml', () => {
    it('AC11/AC12: gives the static checks and the Trivy scan no secrets', () => {
      for (const name of ['static', 'trivy']) {
        expect(job('infra', name), name).not.toContain('secrets.');
        expect(job('infra', name), name).not.toContain('environment:');
      }
    });

    it('AC11/AC12: plans and checks drift in infra-plan, applies in infra', () => {
      expect(job('infra', 'plan')).toMatch(/environment: infra-plan/);
      expect(job('infra', 'drift')).toMatch(/environment: infra-plan/);
      const apply = job('infra', 'apply');
      expect(apply).toMatch(/environment: infra\n/);
      expect(apply).toMatch(/needs: plan/);
      expect(apply).toMatch(/github\.event_name == 'push'/);
    });

    it('AC11/AC12: skips fork and Dependabot PRs for the plan', () => {
      const plan = job('infra', 'plan');
      expect(plan).toContain(
        'github.event.pull_request.head.repo.full_name == github.repository',
      );
      expect(plan).toContain("github.actor != 'dependabot[bot]'");
    });

    it('AC11: applies the saved plan, not a fresh one, and asks for one approval', () => {
      expect(job('infra', 'plan')).toContain('-out=tfplan');
      expect(job('infra', 'plan')).toContain('plan-${{ matrix.root }}');
      const apply = job('infra', 'apply');
      expect(apply).toMatch(/terraform apply [^\n]*tfplan"/);
      expect(apply).not.toContain('-auto-approve');
      expect(apply).not.toContain('matrix:');
    });

    it('AC11: comments the plan on PRs and keeps the saved plan for one day', () => {
      const plan = job('infra', 'plan');
      expect(plan).toContain("github.event_name == 'pull_request'");
      expect(plan).toContain('retention-days: 1');
    });

    it('AC11: runs fmt, validate, tflint and trivy in the static jobs', () => {
      expect(job('infra', 'static')).toMatch(/terraform fmt -check/);
      expect(job('infra', 'static')).toMatch(/terraform validate/);
      expect(job('infra', 'static')).toMatch(/tflint --config/);
      expect(job('infra', 'trivy')).toMatch(/trivy-action/);
    });

    it('AC11: checks drift weekly, opens the issue and closes it when clean', () => {
      expect(header('infra')).toMatch(/schedule:\n\s+- cron:/);
      const drift = job('infra', 'drift');
      expect(drift).toContain('-detailed-exitcode');
      expect(drift).toContain("process.env.CODE === '2'");
      expect(drift).toContain("state: 'closed'");
    });

    it('AC11: never plans, applies or checks drift on the bootstrap root', () => {
      for (const name of ['plan', 'apply', 'drift']) {
        expect(job('infra', name), name).not.toContain('bootstrap');
      }
      expect(job('infra', 'static')).toContain('bootstrap');
    });
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

  it('AC12: documents every secret as an environment secret', () => {
    const commands = read('infra/README.md')
      .split('\n')
      .filter((line) => /^\s*gh (secret|variable) set/.test(line));
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) expect(command).toContain('--env');
  });

  it('AC12: gives each job its own scoped token', () => {
    const main = read('infra/bootstrap/main.tf');
    const token = (name: string): string =>
      new RegExp(
        `resource "cloudflare_account_token" "${name}" \\{[\\s\\S]*?\\n\\}`,
      ).exec(main)?.[0] ?? '';
    for (const name of ['deploy', 'preview', 'infra']) {
      expect(token(name), name).not.toBe('');
    }
    for (const name of ['deploy', 'preview']) {
      expect(token(name), name).toContain('workers_scripts_write');
      expect(token(name), name).not.toContain('r2_storage_write');
    }
    expect(token('infra')).toContain('r2_storage_write');
    expect(token('infra')).not.toContain('workers_scripts_write');
    const outputs = read('infra/bootstrap/outputs.tf');
    for (const name of [
      'deploy_api_token',
      'preview_api_token',
      'infra_api_token',
    ]) {
      expect(outputs).toMatch(
        new RegExp(`output "${name}" \\{[^}]*sensitive\\s+= true`, 's'),
      );
    }
  });

  it('AC9: gates the zone permissions on the same switch as the domain', () => {
    const variables = read('infra/bootstrap/variables.tf');
    expect(variables).toMatch(
      /variable "enable_domain_permissions" \{[^}]*default\s+= false/s,
    );
    expect(read('infra/bootstrap/main.tf')).toContain(
      'var.enable_domain_permissions ?',
    );
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

  it('AC9: refuses to delete the zone when the domain is switched off', () => {
    const zone =
      /resource "cloudflare_zone" "site" \{[\s\S]*?\n\}/.exec(
        read('infra/cloudflare/main.tf'),
      )?.[0] ?? '';
    expect(zone).toContain('prevent_destroy = true');
  });

  it('AC9/AC11: keeps the account ID out of plan output and comments', () => {
    expect(read('infra/cloudflare/variables.tf')).toMatch(
      /variable "account_id" \{[^}]*sensitive\s+= true/s,
    );
  });

  it('AC10: protects main and develop', () => {
    const main = read('infra/github/main.tf');
    expect(main).toContain('toset(["main", "develop"])');
    expect(main).toMatch(/deletion\s+= true/);
    expect(main).toMatch(/non_fast_forward\s+= true/);
    expect(main).toMatch(/pull_request \{/);
  });

  it('AC10: gives infra applies their own approval and leaves production open', () => {
    const main = read('infra/github/main.tf');
    const environment = (name: string): string =>
      new RegExp(
        `resource "github_repository_environment" "${name}" \\{[\\s\\S]*?\\n\\}`,
      ).exec(main)?.[0] ?? '';
    for (const [name, label] of [
      ['preview', 'preview'],
      ['production', 'production'],
      ['infra_plan', 'infra-plan'],
      ['infra', 'infra'],
    ] as const) {
      expect(environment(name), name).toContain(`environment = "${label}"`);
    }
    expect(environment('production')).not.toContain('reviewers');
    expect(environment('infra_plan')).not.toContain('reviewers');
    expect(environment('infra')).toContain('reviewers');
    expect(main).toMatch(/"production_main" \{[^}]*branch_pattern = "main"/s);
  });

  it('AC10: takes required status checks from a variable, set to the ci-gate job', () => {
    expect(read('infra/github/variables.tf')).toMatch(
      /variable "required_status_checks" \{[^}]*default\s+= \[\]/s,
    );
    expect(read('infra/github/terraform.tfvars')).toContain(
      'required_status_checks = ["ci-gate"]',
    );
    expect(read('.github/workflows/ci.yml')).toMatch(/^ {2}ci-gate:$/m);
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
