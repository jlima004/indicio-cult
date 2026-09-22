# Tokens

A identidade visual está nos valores do bloco `@theme` de `globals.css`. A substituição é só esse bloco: a tabela abaixo é o mapa 1:1 com as variáveis CSS, e componentes não recebem hex.

| Token CSS        | Token Figma                  | Valor                                        | Uso                                      |
| ---------------- | ---------------------------- | -------------------------------------------- | ---------------------------------------- |
| `--color-bg`     | `bg/page` → `paper-50`       | `#f8f7f4`                                    | Fundo da página                          |
| `--color-fg`     | `text/primary` → `ink-950`   | `#0f0f0d`                                    | Texto e traços de maior contraste        |
| `--color-muted`  | `text/secondary` → `ink-600` | `#57534c`                                    | Texto secundário                         |
| `--color-border` | `border/subtle` → `line-300` | `#d6d0c4`                                    | Divisórias e contornos discretos         |
| `--color-accent` | `brand/copper`               | `#b04422`                                    | Ênfase e símbolo da marca                |
| `--font-sans`    | `type/font-family-sans`      | Inter (`var(--font-inter)`)                  | Corpo, nav e labels                      |
| `--font-serif`   | `type/font-family-editorial` | Cormorant Garamond (`var(--font-cormorant)`) | Display e headings; utility `font-serif` |
| `--radius-none`  | `radius/none`                | `0`                                          | Cantos retos da marca                    |

`--font-serif` carrega Cormorant Garamond. O Tailwind gera `font-serif` para uso futuro; ninguém precisa aplicá-la ainda.

Estes tokens existem no Figma e só serão adicionados ao `@theme` quando a Home for implementada: `text/muted`, `accent/red`, `bg/soft`, `bg/card`, `bg/inverse` e `text/inverse`. `text/muted` é texto terciário e `accent/red` é o pager do Hero; nenhum dos dois substitui `--color-muted` nem `--color-accent`.

`lint:tokens` não muda. No código de interface, use as utilities semânticas geradas pelo Tailwind, como `bg-bg`, `text-fg`, `text-muted`, `border-border` e `text-accent`. Fora de `globals.css`, o script `npm run lint:tokens` rejeita:

- utilities cromáticas das paletas nativas do Tailwind instalado (nomes derivados de
  `tailwindcss/theme.css`, incluindo variantes e opacidade) nas famílias `accent`, `bg`, `border`,
  `caret`, `decoration`, `divide`, `drop-shadow`, `fill`, `from`/`via`/`to`, `inset-ring`,
  `inset-shadow`, `mask-*-from`/`mask-*-to`, `outline`, `placeholder`, `ring`, `ring-offset`,
  `shadow`, `stroke`, `text` e `text-shadow`;
- literais cromáticos em todo o valor de utilities arbitrárias dessas famílias, inclusive dentro de
  gradientes, `color-mix(...)`, outras funções compostas e type hints como `color:` ou `image:`;
  para valores arbitrários, a cobertura também inclui `backdrop-filter`, `filter` e `mask`;
- literais em arbitrary properties cromáticas, como `[color:...]`, `[background:...]`,
  `[border-color:...]`, `[fill:...]` e `[stroke:...]`, inclusive com variantes;
- hexadecimais, o conjunto de cores CSS nomeadas e funções CSS de cor em propriedades
  cromáticas, gradientes, sombras, filtros e custom properties, inclusive quando a declaração é
  multilinha; em TS/JS/HTML/SVG, o mesmo vale para propriedades de estilo reconhecidas e atributos
  cromáticos, incluindo `stopColor`, `floodColor` e `lightingColor` em JSX e seus equivalentes
  kebab-case em SVG.

Referências de fragmento (`href="#feed-section"`, `url(#fade)`), `currentColor`, `none`,
`var(--token)`, URLs, arbitrary properties não cromáticas, utilities estruturais e tokens
semânticos não são cores literais proibidas. A checagem é estática: classes ou valores montados
dinamicamente, tagged templates de bibliotecas CSS-in-JS e data-flow indireto continuam sendo
responsabilidade de revisão.
