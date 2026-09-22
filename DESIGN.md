---
version: alpha
name: Indicio Cult
description: 'Sistema visual editorial para a vitrine headless de arte impressa Indicio Cult, derivado do Figma atual.'
colors:
  white: '#FFFFFF'
  paper-50: '#F8F7F4'
  paper-100: '#EFEDE9'
  ink-950: '#0F0F0D'
  ink-800: '#24231F'
  ink-600: '#57534C'
  ink-450: '#7B756B'
  line-300: '#D6D0C4'
  accent-red: '#982F28'
  accent-blue: '#30445E'
  accent-ochre: '#A7732A'
  brand-ink: '#141414'
  brand-copper: '#B04422'
  ink-stage: '#292926'
  overlay-clear: '#00000000'
  overlay-scrim: '#000000B8'
  bg-page: '{colors.paper-50}'
  bg-soft: '{colors.paper-100}'
  bg-inverse: '{colors.ink-950}'
  bg-card: '{colors.white}'
  bg-stage: '{colors.ink-stage}'
  text-primary: '{colors.ink-950}'
  text-secondary: '{colors.ink-600}'
  text-muted: '{colors.ink-450}'
  text-inverse: '{colors.white}'
  border-subtle: '{colors.line-300}'
  brand-accent: '{colors.brand-copper}'
  editorial-red: '{colors.accent-red}'
  editorial-blue: '{colors.accent-blue}'
  editorial-ochre: '{colors.accent-ochre}'
  scrim-start: '{colors.overlay-clear}'
  scrim-end: '{colors.overlay-scrim}'
typography:
  display-hero:
    fontFamily: 'Cormorant Garamond'
    fontSize: '104px'
    fontWeight: 500
    lineHeight: '96px'
    letterSpacing: '-0.03em'
  display-banner:
    fontFamily: 'Cormorant Garamond'
    fontSize: '44px'
    fontWeight: 500
    lineHeight: '42px'
    letterSpacing: '-0.35px'
  display-error-code:
    fontFamily: 'Cormorant Garamond'
    fontSize: '200px'
    fontWeight: 500
    lineHeight: 1.08
  display-error-code-mobile:
    fontFamily: 'Cormorant Garamond'
    fontSize: '100px'
    fontWeight: 500
    lineHeight: 1.08
  heading-h1:
    fontFamily: 'Cormorant Garamond'
    fontSize: '48px'
    fontWeight: 500
    lineHeight: '52px'
    letterSpacing: '-0.6px'
  heading-h2:
    fontFamily: 'Cormorant Garamond'
    fontSize: '36px'
    fontWeight: 500
    lineHeight: '42px'
    letterSpacing: '-0.35px'
  heading-h3:
    fontFamily: 'Cormorant Garamond'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: '30px'
    letterSpacing: '-0.1px'
  heading-editorial:
    fontFamily: 'Cormorant Garamond'
    fontSize: '42px'
    fontWeight: 500
    lineHeight: '42px'
    letterSpacing: '-0.35px'
  body-lg:
    fontFamily: 'Inter'
    fontSize: '18px'
    fontWeight: 400
    lineHeight: '28px'
    letterSpacing: '0px'
  body-hero:
    fontFamily: 'Inter'
    fontSize: '18px'
    fontWeight: 400
    lineHeight: '27px'
    letterSpacing: '0px'
  body-md:
    fontFamily: 'Inter'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: '24px'
    letterSpacing: '0px'
  body-sm:
    fontFamily: 'Inter'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
    letterSpacing: '0px'
  label-tagline:
    fontFamily: 'Inter'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: '20px'
    letterSpacing: '0px'
  label-nav:
    fontFamily: 'Inter'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: '16px'
    letterSpacing: '0.6px'
  label-micro:
    fontFamily: 'Inter'
    fontSize: '11px'
    fontWeight: 500
    lineHeight: '16px'
    letterSpacing: '1.8px'
  label-fine:
    fontFamily: 'Inter'
    fontSize: '10px'
    fontWeight: 500
    lineHeight: '16px'
    letterSpacing: '1.8px'
  label-plate:
    fontFamily: 'Inter'
    fontSize: '10px'
    fontWeight: 400
    lineHeight: '16px'
    letterSpacing: '0.14em'
  label-kicker-wide:
    fontFamily: 'Inter'
    fontSize: '11px'
    fontWeight: 400
    lineHeight: '16px'
    letterSpacing: '0.16em'
