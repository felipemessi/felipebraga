import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const URL = '/blog/artigo-completo';

function serious(violations: { impact?: string | null }[]) {
  return violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

test.describe('AC1: routes', () => {
  test('builds a page per published post and none for drafts or scheduled', async ({
    request,
  }) => {
    for (const slug of ['primeiro-post', 'artigo-completo']) {
      expect(existsSync(`dist/blog/${slug}.html`)).toBe(true);
      expect((await request.get(`/blog/${slug}`)).status()).toBe(200);
    }
    for (const slug of ['rascunho', 'agendado']) {
      expect(existsSync(`dist/blog/${slug}.html`)).toBe(false);
      expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
    }
  });
});

test.describe('AC2/AC3/AC4: layout, opening band and cover', () => {
  test('bands are in order and the header takes the post color', async ({
    page,
  }) => {
    await page.goto(URL);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('body > div[data-tone]').first()).toHaveAttribute(
      'data-tone',
      'ceu',
    );
    const tones = await page
      .locator('main > section[data-tone]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tone')));
    expect(tones).toEqual(['ceu', 'creme', 'salvia']);
    await expect(page.locator('footer')).toHaveAttribute('data-tone', 'creme');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:4321/blog/artigo-completo',
    );
  });

  test('tag pills, title, lead and meta line', async ({ page, isMobile }) => {
    await page.goto(URL);
    const pills = page.locator('main > section').first().locator('ul a');
    await expect(pills).toHaveText(['DevOps', 'IA']);
    await expect(pills.first()).toHaveAttribute('href', '/tags/devops');
    await expect(pills.nth(1)).toHaveAttribute('href', '/tags/ia');
    await expect(page.locator('h1')).toHaveText(
      'Helm sem sustos: valores por ambiente sem copiar e colar',
    );
    const meta = page.locator('.meta span:visible');
    if (isMobile) {
      await expect(meta).toHaveText(/^12 nov 2026 · \d+ min$/);
    } else {
      await expect(meta).toHaveText(
        /^12 nov 2026 · \d+ min de leitura · atualizado 18 nov$/,
      );
    }
  });

  test('a post without updatedDate shows no "atualizado"', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the mobile meta line never has it');
    await page.goto('/blog/primeiro-post');
    await expect(page.locator('.meta')).not.toContainText('atualizado');
    await expect(page.locator('picture')).toHaveCount(0);
    await expect(page.locator('figure.cover')).toHaveCount(0);
  });

  test('the cover is a responsive eager picture with dimensions', async ({
    page,
  }) => {
    await page.goto(URL);
    const picture = page.locator('figure.cover picture');
    await expect(picture.locator('source')).toHaveCount(2);
    const types = await picture
      .locator('source')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('type')));
    expect(types).toEqual(['image/avif', 'image/webp']);
    const img = picture.locator('img');
    await expect(img).toHaveAttribute('loading', 'eager');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(img).toHaveAttribute('width', /^\d+$/);
    await expect(img).toHaveAttribute('height', /^\d+$/);
    await expect(img).toHaveAttribute(
      'alt',
      'Três folhas sobrepostas rotuladas values.yaml, values-prod.yaml e --set secrets',
    );
    const ratio = await img.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return box.width / box.height;
    });
    expect(ratio).toBeCloseTo(2, 1);
  });
});

