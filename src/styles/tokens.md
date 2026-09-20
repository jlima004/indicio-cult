# Tokens provisórios

Os tokens desta fundação são semânticos e neutros. A identidade visual definitiva deve trocar
somente os valores declarados no bloco `@theme` de `globals.css`; componentes não devem receber
cores literais durante essa substituição.

| Token            | Uso                                                             |
| ---------------- | --------------------------------------------------------------- |
| `--color-bg`     | Fundo principal                                                 |
| `--color-fg`     | Texto e traços de maior contraste                               |
| `--color-muted`  | Texto secundário                                                |
| `--color-border` | Divisórias e contornos discretos                                |
| `--color-accent` | Ênfase neutra e símbolo da marca                                |
| `--font-sans`    | Fonte sem serifa carregada pelo layout, com fallback do sistema |
| `--radius-none`  | Cantos retos da marca                                           |

No código de interface, use as utilities semânticas geradas pelo Tailwind, como `bg-bg`, `text-fg`,
`text-muted`, `border-border` e `text-accent`. Fora de `globals.css`, o script
`npm run lint:tokens` rejeita:

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
