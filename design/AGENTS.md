# Design handoff — Blog Felipe Braga

Esta pasta é a referência **visual** do blog. As fontes da verdade do produto e da técnica são o
[PRD](../docs/prd.md) e o [TRD](../docs/trd.md); em caso de conflito, eles vencem. Implemente o site em
**Astro 7 (SSG) + MDX + TypeScript estrito**, conforme o TRD, seguindo estes arquivos para layout,
espaçamento, cores e textos. Os `.dc.html` são o código-fonte dos mockups (formato do canvas de design,
com estilos inline e pequenos loops `{{...}}` / `<sc-for>`). Leia-os como especificação; **não** copie o
HTML nem tente abri-los direto no navegador. O visual renderizado está no canvas:
https://claude.ai/artifact/S59CtWnLXBoW6Mw9qRhJq8

## Arquivos
- `tokens.css` — fonte da verdade de cores, tipografia, espaçamento, raios e bordas. Vira `src/styles/tokens.css`, importado no layout base.
- `telas/Tokens.dc.html` — tabela visual dos tokens.
- `telas/Home*.dc.html`, `Artigo*.dc.html`, `Contrate*.dc.html`, `NotFound*.dc.html` — desktop (1440) e mobile (390).
- `assets/` — foto do autor (logo/avatar) e as duas imagens de exemplo do post.

## Regras do design (não quebrar)
1. **Faixas de cor:** cada seção é uma faixa de largura total com `data-tone="<cor>"`. A página abre e
   fecha em `creme` (hero e rodapé) — exceto quando a faixa de abertura tem outra cor (artigo usa a
   `sectionColor` do post; 404 usa lavanda).
2. **O header tem sempre a mesma cor da faixa de abertura** da página (fica dentro dela, sem borda inferior).
3. Texto sempre grafite `--text`. O `--accent` da faixa colore links, tags, bordas, números, foco.
4. Sem gradientes, sem sombras. Profundidade = troca de faixa + bordas de 1px + espaço.
5. Cor por tema (sugestão para a `sectionColor` dos posts): Plataforma = céu, IA & agentes = lavanda,
   Python = sálvia, Pessoal = pêssego. Nos mockups esses temas aparecem como "categoria"; no código são tags.
6. **Conteúdo em primeiro lugar.** "Me contrate" é só um item comum do menu; CTAs de contratação e o
   botão de download do PDF existem **apenas** na página `/me-contrate`.
7. Rodapé preso ao fim da página (`body` em coluna com `min-height: 100vh`, `footer { margin-top: auto }`)
   e com exatamente `2rem` de espaço final. No mobile do Me contrate, somar a altura da barra fixa de download.
8. Logo = foto circular do autor + "Felipe Braga" em Fraunces.
9. Nenhuma referência a cidade. Frase do blog: "Apenas um desenvolvedor resolvendo atividades de DevOps em um mundo com IA."
10. Acessibilidade: contraste WCAG AA, foco visível, alvos de toque ≥ 44px, `alt` em imagens.
11. Zero JS por padrão. Interatividade (copiar código, busca) só como ilha Astro com `client:visible`/`client:idle`.

## Fontes
Astro Fonts API, self-hosted (WOFF2, subset latino): Fraunces (eixos `opsz`, `SOFT`, `WONK`), Instrument Sans,
JetBrains Mono. H1 e display usam `font-variation-settings: 'SOFT' 50–70, 'WONK' 1`; demais títulos sem WONK.

## Estrutura sugerida
Rotas e modelo de conteúdo seguem o TRD (seções "Modelo de conteúdo", "Estrutura do repositório" e "SEO técnico").
```
src/
  layouts/   Base.astro (fontes, tokens, <SEO>, <Header tone>, <Footer>), Post.astro, Listagem.astro
  pages/
    index.astro               # Home
    blog/index.astro          # listagem (filtro por tag, paginação; busca entra depois com Pagefind)
    blog/[slug].astro         # artigo
    tags/[tag].astro          # tema
    series/[serie].astro      # série
    me-contrate.astro
    404.astro
  components/  Band, Header, Footer, PostCard, PostRow, Tag, Button, DownloadButton,
               Toc (sticky no desktop, <details> no mobile), Timeline, SkillGroup, NewsletterForm
  components/mdx/  Callout (sugestão: nota=menta, dica=manteiga, atenção=pêssego, perigo=rosa),
               CodeBlock (Shiki no build, tema claro pastel, nome do arquivo, copiar como ilha, destaque de linhas),
               Figure (normal e largura estendida), Tldr, Table, Footnotes, headings com âncora no hover
  content/posts/<slug>/index.mdx   # frontmatter do TRD: title, description, publishDate, updatedDate?,
                                   # draft?, tags, series?, seriesOrder?, cover?, coverAlt?, sectionColor?
  lib/       lógica em .ts (o .astro fica só com marcação)
```
O "subtítulo" dos mockups é a `description` do post; o TL;DR é o componente `<Tldr>` no corpo do MDX.

## Ordem de trabalho
1. Tokens + fontes + `Band`/`Header`/`Footer`.
2. Página de artigo com todos os componentes MDX (é a tela mais importante).
3. Home → listagem → tema → Me contrate → 404.
4. Conferir cada tela em 390, 768 e 1440 contra os mockups.

Textos entre colchetes (`[ANO]`, `[EMPRESA]`, `[RESULTADO]`, `[seu@email.com]`) são placeholders a preencher.