test.describe('AC6/AC7: code blocks and the copy button', () => {
  test('frame, header, language, title and highlighted line', async ({
    page,
  }) => {
    await page.goto(URL);
    const frame = page.locator('figure.code').first();
    await expect(frame.locator('.code-title')).toHaveText(
      'charts/api/values-prod.yaml',
    );
    await expect(frame.locator('.code-lang')).toHaveText('yaml');
    const header = await frame.locator('.code-header').boundingBox();
    expect(Math.round(header?.height ?? 0)).toBe(48);
    await expect(frame.locator('.line.highlighted')).toHaveCount(1);
    await expect(frame.locator('.line.highlighted')).toContainText('tag');
    const border = await frame
      .locator('.line.highlighted')
      .evaluate((node) => getComputedStyle(node).borderLeftWidth);
    expect(border).toBe('3px');
    const others = await page.locator('figure.code').count();
    expect(others).toBe(3);
    await expect(
      page.locator('figure.code').nth(2).locator('.code-title'),
    ).toHaveText('');
    await expect(
      page.locator('figure.code').nth(2).locator('.code-lang'),
    ).toHaveCount(0);
  });

  test('line numbers are CSS only, on desktop only', async ({
    page,
    isMobile,
  }) => {
    await page.goto(URL);
    const line = page.locator('figure.code .line').first();
    const content = await line.evaluate(
      (node) => getComputedStyle(node, '::before').content,
    );
    expect(content).toBe(isMobile ? 'none' : 'counter(line)');
    expect(await line.evaluate((node) => node.textContent)).not.toMatch(/^1/);
  });

  test('the page never scrolls sideways and a long line scrolls inside its block', async ({
    page,
  }) => {
    await page.goto(URL);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const bash = page.locator('figure.code').nth(1).locator('pre');
    const scrolls = await bash.evaluate(
      (node) => node.scrollWidth > node.clientWidth,
    );
    expect(scrolls).toBe(true);
  });

  test('copies the exact code and announces it', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'clipboard permissions are Chromium-only',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(URL);
    const frame = page.locator('figure.code').first();
    const button = frame.locator('button[data-copy]');
    await expect(button).toBeVisible();
    const expected = await frame
      .locator('pre code')
      .evaluate((n) => n.textContent);
    await button.click();
    await expect(frame.locator('[data-copy-status]')).toHaveText('Copiado');
    await expect(button.locator('.code-copy-label')).toHaveText('Copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      expected,
    );
    expect(expected).not.toMatch(/^1/);
    expect(expected.endsWith('\n')).toBe(false);
    await expect(frame.locator('[data-copy-status]')).toHaveText('', {
      timeout: 4000,
    });
  });

  test('the copy button is labelled and at least 44px tall on mobile', async ({
    page,
    isMobile,
  }) => {
    await page.goto(URL);
    const button = page.locator('figure.code button[data-copy]').first();
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-label', 'Copiar código');
    const box = await button.boundingBox();
    if (isMobile) {
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      await expect(button.locator('.code-copy-label')).toBeHidden();
    } else {
      await expect(button.locator('.code-copy-label')).toHaveText('Copiar');
    }
    await button.focus();
    await expect(button).toBeFocused();
  });

  test('without JavaScript there is no copy control', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`http://localhost:4321${URL}`);
    await expect(
      page.locator('figure.code button[data-copy]').first(),
    ).toBeHidden();
    await context.close();
  });
});

test('AC8: Mermaid is a static, named SVG with a caption and no Mermaid JS', async ({
  page,
}) => {
  await page.goto(URL);
  const figure = page.locator('figure.diagram');
  await expect(figure.locator('figcaption')).toHaveText(
    'As três camadas que chegam ao release',
  );
  const svg = figure.locator('svg').first();
  await expect(svg).toHaveAttribute('role', 'img');
  await expect(svg).toHaveAttribute(
    'aria-label',
    'As três camadas que chegam ao release',
  );
  await expect(figure.locator('pre')).toHaveCount(0);
  expect(await page.locator('script[src]').count()).toBeLessThanOrEqual(1);
  expect(readFileSync('dist/blog/artigo-completo.html', 'utf8')).not.toMatch(
    /mermaid\.(min\.)?js/,
  );
});

