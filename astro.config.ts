import { loadEnvFile } from 'node:process';
import mdx from '@astrojs/mdx';
import { defineConfig, fontProviders } from 'astro/config';
import { assertLinksReady } from './src/lib/links';
import { markdownConfig } from './src/lib/markdown/config';
import { resolveSiteUrl } from './src/lib/site-url';

// Astro reads the config before it loads `.env`, so load it here. Variables that
// are already set (shell, CI) win, and `.env.local` wins over `.env`.
for (const file of ['.env.local', '.env']) {
  try {
    loadEnvFile(file);
  } catch {
    // The file is optional.
  }
}

// The production origin (https://febraga.dev) comes from PUBLIC_SITE_URL.
const site = resolveSiteUrl(process.env['PUBLIC_SITE_URL']);
assertLinksReady(site);

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
  markdown: markdownConfig,
  vite: {
    build: {
      // Keep page scripts (the copy button, AC7) as files under /_astro/; every
      // other asset keeps Vite's default threshold.
      assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined),
    },
  },
  integrations: [mdx()],
});