rounded:
  none: '0px'
  xs: '2px'
  sm: '4px'
  full: '999px'
spacing:
  none: '0px'
  xs: '4px'
  2xs: '6px'
  sm: '8px'
  sm-plus: '9px'
  compact: '10px'
  md: '12px'
  base: '16px'
  base-plus: '18px'
  editorial: '20px'
  lg: '24px'
  xl: '32px'
  2xl: '48px'
  hero: '56px'
  3xl: '64px'
  gutter-wide: '72px'
  4xl: '80px'
  5xl: '96px'
  6xl: '128px'
  7xl: '160px'
  layout-page-max: '1440px'
  layout-content-max: '1312px'
  layout-mobile-width: '390px'
  layout-header-height: '80px'
  layout-touch-target: '48px'
  layout-collection-card-height: '288px'
  layout-product-image-height: '228px'
  layout-mobile-product-image-height: '196px'
  layout-mobile-hero-image-height: '380px'
components:
  button-ghost-desktop:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    typography: '{typography.label-micro}'
    rounded: '{rounded.none}'
    height: '16px'
  button-ghost-mobile:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    typography: '{typography.label-micro}'
    rounded: '{rounded.none}'
    height: '{spacing.layout-touch-target}'
    width: '342px'
  field-input:
    backgroundColor: '{colors.bg-card}'
    textColor: '{colors.text-muted}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.none}'
    height: '52px'
  field-submit:
    backgroundColor: '{colors.bg-inverse}'
    textColor: '{colors.text-inverse}'
    typography: '{typography.label-micro}'
    rounded: '{rounded.none}'
    height: '52px'
  text-link-nav:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    typography: '{typography.label-nav}'
    rounded: '{rounded.none}'
  text-link-nav-hover:
    backgroundColor: 'transparent'
    textColor: '{colors.text-secondary}'
    typography: '{typography.label-nav}'
    rounded: '{rounded.none}'
  text-link-footer:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.none}'
  text-link-footer-hover:
    backgroundColor: 'transparent'
    textColor: '{colors.text-secondary}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.none}'
  icon-button-hit:
    backgroundColor: 'transparent'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.none}'
    size: '{spacing.layout-touch-target}'
  icon-button-hit-hover:
    backgroundColor: 'transparent'
    textColor: '{colors.text-secondary}'
    rounded: '{rounded.none}'
    size: '{spacing.layout-touch-target}'
  header:
    backgroundColor: '{colors.bg-card}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.none}'
    height: '{spacing.layout-header-height}'
  footer:
    backgroundColor: '{colors.bg-card}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.none}'
  not-found-artwork:
    backgroundColor: '{colors.bg-soft}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.none}'
    width: '520px'
    height: '420px'
  not-found-artwork-mobile:
    backgroundColor: '{colors.bg-soft}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.none}'
    width: '260px'
    height: '210px'
---

# Indicio Cult — DESIGN.md

## Overview

A Indicio Cult é uma marca de **arte impressa para pessoas de repertório específico**. A interface deve se comportar como um espaço editorial e de curadoria, não como uma loja genérica de camisetas, um produto SaaS ou uma vitrine “geek”. O primeiro suporte comercial é a camiseta, mas o sistema visual deve permanecer apropriado para posters, quadros e outros suportes futuros.

A personalidade visual é **editorial, artística, culta sem pedantismo, precisa, contemporânea e silenciosa**. O layout usa espaço negativo, fotografia e arte como protagonistas. Texto e interação são deliberadamente contidos: a interface sugere mais do que explica e evita gamificação, urgência artificial, excesso de badges e ornamentos gratuitos.

