# Manual verification: layout shell (1.3)

Run with Node 26 (`nvm use`), then `pnpm install --frozen-lockfile && pnpm build && pnpm preview`. Open `http://localhost:4321`.

1. AC1: `src/styles/tokens.css` matches `design/tokens.css` in values. `grep -rE "gradient|box-shadow" src` finds nothing.
2. AC2: In DevTools Network, every request is to `localhost` (no `fonts.googleapis.com`). Two `woff2` preloads appear in the HTML head.
3. AC3: `[data-tone]` bands render with the token colors; `isTone` list equals the eight tokens.
4. AC4: At 1440 and 768 px the header is 76px, logo left, nav Artigos / Temas / Me contrate right, no bottom border, same color as the opening band.
5. AC5: At 390 px the menu button ("Abrir menu") opens the three links with no JS (JS disabled still works); keyboard Enter/Space toggles it; touch targets are at least 44px.
6. AC6: The logo links to `/`, shows the 36/40px circular photo and "Felipe Braga" in Fraunces.
7. AC7: The footer has the name, tagline, RSS / GitHub / LinkedIn / E-mail and "© <ano> · Astro + MDX · sem rastreadores", with 2rem below the last line and no city.
8. AC8: With short content, the footer sits at the viewport bottom at 390, 768 and 1440 px.
9. AC9: The first Tab stops on "Pular para o conteúdo" and shows it; Enter jumps to `main#conteudo`. `grep "<script" dist/index.html` shows only the JSON-LD.
10. AC10: View source: title, description, canonical (`http://localhost:4321`, no `/index.html`), `og:*`, `twitter:card`, RSS and feed alternates. Visual compare with `design/telas/Home*.dc.html` for header and footer.
11. AC11: The JSON-LD `Person` is valid in the Schema.org validator.
12. AC12: `PUBLIC_SITE_URL=https://example.com pnpm build` changes canonical and `og:url`; `PUBLIC_SITE_URL=nope pnpm build` fails.
13. AC13: Only `src/lib/links.ts` holds the GitHub, LinkedIn and e-mail targets. Replace the `TODO` values before launch.
14. AC14: The home has one `h1` and the tagline.
15. AC15: `pnpm test` (contrast) and `pnpm test:e2e` (axe) pass.
16. AC16: `pnpm check`, `pnpm lint`, `pnpm test:coverage` and `pnpm build` pass; HTML + CSS + fonts in `dist` stay under 150 KB.
