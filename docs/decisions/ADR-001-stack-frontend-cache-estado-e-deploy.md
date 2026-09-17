# ADR-001: Stack do frontend, estratégia de cache, estado do carrinho e infraestrutura de deploy

## Status
Aceito

## Data
2026-09-16

## Contexto

O [PRD](../PRD.md) e o [README](../../README.md) fixam a arquitetura de negócio da Indicio Cult como **Headless Commerce**: a vitrine é própria, enquanto catálogo, carrinho final, checkout, pagamento e pedidos são delegados à **Nuvemshop**; o fulfillment POD é da **Reserva Ink**; autenticação e banco da vitrine são do **Supabase**. Este ADR fecha a única decisão técnica que o README listava como pendente: *stack do frontend (framework, gerenciamento de estado, estratégia de cache) e infraestrutura de deploy*.

Restrições que a decisão precisa atender:

| Origem | Restrição |
|---|---|
| PRD §14 Performance | Core Web Vitals "bom" em 75% das sessões mobile (LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1); Lighthouse ≥ 90 mobile na saída do MVP. |
| PRD §14 Performance, RF-06 | Catálogo em cache com **revalidação por webhook** da Nuvemshop; preço e disponibilidade nunca desatualizados por mais de **1 minuto** após alteração. |
| PRD §14 Disponibilidade | ≥ 99,5% mensal na vitrine. |
| PRD §14 Segurança | Tokens Nuvemshop e Reserva Ink **só no servidor**, escopos mínimos; rate limit em login, rastreio, contato e simulação de frete. Nenhum dado de pagamento na vitrine. |
| PRD §14 SEO | URLs estáveis, metadados, dados estruturados (Produto, Artigo, Organização, Breadcrumb), sitemap, canonical, Open Graph. |
| PRD §14 Manutenibilidade | Conteúdo e curadoria alteráveis **sem deploy**. |
| PRD §14 Responsividade / i18n | Mobile-first (≥ 70% do tráfego); PT-BR agora, estrutura pronta para EN na Fase 3. |
| PRD §9.7, RF-04, RF-05 | Carrinho **local** para convidado, associado à conta ao logar (merge), com handoff ao checkout Nuvemshop e evento `begin_checkout` antes do redirecionamento. |
| PRD §3 princípio 5, §5 P4 | Operação por **uma pessoa** em menos de 1h/dia; plano Reserva Ink de ~20 vendas/mês na fase de validação. Custo fixo de infraestrutura precisa ser baixo e previsível. |
| PRD §16 | Recebimento de webhooks `product/updated`, `order/paid`, `order/fulfilled`, `order/cancelled` da Nuvemshop — exige endpoint HTTPS público sempre disponível. |
| PRD §11 | Backoffice próprio em `/admin/*` com Supabase Auth (papel `admin`, 2FA), sob o mesmo domínio da vitrine. |

## Decisão

Adotar, em conjunto:

1. **React com Next.js (App Router)** como framework da vitrine e do backoffice.
2. **ISR (Incremental Static Regeneration) com revalidação sob demanda disparada por webhook** como estratégia de cache do catálogo e do conteúdo editorial.
3. **Zustand** para o estado do carrinho no cliente.
4. **Docker em VPS Hostinger KVM 2** como infraestrutura de deploy, com Next.js em modo `standalone` atrás de um reverse proxy com TLS.

### 1. React + Next.js (App Router)

- **Server Components** por padrão nas páginas públicas (Home, Séries, Catálogo, PDP, Editorial): o HTML chega pronto, o JavaScript enviado ao cliente fica restrito aos componentes interativos (seletores de variante, simulação de frete, mini-carrinho, favoritar). Isso ataca diretamente LCP e INP no mobile.
- **Route Handlers** (`app/api/**`) concentram tudo o que precisa de segredo: recepção e verificação de webhooks da Nuvemshop, proxy da simulação de frete e do saldo da Reserva Ink, leitura de pedidos por e-mail verificado, rastreio sem login. Os tokens nunca chegam ao navegador, cumprindo o requisito de segurança do PRD.
- **Metadata API**, `generateMetadata` e `sitemap.ts`/`robots.ts` cobrem SEO, Open Graph e dados estruturados sem dependência externa.
- **`next/image`** com otimização no servidor atende a galeria da PDP e a fotografia editorial (imagens são o principal risco de LCP nesta vitrine).
- **Segmentação de rotas** separa `(vitrine)`, `(conta)` e `admin` com layouts, políticas de cache e middleware de autenticação distintos, dentro de um único deploy.
- **Internacionalização**: o App Router permite introduzir o segmento `[locale]` na Fase 3 sem reescrever a árvore de rotas.