O público principal reconhece referências de cinema de autor, literatura, artes plásticas e crítica cultural. A experiência deve transmitir repertório, autoria e confiança sem transformar referência cultural em fanart, piada interna ou estética geek.

**Assinatura da marca:** “Arte para quem reconhece o indício.”

### Fontes de verdade

Este arquivo descreve o sistema visual do **Figma atual** e segue o formato `alpha` de `google-labs-code/design.md`.

- Figma: `https://www.figma.com/design/rakcFK2hEb9f9wktHDAVET/Indicio-Cult`
- Página `Páginas`: `0:1`
- Home Desktop: `8:110`
- Home Mobile: `38:41`
- Home Mobile / Menu Open: `136:526`
- Página de biblioteca: `Foundation / Components` (`65:80`)
- Header: `72:299`
- Footer: `74:354`
- 404 / Not Found: `141:524`
- 404 Desktop / Mobile: `23:3` / `23:4`
- Error Desktop / Mobile: `23:6` / `23:7`
- Global Error Desktop / Mobile: `23:9` / `23:10`
- Maintenance Desktop / Mobile: `23:12` / `23:13`

Para comportamento funcional, rotas, copy de produto e requisitos, usar `docs/PRD.md`, `docs/specs/SPEC-foundation.md` e `docs/specs/CAPABILITY-MAP.md`. Para decisões puramente visuais, o Figma e os tokens deste frontmatter são normativos.

O código atual expõe apenas parte dos tokens do Figma em `globals.css`. Isso é um estado de implementação, não autorização para substituir tokens ausentes por cores literais ou por paletas nativas do Tailwind. Novos componentes devem mapear o Figma para tokens semânticos.

## Colors

A paleta combina **papel quente**, **tinta quase preta**, neutros terrosos e acentos contidos. O sistema evita preto puro como cor geral de texto e evita branco puro como fundo de página; isso reduz a aparência digital genérica e aproxima a vitrine de um objeto editorial impresso.

- **Paper 50 (`#F8F7F4`)** é a superfície principal da página.
- **Paper 100 (`#EFEDE9`)** cria planos editoriais suaves, inclusive a gravura da 404.
- **Ink 950 (`#0F0F0D`)** é o texto primário, o fundo inverso e a principal tinta funcional.
- **Ink 600 (`#57534C`)** é o texto secundário.
- **Ink 450 (`#7B756B`)** é texto terciário, placeholder e informação de baixa ênfase.
- **Line 300 (`#D6D0C4`)** é a borda discreta usada para separar sem criar “cards flutuantes”.
- **Brand Copper (`#B04422`)** é o acento de marca. No Figma atual aparece como ênfase editorial, por exemplo no kicker da 404. Não deve virar uma cor genérica de botão.
- **Accent Red (`#982F28`)**, **Blue (`#30445E`)** e **Ochre (`#A7732A`)** são acentos editoriais separados do cobre da marca. Não são intercambiáveis com `brand-copper`.
- **White (`#FFFFFF`)** é reservado a superfícies de card, header/footer e texto inverso.
- **Stage (`#292926`)** e o scrim preto a 72% existem para composição sobre mídia; não formam uma “dark theme”.

A regra de implementação é semântica: componentes consomem `bg-page`, `bg-soft`, `bg-card`, `bg-inverse`, `text-primary`, `text-secondary`, `text-muted`, `text-inverse`, `border-subtle` e os acentos definidos acima. Não usar hex, `rgb()`, nomes de cor ou paletas utilitárias diretamente em componentes.

## Typography

A tipografia cria a tensão central da marca: **Cormorant Garamond** carrega voz editorial, cultura e dramaticidade; **Inter** carrega informação, navegação e precisão funcional.

### Editorial — Cormorant Garamond

