# Spec: `nuvemshop`

| Campo                           | Valor                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Status                          | **REVISED / HUMAN RE-APPROVAL REQUIRED**                                         |
| Capability                      | `nuvemshop`                                                                      |
| Tipo                            | Adapter de integração server-only, sem UI                                        |
| Base do repositório             | `origin/main` = `5b9acec069b31e0b7acde00252b8cdc849bc867f`                       |
| Baseline da convergência PR #27 | `02252f2b874f812179526c9394b0fdc33427277e`                                       |
| Data da pesquisa atualizada     | 2026-09-30; pesquisa inicial em 2026-09-28/29 preservada como histórico          |
| Plano                           | [plan.md](../../tasks/nuvemshop/plan.md), **RECONCILED / HUMAN REVIEW REQUIRED** |
| Implementação                   | **NOT AUTHORIZED / NOT READY**                                                   |
| Próximo gate                    | Reaprovação humana conjunta da spec revisada e do plano reconciliado             |

Este documento separa contratos upstream do repositório, **fatos externos verificados**, **decisões de design do projeto** e **decisões humanas/account-specific**. Design do projeto não é garantia do provider.

## Adjudicação humana e revisão atual

A revisão anterior foi **HUMAN APPROVED / PLANNING ALLOWED em 2026-09-29**: limites do módulo, API/versionamento, autenticação/scopes, secrets server-only, cliente tipado, webhooks, durabilidade, erros, observabilidade, testes e consumers. Essa aprovação histórica permitiu materializar o plano; nunca autorizou implementação.

A convergência contratual autorizada em 2026-09-30 revisa materialmente essa spec após pesquisa oficial atual. A aprovação anterior não se estende automaticamente à revisão atual. O planejamento já existe em `tasks/nuvemshop/`; o próximo passo é **HUMAN SPEC + PLAN RE-APPROVAL**. `NUV-HR-01` a `NUV-HR-08` permanecem **OPEN**, inclusive decisões de conta, scopes/modalidade, secret, inventário, checkout, subscriptions, durabilidade e privacy. Nenhum código, teste real, conta, secret, infraestrutura ou produção é alterado nesta execução documental.

## 1. Objetivo

Definir o adapter único da API Nuvemshop que será consumido por `catalog`,
`cart` e `orders`, além de receber e autenticar webhooks. O adapter deve
encapsular autenticação, versão, transporte HTTP, validação de respostas,
paginação, limites de uso, erros, HMAC e despacho de eventos para que os
consumidores não reimplementem a integração individualmente.

O módulo não é a experiência de comércio da Indicio Cult. Ele fornece
primitivas de integração e eventos verificados; os consumidores continuam
donos de sua própria semântica.

## 2. Escopo

### Incluído

- Cliente HTTP tipado e exclusivamente de servidor para a API REST da
  Nuvemshop.
- Pin de versão da API, base URL, `Authorization` e `User-Agent`.
- Leitura tipada de produtos, variantes, categorias e pedidos; leitura de
  clientes apenas se `read_customers` for adjudicado e concedido.
- Paginação explícita e tratamento de limites de uso.
- Recepção de webhooks por Route Handler, preservando o corpo bruto.
- Verificação HMAC antes de interpretar o JSON.
- Validação do envelope e despacho de eventos discriminados.
- Processamento seguro contra reentregas, concorrência e eventos fora de
  ordem, sem prometer exactly-once onde o provedor não oferece essa garantia.
- Taxonomia de erros, redaction, logs estruturados e alertas de falha.
- Contratos de teste e checkpoints de instalação/bootstrap.

### Fora de escopo

- Qualquer UI, PDP, catálogo, busca, SEO, Zustand cart, conta ou backoffice.
- Regras de identidade do cliente, associação de pedido à conta ou política de
  analytics de compra.
- Checkout próprio, pagamento, cupons, frete e fulfillment.
- Integração customizada com Reserva Ink.
- Criação/edição de produtos, categorias, clientes ou pedidos no MVP deste
  adapter; scopes de escrita não devem ser solicitados sem nova adjudicação.
- Persistência de um domínio de pedidos ou projeção de catálogo.
- Registro de webhooks, criação de app, instalação em loja e chamadas reais
  nesta execução.
- Alterações em Foundation, dependências, workflows, Docker, Coolify,
  Supabase ou produção.

## 3. Contrato herdado, dependências e consumers

### Repo contract

O Capability Map define `nuvemshop` como cliente tipado, token somente no
servidor, escopos mínimos, webhooks com HMAC, idempotência, despacho por evento
e alerta de falha. A dependência é `foundation`; os consumidores posteriores são
`catalog`, `cart` e `orders`.

O PRD fixa Nuvemshop como fonte de produtos, variantes, preços,
disponibilidade, categorias, carrinho final, checkout e pedidos. A vitrine não
processa pagamento. O PRD também fixa `product/updated`, `order/paid`,
`order/fulfilled` e `order/cancelled` como eventos necessários, mas os nomes e a
configuração efetiva da app ainda precisam ser confirmados no setup humano.

O `SPEC-foundation` fixa Next.js App Router, código que toca segredos em
server-only, `use cache`/`cacheTag`/`revalidateTag`, RFC 9457 Problem Details,
Sentry com coleta restrita e testes espelhando a árvore de `src/`. A estratégia
de deploy ativa é Next standalone no Coolify/Traefik; Compose, Caddy e proxy
próprio são históricos.

### Fronteiras

```text
foundation
    ↓
nuvemshop adapter
    ├── leitura tipada de recursos
    └── webhook autenticado → evento verificado
         ├── catalog: decide cache/tag e revalidação
         ├── orders: decide projeção, estado e analytics
         └── cart: decide estado local e handoff
```

O adapter não importa `next/cache`, não chama `revalidateTag`, não emite
`purchase`, não aplica regras de conta e não transforma um pedido em domínio da
aplicação. Os consumidores registram handlers e permanecem donos de seus
efeitos. Esta é uma decisão de design proposta, compatível com a direção de
dependências do Capability Map.

## 4. Fontes normativas e matriz de pesquisa

As fontes oficiais abaixo foram revalidadas em **2026-09-30**. Confiança alta significa contrato público verificado; não comprova a configuração da conta. `UNPROVEN / HUMAN GATE` não pode ser promovido a fato.

