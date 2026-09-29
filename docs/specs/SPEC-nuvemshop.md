# Spec: `nuvemshop`

| Campo               | Valor                                                               |
| ------------------- | ------------------------------------------------------------------- |
| Status              | **DRAFT / AWAITING HUMAN REVIEW**                                   |
| Capability          | `nuvemshop`                                                         |
| Tipo                | Adapter de integração server-only, sem UI                           |
| Base do repositório | `origin/main` em `399dbfa0ec22b457da9a4e61a0b1cb1a082303c6`         |
| Data da pesquisa    | 2026-09-28                                                          |
| Próximo gate        | Revisão e adjudicação humana; não iniciar implementação antes disso |

Este documento é uma especificação inicial. Ele separa contratos já fixados no
repositório, fatos externos verificados na documentação oficial e decisões de
design propostas. Uma decisão proposta não é uma garantia da Nuvemshop.

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

As URLs abaixo são documentação oficial Nuvemshop/Tiendanube ou documentação
oficial do repositório do provedor. Acesso e verificação: 2026-09-29 para os
contratos de Order/scopes, headers e app ID; 2026-09-28 para os demais.

| Fato/decisão       | Fonte oficial                                                                                                                                                                                                                                                                                                      | Valor verificado                                                                                                                                                                                                                     | Confiança                                    | Impacto                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Base e versão      | [Introduction](https://tiendanube.github.io/api-documentation/intro), [Versioning](https://tiendanube.github.io/api-documentation/versioning)                                                                                                                                                                      | API REST versionada por `YYYY-MM`; referência estável consultada: `2025-03`; base Nuvemshop `https://api.nuvemshop.com.br/2025-03/{store_id}` e equivalente Tiendanube                                                               | Alta                                         | Toda chamada deve usar a versão pinada; não usar `/v1` legado sem decisão explícita |
| OAuth e store id   | [Authentication](https://tiendanube.github.io/api-documentation/authentication)                                                                                                                                                                                                                                    | Authorization Code; URL de instalação usa `app_id` e troca de código usa `client_id`/segredo; código expira em 5 min; retorno traz `user_id`/ID da loja; conferir `state`; token não tem expiração fixa documentada                  | Alta                                         | Bootstrap humano separado do runtime; não criar OAuth UI no MVP                     |
| Autorização        | [Authentication / scopes](https://tiendanube.github.io/api-documentation/authentication#scopes)                                                                                                                                                                                                                    | Há permissões de leitura/escrita por recurso; escrita implica leitura; registro de webhook depende da permissão do recurso                                                                                                           | Alta                                         | Solicitar somente leituras necessárias; confirmar scopes no app real                |
| Headers            | [Introduction](https://tiendanube.github.io/api-documentation/intro)                                                                                                                                                                                                                                               | Requests store-scoped usam `Authorization: Bearer` e `User-Agent` com nome da app e URL ou e-mail de contato, sem `app_id` no header; `Content-Type: application/json; charset=utf-8` para JSON                                      | Alta                                         | Headers obrigatórios; token redacted em logs                                        |
| Paginação          | [Introduction / pagination](https://tiendanube.github.io/api-documentation/intro#pagination)                                                                                                                                                                                                                       | `page` começa em 1, `per_page` até 200, `x-total-count` e `Link`; produtos/pedidos documentam 30 como padrão                                                                                                                         | Alta                                         | Expor página normalizada; não carregar tudo implicitamente                          |
| Rate limit         | [Introduction / rate limiting](https://tiendanube.github.io/api-documentation/intro#rate-limiting)                                                                                                                                                                                                                 | Leaky bucket padrão 40, vazão 2/s, por loja/app; Next/Evolution multiplica por 10; headers `x-rate-limit-limit`, `x-rate-limit-remaining`, `x-rate-limit-reset` em ms                                                                | Alta                                         | Tratar 429 usando os headers disponíveis; não assumir `Retry-After`                 |
| Recursos           | [Product](https://tiendanube.github.io/api-documentation/resources/product), [Category](https://tiendanube.github.io/api-documentation/resources/category), [Customer](https://tiendanube.github.io/api-documentation/resources/customer), [Order](https://tiendanube.github.io/api-documentation/resources/order) | Existem list/get para produtos, variantes, categorias, clientes e pedidos; `order.id` é distinto de `number`; `Order.contact_email` é campo direto do pedido, enquanto o objeto `Order.customer` só é fornecido com `read_customers` | Alta                                         | E-mail de vínculo vem de Order; Customer é capability condicional                   |
| Produto/inventário | [Product](https://tiendanube.github.io/api-documentation/resources/product), [Product variant](https://tiendanube.github.io/api-documentation/resources/product-variant), [Multiple inventory](https://tiendanube.github.io/api-documentation/guides/multi-inventory/products)                                     | Produtos têm variantes; variante tem preço, SKU e estoque; a documentação descreve formatos distintos para estoque agregado e `inventory_levels`, conforme a configuração da loja                                                    | Alta para os formatos; modo da loja aberto   | Não fixar schema operacional sem confirmar o modo da loja                           |
| Webhooks           | [Webhook](https://tiendanube.github.io/api-documentation/resources/webhook)                                                                                                                                                                                                                                        | Registro via `/webhooks`; envelope comum contém `store_id`, `event` e `id`; não é snapshot; HMAC-SHA256 no header `x-linkedstore-hmac-sha256` sobre o corpo com segredo da app                                                       | Alta                                         | Ler corpo bruto, validar HMAC e só depois parsear                                   |
| Entrega de webhook | [Webhook / retry and ordering](https://tiendanube.github.io/api-documentation/resources/webhook#retry-policies)                                                                                                                                                                                                    | Responder 2xx em até 3 s; documentação descreve repetição por até 48 h e até 16 tentativas; ordem não é garantida e duplicatas são possíveis                                                                                         | Alta, com conflito de timeout anotado abaixo | Persistir trabalho antes do 2xx; não presumir exactly-once                          |
| Privacidade        | [Webhook / required webhooks](https://tiendanube.github.io/api-documentation/resources/webhook#required-webhooks)                                                                                                                                                                                                  | Apps que guardam dados podem ter de tratar `store/redact`, `customers/redact` e `customers/data_request`, com payloads próprios                                                                                                      | Alta                                         | Contrato separado e checkpoint antes da instalação                                  |
| Cart/checkout      | [Cart](https://tiendanube.github.io/api-documentation/resources/cart), [Checkout](https://tiendanube.github.io/api-documentation/resources/checkout), [Draft Order](https://tiendanube.github.io/api-documentation/resources/draft-order)                                                                          | Cart documenta consulta/remoção de carrinho existente; Draft Order mostra `checkout_url`; não foi comprovado que isso é o mecanismo do handoff normal da vitrine                                                                     | Alta                                         | Manter `NUV-OPEN-CHECKOUT`; não escolher Draft Order por inferência                 |

### Divergências e limites das fontes

- Algumas páginas atuais do DevHub mostram exemplos com `/v1`; a documentação de
  versionamento e os recursos versionados sustentam `2025-03`. A spec adota
  `2025-03` como referência e exige reconfirmação antes do código.
- A página geral de webhook menciona 3 segundos; páginas específicas de
  recursos mencionam 10 segundos. A implementação deve usar o limite mais
  estrito, 3 segundos, até que o owner confirme qual regra vale para os eventos
  desta app.
- A documentação descreve duplicatas, mas não fornece um ID universal de
  entrega nem uma garantia de timestamp/frescor para os quatro eventos. HMAC
  autentica integridade/origem do segredo; não impede replay por si só.
- A documentação oficial lista os headers de rate limit, mas não garante
  `Retry-After`. O cliente não deve depender desse header.

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
`src/app/api/webhooks/nuvemshop/customers-data-request/route.ts`. Eles usam um
verificador comum e são boundaries HTTP finos: não contêm regra de
catálogo/pedido e não chamam parsers ou handlers antes da autenticação.
Durante manutenção, a rota precisa ficar fora do bypass genérico que responde
503 sem persistir o webhook; essa integração com a regra de manutenção é um
gate de implementação, não uma alteração nesta spec.

## 9. Typed HTTP client

### Request contract

O cliente deve:

1. construir somente URLs do host fixo da API e do path versionado;
2. validar IDs e parâmetros antes de interpolá-los;
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

Os nomes abaixo são contratos conceituais a serem refinados no planning após
aprovação humana. Todos são server-only e retornam tipos normalizados; nenhum
consumer monta URL Nuvemshop ou lê o payload externo diretamente.

### Products e variants

```ts
listProducts(input: ListProductsInput): Promise<Page<Product>>
getProduct(input: { productId: ProductId }): Promise<Product>
getVariant(input: { productId: ProductId; variantId: VariantId }): Promise<Variant>
```

`Product` deve cobrir, no mínimo, ID interno, nome/handle localizável, descrição
quando disponível, visibilidade, imagens, categorias, variantes e timestamps
necessários ao `catalog`. `Variant` deve preservar os campos brutos necessários
para distinguir preço regular de `promotional_price`, além de um preço efetivo
explicitamente definido para a aplicação. Preços permanecem como decimal/string
sem ponto flutuante. A disponibilidade deve distinguir estoque finito,
`stock_management=false` (estoque ilimitado) e `inventory_levels`; o modo da
loja é `NUV-OPEN-INVENTORY-MODE` até confirmação.

O adapter não decide slug editorial, série, SEO, texto curatorial ou política
de produto indisponível. Preço e disponibilidade usados pelo `cart` devem ser
revalidados no servidor imediatamente antes do handoff.

### Categories

```ts
listCategories(input: ListCategoriesInput): Promise<Page<Category>>
getCategory(input: { categoryId: CategoryId }): Promise<Category>
```

`Category` expõe ID, nome localizável, handle quando existente, parent e
metadados necessários para o vínculo posterior da curadoria. Não contém a
política de séries do `content`.

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
```

O contrato usa o ID interno do pedido; o `number` amigável é somente um campo
de apresentação. `Order` deve conter os campos necessários para estado,
itens/variantes, valores, pagamento, fulfillment e tracking. Inclui
`Order.contactEmail`, normalizado do campo oficial `Order.contact_email`, para
que `orders`/`identity` compare o e-mail do pedido com um e-mail Supabase
verificado. Esse campo é PII e server-only: não entra em logs, analytics, cache
compartilhado ou tipo importável pelo cliente. Se o e-mail estiver ausente ou
inválido, o pedido não pode ser vinculado por essa regra. O contrato não exige
o objeto Customer completo nem `read_customers`. O adapter fornece o dado,
mas não decide o vínculo, a linha do tempo da conta, troca, `purchase`,
contador de vendas ou reembolso.

### Checkout/cart

O adapter fornece `getProduct`/`getVariant` para revalidação do carrinho. Não
define ainda `createCart`, `createCheckoutSession`, `createDraftOrder` ou
`checkoutUrl`: a documentação pública consultada não prova que Draft Order é o
handoff equivalente ao checkout normal da vitrine. Esses métodos permanecem
proibidos na implementação até fechar `NUV-OPEN-CHECKOUT`.

## 11. Webhooks

### Boundary HTTP

- Método: `POST` em `/api/webhooks/nuvemshop/events` para os quatro eventos de
  negócio.
- Callbacks de privacidade usam endpoints distintos, registrados
  explicitamente na app: `/api/webhooks/nuvemshop/store-redact`,
  `/api/webhooks/nuvemshop/customers-redact` e
  `/api/webhooks/nuvemshop/customers-data-request`. Não se escolhe o parser a
  partir de um body ambíguo.
- O handler obtém os bytes do corpo uma vez, antes de chamar qualquer parser.
- O corpo tem limite de tamanho configurado e fail-closed antes de parsear; a
  proposta inicial é 1 MiB, sujeita a validação com fixtures oficiais e revisão
  humana.
- O header de assinatura é `x-linkedstore-hmac-sha256`. Ausente, duplicado ou
  malformado é rejeitado.
- A assinatura é HMAC-SHA256 dos bytes brutos usando o segredo da app, não o
  access token e não o JSON reserializado.
- Todos os quatro endpoints, inclusive os callbacks de privacidade, passam por
  esse mesmo verificador HMAC antes do roteamento para o parser específico. Não
  há exceção de autenticação sem fonte oficial e adjudicação humana.
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
```

O envelope externo também pode conter campos necessários à reconciliação, mas
eles não são copiados indiscriminadamente ao tipo público. O `id` do provedor
é o ID do recurso; não deve ser tratado como delivery ID sem prova.

Além dos quatro eventos de negócio, um app que guarda dados deve tratar os
callbacks de privacidade documentados oficialmente: `store/redact`,
`customers/redact` e `customers/data_request`. Eles têm payloads e owners
diferentes do envelope de recurso e são roteados pelos endpoints próprios; não
caem no parser de `{event, id}`. Seu contrato de retenção, resposta e execução
fica em `NUV-OPEN-PRIVACY-WEBHOOKS` e bloqueia a instalação operacional até
`NUV-HR-08`.

Eventos não reconhecidos, depois de HMAC válido, não chamam handler nem API
externa. Eles geram `ignored_unknown_event` e 2xx somente se não forem um
callback obrigatório de privacidade; essa política deve ser validada com o
owner.

### Ack e falha

1. autenticar e validar dentro do limite do provedor;
2. registrar uma intenção de processamento ou enfileirar de modo durável;
3. responder 2xx somente após esse registro confiável;
4. processar efeitos fora da request, com limite de concorrência e alerta;
5. retornar 4xx para assinatura/envelope inválidos;
6. retornar 5xx quando o registro durável não estiver disponível, permitindo
   nova tentativa do provedor.

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
NuvemshopWebhookError        # assinatura/envelope/loja inválidos
```

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
- schemas de produto, variante, categoria, pedido e envelope; cliente somente se a
  capability opcional for habilitada;
- taxonomia para 401/402/403/404/429/5xx/timeout/schema inválido;
- limite de retry, jitter/bounded behavior e ausência de retry inseguro de write;
- HMAC válido, digest ausente/malformado, corpo alterado e comparação constante;
- parse somente depois da assinatura;
- body oversized, JSON malformado e objeto com campos abusivos;
- loja errada, evento desconhecido e evento fora da allowlist;
- endpoints e payloads distintos de `store/redact`, `customers/redact` e
  `customers/data_request`, todos autenticados pelo verificador HMAC comum;
- duplicatas concorrentes, reentrega após falha e eventos fora de ordem;
- ledger `received` → `claimed` → `processing` → `retryable`/`quarantined`,
  lease expirado e crash depois do ack;
- `Link` externo, redirect, host, versão, loja e recurso inválidos;
- preço promocional, estoque ilimitado, estoque agregado e `inventory_levels`;
- resposta 402 e interrupção simultânea de API/webhooks;
- manutenção ativa sem descarte de webhook e redaction no argumento enviado ao
  Sentry;
- redaction em logs/Sentry.

### Contract/fixture tests

Usar fixtures sintéticas ou oficiais anonimizadas, com provenance registrada no
teste. Nunca incluir token, client secret, PII real ou payload copiado de loja
real. Confirmar que os fixtures cobrem o modo de inventário escolhido antes do
merge da implementação.

### HTTP integration tests

Usar mock HTTP server para verificar request/response, rate limits, headers,
timeouts e retries. Não apontar o teste para a API real.

### Smoke real posterior

Uma chamada real à Nuvemshop exige checkpoint humano, credenciais de teste,
cleanup e evidência independente. Não faz parte desta execução nem deve entrar
na CI de pull request com segredo.

## 19. Human setup e checkpoints

O bootstrap humano deve seguir o Authorization Code oficial: owner inicia a
instalação, gera e guarda `state` de uso único, recebe o callback, confere
`state` e troca o código dentro dos 5 minutos, sem imprimir o código, token ou
secret. A evidência compartilhável é somente app/store ID, scopes aprovados,
versão, data e resultado redigido. A injeção no runtime ocorre pelo secret
manager/env autorizado; o procedimento também deve documentar revogação e
reinstalação. Não se cria UI OAuth nesta etapa, mas o runbook de bootstrap é
pré-requisito operacional.

| ID          | Decision/action                                                                                                                                                                | Why human                                            | Evidence                                                                          | Blocks                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `NUV-HR-01` | Confirmar que a loja/app single-store existem e identificar `store_id` sem expor token                                                                                         | Account-specific                                     | ID seguro e app autorizado                                                        | Implementação e smoke real                       |
| `NUV-HR-02` | Aprovar `2025-03`, modalidade da app e scopes efetivos: `read_products`, `read_orders` e apenas adicionais comprovados; confirmar permissão dos tópicos de webhook pretendidos | A documentação não conhece a configuração real       | Registro de scopes e tópicos autorizados, sem valores secretos                    | Implementação autenticada e registro de webhooks |
| `NUV-HR-03` | Confirmar app secret usado pelo HMAC, rotação e janela de coexistência                                                                                                         | Secret/account-specific                              | Procedimento documentado, sem valor do segredo                                    | Implementação de HMAC operacional                |
| `NUV-HR-04` | Confirmar se a loja está em inventário simples ou Multiple Locations                                                                                                           | O modo altera schema e disponibilidade               | Resposta/documentação da conta + fixture correspondente                           | Contrato final de disponibilidade                |
| `NUV-HR-05` | Adjudicar o handoff local cart → checkout hospedado                                                                                                                            | Cart/Draft Order não provam equivalência             | Fluxo oficial ou ensaio autorizado com cleanup                                    | Consumer `cart`                                  |
| `NUV-HR-06` | Registrar os quatro webhooks de negócio, endpoints e lifecycle                                                                                                                 | Registro muta app/loja                               | Lista de webhooks e eventos confirmada                                            | End-to-end de webhooks                           |
| `NUV-HR-07` | Definir durabilidade, retenção, fila e alerta                                                                                                                                  | É uma decisão operacional da Foundation/infra        | Runbook, owner e evidência de recuperação                                         | Ack/retry seguro                                 |
| `NUV-HR-08` | Definir callbacks de privacidade, owner, retenção e resposta                                                                                                                   | São callbacks obrigatórios para app que guarda dados | Contrato e ensaio de `store/redact`, `customers/redact`, `customers/data_request` | Instalação operacional                           |

## 20. Contracts provided to consumers

| Consumer  | Pode importar                                                                                                                                     | Não pode depender de                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `catalog` | `listProducts`, `getProduct`, `getVariant`, `listCategories`, `getCategory`, `Product`, `Variant`, `Category`, evento `product/updated`           | URL/header Nuvemshop, token, `next/cache`, semântica de série/SEO                                                                  |
| `cart`    | `getVariant`/revalidação de preço-disponibilidade; contrato de checkout somente após `NUV-HR-05`                                                  | Draft Order presumido, checkout URL inventada, estoque do browser                                                                  |
| `orders`  | `getOrder`, `listOrders`, `Order.contactEmail`, eventos de pedido autenticados; `getCustomer` somente com `read_customers` adjudicado e concedido | Decisão de vínculo ao e-mail Supabase verificado, timeline, analytics `purchase`, idempotência de domínio sem persistência própria |

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
4. Listas tratam `page`, `per_page`, `Link` e `x-total-count` sem `listAll`
   implícito.
5. 429, 5xx, timeout e falha de schema têm erros estáveis; retry é bounded e
   não repete writes não idempotentes.
6. Webhook válido calcula HMAC-SHA256 sobre bytes brutos e só então parseia;
   corpo alterado, assinatura ausente/malformada e loja errada são rejeitados.
7. Corpo excedente e JSON abusivo falham com custo limitado e sem persistir
   payload bruto por default.
8. Eventos autenticados são allowlisted, cada entrega tem ledger local e
   eventos desconhecidos não obrigatórios não provocam efeitos; não há promessa
   de exactly-once sem identidade de entrega do provedor.
9. Callbacks de privacidade obrigatórios têm parser, autenticação, owner,
   retenção e resposta próprios antes da instalação operacional.
10. Duplicatas, concorrência e ordering arbitrário não duplicam efeitos de
    consumer nem descartam atualização legítima por hash permanente do body;
    pedido tem matriz de transições e caminho de reconciliação/quarentena.
11. Ack só ocorre depois de registro durável; claim expirado, crash pós-ack,
    retry interno, replay e quarentena são recuperáveis e observáveis.
12. Links de paginação são validados contra host, versão, loja e recurso antes
    do egress; redirects e destinos externos são rejeitados.
13. Preço regular/promocional, estoque ilimitado, estoque agregado e níveis por
    local têm semântica e fixtures explícitos.
14. 402 é distinguido de auth/5xx e alerta a suspensão que também interrompe
    webhooks.
15. O adapter não importa `next/cache`, não contém UI/domínio de catalog/cart/
    orders e mantém checkout explicitamente bloqueado até decisão.
16. Logs têm correlation ID, evento, loja segura, latência/status/tentativa e
    resultado sem segredos/PII.
17. Unit, fixture/contract e mock HTTP cobrem os casos de segurança, limite,
    erro, retry, idempotência e redaction descritos nesta spec.
18. CI mantém o scan de segredos e bundle; smoke real separado exige checkpoint
    humano e não executa na PR.

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

| ID                            | Status | Classification          | Evidence to resolve                                                                                                                                                                              | Blocking scope                             | Owner/gate           |
| ----------------------------- | ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------- |
| `NUV-OPEN-CHECKOUT`           | OPEN   | BLOCKING CONSUMER       | Documentação/ensaio autorizado do fluxo cart → checkout                                                                                                                                          | `cart`                                     | Human `NUV-HR-05`    |
| `NUV-OPEN-INVENTORY-MODE`     | OPEN   | BLOCKING IMPLEMENTATION | Modo efetivo da loja e fixture                                                                                                                                                                   | disponibilidade de product/variant         | Human `NUV-HR-04`    |
| `NUV-OPEN-SCOPES`             | OPEN   | BLOCKING IMPLEMENTATION | Confirmar na app `read_products`, `read_orders`, permissão dos tópicos de webhook e somente scopes adicionais comprovados; `read_customers` não é requisito do vínculo por `Order.contact_email` | authenticated client/webhook registration  | Human `NUV-HR-02`    |
| `NUV-OPEN-SECRET-ROTATION`    | OPEN   | BLOCKING IMPLEMENTATION | Procedimento oficial de secret/HMAC rotation                                                                                                                                                     | production webhook auth                    | Human `NUV-HR-03`    |
| `NUV-OPEN-DURABILITY`         | OPEN   | BLOCKING IMPLEMENTATION | Escolha de store/fila, retenção, recovery e runbook                                                                                                                                              | ack/retry/idempotency                      | Human `NUV-HR-07`    |
| `NUV-OPEN-TIMEOUT-DIVERGENCE` | OPEN   | HUMAN CHECKPOINT        | Confirmar 3 s versus referências específicas de 10 s                                                                                                                                             | operational webhook SLA                    | Human `NUV-HR-06`    |
| `NUV-OPEN-PRIVACY-WEBHOOKS`   | OPEN   | BLOCKING IMPLEMENTATION | Confirmar payload, owner, retenção e execução dos callbacks obrigatórios                                                                                                                         | privacy callbacks e instalação operacional | Human `NUV-HR-08`    |
| `NUV-OPEN-LIFECYCLE`          | OPEN   | NON-BLOCKING / DEFERRED | Decidir uninstall/suspend events além dos callbacks obrigatórios                                                                                                                                 | lifecycle beyond MVP                       | Product/ops later    |
| `NUV-OPEN-RETURN-URL`         | OPEN   | NON-BLOCKING / DEFERRED | PRD/conta confirmation URL decision                                                                                                                                                              | `cart` post-purchase UX                    | `cart`/product later |

Nenhuma dessas perguntas deve ser resolvida por assumir comportamento da conta
real. Questões abertas não mudam o status da spec para APPROVED ou READY FOR
IMPLEMENTATION.

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

**DRAFT / AWAITING HUMAN REVIEW**.

O próximo passo é revisar e adjudicar este documento, em especial
`NUV-OPEN-CHECKOUT`, `NUV-OPEN-INVENTORY-MODE`, scopes, durabilidade e rotação
de segredo. Só após uma decisão humana explícita a spec pode alimentar
`planning-and-task-breakdown`. Não criar tasks de implementação nem código do
capability nesta execução.
