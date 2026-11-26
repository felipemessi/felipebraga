import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('AC9/AC10/AC11: head carries SEO, feeds and a single JSON-LD, no JS', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page).toHaveTitle('Felipe Braga');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^http:\/\/localhost:4321$/,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    'content',
    'pt_BR',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('link[rel="alternate"]')).toHaveCount(2);

  await expect(page.locator('script')).toHaveCount(1);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  );
  await expect(page.locator('script[src]')).toHaveCount(0);
});

test('AC2: fonts are self-hosted, with no third-party host', async ({
  page,
}) => {
  const hosts = new Set<string>();
  page.on('request', (request) => {
    hosts.add(new URL(request.url()).hostname);
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect([...hosts]).toEqual(['localhost']);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(2);
});

test('AC4/AC6/AC7/AC9: header, skip link, landmarks and footer', async ({
  page,
}) => {
  await page.goto('/');

  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  // WebKit does not Tab to links by default, so focus it directly.
  await skip.focus();
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  await expect(page.locator('main#conteudo')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);

  const logo = page.getByRole('link', { name: 'Felipe Braga' }).first();
  await expect(logo).toHaveAttribute('href', '/');

  const footer = page.locator('footer');
  await expect(footer.getByText('Apenas um desenvolvedor')).toBeVisible();
  await expect(
    footer.getByRole('navigation', { name: 'Rodapé' }).getByRole('link'),
  ).toHaveText(['RSS', 'GitHub', 'LinkedIn', 'E-mail']);
  await expect(
    footer.getByText(/Astro \+ MDX · sem rastreadores/),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Next\.js/);
});

test('AC4/AC5: menu is plain links on desktop and a no-JS toggle on mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const mobile = testInfo.project.name === 'webkit-mobile';
  const labels = ['Artigos', 'Temas', 'Me contrate'];

  if (mobile) {
    const summary = page
      .getByText('Abrir menu', { exact: true })
      .or(page.locator('summary[aria-label="Abrir menu"]'));
    await expect(summary.first()).toBeVisible();
    const toggle = await page
      .locator('summary[aria-label="Abrir menu"]')
      .boundingBox();
    expect(toggle?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(toggle?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.locator('summary[aria-label="Abrir menu"]').click();
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link')).toHaveText(labels);
    for (const link of await nav.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  } else {
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link')).toHaveText(labels);
    await expect(page.locator('summary')).toBeHidden();
    for (const link of await nav.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
});

test('AC8: with long content the footer follows it and the page scrolls', async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 500],
    [768, 500],
    [1440, 500],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.locator('main').evaluate((el) => {
      el.style.minHeight = '2000px';
    });
    const main = await page.locator('main').boundingBox();
    const footer = await page.locator('footer').boundingBox();
    expect(footer?.y ?? 0).toBeGreaterThanOrEqual(
      (main?.y ?? 0) + (main?.height ?? 0) - 1,
    );
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrollable).toBe(true);
  }
});

test('AC8: footer sticks to the bottom and keeps 2rem below', async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 1400],
    [768, 1400],
    [1440, 1400],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const footer = await page.locator('footer').boundingBox();
    const bottom = (footer?.y ?? 0) + (footer?.height ?? 0);
    expect(Math.round(bottom)).toBe(height);
    const padding = await page
      .locator('footer')
      .evaluate((el) => getComputedStyle(el).paddingBottom);
    expect(padding).toBe('32px');

    // The footer links stay on one row at every width the mockups cover.
    if (width >= 768) {
      const tops = await page
        .locator('footer nav a')
        .evaluateAll((links) =>
          links.map((a) => Math.round(a.getBoundingClientRect().top)),
        );
      expect(new Set(tops).size).toBe(1);
    }
  }
});

test('AC4: header and the opening band share the same tone', async ({
  page,
}) => {
  await page.goto('/');
  const bg = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  const header = await bg('[data-tone]:has(> header)');
  const band = await bg('main section[data-tone]');
  expect(header).toBe(band);
  const border = await page
    .locator('header')
    .evaluate((el) => getComputedStyle(el).borderBottomWidth);
  expect(border).toBe('0px');
});

test('AC6: the logo is a 40px round photo with an empty alt', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const avatar = page.locator('header img');
  await expect(avatar).toHaveAttribute('alt', '');
  await expect(avatar).toHaveAttribute('width', '40');
  await expect(avatar).toHaveAttribute('height', '40');
  const radius = await avatar.evaluate(
    (el) => getComputedStyle(el).borderRadius,
  );
  expect(radius).toBe('999px');
  const box = await avatar.boundingBox();
  const expected = testInfo.project.name === 'webkit-mobile' ? 36 : 40;
  expect(Math.round(box?.width ?? 0)).toBe(expected);
});

test('AC16: the home HTML, CSS and fonts stay under 150 KB with no JS files', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  expect(walk('dist').filter((f) => f.endsWith('.js'))).toEqual([]);

  // RNF2 is per page: weigh the home plus the CSS and fonts it references.
  const html = readFileSync('dist/index.html', 'utf8');
  const refs = (text: string): string[] =>
    [...text.matchAll(/\/_astro\/[\w./-]+\.(?:css|woff2)/g)].map((m) => m[0]);
  const css = refs(html).filter((p) => p.endsWith('.css'));
  const resources = new Set(refs(html));
  for (const file of css) {
    for (const ref of refs(readFileSync(join('dist', file), 'utf8'))) {
      resources.add(ref);
    }
  }
  expect(resources.size).toBeGreaterThanOrEqual(4);
  const weight = [...resources].reduce(
    (sum, p) => sum + statSync(join('dist', p)).size,
    statSync('dist/index.html').size,
  );
  expect(weight).toBeLessThan(150 * 1024);
});

test('AC15: the shell has no serious axe violations, menu open or closed', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'webkit-mobile') {
    await page.locator('summary[aria-label="Abrir menu"]').click();
  }
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});