- **Display Hero:** 104/96, Medium, tracking `-3%`. Usado no grande título do Hero desktop.
- **H1:** 48/52, Medium. Principal heading editorial.
- **H2:** 36/42, Medium. Headings menores e principal escala editorial mobile.
- **H3:** 24/30, SemiBold. Subtítulos e assinatura editorial menor.
- **Editorial:** 42/42, Medium. Blocos narrativos e headings de composição editorial.
- **Banner:** 44/42, Medium. Mensagens de lifestyle/banner.
- **404 code:** Cormorant Garamond Medium, 200px desktop e 100px mobile, line-height 1.08.

### Funcional — Inter

- **Body Large:** 18/28.
- **Body Hero:** 18/27.
- **Body Medium:** 16/24.
- **Body Small:** 14/20.
- **Tagline:** 14/20 Medium.
- **Nav:** 12/16 Medium, uppercase, tracking 0.6px.
- **Micro:** 11/16 Medium, uppercase, tracking 1.8px.
- **Fine:** 10/16 Medium.
- **Plate:** 10/16 Regular, tracking 0.14em.
- **Kicker Wide:** 11/16 Regular, tracking 0.16em.

Não substituir Cormorant Garamond por uma serif “parecida” nem Inter por uma sans genérica quando as fontes do produto estiverem disponíveis. A escala tipográfica é parte da identidade; reduzir tamanhos apenas de acordo com os breakpoints já expressos no Figma.

No Hero, o desktop usa o display de 104px; o mobile reduz o título para a escala de H1. Em mensagens de sistema, H1 é a referência desktop e H2 a referência mobile quando mostrado no Figma.

## Layout

O sistema combina **largura máxima fixa no desktop** com **coluna fluida e margem fixa no mobile**.

### Grid principal

- Desktop de referência: 1440px.
- Conteúdo principal desktop: 1312px.
- Margem lateral desktop: 64px.
- Mobile de referência: 390px.
- Margem lateral mobile: 24px.
- Conteúdo mobile: 342px.
- Header: 80px em ambos os breakpoints.
- Área mínima de toque: 48px.
- Cantos e componentes seguem Auto Layout/fluxo; não reproduzir layouts responsivos com posicionamento absoluto quando uma relação estrutural puder ser expressa por grid ou flex.

### Ritmo

A escala base é 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128 e 160px, com passos editoriais adicionais de 6, 9, 10, 18, 20, 56 e 72px já presentes no Figma. Use os tokens do frontmatter; não introduza novos valores apenas para “aproximar” uma tela.

### Home

A ordem visual é fixa nos dois breakpoints:

1. Header
2. Hero
3. Manifesto
4. Collections
5. Featured Products
6. Lifestyle Banner
7. Materials
8. Journal
9. Footer

**Hero desktop:** header de 80px seguido por bloco de 688px. A fotografia ocupa o lado de maior peso visual; copy e CTA são editoriais e contidos.

**Hero mobile:** 668px: 288px de copy + 380px de fotografia.

**Collections:** 3 cards lado a lado no desktop; 3 cards empilhados no mobile. A quantidade visual da Home é fixa em três slots.

**Featured Products:** 6 peças em uma fileira desktop; grade 2 × 3 no mobile. A quantidade visual da Home é fixa em seis slots.

**Materials:** 3 faixas horizontais no desktop; pilha vertical no mobile.

**Journal:** composição horizontal compacta no desktop e pilha vertical no mobile.

O conteúdo deve crescer naturalmente em altura. Não fixar a altura total da página em código; as alturas do Figma servem como referência do conteúdo atual.

### 404

Desktop 1440 × 900:

- Header: 80px.
- Main: 756px.
- `IC / Not Found`: 1120 × 420, duas colunas de 520px separadas por 80px.
- Arte: 520 × 420.
- Footer de sistema: 64px.

Mobile 390 × 844:

- Header: 80px.
- Conteúdo: 342px com 24px de margem.
- Arte: 260 × 210.
- Layout em uma coluna.
- Footer de sistema: 80px.
- Em alturas menores, permitir rolagem natural e preservar pelo menos 24px de respiro.

## Elevation & Depth