test.describe('AC9: MDX components', () => {
  test('Tldr is a box on the post tone with a mono label', async ({ page }) => {
    await page.goto(URL);
    const tldr = page.locator('.prose .tldr');
    await expect(tldr).toContainText('TL;DR');
    await expect(tldr.locator('li')).toHaveCount(3);
    await expect(tldr).toHaveCSS('border-top-width', '1px');
    await expect(tldr).toHaveCSS('background-color', 'rgb(223, 233, 244)');
  });

  test('Callout has four tones, role=note, an icon and a lead', async ({
    page,
  }) => {
    await page.goto(URL);
    const notes = page.locator('.prose [role="note"]');
    await expect(notes).toHaveCount(4);
    const tones = await notes.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-tone')),
    );
    expect(tones).toEqual(['menta', 'manteiga', 'pessego', 'rosa']);
    for (const lead of ['Nota.', 'Dica.', 'Atenção.', 'Perigo.']) {
      await expect(
        page.locator('.prose [role="note"] strong', { hasText: lead }),
      ).toHaveCount(1);
    }
    await expect(notes.first().locator('svg[aria-hidden="true"]')).toHaveCount(
      1,
    );
  });

  test('Figure is lazy, has dimensions, alt and a caption; wide extends on desktop', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL);
    const figures = page.locator('.prose figure.figure');
    await expect(figures).toHaveCount(2);
    for (const index of [0, 1]) {
      const img = figures.nth(index).locator('img');
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('decoding', 'async');
      await expect(img).toHaveAttribute('width', /^\d+$/);
      await expect(img).toHaveAttribute('alt', /.+/);
      await expect(figures.nth(index).locator('figcaption')).toContainText(
        'Figura',
      );
    }
    const [normal, wide] = await Promise.all(
      [0, 1].map((i) => figures.nth(i).boundingBox()),
    );
    if (!isMobile) {
      expect((wide?.width ?? 0) - (normal?.width ?? 0)).toBeGreaterThanOrEqual(
        150,
      );
    }
    if (isMobile) {
      const width = page.viewportSize()?.width ?? 0;
      expect(Math.round(wide?.width ?? 0)).toBe(width);
      expect(Math.round(normal?.width ?? 0)).toBeLessThan(width);
    }
  });
});

test.describe('AC10/AC11/AC12: prose, footnotes and anchors', () => {
  test('a wide table scrolls in a focusable region', async ({ page }) => {
    await page.goto(URL);
    const wrap = page.locator('.table-wrap');
    await expect(wrap).toHaveAttribute('role', 'region');
    await expect(wrap).toHaveAttribute('tabindex', '0');
    await expect(wrap).toHaveAttribute('aria-label', 'Tabela');
  });

  test('footnotes carry no English label', async ({ page }) => {
    await page.goto(URL);
    const html = await page.content();
    expect(html).not.toContain('Footnotes');
    expect(html).not.toContain('Back to content');
    const section = page.locator('section[data-footnotes]');
    await expect(section.locator('h2')).toHaveText('Notas');
    await expect(section.locator('li')).toHaveCount(2);
    await expect(
      section.locator('a[aria-label="Voltar ao texto"]').first(),
    ).toHaveCount(1);
  });

  test('every h2 and h3 links to itself', async ({ page }) => {
    await page.goto(URL);
    const headings = page.locator('.prose h2:not(.sr-only), .prose h3');
    expect(await headings.count()).toBe(3);
    for (const index of [0, 1, 2]) {
      const heading = headings.nth(index);
      const id = await heading.getAttribute('id');
      const anchor = heading.locator('a.heading-anchor');
      await expect(anchor).toHaveAttribute('href', `#${String(id)}`);
      await expect(anchor).toHaveAttribute(
        'aria-label',
        /^Link para a seção .+/,
      );
    }
  });

  test('the anchor shows on hover on desktop and is hidden on mobile', async ({
    page,
    isMobile,
  }) => {
    await page.goto(URL);
    const heading = page.locator('.prose h2').first();
    const anchor = heading.locator('a.heading-anchor');
    if (isMobile) {
      await expect(anchor).toBeHidden();
      return;
    }
    await expect(anchor).toHaveCSS('opacity', '0');
    await heading.hover();
    await expect(anchor).toHaveCSS('opacity', '1');
    await anchor.focus();
    await expect(anchor).toHaveCSS('opacity', '1');
  });
});

