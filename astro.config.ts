import { defineConfig, fontProviders } from 'astro/config';

const DEV_SITE_URL = 'http://localhost:4321';

// Production domain is undecided (scope 1.6): PUBLIC_SITE_URL swaps it in.
const site = new URL(process.env['PUBLIC_SITE_URL'] ?? DEV_SITE_URL).origin;

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      weights: ['300 900'],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['Georgia', 'serif'],
      options: {
        experimental: {
          variableAxis: {
            SOFT: [[0, 100]],
            WONK: [[0, 1]],
          },
        },
      },
    },
    {
      provider: fontProviders.google(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
