# felipebraga

Personal blog in Portuguese about DevOps in a world with AI. It is a static site built with Astro, with Git as the single source of truth.

- Product requirements: [docs/prd.md](docs/prd.md)
- Technical requirements: [docs/trd.md](docs/trd.md)
- Delivery plan: [docs/scope/](docs/scope/README.md)

## Prerequisites

- Node 26 (LTS). The version is in [.nvmrc](.nvmrc), for example `nvm use`.
- pnpm. Node 26 does not ship Corepack, so install it with `npm i -g pnpm`.

```bash
pnpm install
pnpm dev
```

## Scripts

| Script               | What it does                                                       |
| -------------------- | ------------------------------------------------------------------ |
| `pnpm dev`           | Dev server at `localhost:4321`                                     |
| `pnpm build`         | Static build into `dist/`                                          |
| `pnpm preview`       | Serves `dist/` locally                                             |
| `pnpm check`         | `astro check` (types and schemas)                                  |
| `pnpm lint`          | ESLint and `prettier --check`                                      |
| `pnpm format`        | Formats the repo with Prettier                                     |
| `pnpm test`          | Vitest unit tests                                                  |
| `pnpm test:coverage` | Vitest with coverage (`coverage/lcov.info`, 80% minimum)           |
| `pnpm test:e2e`      | Builds, then runs Playwright and axe on Chromium and mobile WebKit |
| `pnpm lighthouse`    | Lighthouse CI budgets against `dist/` (run `pnpm build` first)     |

## Deploy

Every push to `main` runs [deploy.yml](.github/workflows/deploy.yml): checks, build, Lighthouse CI, then `wrangler deploy` to Cloudflare Workers Static Assets. Pushes to `develop` and `feature/*` and every PR get a preview through [preview.yml](.github/workflows/preview.yml), which shows drafts and is never indexed.

Production is served from the `workers.dev` address until the custom domain is decided. Record that address here after the first deploy: `https://felipebraga.<account-subdomain>.workers.dev`. The site origin comes from the `PUBLIC_SITE_URL` Actions variable (see [.env.example](.env.example)).

## License

Code and post content are [Apache-2.0](LICENSE). The blog's identity (name, photo, logo, tagline, palette and typography) is all rights reserved: see [BRAND.md](BRAND.md).
