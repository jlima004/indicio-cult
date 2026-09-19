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
`text-muted`, `border-border` e `text-accent`. O script `npm run lint:tokens` rejeita cores literais
conhecidas e valores hexadecimais fora de `globals.css`.