O sistema é deliberadamente **flat**. O arquivo Figma atual não possui Effect Styles e a linguagem não depende de drop shadows.

Profundidade e hierarquia são construídas por:

- contraste entre `bg-page`, `bg-soft`, `bg-card` e `bg-inverse`;
- linhas `border-subtle`;
- escala tipográfica;
- recorte e escala de fotografia;
- sobreposição tonal em imagens;
- scrims e gradientes escuros apenas quando necessários para legibilidade sobre mídia;
- espaço negativo.

Não adicionar sombras padrão de frameworks a cards, header, footer, fields ou botões. Não usar glassmorphism, blur de superfície ou elevação Material.

## Shapes

A linguagem é de **retângulos editoriais e cantos majoritariamente retos**.

- `radius-none` é o padrão da marca.
- `2px` e `4px` existem para exceções utilitárias discretas.
- `999px` está disponível apenas quando uma forma totalmente arredondada fizer sentido; não é um convite para converter a interface em pills.
- Cards de coleção e produto não devem ganhar grandes raios arredondados.
- Inputs, CTAs principais e containers mantêm arquitetura reta.
- Ícones e a marca devem ser usados como ativos/componentes existentes, não redesenhados.
- O logo `IC / Logo` é composto por vetores congelados; usar as variantes `Header`, `Hero` e `Footer`.
- A arte “Rastro interrompido” da 404 é vetorial, decorativa e deve manter proporção.

## Components

A biblioteca canônica vive na página `Foundation / Components` do Figma. Reutilize os main components e suas variantes antes de criar qualquer equivalente.

### IC / Product Card

**Variantes:** `Size=Desktop|Mobile`, `State=Default|Hover|Empty|Loading`.

Anatomia: mídia, nome e preço. O slot de mídia usa `IC / Media / Image` via `INSTANCE_SWAP`. Nome e preço são propriedades de texto.

Regras:

- Home usa exatamente 6 instâncias.
- Trocar a imagem pelo slot/override; não clonar o card para cada produto.
- Estados Empty e Loading já existem e devem ser reproduzidos a partir do Figma, não inventados por convenção.

### IC / Collection Card

**Variantes:** `Size=Desktop|Mobile`, `State=Default|Hover|Empty|Loading`.

Anatomia: mídia, overlay de leitura, título, descrição e CTA `EXPLORAR`.

Regras:

- Home usa exatamente 3 instâncias.
- Mídia é substituível via `IC / Media / Image`.
- Estados de hover/empty/loading seguem as variantes Figma.

### IC / Media / Image

É o slot de mídia reutilizável dos cards. Para conteúdo real, deve ser substituído por imagem do CMS/API ou asset exportado, preservando crop e proporção do componente consumidor.

### IC / Logo

**Variantes:**

- `Placement=Header, Size=Desktop`
- `Placement=Header, Size=Mobile`
- `Placement=Hero, Size=Default`
- `Placement=Footer, Size=Default`

A marca deve ser instanciada/exportada do asset atual. Não reconstruir os vetores manualmente.

### IC / Icon

**Kinds:** `Search`, `Account`, `Bag`, `Menu`, `Arrow`, `Close`.

O glifo não carrega sua área de toque. No mobile, a área mínima de 48px pertence ao `IC / Icon Button`/wrapper do Header.

A seta pertence ao CTA Ghost; não tratá-la como `Icon Button`.

### IC / Icon Button

**Variantes:** `Size=Glyph|Hit`, `State=Default|Hover|Focus`.

- Desktop Header: `Size=Glyph`.
- Mobile Header: `Size=Hit` (48px).
- `Kind` é `INSTANCE_SWAP` para Search, Account, Bag, Menu ou Close.
- Hover usa `text-secondary`.
- Focus usa anel visível de 1px em `text-primary`, alinhado para fora, sem alterar o tamanho do componente.

### IC / Text Link

**Variantes:** `Tone=Nav|Footer`, `State=Default|Hover|Focus`.

