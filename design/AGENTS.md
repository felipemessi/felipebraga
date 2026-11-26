# Design handoff — Blog Felipe Braga

Esta pasta é a referência visual do blog. Implemente o site em **Next.js (App Router) + MDX + TypeScript**
seguindo estes arquivos. Os `.dc.html` são o código-fonte dos mockups (formato do canvas de design,
com estilos inline e pequenos loops `{{...}}` / `<sc-for>`). Leia-os como especificação de layout,
espaçamento, cores e textos; **não** copie o HTML nem tente abri-los direto no navegador. O visual
renderizado está no canvas: https://claude.ai/artifact/S59CtWnLXBoW6Mw9qRhJq8

## Arquivos
- `tokens.css` — fonte da verdade de cores, tipografia, espaçamento, raios e bordas. Importe no `app/globals.css`.
- `telas/Tokens.dc.html` — tabela visual dos tokens.
- `telas/Home*.dc.html`, `Artigo*.dc.html`, `Contrate*.dc.html`, `NotFound*.dc.html` — desktop (1440) e mobile (390).
- `assets/` — foto do autor (logo/avatar) e as duas imagens de exemplo do post.

## Regras do design (não quebrar)
1. **Faixas de cor:** cada seção é uma faixa de largura total com `data-tone="<cor>"`. A página abre e
   fecha em `creme` (hero e rodapé) — exceto quando a faixa de abertura tem outra cor (artigo usa a cor
   da categoria; 404 usa lavanda).
2. **O header tem sempre a mesma cor da faixa de abertura** da página (fica dentro dela, sem borda inferior).
3. Texto sempre grafite `--text`. O `--accent` da faixa colore links, tags, bordas, números, foco.
4. Sem gradientes, sem sombras. Profundidade = troca de faixa + bordas de 1px + espaço.
5. Categoria → cor: Plataforma = céu, IA & agentes = lavanda, Python = sálvia, Pessoal = pêssego.
6. **Conteúdo em primeiro lugar.** "Me contrate" é só um item comum do menu; CTAs de contratação e o
   botão de download do PDF existem **apenas** na página `/me-contrate`.
7. Rodapé preso ao fim da página (`body` em coluna com `min-height: 100vh`, `footer { margin-top: auto }`)
   e com exatamente `2rem` de espaço final. No mobile do Me contrate, somar a altura da barra fixa de download.
8. Logo = foto circular do autor + "Felipe Braga" em Fraunces.
9. Nenhuma referência a cidade. Frase do blog: "Apenas um desenvolvedor resolvendo atividades de DevOps em um mundo com IA."
10. Acessibilidade: contraste WCAG AA, foco visível, alvos de toque ≥ 44px, `alt` em imagens.

## Fontes
`next/font/google`: Fraunces (eixos `opsz`, `SOFT`, `WONK`), Instrument Sans, JetBrains Mono.
H1 e display usam `font-variation-settings: 'SOFT' 50–70, 'WONK' 1`; demais títulos sem WONK.

## Estrutura sugerida
```
app/
  layout.tsx            # fontes, tokens, <Header tone>, <Footer>
  page.tsx              # Home
  artigos/page.tsx      # listagem (filtro por categoria, busca, paginação)
  artigos/[slug]/page.tsx
  temas/[categoria]/page.tsx
  me-contrate/page.tsx
  not-found.tsx         # 404
components/  Band, Header, Footer, PostCard, PostRow, Tag, Button, DownloadButton,
             Toc (sticky no desktop, <details> no mobile), Timeline, SkillGroup, NewsletterForm
components/mdx/  Callout (sugestão: nota=menta, dica=manteiga, atenção=pêssego, perigo=rosa),
             CodeBlock (Shiki, tema claro pastel, nome do arquivo, copiar, destaque de linhas),
             Figure (normal e largura estendida), Tldr, Table, Footnotes, headings com âncora no hover
content/posts/*.mdx     # frontmatter: title, subtitle, date, updated, category, tags, cover?, tldr?
```

## Ordem de trabalho
1. Tokens + fontes + `Band`/`Header`/`Footer`.
2. Página de artigo com todos os componentes MDX (é a tela mais importante).
3. Home → listagem → tema → Me contrate → 404.
4. Conferir cada tela em 390, 768 e 1440 contra os mockups.

Textos entre colchetes (`[ANO]`, `[EMPRESA]`, `[RESULTADO]`, `[seu@email.com]`) são placeholders a preencher.