test.describe('AC13/AC14: table of contents and progress', () => {
  test('desktop: sticky aside with nested entries', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop layout');
    await page.goto(URL);
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    await expect(aside.locator('p')).toHaveText('Nesta página');
    await expect(
      aside.locator('nav[aria-label="Índice"] > ol > li'),
    ).toHaveCount(2);
    await expect(aside.locator('li.child')).toHaveCount(1);
    await expect(aside).toHaveCSS('position', 'sticky');
    await expect(page.locator('.bar')).toBeHidden();
    await expect(aside.locator('.progress')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(page.getByText('% lido')).toHaveCount(0);
  });

  test('mobile: a sticky <details> bar with a 52px summary', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile layout');
    await page.goto(URL);
    const bar = page.locator('.bar');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveCSS('position', 'sticky');
    const summary = bar.locator('summary');
    const box = await summary.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBe(52);
    await expect(summary).toContainText('Índice');
    await expect(page.locator('aside')).toBeHidden();
    await expect(bar.locator('nav a')).toHaveCount(3);
    await summary.click();
    await expect(bar.locator('details')).toHaveAttribute('open', '');
    await expect(bar.locator('nav a').first()).toBeVisible();
  });

  test('a post without headings has no Toc', async ({ page }) => {
    await page.goto('/blog/primeiro-post');
    await expect(page.locator('aside')).toHaveCount(0);
    await expect(page.locator('.bar')).toHaveCount(0);
  });
});

test('AC15: the author band has RSS and LinkedIn and no hire-me link', async ({
  page,
  isMobile,
}) => {
  await page.goto(URL);
  const band = page.locator('section[data-tone="salvia"]');
  await expect(band).toContainText('Felipe Braga');
  await expect(band.locator('img')).toHaveAttribute('alt', '');
  const links = band.locator('nav a');
  await expect(links).toHaveText(['RSS', 'LinkedIn']);
  await expect(links.first()).toHaveAttribute('href', '/rss.xml');
  await expect(links.nth(1)).toHaveAttribute('href', /linkedin\.com/);
  await expect(page.locator('main')).not.toContainText(/contrate/i);
  if (isMobile) {
    for (const index of [0, 1]) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
});

test('AC16: head carries article meta and a single BlogPosting graph', async ({
  page,
}) => {
  await page.goto(URL);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    'content',
    'article',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /^http:\/\/localhost:4321\/_astro\/.+\.jpeg$/,
  );
  await expect(
    page.locator('meta[property="article:published_time"]'),
  ).toHaveAttribute('content', '2026-11-12T12:00:00.000Z');
  await expect(
    page.locator('meta[property="article:modified_time"]'),
  ).toHaveAttribute('content', '2026-11-18T12:00:00.000Z');
  await expect(page.locator('meta[property="article:tag"]')).toHaveCount(2);
  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);
  const data = JSON.parse((await ld.textContent()) ?? '{}') as {
    '@graph': { '@type': string; inLanguage?: string }[];
  };
  expect(data['@graph'].map((n) => n['@type'])).toEqual([
    'BlogPosting',
    'BreadcrumbList',
  ]);
  expect(data['@graph'][0]?.inLanguage).toBe('pt-BR');
});

test.describe('AC18: accessibility', () => {
  test('no serious axe violations and headings in order', async ({ page }) => {
    await page.goto(URL);
    const levels = await page
      .locator('h1, h2:not(.sr-only), h3')
      .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])));
    expect(levels).toEqual([1, 2, 3, 2]);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(serious(violations)).toEqual([]);
  });

  test('and with the Toc <details> open on mobile', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the details bar is mobile only');
    await page.goto(URL);
    await page.locator('.bar summary').click();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(serious(violations)).toEqual([]);
  });

  test('plain Markdown posts pass axe too', async ({ page }) => {
    await page.goto('/blog/primeiro-post');
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(serious(violations)).toEqual([]);
  });
});