- `Nav` usa `label-nav`.
- `Footer` usa `body-sm`.
- Hover usa `text-secondary`.
- Focus usa anel de 1px em `text-primary` para fora.
- Usar apenas para links de navegação e listas do footer, não para headings de coluna, badge, wordmark, tagline ou quote.

### IC / Button

O sistema atual possui CTA **Ghost**, não um botão primário sólido genérico.

**Variantes:** `Variant=Ghost`, `Breakpoint=Desktop|Mobile`, `State=Default|Hover|Focus`.

- Label em `label-micro`, uppercase.
- Ícone padrão: Arrow.
- Desktop é um CTA textual compacto.
- Mobile usa altura mínima de 48px e largura 342px quando ocupa a coluna principal.
- Não criar um “primary solid” paralelo. O sólido `INSCREVER` pertence ao `IC / Field`.

### IC / Field

Controle de newsletter com input + submit sólido.

**Variantes:** `Breakpoint=Desktop|Mobile`, `State=Default|Hover|Focus|Error`.

Desktop:

- largura total 528px;
- input 360 × 52;
- botão 156 × 52;
- gap 12px.

Mobile:

- largura 342px;
- input e botão empilhados;
- gap 12px;
- altura 52px por controle.

O botão sólido usa `bg-inverse` + `text-inverse`. Placeholder usa `text-muted`. Focus e Error devem reproduzir as variantes do Figma.

### IC / Material Card

**Variantes:** `Size=Desktop|Mobile`.

- Desktop: 421.333px de largura; mídia 152 × 104.
- Mobile: 342px de largura; mídia 96 × 104.
- Título e descrição são propriedades de texto.
- A mídia é um slot substituível, não uma duplicação do componente.

### IC / Header

**Variantes:**

- `Breakpoint=Desktop, Menu=Closed`
- `Breakpoint=Mobile, Menu=Closed`
- `Breakpoint=Mobile, Menu=Open`

Desktop:

- altura 80px;
- logo desktop;
- navegação: **Coleções, Peças, Editorial, Manifesto**;
- ações: Search, Account, Bag e badge `0`;
- navegação persistente; não existe dropdown desktop nem variante Desktop Open.

Mobile fechado:

- altura 80px;
- Menu, logo mobile, Search e Bag;
- sem Account;
- sem badge textual.

Mobile aberto:

- usar exclusivamente a variante `Menu=Open`;
- expõe os mesmos quatro destinos da navegação desktop;
- não inventar itens adicionais.

### IC / Footer

**Variantes:** `Breakpoint=Desktop|Mobile`.

O footer aprovado contém:

- logo + assinatura “Arte para quem reconhece o indício.”;
- texto `indicio cult`;
- **LOJA:** Coleções, Peças, Editorial;
- **INSTITUCIONAL:** Manifesto, Ajuda, Trocas e devoluções, Contato;
- **LEGAL:** Privacidade, Termos, Cookies;
- **REDES:** Instagram, Pinterest, YouTube, Spotify;
- placeholders operacionais `CNPJ 00.000.000/0000-00` e `Endereço da sede`;
- pagamentos `PIX` e `CARTÃO`;
- quote “Viver com mais referências.”;
- `© 2026 Indicio Cult` e `Todos os direitos reservados.`

O mobile reorganiza o mesmo conteúdo em pilha. Não remova informação para “simplificar” o breakpoint.

### IC / Artwork / Rastro interrompido

Asset vetorial decorativo da 404.

- Desktop: 520 × 420.
- Mobile: 260 × 210.
- Fundo `bg-soft`.
- Número 404 em Cormorant Garamond.
- Detalhe editorial em `brand-copper`.
- Export preferencial SVG.
- `alt=""` na implementação; não repetir a mensagem da página para leitores de tela.

### IC / Not Found

**Variantes:** `Breakpoint=Desktop|Mobile`.

Desktop: arte + mensagem em duas colunas. Mobile: arte sobre a mensagem.

Conteúdo visual:

