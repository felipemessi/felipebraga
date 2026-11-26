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

## License

Code and post content are [Apache-2.0](LICENSE). The blog's identity (name, photo, logo, tagline, palette and typography) is all rights reserved: see [BRAND.md](BRAND.md).