test.describe('AC19: budgets', () => {
  const refs = (text: string): string[] =>
    [...text.matchAll(/\/_astro\/[\w./%-]+\.(?:css|woff2|js)/g)].map(
      (m) => m[0],
    );

  test('HTML + CSS (gzip) + fonts are under 150 KB and one script of at most 2 KB', () => {
    const html = readFileSync('dist/blog/artigo-completo.html', 'utf8');
    const resources = new Set(refs(html));
    for (const file of [...resources].filter((p) => p.endsWith('.css'))) {
      for (const ref of refs(readFileSync(join('dist', file), 'utf8'))) {
        resources.add(ref);
      }
    }
    const scripts = [...resources].filter((p) => p.endsWith('.js'));
    expect(scripts).toHaveLength(1);
    const script = readFileSync(join('dist', scripts[0] ?? ''));
    expect(gzipSync(script).length).toBeLessThanOrEqual(2048);

    // Only the fonts the page uses are counted, as the browser loads them.
    const fonts = [...resources].filter((p) => p.endsWith('.woff2'));
    expect(fonts.length).toBeGreaterThanOrEqual(3);
    let weight = gzipSync(html).length;
    for (const file of resources) {
      if (file.endsWith('.js')) continue;
      const size = statSync(join('dist', file)).size;
      weight += file.endsWith('.css')
        ? gzipSync(readFileSync(join('dist', file))).length
        : size;
    }
    expect(weight).toBeLessThan(150 * 1024);
  });

  test('a post without code loads no script', () => {
    const html = readFileSync('dist/blog/primeiro-post.html', 'utf8');
    expect(html).not.toMatch(/<script[^>]*\ssrc=/);
  });

  test('the page has no layout shift', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as {
              value: number;
              hadRecentInput: boolean;
            }[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            resolve(total);
          }, 500);
        }),
    );
    expect(shift).toBeLessThan(0.05);
  });
});

async function shoot(page: Page, name: string) {
  mkdirSync('test-results/article', { recursive: true });
  await page.screenshot({
    path: `test-results/article/${name}.png`,
    fullPage: true,
  });
}

test('AC21: screenshots at 390, 768 and 1440 for check verify', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'one set of screenshots is enough');
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    await shoot(page, `artigo-${String(width)}`);
  }
});

test.describe('AC14: reading progress', () => {
  test('the bar fills with the scroll position where scroll timelines exist', async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(browserName !== 'chromium', 'scroll timelines are Chromium here');
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto(URL);
    const fill = page.locator('aside .progress .fill');
    const scale = () =>
      fill.evaluate(
        (node) => new DOMMatrix(getComputedStyle(node).transform).a,
      );
    expect(await scale()).toBeLessThan(0.05);
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await expect.poll(scale).toBeGreaterThan(0.95);
    expect(isMobile).toBe(false);
  });

  test('is decoration only: hidden from assistive tech', async ({ page }) => {
    await page.goto(URL);
    for (const progress of await page.locator('.progress').all()) {
      await expect(progress).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

test('AC15: the author photo loads', async ({ page }) => {
  await page.goto(URL);
  const photo = page.locator('section[data-tone="salvia"] img');
  await photo.scrollIntoViewIfNeeded();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test('AC10: prose styles for quotes, inline code and links', async ({
  page,
}) => {
  await page.goto(URL);
  const quote = page.locator('.prose blockquote');
  await expect(quote).toHaveCSS('border-left-width', '2px');
  await expect(quote).toHaveCSS('font-style', 'italic');
  const code = page.locator('.prose p code').first();
  await expect(code).toHaveCSS('background-color', 'rgb(251, 250, 248)');
  await expect(code).toHaveCSS('border-top-width', '1px');
  const link = page.locator('.prose p a:not([data-footnote-ref])').first();
  await expect(link).toHaveCSS('color', 'rgb(47, 95, 143)');
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  await expect(page.locator('.prose h2').first()).toHaveCSS(
    'font-family',
    /Fraunces/,
  );
});

test('AC1: the draft and scheduled posts are not linked or in the sitemap data', async ({
  request,
}) => {
  for (const path of ['/', '/blog/artigo-completo', '/blog/primeiro-post']) {
    const html = await (await request.get(path)).text();
    expect(html).not.toContain('/blog/rascunho');
    expect(html).not.toContain('/blog/agendado');
  }
});