### 2. ISR com revalidação por webhook

Regras de cache por tipo de dado:

| Dado | Fonte | Estratégia |
|---|---|---|
| Produtos, variantes, preço, disponibilidade, categorias | API Nuvemshop | `fetch` com `cache tags` (`product:{id}`, `category:{id}`, `catalog`). Revalidação sob demanda via `revalidateTag` disparada pelo route handler que recebe `product/updated`. **Revalidação por tempo como rede de segurança** (ordem de 1h) para o caso de webhook perdido. |
| Séries (texto curatorial, capa, ordem, status), Home, Editorial, Manifesto, Ajuda | Supabase (backoffice) | Mesma mecânica: o backoffice, ao salvar/publicar, chama `revalidateTag`/`revalidatePath` do conteúdo afetado. Cumpre "alterável sem deploy". |
| Simulação de frete por CEP | API Reserva Ink | Sem cache no Next; o cache de 1h por CEP é do próprio provedor (PRD §9.4). Rate limit no route handler. |
| Área do cliente, carrinho, backoffice, rastreio | Supabase / Nuvemshop | **Dinâmico, sem cache** (`dynamic = 'force-dynamic'` ou leitura em Server Actions). Dados por usuário nunca entram no cache compartilhado. |

Requisitos do endpoint de webhook:

- Verificar a assinatura HMAC enviada pela Nuvemshop antes de qualquer revalidação.
- Responder rápido (2xx) e revalidar de forma idempotente; um webhook repetido não pode causar efeito colateral além de uma nova revalidação.
- Registrar falhas e disparar alerta (PRD §14 Observabilidade: "alertas de falha de webhook Nuvemshop").
- `order/paid` alimenta o evento `purchase` do funil e o contador de vendas do mês (PRD §9.7, §11); não revalida catálogo.

A janela real de desatualização passa a ser o tempo de propagação do webhook (segundos), bem abaixo do limite de 1 minuto do PRD.

### 3. Zustand para o carrinho

- Uma única store `useCartStore` com itens (produto, variante, quantidade, snapshot de preço/imagem para exibição), CEP de estimativa e ações (`add`, `remove`, `setQuantity`, `moveToFavorites`, `clear`).
- **Persistência local** via middleware `persist` (`localStorage`) para o carrinho de convidado. Ao autenticar, o carrinho local é **mesclado** com o carrinho salvo do usuário no Supabase (RF-04) e a store passa a sincronizar com o servidor.
- A store é **apenas do lado do cliente** e **somente para o pré-checkout**. Ela não é fonte de verdade de preço ou disponibilidade: na abertura de `/carrinho` e no clique em "Ir para o checkout", os itens são revalidados contra a Nuvemshop (aviso de "item indisponível", PRD §9.7) antes de criar/atualizar o carrinho remoto e redirecionar.
- Dados de servidor (catálogo, pedidos, favoritos, conteúdo) **não** entram no Zustand: ficam em Server Components, `fetch` cacheado ou Server Actions. O escopo da store é deliberadamente pequeno para não recriar um estado global desnecessário.
- O contador do cabeçalho e o mini-carrinho lateral leem a mesma store; a hidratação do estado persistido é tratada para evitar divergência entre HTML do servidor e primeiro render no cliente (CLS).

### 4. Docker em VPS Hostinger KVM 2