| Fato                    | Fonte oficial                                                                                                                                                                                                                              | Valor verificado / limite                                                                                                                                                                                   | Confiança e owner                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Base e versão           | [Introduction](https://tiendanube.github.io/api-documentation/intro), [Versioning](https://tiendanube.github.io/api-documentation/versioning)                                                                                              | Stable consultada `2025-03`; base Nuvemshop `https://api.nuvemshop.com.br/2025-03/{store_id}`                                                                                                               | Alta; NUV-04, HR-02                                                       |
| OAuth/headers           | [Authentication](https://tiendanube.github.io/api-documentation/authentication), [Introduction](https://tiendanube.github.io/api-documentation/intro)                                                                                      | Authorization Code, state, código 5 min, user_id da loja; Bearer e User-Agent com nome/contato; sem app_id runtime obrigatório                                                                              | Alta; HR-01/02, NUV-04/21/24                                              |
| Scopes                  | [Scopes](https://tiendanube.github.io/api-documentation/authentication#scopes), [Multi Inventory](https://tiendanube.github.io/api-documentation/guides/multi-inventory)                                                                   | Solicitar `read_products` + `read_orders`; acesso automático documentado a `read_locations` + `read_fulfillment_orders`, respectivamente                                                                    | Alta pública; capacidade efetiva HR-02 OPEN                               |
| Paginação/rate          | [Introduction](https://tiendanube.github.io/api-documentation/intro)                                                                                                                                                                       | page≥1, per_page≤200, Link/count; bucket padrão 40, vazão 2/s, reset em ms; Retry-After não garantido                                                                                                       | Alta; NUV-05/06                                                           |
| Product                 | [Product](https://tiendanube.github.io/api-documentation/resources/product#product-visibility)                                                                                                                                             | visibility `visible/unlisted/hidden`; atributos localizados e tags; published boolean perde distinção                                                                                                       | Alta; NUV-07/08                                                           |
| Variant                 | [Variant](https://tiendanube.github.io/api-documentation/resources/product-variant#properties)                                                                                                                                             | price nullable (contato em vez de checkout); promotional_price nullable; values localizados                                                                                                                 | Alta; NUV-07/08                                                           |
| Category                | [Category](https://tiendanube.github.io/api-documentation/resources/category#properties)                                                                                                                                                   | ID, nome/handle localizados, parent nullable, visibility `visible/hidden/soft-hidden` (último herdado)                                                                                                      | Alta; handle opcional é robustez do projeto; NUV-07/09                    |
| Inventário              | [Multi Inventory GET](https://tiendanube.github.io/api-documentation/guides/multi-inventory/products#get-productsid---get-productsidvariants), [Variant FAQ](https://tiendanube.github.io/api-documentation/resources/product-variant#faq) | Simple finito/ilimitado; multi GET stock agregado pode coexistir com levels. FAQ prova escrita ilimitada por local com stock string vazia, não prova sentinel GET nem agregado misto finito/ilimitado       | Alta para formatos provados; leitura multi ilimitada **UNPROVEN / HR-04** |
| Features                | [Store](https://tiendanube.github.io/api-documentation/resources/store#properties)                                                                                                                                                         | features lista capacidades; exemplos `inventory-levels`, `fulfillment-orders` são candidatos de evidência                                                                                                   | Alta pública; modo real HR-04                                             |
| Order/search            | [Order](https://tiendanube.github.io/api-documentation/resources/order)                                                                                                                                                                    | id≠number, q textual (número/nome/email), limite de 10.000; contact_email direto, Customer condicionado a read_customers; IDs de itens podem exceder int32/int64                                            | Alta; NUV-07/11–13                                                        |
| Fulfillments/tracking   | [Fulfillment Order](https://tiendanube.github.io/api-documentation/resources/fulfillment-order), [Order aggregates](https://tiendanube.github.io/api-documentation/resources/order#fulfillment-orders)                                     | Múltiplas remessas, ULID; aggregates de list são parciais; tracking_info/code/url nullable. Campos shipping legados do Order expõem apenas primeira remessa                                                 | Alta; NUV-07/11; consumer orders                                          |
| API subscriptions/auth  | [Webhook](https://tiendanube.github.io/api-documentation/resources/webhook#verifying-a-webhook)                                                                                                                                            | Subscriptions via /webhooks; HMAC sobre raw bytes explicitamente para webhooks criados via API                                                                                                              | Alta; NUV-14–19                                                           |
| API entrega selecionada | [Retry policies](https://tiendanube.github.io/api-documentation/resources/webhook#retry-policies), [Changelog](https://tiendanube.github.io/api-documentation/CHANGELOG)                                                                   | 2xx≤3 s, até 16 tentativas/48h; mudança18→16 em 29/07/2026; duplicatas/ordem não garantida                                                                                                                  | Alta; NUV-19/24; timeout divergence RESOLVED neste conjunto               |
| Lifecycle               | [Webhook](https://tiendanube.github.io/api-documentation/resources/webhook), [Suspension](https://tiendanube.github.io/api-documentation/intro#suspension-of-api-access-due-to-lack-of-payment)                                            | app/uninstalled, app/suspended, app/resumed; id do uninstall é App ID; detalhes adicionais de suspended/resumed **UNPROVEN**; 402 interrompe API/webhooks; fim de free days não gera esses lifecycle events | Alta pública; payload/aplicabilidade real HR-02/06                        |
| Privacy URLs            | [Application URLs](https://tiendanube.github.io/api-documentation/authentication#urls), [Required callbacks](https://tiendanube.github.io/api-documentation/resources/webhook#required-webhooks)                                           | Três URLs da configuração da app; payloads próprios. Fontes divergem sobre trigger store/redact (pedido do lojista versus uninstall)                                                                        | Alta para configuração; trigger real HR-08                                |
| Privacy HMAC/entrega    | [Verifier API](https://tiendanube.github.io/api-documentation/resources/webhook#verifying-a-webhook), [URLs](https://tiendanube.github.io/api-documentation/authentication#urls)                                                           | Extensão do HMAC de subscriptions às três privacy URLs, prazo/retries específicos não comprovados                                                                                                           | **UNPROVEN / HR-08**, NUV-20/24; sem fallback sem autenticação            |
| Modalidade/SDK          | [External apps](https://nuvemshop.dev/en-US/apps/admin/external), [Admin overview](https://nuvemshop.dev/apps/admin/overview), [SDK rehomologation](https://nuvemshop.dev/apps/publish/homologation/nube-sdk-rehomologation)               | External executa fora do Admin; distribuição App Store/Para Seus Clientes é outro eixo. Overview anuncia exigência SDK para instalações desde 30/08/2026; fonte específica exige SDK para JS injetado       | Alta para textos; exemption/instalabilidade API-only **UNPROVEN / HR-02** |
| 400/422                 | [Client errors](https://tiendanube.github.io/api-documentation/intro#client-errors)                                                                                                                                                        | 400 inclui JSON/UA;422 campos inválidos                                                                                                                                                                     | Alta; NUV-03/04/05, sem retry                                             |
| Cart/checkout           | [Cart](https://tiendanube.github.io/api-documentation/resources/cart), [Draft Order](https://tiendanube.github.io/api-documentation/resources/draft-order)                                                                                 | checkout_url de Draft Order não prova handoff normal da vitrine                                                                                                                                             | HR-05 OPEN                                                                |

### Divergências e limites das fontes

Exemplos `/v1` não autorizam fallback do pin `2025-03`. A regra geral **3 s/16 tentativas/48h** vale para o conjunto API business+lifecycle selecionado. O prazo específico de [Fulfillment Order webhooks](https://tiendanube.github.io/api-documentation/resources/fulfillment-order#important-considerations), 10s, pertence a tópicos futuros fora deste conjunto e exige revisão própria se adicionados. Privacy não herda esse SLA como fato; HR-08 confirma prazo/entrega reais, podendo usar 3 s como alvo interno conservador.

Sem delivery ID universal/frescor verificado, HMAC não impede replay. Não inferir SDK obrigatório nem isento para esta app API-only: HR-02 verifica modalidade, distribuição e instalabilidade, inclusive sequência autorizada de criação/configuração/ensaio/instalação. Se SDK for obrigatório para a modalidade real, **BLOCKED_ARCHITECTURE_ADJUDICATION_REQUIRED**; esta convergência não redesenha a arquitetura.

### Revalidação dirigida de Order detail — 2026-10-01

O PRD §10.3 exige itens, pagamento, endereço, timeline/rastreio e nota fiscal em `/conta/pedidos/[id]`. A pesquisa de 2026-09-30 permanece como baseline; esta remediação revalida somente os fatos necessários a esse detalhe autenticado:

- [Order — pagamento](https://tiendanube.github.io/api-documentation/resources/order#payment-details): `payment_status`, `gateway`/`gateway_name`, `paid_at` e `payment_details.method/credit_card_company/installments`; exemplos admitem `paid_at`/`credit_card_company` null. Não incluir dados de cartão nem link transacional desnecessário no mínimo.
- [Fulfillment Order — recipient/destination](https://tiendanube.github.io/api-documentation/resources/fulfillment-order#fulfillmentorderdestination): `recipient.name`, `destination.street` e campos opcionais `number`, `floor` (complemento), `locality` (bairro), `city`, `zipcode`, `province.name/code` e `country.name/code`. As response properties não provam integralmente nullability do objeto destination; não importar obrigatoriedade dos write inputs para o GET. Tolerância a ausência/null com incompletude explícita é design do projeto.
- [Multi Inventory — múltiplos fulfillments](https://tiendanube.github.io/api-documentation/guides/multi-inventory#managing-multiple-fulfillments): `shipping_*` legado representa a primeira Fulfillment Order, não endereço global nem coleção completa.
- [Order — invoices/NF-e](https://tiendanube.github.io/api-documentation/resources/order#invoices-eg-nfe-in-brazil), [Metafields](https://tiendanube.github.io/api-documentation/resources/metafields): `namespace=nfe`, `key=list`, `owner_id` do Order, `value` string contendo array JSON de `{key,link,fulfillment_order_id?}`; zero/múltiplas notas e relação opcional por remessa. O formato legado em dois metafields separados ainda é admitido, sem associação inferida. Exemplos usam HTTP; hosting pela Nuvemshop e HTTPS obrigatório não são fatos comprovados.
- [Scopes](https://tiendanube.github.io/api-documentation/authentication#scopes), [capacidades automáticas](https://tiendanube.github.io/api-documentation/guides/multi-inventory#new-scopes): `read_orders` e acesso automático documentado a `read_fulfillment_orders`. Nenhum scope adicional de invoice foi identificado; capability efetiva de leitura dos metafields Order permanece **UNPROVEN / HR-02**, sem ampliação automática de requested scopes.

## 5. API versioning

### Decisão proposta

O cliente deve usar a versão `2025-03` no path da API e não aceitar versão por
entrada de consumer. Haverá uma única versão de contrato interno (One-Version
Rule). A mudança de versão exige revisão da spec, atualização de fixtures,
revisão de schemas e uma decisão explícita; não será feita por fallback
automático entre versões.

O version pin é configuração interna do módulo, não variável pública e não
parâmetro controlável pelo browser. O cliente deve falhar ao detectar resposta
incompatível, em vez de silently adaptar dois formatos.

## 6. Authentication e authorization

### Fatos externos

- A instalação/bootstrap é Authorization Code, com `state` validado e troca do
  código em endpoint oficial.
- O token é Bearer e o `user_id` retornado identifica a loja.
- O token não deve ser presumido como eterno: pode ser invalidado por nova
  emissão ou desinstalação.

### Decisão proposta para este capability

Esta etapa é single-store, não um SaaS multi-tenant. O runtime usa um contexto
de loja fixo, validado por configuração. Não haverá tela OAuth nem endpoint de
instalação no MVP do adapter. O bootstrap humano registra a app e instala na
loja; depois fornece apenas a configuração necessária ao runtime.

O cliente envia `Authorization: Bearer <token>` e `User-Agent` no formato
documentado `Nome da app (URL ou e-mail de contato)`, derivado de constante
interna ou configuração própria, sem depender de `NUVEMSHOP_APP_ID`. Não expõe
token, client secret ou assinatura em retorno,
logs, erros, analytics, bundle ou headers de resposta para o browser.

Scopes propostos para o core de leitura, sujeitos à necessidade campo a campo:

```text
read_products
read_orders
```

A documentação de Multi Inventory descreve acesso automático a `read_locations` por `read_products` e a `read_fulfillment_orders` por `read_orders`. HR-02 verifica essas capacidades efetivas, versão, modalidade/distribuição, permissão dos tópicos e instalabilidade API-only/NubeSDK na conta real. Não solicitar extras automaticamente; divergência real é **BLOCKED_PROVIDER_SCOPE_DIVERGENCE**, sem ampliação silenciosa. SDK obrigatório na modalidade real exige **BLOCKED_ARCHITECTURE_ADJUDICATION_REQUIRED**.

O vínculo de pedidos da conta usa `Order.contact_email`, campo direto do
recurso Order sob `read_orders`, comparado por `orders`/`identity` apenas com um
e-mail verificado da identidade. Ele não depende do objeto `Order.customer`.
`read_customers` permanece fora do core: só deve ser solicitado se um consumer
provar necessidade de campos adicionais do recurso Customer e o scope for
adjudicado e concedido. O core não expõe `getCustomer` nem `listCustomers` por
default.

Não solicitar `write_products`, `write_customers` ou `write_orders` nesta etapa.
O cadastro de webhook e qualquer operação necessária ao checkout devem ser
confirmados no app real; um scope não deve ser inferido de um nome amigável no
PRD.

## 7. Environment e secrets

As variáveis abaixo são a proposta de contrato para a implementação futura. A
spec não altera `.env.example` nem o schema nesta execução.

| Variável                  | Classificação                                           | Uso                                                      | Browser/build                                               |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `NUVEMSHOP_STORE_ID`      | runtime, required, non-public                           | Loja única autorizada; validação do envelope e path      | Nunca pública; não build arg                                |
| `NUVEMSHOP_ACCESS_TOKEN`  | runtime, required, secret                               | Bearer para leituras API                                 | Nunca pública; nunca build arg                              |
| `NUVEMSHOP_APP_ID`        | bootstrap/tooling, non-secret; fora do contrato runtime | URL de instalação OAuth e `client_id` na troca de código | Não necessário em requests store-scoped; não `NEXT_PUBLIC_` |
| `NUVEMSHOP_CLIENT_SECRET` | runtime, required, secret                               | Verificação HMAC e eventual bootstrap autorizado         | Nunca pública; nunca build arg                              |
| `NUVEMSHOP_API_VERSION`   | código/config interna, fixed                            | `2025-03`                                                | Nunca browser; não controlável pelo usuário                 |

`NUVEMSHOP_CLIENT_SECRET` não deve ser confundido com o access token. A
documentação do webhook atribui a assinatura ao segredo da app; a rotação e o
procedimento de coexistência de segredo anterior precisam de confirmação
humana. O PRD não autoriza armazenar credenciais em `/admin/configuracoes`; até
que esse desenho exista, configuração significa runtime secret manager/env.
`NUVEMSHOP_APP_ID` pertence ao bootstrap/instalação e não vira requisito de
runtime sem uma operação concreta que o consuma. O ID da app não substitui o
segredo usado na verificação HMAC.

O módulo deve importar `server-only` no entrypoint que alcança credenciais. O
CI deverá receber somente fixtures/sentinelas não secretas nos testes locais;
nenhuma chamada autenticada real é parte desta execução.

## 8. Module structure

Esta é a convenção proposta para o primeiro módulo de negócio e deverá ser
seguida por implementação posterior:

```text
src/modules/nuvemshop/
├── server/
│   ├── client.ts       # configuração server-only e cliente autenticado
│   ├── request.ts      # transporte, versão, headers, retry e parse
│   ├── products.ts     # products e variants
│   ├── categories.ts   # categories
│   ├── customers.ts    # opcional; somente após read_customers adjudicado
│   ├── orders.ts       # orders; somente leitura no MVP
│   ├── webhooks.ts     # corpo bruto, HMAC, envelope e dispatcher
│   └── index.ts        # superfície server-only do módulo
├── schemas/
│   ├── product.ts
│   ├── category.ts
│   ├── customer.ts     # opcional; somente com customers.ts
│   ├── order.ts
│   └── webhook.ts
├── types.ts            # tipos normalizados exportáveis ao server consumers
└── index.ts             # entrypoint server-only; nenhum export para client
```

Os endpoints de recepção candidatos são
`src/app/api/webhooks/nuvemshop/events/route.ts`,
`src/app/api/webhooks/nuvemshop/store-redact/route.ts`,
`src/app/api/webhooks/nuvemshop/customers-redact/route.ts` e
`src/app/api/webhooks/nuvemshop/customers-data-request/route.ts`. Eles podem preparar localmente o
verificador comum como design do projeto, com auth privacy ainda UNPROVEN/HR-08, e são boundaries HTTP finos: não contêm regra de
catálogo/pedido e não chamam parsers ou handlers antes da autenticação.
Durante manutenção, a rota precisa ficar fora do bypass genérico que responde
503 sem persistir o webhook; essa integração com a regra de manutenção é um
gate de implementação, não uma alteração nesta spec.

## 9. Typed HTTP client

### Request contract

O cliente deve:

1. construir somente URLs do host fixo da API e do path versionado;
2. preservar IDs exatamente antes de qualquer decode/coerção com perda e validá-los antes de interpolação;
3. enviar `Authorization`, `User-Agent` e `Accept: application/json`;
4. enviar `Content-Type: application/json; charset=utf-8` quando houver body;
5. usar `AbortSignal` e timeout explícito configurável no servidor;
6. anexar um correlation ID interno aos logs, sem expô-lo como segredo;
7. nunca aceitar URL arbitrária, redirect de payload ou host fornecido por
   consumer;
8. validar status, JSON e schema de resposta antes do retorno tipado;
9. redigir `Authorization`, body sensível e PII em erros e logs.

Timeouts e orçamento de retries são política do cliente, não da Nuvemshop.
Proposta: GET/HEAD têm retry limitado, com jitter e orçamento finito; writes
não têm retry automático no MVP; timeout ou resposta desconhecida de um write
retorna estado de resultado desconhecido e exige reconciliação, não repetição
cega. A implementação deve fixar números e testá-los antes de ser considerada
pronta.

### Precisão dos identificadores

IDs do provider são identificadores, sem arithmetic. NUV-07 deve preservar a representação decimal exata **antes** de JSON/decode/coerção que use número JS inseguro; converter um number já arredondado em string não recupera o ID. A escolha entre string decimal, bigint ou estratégia lossless é implementação futura, sem pacote autorizado aqui. Unsafe number de caller falha como ValidationError antes do fetch; resposta que não possa ser decodificada exatamente falha ProtocolError, nunca arredonda. Fixtures raw incluem IDs acima de int32 e de `Number.MAX_SAFE_INTEGER`; o valor normalizado e a URL devem manter todos os dígitos. ULID de fulfillment e correlação local permanecem strings; validar domínio/formato antes de URL, sem URLs externas fornecidas por payload.

### Pagination contract

Métodos de lista expõem resultado normalizado:

```ts
type Page<T> = {
  items: T[]
  page: number
  perPage: number
  totalCount?: number
  nextPage?: number
  previousPage?: number
}
```

O adapter segue o header `Link` quando presente e não exige que consumers
interpretem headers externos. Antes de usar uma URL de `Link`, o cliente deve
validar HTTPS, host oficial, versão, `store_id`, recurso esperado e somente os
parâmetros de paginação/filtro permitidos; redirects são proibidos. Um `Link`
inválido vira `NuvemshopProtocolError`, sem tentativa de egress. `perPage` não
pode superar 200. `listAll` não é permitido como default: qualquer agregação
deve ter limite explícito, abortável e observável.

### Rate-limit contract

O cliente registra os headers de limite em forma segura e reconhece 429 como
erro tipado. `x-rate-limit-reset` significa milissegundos restantes até o bucket
esvaziar, não timestamp; a implementação deve validar unidade, valores ausentes
e valores maiores que o orçamento disponível. Não presume `Retry-After`.
GET/HEAD podem aguardar/backoff somente dentro do orçamento finito definido na
implementação. A falta de uma indicação confiável de espera não autoriza loop
agressivo. Requests devem ser limitados por loja/app e coalescidos quando uma
única revalidação provoca leituras concorrentes.

### Response validation

Respostas da API são input externo. Schemas de runtime validam envelope, tipos,
campos requeridos e variantes de produto antes de mapear para os tipos do
projeto. Campos externos desconhecidos são ignorados ou preservados apenas em
estrutura interna não exportada; não viram superfície pública por acidente.

## 10. Resource contracts

Os nomes abaixo são contratos conceituais reconciliados no plano existente; shapes finais exigem reaprovação humana e implementação futura. Todos são server-only e retornam tipos normalizados; nenhum
consumer monta URL Nuvemshop ou lê o payload externo diretamente.

### Products e variants

```ts
listProducts(input: ListProductsInput): Promise<Page<Product>>
getProduct(input: { productId: ProductId }): Promise<Product>
getVariant(input: { productId: ProductId; variantId: VariantId }): Promise<Variant>
```

`Product` cobre ID estável, nome/handle localizados, descrição quando disponível, imagens, categorias, variantes, timestamps necessários, atributos localizados e tags do provider necessárias aos filtros tema/cor/tamanho do PRD. `Variant.values` corresponde aos atributos do produto; não descartar dados necessários aos seletores. Adapter preserva dados; `catalog` define filtros, labels e apresentação.

Visibility mantém **visible, unlisted, hidden**, nunca boolean: visible participa de discovery/compra; unlisted é acessível/comprável por link direto, fora de discovery; hidden não é comprável. `published=false` não distingue os dois últimos. A política editorial/discovery é do consumer.

Preço regular (`price`) é nullable; null representa contato em vez de checkout. Promo (`promotional_price`) é nullable quando ausente. Design do projeto: preço efetivo decimal/string somente quando houver preço vendável; com regular válido, usar promoção válida quando presente, senão regular. Regular null não gera preço vendável inventado nem invalida toda Variant; efetivo fica ausente. Valores presentes malformados falham, sem float. `cart` revalida no servidor imediatamente antes do handoff e falha fechado para variante sem preço vendável/disponibilidade compatível/visibility que permita compra; checkout continua HR-05.

| Caso                                     | Contrato de disponibilidade                                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simple finito                            | stock_management=true e stock inteiro não negativo                                                                                                                                 |
| Simple ilimitado                         | stock_management=false e stock=null conforme leitura oficial; null não vira zero                                                                                                   |
| Multiple Locations finito                | inventory_levels por location ID e estoque local; stock agregado pode coexistir validamente e representa total; não selecionar primeiro local                                      |
| Multiple Locations ilimitado             | Preservar semântica por local; representação exata GET e agregado misto finito/ilimitado **UNPROVEN / HR-04**. Stock string vazia documenta escrita, não autoriza inventar leitura |
| Desconhecido/malformado/divergência real | Falhar fechado; não adivinhar modo, estoque ou precedência                                                                                                                         |

HR-04 confirma modo operacional por evidência de conta/configuração; Store.features é candidato oficial mais forte que heurística de shape/count. Ambos os formatos têm cobertura contratual, inclusive representação multi ilimitada depois de prova específica/ensaio autorizado em conta compatível; escolher modo simple não elimina essa obrigação nem fecha sozinho NUV-10. Sem prova necessária, disponibilidade final permanece bloqueada. Nenhuma chamada à conta ocorre nesta convergência.

O adapter não decide slug editorial, série, SEO, texto curatorial, cache ou política de apresentação de indisponibilidade.

### Categories

```ts
listCategories(input: ListCategoriesInput): Promise<Page<Category>>
getCategory(input: { categoryId: CategoryId }): Promise<Category>
```

Contrato mínimo fechado: ID estável, nome localizado, handle quando presente, parent ID ou null (raiz), visibility **visible, hidden, soft-hidden**. Soft-hidden é herdado de ancestral oculto; preservar a distinção. Aceitar handle ausente é decisão de robustez do projeto; não afirmar que a documentação prova nullability, não sintetizar slug nem fallback.

Texto curatorial, capa, ordem, status e referências de séries pertencem ao backoffice/`content` conforme PRD/Capability Map. Category é taxonomy/vínculo do provider. Description, Google taxonomy, subcategories, custom fields e timestamps não integram o mínimo sem consumer comprovado. Não há metadata vaga nem nova open decision de curadoria.

### Customers

Capability opcional, indisponível na configuração core. `getCustomer` só fica
habilitado se `read_customers` tiver sido adjudicado e concedido:

```ts
getCustomer(input: { customerId: CustomerId }): Promise<Customer>
```

O acesso a Customer é server-only, minimizado e só deve buscar campos
adicionais comprovadamente necessários ao consumer. Seus dados pessoais não
entram em logs, cache compartilhado, analytics ou tipo client-importable. O
vínculo da conta usa o e-mail do Order; a decisão pertence a `orders`/`identity`,
não ao adapter.

### Orders

```ts
getOrder(input: { orderId: OrderId }): Promise<Order>
listOrders(input: ListOrdersInput): Promise<Page<Order>>
findOrderByNumber(input: { number: OrderNumber }): Promise<Order | null>
```

`getOrder` usa o ID interno do pedido; `number` é o número visível ao cliente e
também a chave de busca para `/rastreio`. A [API Order](https://tiendanube.github.io/api-documentation/resources/order)
documenta `GET /orders?q=<number>` para busca por número, mas `q` também pode
encontrar texto em nome/e-mail. `findOrderByNumber` faz essa busca apenas no
servidor, valida o formato decimal do número, percorre explicitamente as
páginas filtradas dentro de um orçamento finito e aceita somente
`Order.number` igual ao número informado após normalizar ambos como inteiros
decimais canônicos, sem coerção de texto arbitrário ou de número inseguro.
`null` significa que todas as páginas filtradas foram examinadas sem
correspondência exata. Resultado ambíguo,
limite de consulta do provedor ou orçamento esgotado antes da conclusão gera
`NuvemshopLookupIncompleteError`, nunca `null` nem um pedido escolhido por
aproximação. Se o volume real não permitir busca completa nesse orçamento,
`orders` deve manter uma projeção
durável indexada por número antes de disponibilizar `/rastreio`; não se faz
varredura implícita de todos os pedidos.

Para `/conta/pedidos`, `ListOrdersInput` deve aceitar `q` com o e-mail
verificado obtido de `identity` no servidor, nunca de filtro arbitrário do
browser, e paginação explícita. A [API Order](https://tiendanube.github.io/api-documentation/resources/order)
faz busca textual também em nome/e-mail, sem prometer que esse índice cobre
todo `Order.contact_email`; `q` é descoberta de candidatos. `orders` deve
examinar todas as páginas do resultado filtrado dentro de orçamento finito e aceitar apenas
pedidos cujo `Order.contactEmail` coincida exatamente com o e-mail verificado
sob a política de normalização de `identity`. Uma página vazia após o filtro
local não prova fim da busca. Limite do provedor, orçamento esgotado ou falha
de paginação tornam a listagem incompleta, sem apresentá-la como lista final.
Se a busca filtrada não puder ser concluída ou sua cobertura de
`Order.contact_email` não for comprovada, `orders` deve manter projeção durável
indexada por e-mail, com cobertura e reconciliação comprovadas antes de
disponibilizar `/conta/pedidos`. O adapter não requer `read_customers` para
esse fluxo e não registra o e-mail usado em `q`.

`Order` contém ID e número distintos, estado, itens/referências de variante, valores e resumo de pagamento necessário ao PRD (`payment_status`, provider/método, bandeira/parcelas e `paid_at` quando fornecidos, respeitando ausência/null legítimos sem raw payment_details). Fulfillment é **zero ou muitos records/summaries**, cada remessa com estado, tracking próprio opcional e histórico/eventos mínimos suficientes à timeline do PRD. `tracking_info` pode ser null; code/url nullable não invalidam Order. Não escolher primeira remessa nem usar shipping_* legado como coleção completa.

NUV-11 possui leitura tipada/normalização de Fulfillment Orders dentro das tasks existentes: aggregates oficiais e, quando necessário, leituras do recurso usando transporte/paginação bounded. IDs ou summaries parciais da listagem não equivalem a coleção completa nem a ausência de remessas; preservar estado de completude e buscar detalhes explicitamente quando o consumer necessita, ou indicar incompletude. Zero remessas confirmado é válido. Preservar, quando fornecidos, os históricos `status_history` e `tracking_events` por remessa: identificadores disponíveis, estados/transições e tempos, incluindo estados `custom_{status}` documentados ([Fulfillment Order — histórico/tracking](https://tiendanube.github.io/api-documentation/resources/fulfillment-order#fulfillmentordertrackingevent)). Histórico vazio legítimo não é erro nem autoriza inventar eventos; summaries parciais não provam histórico completo. NUV-07 valida, NUV-11 lê/normaliza com completude explícita, NUV-23 integra e NUV-25 exige o detalhe/timeline efetivo do consumer. Não promover endereço bruto/geolocalização/raw: preservar somente a projeção server-only mínima descrita abaixo. Leituras de detalhes preservam contexto/path order-scoped e relações/IDs oficialmente disponíveis, sem exigir `order_id` top-level não documentado. A capability efetiva é verificada em HR-02, sem scope extra automático. Inclui
`Order.contactEmail`, normalizado do campo oficial `Order.contact_email`, para
que `orders`/`identity` compare o e-mail do pedido com um e-mail Supabase
verificado. Esse campo é PII e server-only: não entra em logs, analytics, cache
compartilhado ou tipo importável pelo cliente. Ausência ou invalidade de contactEmail não invalida o Order inteiro (tolerância do projeto), mas impede vínculo por essa regra. O contrato não exige
o objeto Customer completo nem `read_customers`. O adapter fornece o dado,
mas não decide o vínculo, a linha do tempo da conta, troca, `purchase`,
contador de vendas ou reembolso.

Para o futuro consumer autenticado `/conta/pedidos/[id]`, cada fulfillment preserva a projeção mínima de `recipient.name` e `destination.street`, `number`, `floor`, `locality`, `city`, `zipcode`, `province.name/code` e `country.name/code` quando fornecidos. Destino/opcionais ausentes ou null não autorizam inventar endereço nem invalidar o Order por si só (robustez do projeto); distinguir ausência confirmada de dados não consultados/summary incompleto. Objeto/campo presente estruturalmente malformado falha conforme schema. Não promover phone/email/identifier do recipient, reference/between_streets/region, customs, geolocation/latitude/longitude ou destination bruto. `Order.shipping_address`/`shipping_*` legado não é fonte canônica do pedido inteiro nem fallback silencioso para todas as remessas.

**Projeção provisória de endereço no nível Order (design do projeto):** com zero Fulfillment Orders confirmado e endereço legacy/order-level válido disponível no Order, NUV-11 **deve preservar** uma projeção mínima opcional server-only desse endereço para o futuro detalhe autenticado. Reutilizar a mesma política de minimização acima: nome do destinatário quando necessário, rua/endereço, número, complemento, bairro, cidade, CEP, estado/província e país, somente quando fornecidos; não criar segunda política nem promover PII extra/raw/geolocation. Provenance explícita e tipada deve distinguir endereço de fulfillment de endereço legacy/order-level provisório (conceitos equivalentes a `fulfillment` e `order_legacy_provisional`, sem fixar literals, shape TypeScript ou UI). NUV-07 valida essa distinção e rejeita projeção presente malformada ou sem provenance distinguível; NUV-11 normaliza/preserva e NUV-23 integra.

Zero fulfillments confirmado com essa projeção presente é Order válido; zero confirmado com endereço ausente/null também é válido, com endereço unavailable, sem síntese. Endereço não é campo estrutural obrigatório de todo Order; presente estruturalmente malformado falha conforme schema. A disponibilidade da projeção é independente da completude dos dados de fulfillment: não transforma summaries parciais/dados não consultados em zero confirmado nem prova que os dados de fulfillment estão completos. Ela não representa nem antecipa o destino de qualquer futura remessa.

Quando há um ou mais Fulfillment Orders, cada `recipient/destination` permanece autoritativo **para sua própria remessa**, com sua ausência/incompletude preservada. A projeção provisória nunca substitui destino ausente, nunca é convertida/coagida em destino nem copiada para remessas existentes, futuras ou múltiplas, e nunca vira endereço global canônico. Se mantida nesse caso, serve somente como provenance histórica/provisória, distinguível mesmo quando diverge dos destinos. Seu uso no detalhe autenticado exige sessão, vínculo, ownership e autorização próprios de `orders`/`identity`; o adapter não decide disclosure. Todas as restrições de PII abaixo também se aplicam à projeção provisória; `/rastreio` permanece sem qualquer endereço.

NF-e é referência fiscal exposta pelo contrato Order da Nuvemshop, sem garantia de hosting: **0..N referências**, com chave/link e `fulfillment_order_id` opcional preservado exatamente quando fornecido, nunca associação à primeira remessa por inferência. NUV-11 possui a leitura GET dos metafields Order filtrada pelo ID exato, `namespace=nfe`, `key=list` e `fields=value`, via transporte/paginação/budget existentes. Decodificar a string `value` com limites de tamanho/estrutura e validar todos os elementos; `per_page=1` no exemplo limita metafields, não a cardinalidade do array interno. Ausência/null de referências na projeção normalizada é válida, mas leitura não realizada/falha/truncada não prova zero notas; `value` presente incompatível ou JSON/elemento malformado falha, nunca vira array vazio. O legado de chave/link em dois metafields ainda documentado exige reconciliação bounded quando fornecido: revalidar seus nomes/formato na fonte oficial antes de codificar, sem adivinhar associação ou precedência. Ausência de `nfe/list` sozinha não prova ausência total se o legado não foi reconciliado; informar incompletude/erro em vez de descartar nota fornecida. HR-02 verifica capability efetiva da leitura fiscal junto do restante de Order; nenhuma permissão adicional é solicitada automaticamente.

Links fiscais são dados externos sensíveis. Política de segurança proposta e sujeita à reaprovação: preservar referências absolutas HTTP/HTTPS válidas somente no servidor, sem credenciais embutidas ou schemes ativos; HTTPS é preferido, mas os exemplos oficiais HTTP não são malformados nem convertidos artificialmente para HTTPS. O adapter não faz fetch do documento para exibição, não segue redirects, não usa o link como alvo de egress nem prova de ownership. O futuro consumer decide divulgação/navegação, inclusive tratamento explícito de HTTP legado, após autorização própria; esta documentação não implementa isso.

Endereço, destinatário e referências fiscais são PII/dados sensíveis server-only: proibidos em logs, erro público, analytics, Sentry tags, shared cache, tipos/raw importáveis pelo cliente e webhook evidence. O adapter valida/normaliza e preserva o mínimo; `orders`/`identity` possuem sessão autenticada, vínculo pedido↔conta, authorization e projeção autorizada para `/conta/pedidos/[id]`. Somente esse consumer pode entregar a projeção mínima à sua UI após verificar ownership; evidência do adapter não prova authorization/disclosure. Nenhuma identidade, decisão de disclosure ou UI é implementada em NUV-07/11/23.

Em `/rastreio`, `orders` compara `Order.contactEmail` ao e-mail informado e
aplica limitação de tentativas. A comparação identifica um candidato, mas não
comprova posse do e-mail. Antes de divulgar qualquer status ou código,
`orders`/`identity` exige prova de posse do endereço correspondente: sessão com
e-mail verificado ou desafio de uso único enviado a esse endereço para o fluxo
sem login. O desafio deve ser aleatório criptograficamente, vinculado ao e-mail
e ao pedido consultado, ter expiração curta, limite de envios/tentativas e
invalidação no sucesso, na expiração ou na substituição; não pode aparecer em
logs nem ficar armazenado em texto puro ([OWASP OTP](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html#one-time-password-otp-handling-and-storage)).
Sem essa prova, `/rastreio` não divulga dados do pedido. Após a prova,
retorna somente a projeção mínima prevista no PRD: status/linha do tempo de
fulfillment e códigos de rastreio **por remessa**, preservando zero/múltiplas e ausência legítima de tracking, nunca o `Order` completo, e-mail de contato,
endereços, referências invoice/NF-e, itens, valores ou detalhes de pagamento. O novo mínimo do detalhe autenticado não amplia `/rastreio`. Ausência, divergência,
busca inconclusiva e desafio inválido recebem resposta pública genérica. O
adapter não autentica o solicitante desse fluxo.

### Checkout/cart

O adapter fornece `getProduct`/`getVariant` para revalidação do carrinho. Não
define ainda `createCart`, `createCheckoutSession`, `createDraftOrder` ou
`checkoutUrl`: a documentação pública consultada não prova que Draft Order é o
handoff equivalente ao checkout normal da vitrine. Esses métodos permanecem
proibidos na implementação até fechar `NUV-OPEN-CHECKOUT`.

## 11. Webhooks

### Boundary HTTP

- Método: `POST` em `/api/webhooks/nuvemshop/events` para os quatro eventos de
  negócio e lifecycle selecionado.
- Callbacks de privacidade usam endpoints distintos, configurados nas três URLs de privacy do App Admin (não subscriptions POST /webhooks): `/api/webhooks/nuvemshop/store-redact`,
  `/api/webhooks/nuvemshop/customers-redact` e
  `/api/webhooks/nuvemshop/customers-data-request`. Não se escolhe o parser a
  partir de um body ambíguo.
- O handler obtém os bytes do corpo uma vez, antes de chamar qualquer parser.
- O corpo tem limite de tamanho configurado e fail-closed antes de parsear; a
  proposta inicial é 1 MiB, sujeita a validação com fixtures oficiais e revisão
  humana.
- Para subscriptions API, o header de assinatura é `x-linkedstore-hmac-sha256`. Ausente, duplicado ou
  malformado é rejeitado.
- O [exemplo oficial de verificação](https://tiendanube.github.io/api-documentation/resources/webhook#verifying-a-webhook)
  compara o header a `hash_hmac('sha256', ...)` sem saída binária. Pelo
  [contrato do PHP](https://www.php.net/manual/en/function.hash-hmac.php), isso
  é hexadecimal, não Base64: exigir 64 caracteres hexadecimais, decodificar
  para 32 bytes e rejeitar encoding diverso. Fixture no formato documentado e
  confirmação com entrega autorizada são gates antes do uso operacional; a
  documentação não substitui captura do formato real da app.
- A assinatura é HMAC-SHA256 dos bytes brutos usando o segredo da app, não o
  access token e não o JSON reserializado.
- A extensão desse HMAC aos callbacks privacy é **UNPROVEN**. Como design do projeto, NUV-20 pode preparar shared-verifier local com fixtures sintéticas, sem chamar isso fato externo. HR-08 exige ensaio real autorizado de cada callback confirmando autenticação antes de instalação/ativação operacional. Divergência real gera **BLOCKED_SPEC_CONTRADICTION** + adjudicação humana de segurança; nenhum fallback sem autenticação nem assinatura alternativa inventada. Bytes brutos e HMAC antes de JSON permanecem onde HMAC é o contrato autenticado.
- O digest esperado e o recebido são comparados em bytes de mesmo tamanho com
  comparação em tempo constante.
- JSON só é parseado depois da assinatura válida; schema do envelope é aplicado
  depois do parse.
- `store_id` assinado deve coincidir com o store autorizado no runtime. Loja
  desconhecida ou cruzada falha fechado.

### Envelope e allowlist

```ts
type VerifiedWebhookEvent =
  | { event: 'product/updated'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/paid'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/fulfilled'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'order/cancelled'; storeId: string; resourceId: string; correlationId: string }
  | { event: 'app/uninstalled'; storeId: string; appId: string; correlationId: string }
  | { event: 'app/suspended' | 'app/resumed'; storeId: string; correlationId: string }
```

O envelope externo também pode conter campos necessários à reconciliação, mas
eles não são copiados indiscriminadamente ao tipo público. O `id` do provedor
é ID de recurso para business; no uninstall é App ID. Store/event são comuns; detalhes adicionais de suspended/resumed não estão provados e HR-06 confirma payload real. Não impor resourceId/AppID aos dois por inferência. Nenhum id vira delivery ID sem prova.

Lifecycle é necessário ao modelo operacional, não deferred: NUV-15 schema, NUV-16 recibo/intenção mínima recuperável sem resourceId forçado, NUV-18 estado durável pausado/desconectado e reconciliação, NUV-19 mesma rota events, NUV-21 alerta/runbook, NUV-24 subscriptions/evidência sob HR-02/06. Uninstalled interrompe operação e sinaliza owner, **não** equivale a store/redact. Suspended impede operação normal; resumed apenas solicita probe canônico de acesso/configuração bounded e reconciliação dos consumers **já registrados e operacionais** antes de sua retomada, nunca limpa estado cegamente por ordem de entrega. 402 também diagnostica suspensão; silêncio ou free days não garantem lifecycle. Payload real divergente reabre tasks técnicas donas antes do marco, sem implementação em NUV-24. NUV-24 prova estado durável, probe e contrato de coordenação do adapter, sem exigir consumers futuros implementados nem declarar seus efeitos reconciliados. Consumer instalado depois executa sincronização/reconciliação inicial antes de operar; prova efetiva fica em NUV-25. Retomada de consumer operacional aplicável continua bloqueada enquanto sua reconciliação estiver pendente. Pendências de integração permanecem explícitas/recuperáveis, não são marcadas como efeitos concluídos.

Além dos quatro eventos de negócio, um app que guarda dados deve tratar os
callbacks de privacidade documentados oficialmente: `store/redact`,
`customers/redact` e `customers/data_request`. Eles têm payloads e owners
diferentes do envelope de recurso e são roteados pelos endpoints próprios; não
caem no parser de `{event, id}`. Seu contrato de retenção, resposta e execução
fica em `NUV-OPEN-PRIVACY-WEBHOOKS`/HR-08. A decisão humana de owner, retenção, payload e resposta precede NUV-20; prova real de autenticação/trigger/entrega ocorre em NUV-24 antes da ativação operacional. Fontes de URLs exigem configuração da app: HR-02/08 adjudicam sequência de criação/configuração/OAuth/ensaio antes do bootstrap, sem presumir URLs vazias ou ensaio pré-OAuth suportado. Configuração temporária de ensaio exige autorização específica, endpoint real e suporte comprovado.

Eventos não reconhecidos, depois de autenticação válida dos bytes brutos, parse
bounded e validação da loja autorizada, não chamam handler, dispatcher, consumer
nem API externa. Somente quando não forem callbacks obrigatórios de privacidade
e uma política explícita registrada pelo owner permitir o ignore, tornam-se
elegíveis: classificação/eligibilidade não autoriza ACK. NUV-16 deve primeiro
efetivar o commit de um receipt durável mínimo; somente após esse commit NUV-19 pode concluir
`ignored_unknown_event` e responder 2xx. Falha ao persistir o receipt retorna
5xx, sem ACK, permitindo retry do provedor. O receipt usa apenas dados mínimos
autenticados/necessários de intake, identidade e correlação locais, com
classificação terminal segura e auditabilidade/recovery do registro; não exige
`resourceId`, App ID ou delivery ID do provider fictícios, não persiste raw body
por default e não cria trabalho externo de consumer.

### Ack e falha

1. autenticar e validar dentro do limite do provedor;
2. registrar uma intenção de processamento ou enfileirar de modo durável;
   para unknown elegível ao ignore, efetivar o commit do receipt terminal mínimo;
3. responder 2xx somente após esse registro confiável;
4. processar efeitos fora da request, com limite de concorrência e alerta;
5. retornar 4xx para assinatura/envelope inválidos;
6. retornar 5xx quando o registro durável não estiver disponível, permitindo
   nova tentativa do provedor.

Durable-before-ACK e 5xx sem registro durável também se aplicam ao terminal
ignore de unknown autenticado. Esse terminal exige receipt/classificação
duráveis e recovery/auditabilidade do intake, sem claim, retry ou replay de
trabalho de consumer que não existe; os contratos de processamento recuperável
de business/lifecycle e de privacy conforme HR-08 permanecem vigentes.

O mecanismo de storage/recovery durável é genérico e pode ser implementado
antes da decisão do contrato privacy. A projection normalizada específica de
receipt/trabalho privacy pertence à implementação dos callbacks (NUV-20),
somente após HR-08 decidir owner/payload/trigger/retention/response; ela reutiliza
as primitives genéricas NUV-16/17, com commit antes do ACK e falha de
storage/commit retornando 5xx/sem ACK, sem persistir raw body por default.

O handler não deve realizar chamadas lentas de catálogo/pedido antes do ack.
Quando a entrega chega durante manutenção, ela deve seguir a mesma regra de
durabilidade; a rota não pode ser descartada pelo 503 terminal genérico sem uma
política de recuperação.

O registro durável tem estados explícitos `received`, `claimed`, `processing`,
`succeeded`, `retryable` e `quarantined`. O claim tem lease expirável; crash
após o 2xx deve permitir reclaim, retry interno bounded e replay/quarentena por
operador, com alerta e runbook. Persistir a intenção não é, sozinho, prova de
processamento ou de efeito de negócio.

## 12. Idempotência, ordering e retries

### O que o provedor garante

A documentação permite duplicatas e não garante ordem. Não há delivery ID
universal verificado para os quatro eventos. Portanto `hash(raw_body)` não é
uma chave válida de deduplicação permanente: um mesmo corpo pode ser uma
reentrega, mas o par `(store_id, event, resource_id)` também pode reaparecer em
uma alteração legítima posterior.

### Decisão proposta

- `product/updated`: registrar cada entrega com identificador local, tratar
  como sinal de revalidação e coalescer somente trabalho concorrente. Se uma
  nova entrega chegar durante o processamento, uma geração pendente deve forçar
  nova leitura; não bloquear para sempre updates posteriores do mesmo produto.
- Eventos de pedido: separar ledger de entregas, reconciliação do recurso e
  idempotência de efeitos. O adapter não pode inventar delivery ID nem usar
  hash do body como identidade. `orders` deve definir matriz de transições para
  `paid`, `fulfilled` e `cancelled`, incluindo reversões, e só emitir `purchase`
  quando os campos canônicos comprovarem o efeito. Se o snapshot atual não
  provar a transição recebida, o trabalho vai para reconciliação ou quarentena,
  não é silenciosamente descartado.
- Reentregas e falhas após o ack devem ser recuperáveis pelo state machine da
  seção 11. A retenção deve exceder a janela máxima de retry e replay
  operacional; a duração exata é checkpoint de implementação.
- Eventos fora de ordem não são aplicados como sequência confiável. O consumer
  consulta/reconcilia o recurso atual, mas não trata monotonicidade como prova
  de todo efeito histórico.

## 13. Cache e revalidation boundary

O adapter despacha evento tipado; o `catalog` decide quais tags invalidar e o
Route Handler/integrador do consumer chama `revalidateTag` após autenticação e
registro. O adapter não importa `next/cache` nem conhece tags de página.

O caminho normal deve atender à meta do PRD de atualização de preço/
disponibilidade em até 1 minuto quando o webhook é entregue e o consumer está
saudável. O fallback temporal do ADR-001 é uma rede de segurança, não prova de
SLA de um minuto após perda de webhook. Essa distinção deve aparecer nos testes
e nos alertas.

`catalog` pode usar `use cache`/`cacheTag`; leituras de pedidos vinculadas a
usuário ficam fora do cache compartilhado. O `cart` sempre revalida variantes no
servidor antes do handoff.

## 14. Error model

Consumers não fazem branching em strings ou em detalhes acidentais do provedor.
O adapter expõe uma taxonomia mínima e estável:

```text
NuvemshopConfigurationError  # configuração ausente/inválida
NuvemshopAuthenticationError # 401/credencial inválida ou revogada
NuvemshopAuthorizationError  # 403/scope insuficiente
NuvemshopAccountSuspendedError # 402/acesso suspenso por cobrança
NuvemshopNotFoundError       # 404 no recurso solicitado
NuvemshopValidationError     # input local inválido
NuvemshopProtocolError       # resposta/status/JSON/schema incompatível
NuvemshopRateLimitError      # 429 + metadados seguros de reset
NuvemshopNetworkError        # timeout, abort ou falha de conexão
NuvemshopProviderError       # 5xx/erro externo não específico
NuvemshopLookupIncompleteError # busca por número ambígua ou não concluída
NuvemshopWebhookError        # assinatura/envelope/loja inválidos
```

Input local inválido → `NuvemshopValidationError` **antes do fetch**. Resposta inesperada 400/422 em leitura localmente válida → `NuvemshopProtocolError` seguro, não retryable, salvo classe semântica já aprovada demonstrada por fonte específica. Não ecoar payload/mensagem externa nem criar classe ad hoc.

Cada erro pode carregar operação, recurso, status e correlation ID seguro;
nunca token, client secret, `Authorization`, body cru ou PII. Route Handlers
usam o formato Problem Details já fornecido pela Foundation e não devolvem
stack trace.

## 15. Rate limit e política de retry

Fatos do provedor e headers estão na seção 4. A política do adapter é proposta:

- GET/HEAD: retry limitado, apenas para falhas transitórias elegíveis, com
  backoff e jitter; observar o reset anunciado e abortar fora do orçamento.
- 429: não fazer loop imediato; interpretar `x-rate-limit-reset` como duração
  em milissegundos, validar o valor e respeitar limite por loja/app. `Retry-After`
  pode ser usado se vier, mas não é pré-requisito.
- 5xx/network/timeout: retry bounded somente para leitura idempotente.
- 400/422 inesperados e erros locais ValidationError: sem retry.
- POST/PUT/PATCH/DELETE ou operação com efeito: sem retry automático cego; a
  operação precisa de chave/idempotência do provedor ou reconciliação explícita.
- Tentativas devem carregar o mesmo correlation ID e ser visíveis em logs.

Os valores numéricos de timeout, máximo de tentativas, teto de backoff e
concorrência por loja devem ser fixados no planejamento após aprovação desta
spec; eles não são fatos externos e não devem surgir como defaults implícitos.

## 16. Security / threat model

| Ativo                      | Fronteira                       | Ameaça                                      | Mitigação e verificação                                                                        |
| -------------------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Access token/client secret | env/build/browser               | Vazamento em bundle, log, erro ou build arg | `server-only`, runtime env, scan do bundle, redaction e teste negativo; nenhum `NEXT_PUBLIC_*` |
| Catálogo/pedidos           | HTTP público → webhook          | Forgery/tampering                           | HMAC sobre raw bytes, digest validado, comparação constante, parse posterior                   |
| Isolamento da loja         | payload assinado → configuração | Evento de outra loja                        | comparar `store_id` com store autorizado e testar fixture cross-store                          |
| Efeitos de pedido          | webhook → consumer              | Replay, duplicata, concorrência             | registro durável/claim atômico, efeitos por estado canônico e testes de reentrega              |
| Estado                     | entrega → consumer              | Ordering arbitrário                         | reconciliação por leitura canônica e transições não regressivas                                |
| Disponibilidade            | provider → route/queue          | timeout, retry amplification, DoS           | body cap, parse bounded, ack após durabilidade, concorrência/orçamento por loja                |
| PII                        | API/log/Sentry/cache            | exposição de customer/order                 | minimização, allowlist de campos, sem PII em logs/cache público, redaction testada             |
| Egress                     | payload → API externa           | SSRF                                        | host/path fixos; IDs validados; nenhuma URL do payload é buscada                               |
| Supply chain               | dependência → HMAC              | pacote comprometido                         | primitivas do runtime, lockfile e auditoria de scripts; sem dependência nesta spec             |
| Secret rotation            | app secret → verifier           | rotação quebra ou aceita segredo antigo     | confirmar mecanismo oficial e janela; testar atual/anterior somente se suportado               |

## 17. Observability

O contrato observável deve responder: qual webhook chegou, de qual loja segura,
qual foi o resultado do despacho, quanto demorou e por que um retry/falha
ocorreu.

Logs estruturados de uma linha devem permitir, com cardinalidade controlada:

```text
event_name
source = nuvemshop
webhook_event
safe_store_id
resource_kind
resource_id_hash_or_safe_id
request_or_delivery_correlation
latency_ms
provider_status
retry_attempt
dispatch_result
error_code
```

Não registrar access token, client secret, `Authorization`, HMAC, corpo bruto,
URL arbitrária ou customer PII. IDs de recurso só entram se a política de
privacidade os considerar seguros; caso contrário, usar identificador derivado
não reversível.

Sentry recebe exceções sanitizadas com tags de baixo cardinality (`event`,
`status_class`, `operation`), nunca payload inteiro. Alertar quando a fila não
é persistida, quando falhas de assinatura/schema crescem anormalmente, quando
há 429/5xx persistente ou quando retries excedem o orçamento. Alertas devem
apontar para runbook futuro e ser acionáveis; o detalhe do canal é decisão de
operação posterior.

## 18. Testing strategy

Testes devem ser escritos antes da implementação e separar fatos verificáveis
de chamadas reais.

### Unitários

- construção de URL versionada, headers, `User-Agent` e `AbortSignal`;
- ausência de `Authorization`/segredos em logs e erros;
- paginação, `Link`, `x-total-count` e limite de `per_page`;
- busca por número com `q`: matches por nome/e-mail rejeitados, número
  normalizado, paginação incompleta distinguida de ausência;
- listagem da conta com `q`: e-mail verificado exato, páginas intermediárias sem
  matches, limite do provedor e cobertura incompleta sem lista final;
- contrato do consumer `/rastreio`: nenhuma divulgação antes da prova de posse,
  desafio expirado/reutilizado ou com tentativas excedidas rejeitado, resposta
  limitada à projeção de rastreio;
- schemas de produto, variante, categoria, pedido e envelope; cliente somente se a
  capability opcional for habilitada;
- taxonomia para 401/402/403/404/429/5xx/timeout/schema inválido; input local inválido sem fetch e 400/422 remoto válido → ProtocolError sem retry;
- IDs raw acima de int32/MAX_SAFE_INTEGER preservados antes de decode com perda, unsafe caller rejeitado, ULID string e URL exata;
- Product visibility três estados, Category visibility três estados/parent/handle opcional, atributos/values/tags preservados;
- regular/promo nullable, efetivo ausente legítimo versus decimal malformado;
- zero/múltiplas remessas, histórico/eventos por remessa preservados (vazio legítimo/custom status), summaries parciais distintos de coleção/histórico completos, tracking_info/code/url nullable e ausência de contactEmail sem invalidar Order;
- endereço mínimo por fulfillment preservado, opcionais/ausência/null legítimos distintos de incompletude, malformed falha, sem endereço global legado nem raw/geolocation/PII extra;
- invoice/NF-e 0..N, associação opcional exata, ausência confirmada versus leitura fiscal incompleta/legado não reconciliado, JSON-string bounded e links HTTP/HTTPS válidos sem fetch/redirect/egress; negativos de descarte/primeira nota/associação errada e vazamento em logs/Sentry/cache/cliente/evidência;
- limite de retry, jitter/bounded behavior e ausência de retry inseguro de write;
- HMAC hexadecimal válido, header Base64/ausente/malformado, corpo alterado e
  comparação constante de 32 bytes;
- parse somente depois da assinatura;
- body oversized, JSON malformado e objeto com campos abusivos;
- loja errada, evento desconhecido e evento fora da allowlist;
- endpoints e payloads distintos de `store/redact`, `customers/redact` e
  `customers/data_request`, shared-verifier local preparado como design com auth real UNPROVEN/HR-08, sem fallback não autenticado;
- duplicatas concorrentes, reentrega após falha e eventos fora de ordem;
- ledger `received` → `claimed` → `processing` → `retryable`/`quarantined`,
  lease expirado e crash depois do ack;
- `Link` externo, redirect, host, versão, loja e recurso inválidos;
- preço promocional, estoque ilimitado, estoque agregado e `inventory_levels`;
- resposta 402, app/suspended/uninstalled/resumed, duplicatas/ordem, recibo sem resourceId, estado durável pausado/desconectado, probe/reconciliação de consumers operacionais antes de retomar, consumer futuro exige sync inicial antes de operar, e interrupção API/webhooks;
- manutenção ativa sem descarte de webhook e redaction no argumento enviado ao
  Sentry;
- redaction em logs/Sentry.

### Contract/fixture tests

Usar fixtures sintéticas ou oficiais anonimizadas, com provenance registrada no
teste. Nunca incluir token, client secret, PII real ou payload copiado de loja
real. Cobrir **ambas** as famílias oficiais de inventário, independentemente do modo real HR-04; multi ilimitado exige representação GET provada antes do mapper final. Modo da conta não reduz fixtures.

### HTTP integration tests

Usar mock HTTP server para verificar request/response, rate limits, headers,
timeouts e retries. NUV-23 integra os owners Product/Category/inventory/Order concluídos, incluindo endereços mínimos por fulfillment, metafields fiscais 0..N, completude e redaction, sem egress aos links fiscais. Não apontar o teste para a API real.

### Smoke real posterior

Uma chamada real à Nuvemshop exige checkpoint humano, credenciais de teste,
cleanup e evidência independente. Não faz parte desta execução nem deve entrar
na CI de pull request com segredo.

## 19. Human setup e checkpoints

Antes do bootstrap, HR-02/08 confirmam modalidade/instalabilidade e sequência suportada de configuração das URLs privacy obrigatórias/ensaio/OAuth, sem URLs fictícias. O bootstrap humano deve seguir o Authorization Code oficial: owner inicia a
instalação, gera e guarda `state` de uso único, recebe o callback, confere
`state` e troca o código dentro dos 5 minutos, sem imprimir o código, token ou
secret. A evidência compartilhável é somente app/store ID, scopes aprovados,
versão, data e resultado redigido. A injeção no runtime ocorre pelo secret
manager/env autorizado; o procedimento também deve documentar revogação e
reinstalação. Não se cria UI OAuth nesta etapa, mas o runbook de bootstrap é
pré-requisito operacional.

Todos **OPEN nesta execução**. Gates fecham fatos/decisões; tasks implementam depois, sem ciclo.

| ID        | Decisão humana / evidência                                                                                                                                                                                                                                                                                                                      | Blocking scope e momento                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| NUV-HR-01 | Loja/app single-store autorizadas; store_id seguro sem token                                                                                                                                                                                                                                                                                    | Toda implementação, inclusive fixtures locais, e smoke                                                        |
| NUV-HR-02 | Versão 2025-03, modalidade/distribuição/instalabilidade API-only/SDK e sequência de criação/configuração/OAuth; mínimo requested read_products/read_orders versus effective locations/fulfillment_orders, topics permitidos. Divergência scope → BLOCKED_PROVIDER_SCOPE_DIVERGENCE; SDK necessário → BLOCKED_ARCHITECTURE_ADJUDICATION_REQUIRED | Uso real/NUV-24; não testes locais após AUTH+HR-01                                                            |
| NUV-HR-03 | Mecanismo secret/rotação; coexistência sim/não e janela somente se suportada. Decisão primeiro, reconciliação condicional NUV-02/14 depois; previous nunca permanente                                                                                                                                                                           | HMAC operacional; não verifier sintético. Entrega real depois da reconciliação                                |
| NUV-HR-04 | Modo real por conta/features; representação GET multi ilimitada/agregado misto por fonte específica ou ensaio autorizado compatível; evidência redigida, exemplos/provenance aprovados e plano de cobertura, sem raw da conta; NUV-10 implementa/executa fixtures das duas famílias depois, não é pré-requisito para fechar o gate              | NUV-10/disponibilidade final; ambas famílias obrigatórias mesmo se loja simple                                |
| NUV-HR-05 | Handoff cart→checkout normal provado por fonte/ensaio autorizado                                                                                                                                                                                                                                                                                | cart/checkout, não core                                                                                       |
| NUV-HR-06 | Autorização específica/inventário/subscriptions API: quatro business e lifecycle aplicável; payload real suspended/resumed, endpoints, evidência por topic/família e rollback separado                                                                                                                                                          | Dentro de NUV-24 após deploy aprovado; não pré-requisito dos schemas locais15/18                              |
| NUV-HR-07 | Store/fila, retenção, claim/lease, worker/recovery, alert owner/runbook; decisão de backend e contrato/protocolo de ensaio de recovery antes de NUV-16/17; prova implementada de recovery depois em16/17 e operacional em NUV-24, nunca pré-requisito para fechar a decisão                                                                     | Backend/ACK/retry seguro; não exigir backend pronto para escolher tecnologia                                  |
| NUV-HR-08 | Decisão de privacy owner/payload/trigger/retention/response antes de NUV-20; auth HMAC e prazo/retries UNPROVEN. Configurar três URLs App Admin; ensaio real de cada callback e adjudicação de divergências antes de ativação operacional                                                                                                       | NUV-20 depende da decisão humana; NUV-24 depende da confirmação real pós-implementação. Sem fallback sem auth |

### Gate operacional e inventário

NUV-24 é evidência/coordenação humana, não implementação. Exige core completo, gates aplicáveis, release por HEAD autorizada antes de cada merge que pode auto-deployar, deploy/health verificados e inventários prévios separados: subscriptions API e URLs privacy App Admin. Configurações/ensaios/instalações externas exigem autorizações específicas. Sucesso verifica auth/parser/durable-before-ACK/recovery/observability por família aplicável e cada topic/config necessário; limpa **somente artefatos temporários próprios** e exige inventário final mostrando toda integração operacional necessária ativa/configurada. Rollback/desregistro é procedimento separado, só acionado deliberadamente; após rollback não declarar `ADAPTER OPERATIONAL`. Nenhuma mutação ocorre nesta execução.

## 20. Contracts provided to consumers

| Consumer  | Pode importar                                                                                                                                                                                                                                                                                                                                                                  | Não pode depender de                                                                                                                                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog` | `listProducts`, `getProduct`, `getVariant`, `listCategories`, `getCategory`, `Product`, `Variant`, `Category`, evento `product/updated`                                                                                                                                                                                                                                        | URL/header Nuvemshop, token, `next/cache`, semântica de série/SEO                                                                                                                                                                                                                                                       |
| `cart`    | `getVariant`/revalidação de preço-disponibilidade e recusa de handoff sem preço vendável; contrato de checkout somente após `NUV-HR-05`                                                                                                                                                                                                                                        | Draft Order presumido, checkout URL inventada, estoque do browser                                                                                                                                                                                                                                                       |
| `orders`  | `getOrder`, `listOrders` com `q`/paginação, `findOrderByNumber`, `Order.contactEmail`, zero/muitas remessas com histórico/eventos mínimos, tracking nullable/completude explícita, endereço mínimo por remessa e 0..N referências NF-e server-only para detalhe autenticado, eventos de pedido autenticados; `getCustomer` somente com `read_customers` adjudicado e concedido | Lista completa vinculada ao e-mail Supabase verificado, sessão/ownership/authorization do detalhe autenticado e disclosure, prova de posse do e-mail e projeção restrita em `/rastreio` sem endereço/invoice, limitação de tentativas, timeline, analytics `purchase`, idempotência de domínio sem persistência própria |

Todos os métodos são server-only, têm input/output tipados, paginação
normalizada, erro discriminável e validação de resposta externa. A superfície
é evoluída aditivamente; remover/renomear campos requer nova revisão da spec.

## 21. Success criteria para a implementação futura

1. Nenhum access token, client secret ou header `Authorization` aparece em
   client bundle, build arg, logs, Sentry ou resposta HTTP.
2. Cada request usa `2025-03`, host allowlisted, Bearer e `User-Agent` válido;
   versão não vem do browser.
3. Produtos, variantes, categorias e pedidos são validados por schemas de
   runtime antes de serem expostos aos consumers; Customer só é exposto com
   `read_customers` adjudicado e concedido. `Order.contactEmail` é server-only,
   validado e nunca autoriza vínculo sem e-mail verificado correspondente.
   `/rastreio` resolve o número exato com busca filtrada e completa dentro do
   orçamento ou projeção indexada, e só divulga status/linha do tempo de
   fulfillment e código de rastreio após comparar e comprovar posse do e-mail.
   `/conta/pedidos` não considera uma página ou busca truncada como lista
   completa; filtra `contactEmail` exato e exige cobertura completa ou índice
   reconciliado. O mínimo server-only de `/conta/pedidos/[id]` preserva itens,
   valores/pagamento, endereço mínimo de recipient/destination por fulfillment,
   timeline/tracking nullable e 0..N referências invoice/NF-e com associação à
   remessa quando fornecida, sem primeira remessa/nota implícita e com completude
   honesta. Zero fulfillments confirmado preserva endereço order-level provisório
   mínimo disponível com provenance explícita; ausência/null mantém Order válido,
   sem síntese. Destinos por fulfillment permanecem autoritativos por remessa;
   nenhuma propagação provisório→fulfillment nem inferência de completude.
   Sessão autenticada, vínculo/ownership e disclosure pertencem a
   `orders`/`identity`; prova de schema/mapper do adapter não prova autorização.
   `/rastreio` não recebe endereço, invoice, contactEmail, itens, valores ou
   pagamento. NUV-25 exige evidência efetiva do consumer para fechamento integral.
4. Listas tratam `page`, `per_page`, `Link` e `x-total-count` sem `listAll`
   implícito.
5. Input local inválido falha antes do fetch; 400/422 inesperados em read válido são ProtocolError seguro sem retry; 429, 5xx, timeout e schema têm erros estáveis; retry é bounded e
   não repete writes não idempotentes.
6. Webhook API válido calcula HMAC-SHA256 sobre bytes brutos e só então parseia;
   corpo alterado, assinatura ausente/malformada e loja errada são rejeitados.
7. Corpo excedente e JSON abusivo falham com custo limitado e sem persistir
   payload bruto por default.
8. A allowlist business/lifecycle permanece fechada; cada entrega autenticada
   aceita tem ledger/receipt local commitado antes de ACK. Business/lifecycle
   selecionados têm owners, trabalho recuperável, estado durável e reconciliação.
   Unknown autenticado não obrigatório só é elegível ao ignore com política
   explícita do owner e recebe `ignored_unknown_event`/2xx depois de receipt
   terminal mínimo durável commitado, sem efeitos externos nem recurso ou
   identidade de entrega do provider fictícios; não há promessa de exactly-once.
9. Callbacks de privacidade obrigatórios têm parser, autenticação, owner,
   retenção e resposta próprios, três URLs App Admin separadas de subscriptions, auth real confirmado por ensaio HR-08 antes da ativação operacional, sem fallback sem autenticação.
10. Duplicatas, concorrência e ordering arbitrário não duplicam efeitos de
    consumer nem descartam atualização legítima por hash permanente do body;
    pedido tem matriz de transições e caminho de reconciliação/quarentena.
11. Ack só ocorre depois de commit durável: business/lifecycle com trabalho
    recuperável, privacy conforme HR-08 e unknown autenticado elegível sob
    política do owner com receipt terminal `ignored_unknown_event`. Storage
    indisponível/falha no commit retorna 5xx, sem ACK, inclusive para unknown.
    Claim expirado, crash pós-ack, retry interno, replay e quarentena de trabalho
    processável permanecem recuperáveis e observáveis; unknown terminal exige
    receipt/classificação persistidos e recovery/auditabilidade do intake antes
    do ACK, sem trabalho de consumer nem efeitos externos.
12. Links de paginação são validados contra host, versão, loja e recurso antes
    do egress; redirects e destinos externos são rejeitados.
13. Product/Category preservam enums e mínimo explícito; preço regular/promo nullable e efetivo quando vendável, atributos/values/tags, ambas famílias de inventário e coexistência stock/levels têm semântica/fixtures com provenance; multi ilimitado só após prova GET HR-04.
14. 402 é distinto e alerta suspensão; lifecycle tem recibo/schema/estado/dispatch/runbook e evidência operacional; resumed exige probe/configuração e reconciliação dos consumers operacionais antes de retomá-los; futuros fazem sync inicial sem bloquear NUV-24, uninstall não equivale a redact.
15. O adapter não importa `next/cache`, não contém UI/domínio de catalog/cart/
    orders e mantém checkout explicitamente bloqueado até decisão.
16. Logs cumprem todos os 12 campos da seção 17 nos casos aplicáveis, com provas de recurso/evento/error_code sem PII. Sentry mantém tags event/status_class/operation sanitizadas de baixa cardinalidade, separadas do contrato de logs.
17. Unit, fixture/contract e mock HTTP cobrem os casos de segurança, limite,
    erro, retry, idempotência e redaction descritos nesta spec.
18. CI existente prova scans de segredos/bundle sem alteração de workflow; insuficiência exige BLOCKED_SPEC_SCOPE_EXPANSION. Smoke humano separado, auth real, subscriptions e privacy URLs verificadas, cleanup temporário/inventário final e rollback distinto antecedem marco operacional, sem execução na PR.

## 22. Riscos

| Risco                                         | Impacto                                 | Mitigação/owner                                                                  |
| --------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Versionamento/documentação muda               | requests ou schemas quebram             | Pin, changelog review e revalidação antes de implementação; owner integração     |
| Modo de múltiplos locais desconhecido         | disponibilidade/preço incorretos        | `NUV-HR-04`, fixtures por modo e reconciliação                                   |
| Checkout não suportado pelo caminho presumido | `cart` bloqueado                        | `NUV-HR-05`; não implementar Draft Order por inferência                          |
| Webhook perdido/manutenção/queue down         | catálogo/pedido defasado                | ack após durabilidade, retries, fallback temporal explicitamente não-SLA, alerta |
| Duplicata/out-of-order                        | compra duplicada ou regressão de estado | consumer idempotente por efeito e leitura canônica                               |
| Secret rotation desconhecida                  | perda de webhook ou aceitação indevida  | `NUV-HR-03`, runbook e teste de rotação                                          |
| PII em pedidos/logs                           | incidente LGPD                          | minimização, server-only, redaction e testes negativos                           |
| Rate limit exaurido por retry                 | indisponibilidade                       | budget por loja, headers, jitter e alertas                                       |

## 23. Open questions e classificação

| ID                        | Status/classificação           | Evidência/owner                                                                                                | Blocking scope                                                          |
| ------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| NUV-OPEN-CHECKOUT         | OPEN / BLOCKING CONSUMER       | Fluxo oficial/ensaio autorizado, HR-05                                                                         | cart/checkout                                                           |
| NUV-OPEN-INVENTORY-MODE   | OPEN / BLOCKING IMPLEMENTATION | Modo real/features + leitura multi ilimitada comprovada, HR-04                                                 | NUV-10 disponibilidade final, não reduzir fixtures                      |
| NUV-OPEN-SCOPES           | OPEN / BLOCKING IMPLEMENTATION | Requested/effective, modalidade/distribuição/SDK/instalabilidade/URLs e topics, HR-02                          | Uso real/instalação; divergence bloqueia sem expandir scope/arquitetura |
| NUV-OPEN-SECRET-ROTATION  | OPEN / BLOCKING IMPLEMENTATION | Mecanismo/coexistência/janela, HR-03 → reconciliação NUV-02/14 condicional                                     | HMAC produção                                                           |
| NUV-OPEN-DURABILITY       | OPEN / BLOCKING IMPLEMENTATION | Backend/retention/claim/recovery/runbook, HR-07                                                                | 16–24 ACK/recovery seguro                                               |
| NUV-OPEN-PRIVACY-WEBHOOKS | OPEN / BLOCKING IMPLEMENTATION | Decisão owner/payload/trigger/retention/response antes de NUV-20; auth/prazo/retries reais por ensaio24, HR-08 | Privacy e ativação operacional                                          |
| NUV-OPEN-RETURN-URL       | OPEN / NON-BLOCKING / DEFERRED | cart/product depois HR-05; PRD/conta/URL                                                                       | UX pós-compra, não core                                                 |

### Decisões fechadas documentalmente

`NUV-OPEN-TIMEOUT-DIVERGENCE`: **RESOLVED** para quatro business+lifecycle API selecionados (3 s/16 tentativas/48h); 10s de futuros FO topics e auth/SLA privacy não são incluídos. `NUV-OPEN-LIFECYCLE`: **RESOLVED** quanto à necessidade/desenho/owners 15/16/18/19/21/24, não deferred; payload/aplicabilidade da conta e registro continuam HR-02/06 OPEN. Category mínimo/content, Product visibility, nullability de preço, ambas famílias de inventário e cardinalidade fulfillments estão fechados por esta spec. Modo real, leitura multi ilimitada e todas as decisões account-specific continuam abertos.

## 24. Referências do repositório

- [`CAPABILITY-MAP.md`](./CAPABILITY-MAP.md)
- [`SPEC-foundation.md`](./SPEC-foundation.md)
- [`PRD.md`](../PRD.md)
- [`ADR-001`](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md)
- [`ADR-002`](../decisions/ADR-002-coolify-traefik-deploy.md)
- [`README.md`](../../README.md)
- [`src/lib/env`](../../src/lib/env/index.ts)
- [`src/lib/http`](../../src/lib/http/index.ts)
- [`src/lib/rate-limit.ts`](../../src/lib/rate-limit.ts)
- [Next.js instrumentation guide](https://nextjs.org/docs/app/guides/instrumentation)
- [Node `timingSafeEqual`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

## 25. Status e próximo passo humano

**SPEC REVISED / HUMAN RE-APPROVAL REQUIRED**. **PLAN RECONCILED / HUMAN REVIEW REQUIRED**. **IMPLEMENTATION NOT AUTHORIZED / NOT READY**.

Próximo gate: uma adjudicação humana conjunta desta revisão e do plano existente. HR-01–08 continuam OPEN. CI/reviews verdes não autorizam implementação, instalação, conta, secret, deploy ou merge. Após reaprovação, execução futura exige AUTH e gates aplicáveis; NUV-24 pode fechar adapter operacional, NUV-25 somente após evidência efetiva dos consumers fecha18/18. Nenhum código/teste real do capability é criado nesta convergência.