- kicker `PÁGINA NÃO ENCONTRADA` em cobre;
- H1/H2 com `Esse rastro não leva a lugar nenhum.`;
- apoio `Talvez a página tenha mudado de lugar. Mas ainda há muito para descobrir por aqui.`;
- CTA Ghost `VOLTAR À HOME`.

Interação:

- CTA retorna à Home e reinicia o scroll;
- logo também pode retornar à Home;
- CTA mantém 48px de área de interação;
- foco visível e tabulação são obrigatórios;
- a página deve continuar utilizável a 200% de zoom.

### System pages

O Figma atual também materializa Error, Global Error e Maintenance.

- **Error:** composição central, símbolo 48px desktop / 32px mobile, mensagem `Algo saiu do lugar.` e ação `Tentar de novo`.
- **Global Error:** mesma linguagem e ação, porém estruturalmente autossuficiente.
- **Maintenance:** wordmark stacked, mensagem `O arquivo está em ajuste. Voltamos em breve.`, sem CTA.

Essas telas não devem ganhar conteúdo técnico, countdown, prazo ou mensagem operacional não presente na fonte de copy.

## Do's and Don'ts

- **Do** trate o Figma atual e este frontmatter como fonte normativa para decisões visuais.
- **Don't** reutilize o antigo `design.md` pré-T8 ou a antiga Home placeholder como referência.
- **Do** preserve a sensação de espaço editorial, silêncio visual e curadoria.
- **Don't** transforme a interface em um e-commerce genérico, SaaS, marketplace ou estética geek.
- **Do** use Cormorant Garamond para voz editorial e Inter para função e leitura.
- **Don't** substitua as famílias por fontes aproximadas quando as fontes oficiais estiverem disponíveis.
- **Do** use tokens semânticos e variáveis.
- **Don't** coloque hex, funções CSS de cor ou paletas nativas do Tailwind em componentes.
- **Do** mantenha `brand-copper` e `accent-red` como cores distintas.
- **Don't** use cobre como botão primário universal ou vermelho editorial como substituto do cobre.
- **Do** use os estados e variantes existentes dos componentes.
- **Don't** invente hover, loading, empty ou error state quando o Figma já define um.
- **Do** mantenha 48px como área mínima de toque nas ações mobile.
- **Do** forneça foco visível para links, icon buttons, fields e CTAs.
- **Don't** remova foco, dependa apenas de hover ou altere layout durante focus.
- **Do** mantenha cantos predominantemente retos.
- **Don't** aplique grandes border-radii, pills, glassmorphism ou sombras de framework.
- **Do** preserve a ordem da Home e os 3 slots de coleção + 6 slots de destaque.
- **Don't** aumente a quantidade de cards porque há mais conteúdo disponível.
- **Do** use a navegação aprovada: Coleções, Peças, Editorial e Manifesto.
- **Don't** reintroduza os rótulos antigos “Novidades”, “Camisetas”, “Sobre” ou “Journal” no Header.
- **Do** mantenha Journal como bloco de captura de e-mail na Home.
- **Don't** trate Journal como destino principal da navegação.
- **Do** use `Menu=Open` apenas no mobile.
- **Don't** crie um dropdown/menu aberto para desktop.
- **Do** use os assets de logo e ícones existentes.
- **Don't** redesenhe logo, símbolo ou ícones a partir de aproximações.
- **Do** mantenha fotografias e artes como protagonistas e preserve seus crops.
- **Don't** substitua imagens por gradientes, ilustrações genéricas ou placeholders quando o asset real estiver disponível.
- **Do** mantenha a arte da 404 decorativa com `alt=""`.
- **Don't** anuncie “404” e a mesma mensagem duas vezes para tecnologias assistivas.
- **Do** mantenha placeholders de CNPJ e endereço exatamente como placeholders até existirem dados reais.
- **Don't** invente dados legais, operacionais ou sociais.
- **Do** permita rolagem natural e reflow em telas menores e zoom alto.
- **Don't** fixe a altura total das páginas ou corte conteúdo para coincidir com a altura do frame Figma.