- Imagem construída com `output: 'standalone'`, multi-stage (build → runtime Node LTS enxuto), usuário não-root, `HEALTHCHECK` em rota dedicada.
- **Reverse proxy** no mesmo host (Caddy ou Nginx via Docker Compose) responsável por TLS automático (Let's Encrypt), HTTP/2, compressão e cabeçalhos de segurança. Isso garante o endpoint HTTPS público exigido pelos webhooks e pelo callback OAuth do Supabase.
- Um único container da aplicação. O cache do ISR fica no sistema de arquivos do container/volume — adequado a uma instância; se um dia houver mais de uma réplica, será necessário um `cacheHandler` compartilhado (ver Consequências).
- Variáveis de ambiente e segredos (Nuvemshop, Reserva Ink, Supabase service role, remetente de e-mail) injetados no runtime, nunca na imagem.
- Deploy por CI: build da imagem em cada tag/merge na branch principal, push para um registry, `docker compose pull && up -d` no VPS; rollback trocando a tag da imagem.
- Toda a persistência de negócio está fora do VPS (Supabase, Nuvemshop, Reserva Ink). O servidor é **descartável**: recriá-lo é reconstruir a imagem e restaurar `.env`.

## Alternativas consideradas

### Framework

**Remix / React Router v7 (framework mode)**
- Prós: modelo de dados simples, boa performance, menos "mágica" de cache.
- Contras: não oferece ISR nativo nem revalidação sob demanda por tag; a estratégia de cache do catálogo teria que ser construída à mão (CDN ou Redis).
- Rejeitado: o requisito RF-06 é atendido nativamente pelo Next.js.

**Astro (com ilhas React)**
- Prós: excelente para conteúdo estático, JavaScript mínimo.
- Contras: área do cliente, backoffice e carrinho interativo são grande parte do escopo; o modelo de ilhas fica desconfortável para aplicação autenticada com muitas mutações.
- Rejeitado: a vitrine é metade conteúdo, metade aplicação.

**Next.js com Pages Router**
- Prós: mais maduro e documentado.
- Contras: sem Server Components, sem revalidação por tag, sem `generateMetadata`; caminho de migração futuro.
- Rejeitado: App Router é a direção do framework e resolve melhor os requisitos de performance e cache.

**Frontend SPA (Vite + React) consumindo a Nuvemshop no cliente**
- Contras: tokens exporiam-se ao navegador ou exigiriam um backend separado; SEO dependeria de pré-renderização; LCP no mobile penalizado.
- Rejeitado: viola o requisito de segredos apenas no servidor e o de SEO.

### Estratégia de cache

**SSR puro a cada requisição**
- Prós: nunca desatualizado.
- Contras: cada page view bate na API da Nuvemshop; latência e rate limit do provedor viram gargalo; LCP pior.
- Rejeitado: o PRD pede cache com revalidação, não ausência de cache.

**Site estático (`output: 'export'`) com rebuild por webhook**
- Prós: hospedagem trivial.
- Contras: rebuild completo a cada alteração de preço (minutos, não segundos); sem route handlers para webhooks, proxy de frete ou área do cliente.
- Rejeitado: não atende o limite de 1 minuto nem as partes dinâmicas do produto.

**ISR só por tempo (ex.: `revalidate: 60`)**
- Prós: simples.
- Contras: todo o catálogo é reconsultado periodicamente mesmo sem mudança; a janela de desatualização é sempre o valor máximo escolhido.
- Rejeitado como estratégia principal; **mantido como rede de segurança** com intervalo longo.

### Estado do carrinho

**React Context + `useReducer`**
- Prós: sem dependência.
- Contras: re-renderizações amplas, persistência e merge manuais, seletores inexistentes.
- Rejeitado: Zustand entrega o mesmo com menos código e sem custo relevante de bundle.

**Redux Toolkit**
- Prós: ferramental maduro.
- Contras: boilerplate e peso desproporcionais para uma única store de carrinho.
- Rejeitado: o escopo de estado global do projeto é pequeno por decisão.

**Carrinho vivendo diretamente na Nuvemshop (server-side desde o primeiro item)**
- Contras: cada "Adicionar ao arquivo" vira chamada de API; convidado exigiria identificar sessão remota; experiência de mini-carrinho fica dependente de rede.
- Rejeitado: o PRD define o carrinho como local, com handoff no checkout.

**TanStack Query para o carrinho**
- Contras: é uma camada de cache de servidor, não um gerenciador de estado local persistido.
- Rejeitado para o carrinho; pode ser adotado pontualmente em telas do backoffice com muita mutação, sem conflito com este ADR.

### Infraestrutura

**Vercel**
- Prós: integração nativa com Next.js, ISR e revalidação por tag funcionando sem configuração, região em São Paulo.
- Contras: custo variável por uso e por assento; funções serverless limitam duração e tornam o comportamento do cache dependente do provedor; segredos e observabilidade ficam presos à plataforma.
- Rejeitado: para uma operação de uma pessoa com ~20 vendas/mês, o custo fixo baixo e previsível do VPS pesa mais do que a conveniência. Permanece como alternativa viável de migração, já que o código não usa nada específico da Vercel.

**Serverless self-hosted (OpenNext em AWS Lambda/CloudFront)**
- Contras: complexidade operacional alta para uma pessoa; muitas partes móveis.
- Rejeitado: contraria o princípio de operação enxuta.

**PaaS (Railway, Render, Fly.io)**
- Prós: deploy simples de container.
- Contras: custo por uso menos previsível; algumas plataformas sem região no Brasil.
- Rejeitado por custo e latência; segunda opção se o VPS se mostrar oneroso de operar.

**Deploy direto no VPS sem Docker (PM2)**
- Contras: ambiente do servidor vira estado a manter; rollback e reprodutibilidade piores.
- Rejeitado: a imagem Docker torna o servidor descartável e o rollback trivial.

## Consequências

**Positivas**

- Requisitos de performance, SEO, cache por webhook e segredos no servidor são atendidos com recursos nativos do framework, sem serviços adicionais (sem Redis, sem CDN obrigatória, sem backend separado).
- Um único deploy cobre vitrine, área do cliente, backoffice e endpoints de integração.
- Custo fixo de infraestrutura conhecido (VPS) e independente do volume de sessões.
- Nenhum dado de negócio no VPS: recuperação de desastre é reconstruir a imagem e reaplicar variáveis de ambiente.
- Conteúdo e curadoria alteráveis pelo backoffice sem deploy, com propagação em segundos.

**Negativas e riscos**

- **Ponto único de falha.** Um VPS com um container não tem redundância; a meta de 99,5% (≈ 3,6h de indisponibilidade/mês) depende de monitoramento externo de uptime, `restart: unless-stopped` e disciplina de atualização do host. Se a meta for violada, o caminho é uma segunda instância com `cacheHandler` compartilhado ou a migração para Vercel.
- **Cache do ISR é local ao container.** Cada deploy começa com cache frio; a primeira visita a cada página paga a geração. Mitigação: passo de aquecimento pós-deploy nas rotas principais (Home, séries vigentes, PDPs em destaque).
- **Dependência do webhook.** Se a Nuvemshop não entregar `product/updated`, a vitrine só se corrige no ciclo de segurança por tempo. Mitigação: alerta de falha de webhook e revalidação manual pelo backoffice.
- **Operação do host é responsabilidade da equipe**: patches do sistema, renovação de TLS (automatizada pelo proxy), espaço em disco de imagens e logs, backups do `.env`.
- **Curva do App Router.** Fronteira servidor/cliente, semântica de cache e Server Actions exigem cuidado; a equipe deve fixar a versão do Next.js e revisar regras de cache a cada upgrade maior.
- **Hidratação do carrinho persistido** precisa ser tratada explicitamente para não gerar CLS no contador do cabeçalho.

**Ações decorrentes**

1. Registrar no `README.md` esta decisão como fixada e remover o item de "Decisões pendentes".
2. Fixar versões (Next.js, React, Node LTS, Zustand) no `package.json` e na imagem base.
3. Definir o `docker-compose.yml` (app + proxy), a rota de healthcheck e o pipeline de CI de build/push/deploy.
4. Implementar o route handler de webhooks com verificação de assinatura, idempotência e alerta de falha.
5. Configurar monitoramento externo de uptime e coleta de erros (PRD §14 Observabilidade) antes do lançamento suave.
6. Confirmar os recursos do plano KVM 2 (vCPU, RAM, disco, tráfego) contra o consumo medido do build e do runtime; documentar limite a partir do qual se avalia upgrade ou migração.

## Referências

- [README — Decisões fixadas e pendentes](../../README.md)
- [PRD §9.4 Página de Peça](../PRD.md), [§9.7 Carrinho e handoff](../PRD.md), [§11 Backoffice](../PRD.md), [§13 Requisitos funcionais](../PRD.md), [§14 Requisitos não funcionais](../PRD.md), [§16 Integrações](../PRD.md)
- [API Nuvemshop](https://dev.nuvemshop.com.br/en/docs/developer-tools/nuvemshop-api)
- [API Reserva Ink](https://developers.reserva.ink)
