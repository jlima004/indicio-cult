# Indicio Cult

**Arte para quem reconhece o indício.**

Loja virtual de **arte impressa** — camisetas com estampas autorais no primeiro momento; posters e quadros no roadmap. Opera em **Print on Demand (POD)**, sem estoque próprio, sob arquitetura **Headless Commerce**: vitrine própria, checkout e pedidos delegados à plataforma de commerce.

A marca se posiciona como _marca de arte impressa para pessoas de repertório específico_, não como "loja de camisetas cult". Trata alienação, corpo fragmentado, futuro opaco, memória cultural e ruído tecnológico como sintomas do presente — sem transformar sofrimento em estética vazia.

## Como rodar localmente

Use Node.js **22.23.1** (versão fixada em `.nvmrc` e `.node-version`) e npm. A faixa aceita pelo projeto é `>=22.22.2 <23`. A partir de um clone limpo:

```sh
npm ci
```

Crie `.env` como cópia de `.env.example` (por exemplo, `cp .env.example .env` em um shell POSIX ou `Copy-Item .env.example .env` no PowerShell). Preencha os campos obrigatórios antes de iniciar:

| Variável                        | Configuração local                                                                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Mantenha `http://localhost:3000`, já preenchido no exemplo.                                                                                                                |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do seu projeto Supabase, no painel do projeto em **Settings → API Keys**.                                                                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave **publishable** (ou `anon` legada) do mesmo projeto, no mesmo painel. É pública e pode chegar ao navegador.                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Chave **secret** (ou `service_role` legada) do mesmo projeto, no mesmo painel. É obrigatória no bootstrap do servidor, mesmo para abrir a Home. Mantenha apenas no `.env`. |

As variáveis `NEXT_PUBLIC_*` são públicas: nunca coloque nelas a chave secreta. Não use credenciais fictícias nem versione `.env`. A chave secreta ignora RLS; obtenha acesso ao projeto Supabase autorizado para desenvolvimento com a equipe responsável.

Os DSNs `NEXT_PUBLIC_SENTRY_DSN` e `SENTRY_DSN` são opcionais e podem ficar vazios. Mantenha `MAINTENANCE_MODE=false` para ver a Home; `APP_VERSION` pode ficar vazio (usa `dev`). `SUPABASE_PROJECT_ID` é necessário apenas para os comandos de tooling `db:types` e `db:migrate`, não para `npm run dev`.

```sh
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e confirme a Home com o título **“Arte para quem reconhece o indício.”**. `GET http://localhost:3000/api/health` responde 200 com `status: ok` e `supabase: ok` quando o Supabase real está acessível; caso contrário, pode responder 503. Se o servidor encerrar na inicialização, confira os nomes das variáveis indicados no erro e os valores obrigatórios no `.env`.

Para a configuração e operação em produção no Coolify, consulte o [runbook de deploy](./deploy/README.md).

## Documentação

| Arquivo                           | Conteúdo                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`PRD.md`](./docs/PRD.md)         | Documento de requisitos do produto: posicionamento, personas, escopo por fase, todas as páginas e fluxos de autenticação, backoffice, política de trocas, requisitos funcionais e não funcionais, integrações, riscos e roadmap                                                                                                             |
| [`decisions/`](./docs/decisions/) | Architecture Decision Records (ADRs) — registro do _porquê_ de cada decisão técnica, com alternativas consideradas e consequências. [`ADR-001`](./docs/decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md) fixa frontend, cache e carrinho; [`ADR-002`](./docs/decisions/ADR-002-coolify-traefik-deploy.md) atualiza o deploy.       |
| [`specs/`](./docs/specs/)         | Especificações por módulo. O [`CAPABILITY-MAP.md`](./docs/specs/CAPABILITY-MAP.md) decompõe o MVP em módulos com dependências e ordem de construção; cada módulo recebe um `SPEC-<id>.md` quando chega a sua vez, começando por [`SPEC-foundation.md`](./docs/specs/SPEC-foundation.md) (base técnica: esqueleto, Docker, CI/CD, Supabase). |

## Decisões fixadas

| Área                   | Decisão                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plataforma de commerce | **Nuvemshop** (plano gratuito) — catálogo, categorias, carrinho final, **checkout hospedado**, pedidos, cupons e nota fiscal. Integração via [API Nuvemshop](https://dev.nuvemshop.com.br/en/docs/developer-tools/nuvemshop-api) e webhooks. |
| Pagamento              | **Nuvem Pago** (Pix e cartão de crédito), dentro do checkout Nuvemshop. A vitrine não toca dados de pagamento.                                                                                                                               |
| Fulfillment POD        | **[Reserva Ink](https://reservaink.com.br/quanto-custa-reserva-ink/)**, plano Experimente (R$ 39,90/mês, até 20 vendas/mês), via app oficial instalado na Nuvemshop. Pedidos aprovados vão automaticamente para produção e envio.            |
| Frete na vitrine       | Simulação por CEP via [API Reserva Ink](https://developers.reserva.ink) (`GET /v1/stores/shipping_simulation`). Valor final é o do checkout.                                                                                                 |
| Autenticação           | **Supabase Auth** — e-mail/senha e **login com Google**. Nenhum outro provedor social no escopo inicial.                                                                                                                                     |
| Banco da vitrine       | Supabase (favoritos, endereços, séries/curadoria, conteúdo editorial, solicitações de troca, assinantes, consentimentos), com RLS.                                                                                                           |
| Trocas                 | Solicitação por formulário na área do cliente → e-mail ao gerente, que resolve diretamente com o cliente. 7 dias para devolução, 90 para defeito, primeira troca gratuita. Edição de pedido fora de escopo.                                  |
| Frontend               | **React + Next.js (App Router)** — Server Components nas páginas públicas, Route Handlers para webhooks e proxy das APIs (tokens só no servidor). Ver [ADR-001](./docs/decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md).           |
| Cache                  | **ISR com revalidação sob demanda por webhook** da Nuvemshop (`product/updated` → `revalidateTag`) e pelo backoffice ao publicar conteúdo; revalidação por tempo apenas como rede de segurança.                                              |
| Estado do carrinho     | **Zustand** com persistência local para convidado e merge ao autenticar; itens revalidados contra a Nuvemshop antes do handoff ao checkout.                                                                                                  |
| Infraestrutura         | **Next.js `standalone` em Docker na VPS Hostinger, gerenciado pelo Coolify** — Traefik do Coolify faz roteamento e TLS; nenhum dado de negócio no servidor. Ver [runbook](./deploy/README.md).                                               |

## Decisões pendentes

- **Variantes vetoriais finais da marca** — integrar `Wordmark`, `Symbol` e favicon quando o pacote visual autorizado estiver disponível; a paleta, Inter e Cormorant Garamond da Foundation já estão fixadas nos tokens e no layout.
- URL de retorno pós-compra da Nuvemshop para o domínio da vitrine.
- Prazo de produção padrão e modelagens disponíveis na Reserva Ink.

## Ponto de atenção operacional

A Reserva Ink só envia pedidos à fábrica se houver **saldo pré-pago** suficiente para cobrir custo + frete. O backoffice deve monitorar o saldo via `GET /v1/stores/balance` e alertar a operadora antes que pedidos pagos fiquem travados. Ver seção 11 do PRD.

## Estrutura do repositório

```
README.md                 Este arquivo
docs/PRD.md               Documento de requisitos do produto
docs/decisions/           Architecture Decision Records (ADR-001, ...)
docs/specs/               Mapa de capacidades e specs por módulo (SPEC-foundation, ...)
```
