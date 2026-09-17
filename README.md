# Indicio Cult

**Arte para quem reconhece o indício.**

Loja virtual de **arte impressa** — camisetas com estampas autorais no primeiro momento; posters e quadros no roadmap. Opera em **Print on Demand (POD)**, sem estoque próprio, sob arquitetura **Headless Commerce**: vitrine própria, checkout e pedidos delegados à plataforma de commerce.

A marca se posiciona como _marca de arte impressa para pessoas de repertório específico_, não como "loja de camisetas cult". Trata alienação, corpo fragmentado, futuro opaco, memória cultural e ruído tecnológico como sintomas do presente — sem transformar sofrimento em estética vazia.

## Documentação

| Arquivo                           | Conteúdo                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`PRD.md`](./docs/PRD.md)         | Documento de requisitos do produto: posicionamento, personas, escopo por fase, todas as páginas e fluxos de autenticação, backoffice, política de trocas, requisitos funcionais e não funcionais, integrações, riscos e roadmap                                                                                                             |
| [`decisions/`](./docs/decisions/) | Architecture Decision Records (ADRs) — registro do _porquê_ de cada decisão técnica, com alternativas consideradas e consequências. Começa em [`ADR-001`](./docs/decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md) (stack do frontend, cache, carrinho e deploy).                                                                  |
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
| Infraestrutura         | **Docker em VPS Hostinger KVM 2** — Next.js `standalone` em container único atrás de reverse proxy com TLS; nenhum dado de negócio no servidor.                                                                                              |

## Decisões pendentes

- **Paleta de cores e tipografia** — serão definidas em etapa de design.
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
