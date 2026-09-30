# Breakdown executável: `nuvemshop`

Plano: [plan.md](./plan.md) · Spec: [SPEC-nuvemshop.md](../../docs/specs/SPEC-nuvemshop.md) · Baseline: `5b9acec069b31e0b7acde00252b8cdc849bc867f`.

**Estado: MATERIALIZED / AWAITING HUMAN REVIEW; IMPLEMENTATION NOT AUTHORIZED.** Nenhuma caixa abaixo representa trabalho iniciado. `AUTH` significa futura autorização humana de execução. `HR-XX` abrevia `NUV-HR-XX`, todos abertos. `READY_AFTER_AUTH_AND_HR_01` e `READY_AFTER_AUTH_AND_HR_01_AND_DEPENDENCIES` são condições futuras: nenhuma task técnica começa sem AUTH **e** HR-01 CLOSED, mesmo com fixtures locais. `BLOCKED_BY_NUV_HR_XX` indica gate adicional que não é dispensado por AUTH/HR-01. `HUMAN_ONLY` nunca é automatizado.

## Definition of Ready e Done comum

Cada task técnica só se torna `READY` após AUTH, HR-01 CLOSED, dependências mergeadas, demais gates específicos aplicáveis fechados, fatos externos reconfirmados quando usados e fixture com provenance; o status indicado é a condição **futura**, não o estado atual. Enquanto HR-01 estiver OPEN, implementação e testes locais de NUV-01–23 permanecem NOT READY. Cada PR contém apenas seu boundary, começa por RED, faz GREEN mínimo e REFACTOR sem mudar comportamento. Aceite comum por task: focused tests PASS, `npm run check` PASS, CI `ci` PASS, diff sem segredos/PII reais, revisão adversarial P0/P1/P2 material = 0. Se novo pacote for necessário: `DEPENDENCY_DECISION_REQUIRED`, **Perguntar antes**, sem instalação automática. Comandos de testes abaixo usam paths **futuros** sob `tests/unit/**`, o glob real de `vitest.config.mts`; são comandos para depois da criação desses testes, não comandos executáveis nesta PR documental. `npm run build` é gate de PR; E2E, Gitleaks, scan de bundle e Docker pertencem à CI atual.

Cada task sugere branch `codex/nuv-XX-<slug>` e commit `feat(nuvemshop): <intent>`, exceto tasks de teste/docs (`test`/`docs`). Uma task técnica = uma PR para `main`, revisão de código e segurança quando tocar boundary externo, CI `ci` obrigatória. **Gate comum de merge:** `.github/workflows/deploy.yml` dispara deploy após CI de push em `main` bem-sucedida; antes do primeiro merge de implementação e de cada merge posterior, exigir adjudicação humana explícita de release do candidato, com impacto runtime/configuração, segurança, rollback e HR operacionais aplicáveis verificados. Identificar o humano responsável autorizado pela release e exigir que ele registre aprovação explícita em comentário na própria PR, vinculada ao HEAD revisado e a essa evidência; mudança de HEAD exige nova aprovação antes do merge. Para candidato cujo deploy ative leituras Nuvemshop, anexar antes do merge evidência de uma instância/processo compatível com o limiter local ou coordenação de budget compartilhado adjudicada e testada; múltiplos processos sem isso mantêm merge/deploy bloqueados, sem esperar NUV-24. AUTH + HR-01 CLOSED e CI verde não autorizam esse merge/deploy. Responsável não identificado ou registro ausente mantém `BLOCKED_FOR_HUMAN_ADJUDICATION`; não postergar esse gate para NUV-24, presumir desativação do capability ou dispensar qualquer HR. Workflows permanecem READ-ONLY; mudança Foundation/CI/deploy exige autorização e escopo próprios, revisão Foundation/CI e PR separada. Tasks paralelas não editam arquivo compartilhado sem coordenação; nenhuma PR de implementação é aberta nesta execução. Testes usam fixtures sintéticas ou oficiais anonimizadas, com fonte/data no teste; nunca copiam payload de loja real para commit.

## Wave 0 — contratos locais

### NUV-01 · Superfície server-only do módulo

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · S. **Racional:** estabelecer direção de dependência antes dos consumidores.
- **Dependências/gates:** AUTH + HR-01 CLOSED. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/index.ts`, `server/index.ts`, `types.ts` e `tests/unit/modules/nuvemshop/boundary.test.ts`; exportar apenas contratos server-side.
- **RED:** teste de import cliente, ausência de `server-only` e exports indesejados falha. **GREEN:** entrypoint bloqueia client import e expõe tipos/contratos mínimos. **REFACTOR:** reduzir exports sem alterar API.
- **Aceite:** [ ] nenhuma API de checkout/Customer default; [ ] nenhum `next/cache`, UI, estado ou domínio `orders`; [ ] tipos não carregam PII para client bundle.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/boundary.test.ts`; `npm run check`; `npm run build`. **Segurança/privacidade:** scan de imports e bundle, sem token ou PII. **Fora:** consumer, HTTP e checkout.
- **PR/evidência:** branch `codex/nuv-01-boundary`; commit `feat(nuvemshop): define server-only surface`; PR só de boundary; diff, teste negativo e CI verde.

### NUV-02 · Configuração runtime e secrets

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** impedir segredo em build/browser e falhar com configuração inválida.
- **Dependências/gates:** AUTH + HR-01 CLOSED; HR-02 adicional para uso autenticado real, HR-03 para HMAC operacional. **Escopo/arquivos prováveis:** `.env.example`, `src/lib/env/index.ts`/`runtime.ts` ou config local, `tests/unit/lib/env/index.test.ts`; classificação `STORE_ID` required, `ACCESS_TOKEN`/`CLIENT_SECRET` secrets, `APP_ID` tooling, versão interna.
- **RED:** missing/invalid values e divergência env example/schema falham; build sem Nuvemshop secret continua possível. **GREEN:** validação server-only em runtime operacional com fail-fast e nenhuma exigência de secret real no build/PR. **REFACTOR:** separar bootstrap e uso por operação.
- **Aceite:** [ ] config inválida falha antes de request/ACK; [ ] nenhuma variável `NEXT_PUBLIC_NUVEMSHOP_*`; [ ] runtime production não aceita sentinel como segredo; [ ] `NUVEMSHOP_APP_ID` não vira obrigatório.
- **Validação:** `npm run test -- tests/unit/lib/env/index.test.ts`; `npm run check`; `npm run build`. **Segurança/privacidade:** sentinelas sintéticas e scan de bundle/logs. **Fora:** OAuth UI, secret real, Coolify.
- **PR/evidência:** `codex/nuv-02-runtime-config`; `feat(nuvemshop): validate runtime config`; PR env isolada, testes de falha e CI.

### NUV-03 · Erros estáveis e redaction

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · S. **Racional:** consumers não dependem de strings do provedor.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-01. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/errors.ts`, `tests/unit/modules/nuvemshop/errors.test.ts`; taxonomia completa da seção 14 da spec, inclusive 402 e lookup incompleto.
- **RED:** status/erro e serialização contendo token, body ou `contactEmail` falham. **GREEN:** classes/códigos estáveis e metadados seguros; Problem Details em route boundary futuro. **REFACTOR:** centralizar redactor.
- **Aceite:** [ ] 401/402/403/404/429/5xx/network/protocol/lookup são distintos; [ ] correlation ID seguro; [ ] erro público não tem stack/PII.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/errors.test.ts`; `npm run check`. **Segurança/privacidade:** tokens, URL query, assinatura e e-mail nunca em erro/log. **Fora:** transporte e Sentry.
- **PR/evidência:** `codex/nuv-03-errors`; `feat(nuvemshop): define safe error taxonomy`; PR de erro, casos negativos e CI.

### NUV-07 · Schemas runtime e tipos normalizados

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** nenhum payload externo entra diretamente no contrato interno.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-01. HR-04 bloqueia apenas disponibilidade final; HR-02 bloqueia uso real. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/schemas/{product,category,order}.ts`, `types.ts`, `tests/unit/modules/nuvemshop/schemas.test.ts` e fixtures sintéticas.
- **RED:** envelopes/campos malformados e campo Customer sem scope falham. **GREEN:** validar tipos requeridos, ignorar campos externos extras e normalizar Product/Variant/Category/Order, mantendo `contactEmail` server-only. **REFACTOR:** compartilhar parsers sem expor raw.
- **Aceite:** [ ] malformed falha como ProtocolError; [ ] preço decimal/string; [ ] Customer não é exportado por default; [ ] provenance de fixtures documentada.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/schemas.test.ts`; `npm run check`. **Segurança/privacidade:** PII minimizada, fixture sem dados reais. **Fora:** disponibilidade final e consumer `orders`.
- **PR/evidência:** `codex/nuv-07-schemas`; `feat(nuvemshop): validate resource schemas`; PR schemas, fixtures e CI.

### NUV-14 · Verificador HMAC de bytes brutos

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** autenticar antes de interpretar qualquer webhook.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-01/02/03; HR-03 bloqueia produção, testes sintéticos não. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/webhook-auth.ts`, `tests/unit/modules/nuvemshop/webhook-auth.test.ts`; limite provisório 1 MiB validado antes do uso real.
- **RED:** fixture oficial-documentada hex, assinatura alterada, Base64, header ausente/duplicado, corpo reserializado e tamanho excedido falham. **GREEN:** ler bytes uma vez, 64 hex estrito, HMAC-SHA256 com app secret, comparar 32 bytes com tempo constante antes de parse. **REFACTOR:** isolar leitor bounded e verificador.
- **Aceite:** [ ] ausência/forma ruim falham fechado; [ ] loja errada é rejeitada pelo parser autenticado NUV-15; [ ] JSON não é parseado antes de HMAC; [ ] segredo e payload não entram no erro; [ ] entrega real fica para gate posterior.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/webhook-auth.test.ts`; `npm run check`. **Segurança/privacidade:** header/payload não logados. **Fora:** rota, registro, rotação presumida.
- **PR/evidência:** `codex/nuv-14-hmac`; `feat(nuvemshop): verify raw webhook HMAC`; revisão segurança obrigatória, fixture e CI.

## Wave 1 — transporte

### NUV-04 · Transporte HTTP versionado e egress fixo

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** centralizar autenticação e impedir URL arbitrária.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-01/02/03; HR-02 adicional antes de API real. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/{client,request}.ts`, `tests/unit/modules/nuvemshop/request.test.ts`.
- **RED:** mock fetch reprova host/versão/header incorretos, ID hostil, redirect e timeout/abort sem efeito. **GREEN:** HTTPS oficial + `2025-03` + store validado, `Authorization: Bearer`, `User-Agent`, Accept, `Content-Type` só com body, redirect manual/rejeitado, `AbortSignal`. **REFACTOR:** request builder privado.
- **Aceite:** [ ] nenhum URL/versão de consumer; [ ] IDs validados antes de interpolar; [ ] response/status/JSON inválido vira erro seguro.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/request.test.ts`; `npm run check`. **Segurança/privacidade:** zero egress a host externo e redaction de Authorization. **Fora:** OAuth e chamadas reais em PR.
- **PR/evidência:** `codex/nuv-04-transport`; `feat(nuvemshop): add fixed API transport`; revisão segurança, mock request e CI.

### NUV-05 · Rate budget e retry bounded

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** 429/5xx não podem causar tempestade nem repetir write.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/request.ts`, `rate-budget.ts`, `tests/unit/modules/nuvemshop/retry.test.ts`; não usar `src/lib/rate-limit.ts` como garantia distribuída.
- **RED:** leituras rápidas sustentadas que respeitam concorrência ≤2 mas excedem a taxa por loja/app falham; chamadas de chaves distintas da mesma loja/app sem orçamento de admissão comum, retries não debitados, headers limit/remaining/reset ausentes ou inválidos liberando quota ilimitada, remaining zero com nova chamada imediata, reset em unidade errada/maior que o budget, 429 sem `Retry-After`, 5xx/network/timeout, budget esgotado, POST e leituras concorrentes idênticas sem coalescing falham. **GREEN:** GET/HEAD até 2 tentativas, 4 s/tentativa, jitter ≤500 ms e total ≤9 s incluindo admissão/pacing; concorrência local ≤2/loja/app **mais** rate budget compartilhado por loja/app dentro do processo, debitando cada tentativa antes de enviar. Contabilidade e pacing usam `x-rate-limit-limit`, `x-rate-limit-remaining` e `x-rate-limit-reset` validados (reset é duração em ms); reconciliar respostas concorrentes sem criar saldo indevido. Pacing interno inicial sem burst ≤2 requests/s/loja/app, subordinado ao orçamento confiável mais restritivo; headers ausentes/inconsistentes não removem o teto conservador, e saldo esgotado não é reaberto sem espera confiável. Esperar somente dentro do budget/AbortSignal ou retornar erro tipado sem nova chamada; não presumir `Retry-After`. Leituras simultâneas da mesma chave de revalidação compartilham request sem perder atualização posterior; write sem retry automático. **REFACTOR:** injetar clock/random e isolar chave segura e contabilidade para teste determinístico.
- **Aceite:** [ ] pacing/contabilidade limitam leituras sustentadas por loja/app independentemente da concorrência; [ ] todas as tentativas/chaves daquela loja/app compartilham o orçamento, e respostas concorrentes não criam saldo indevido; [ ] headers limit/remaining/reset validados e quota ausente/inválida nunca liberam taxa ilimitada; [ ] espera de admissão/reset/backoff somente dentro do budget total; [ ] 402 não é retry; [ ] tentativas e correlation ID observáveis; [ ] coalescing reduz chamadas idênticas concorrentes; [ ] antes de qualquer deploy que ative leituras Nuvemshop, comprovar topologia de uma instância/processo compatível com o limiter local ou adjudicar e testar coordenação de budget compartilhado entre processos; [ ] múltiplas instâncias/processos sem coordenação aprovada e testada mantêm DEPLOY BLOCKED; [ ] NUV-24 apenas consolida/audita essa evidência já obtida, sem ser o primeiro momento da verificação.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/retry.test.ts`; `npm run check`. **Segurança/privacidade:** logs de tentativas sem URL query/PII. **Fora:** fila durável, escrita de pedido.
- **PR/evidência:** `codex/nuv-05-retry`; `feat(nuvemshop): bound read retries`; revisão integração, relógio fake e CI. Anexar a prova de topologia ou coordenação ao gate comum de release antes do merge que possa ativar leituras via deploy automático. Se coordenação compartilhada for necessária, `DEPENDENCY_DECISION_REQUIRED` + adjudicação humana antes de escolher infraestrutura; nenhum serviço distribuído é presumido.

### NUV-06 · Paginação segura

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** lista explícita e `Link` não controlam egress.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/pagination.ts`, `tests/unit/modules/nuvemshop/pagination.test.ts`.
- **RED:** `Link` externo, http, userinfo, versão/store/recurso/filtro trocados e `per_page` >200 falham sem fetch. **GREEN:** `Page<T>` explícito, `page≥1`, `perPage≤200`, `x-total-count` validado e próximo/anterior só de URL allowlisted. **REFACTOR:** parser único, sem `listAll` default.
- **Aceite:** [ ] links malformados viram ProtocolError; [ ] nenhuma página implícita infinita; [ ] URL de payload não é seguida.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/pagination.test.ts`; `npm run check`. **Segurança/privacidade:** prova de zero egress externo. **Fora:** busca de pedidos específica.
- **PR/evidência:** `codex/nuv-06-pagination`; `feat(nuvemshop): validate pagination links`; revisão segurança, fixtures hostis e CI.

## Wave 2 — recursos de leitura

### NUV-08 · Product e Variant, exceto disponibilidade final

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** fornecer fonte tipada para `catalog`/`cart` sem presumir modo de estoque.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04/05/06/07; HR-04 antes da disponibilidade final em NUV-10. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/products.ts`, `tests/unit/modules/nuvemshop/products.test.ts`.
- **RED:** list/get/variant, preço promocional, decimal e visibilidade falham. **GREEN:** chamadas de leitura com schemas e `Page<Product>`; preço regular/promocional e efetivo explicitados sem float. **REFACTOR:** mapper pequeno.
- **Aceite:** [ ] Product/Variant normalizados; [ ] nenhuma regra editorial/SEO; [ ] disponibilidade desconhecida permanece bloqueada sem modo confirmado.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/products.test.ts`; `npm run check`. **Segurança/privacidade:** entradas/IDs validados, sem raw externo. **Fora:** PDP, cache, disponibilidade final.
- **PR/evidência:** `codex/nuv-08-products`; `feat(nuvemshop): read typed products`; PR de leitura, fixtures e CI.

### NUV-09 · Category read

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · S. **Racional:** contrato de categoria independente do editorial.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04/05/06/07. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/categories.ts`, `tests/unit/modules/nuvemshop/categories.test.ts`.
- **RED:** list/get com parent, handle ausente e schema inválido falham. **GREEN:** `Page<Category>` e `getCategory` normalizados. **REFACTOR:** reutilizar paginação.
- **Aceite:** [ ] ID/nome/handle/parent tipados; [ ] sem séries, curadoria ou cache; [ ] erro de schema estável.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/categories.test.ts`; `npm run check`. **Segurança/privacidade:** ID validado, resposta externa isolada. **Fora:** mapeamento editorial.
- **PR/evidência:** `codex/nuv-09-categories`; `feat(nuvemshop): read typed categories`; PR de categoria, fixtures e CI.

### NUV-10 · Disponibilidade por modo de inventário

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_04 · S. **Racional:** disponibilidade errada afeta venda.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-08, **HR-04** e `NUV-OPEN-INVENTORY-MODE` fechado. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/products.ts`, `schemas/product.ts`, `tests/unit/modules/nuvemshop/inventory.test.ts`.
- **RED:** fixtures do modo real para estoque finito, `stock_management=false`, agregado e `inventory_levels` falham; modo desconhecido falha fechado. **GREEN:** normalização da disponibilidade de acordo com a configuração provada. **REFACTOR:** tabela de casos explícita.
- **Aceite:** [ ] modo e fixture com provenance; [ ] nenhuma inferência por payload incompleto; [ ] revalidação futura do `cart` é responsabilidade do consumer.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/inventory.test.ts`; `npm run check`. **Segurança/privacidade:** sem fixture de loja real em commit. **Fora:** mudança de configuração de estoque.
- **PR/evidência:** `codex/nuv-10-inventory`; `feat(nuvemshop): normalize confirmed inventory mode`; PR somente após gate, evidência HR-04 e CI.

### NUV-11 · Order get/list e `contactEmail`

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** fornecer dados de pedido sem vínculo de identidade.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04/05/06/07; HR-02 para uso real. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/orders.ts`, `schemas/order.ts`, `tests/unit/modules/nuvemshop/orders.test.ts`.
- **RED:** ID ≠ number, paginação, `contact_email` ausente/inválido e PII em logs falham. **GREEN:** `getOrder`/`listOrders` tipados, `contactEmail` validado server-only, paginação finita. **REFACTOR:** mapper minimizado.
- **Aceite:** [ ] Order normalizado; [ ] e-mail inválido não autoriza vínculo; [ ] nenhum objeto Customer requerido.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts`; `npm run check`. **Segurança/privacidade:** sem e-mail em log/cache público. **Fora:** account, timeline, tracking disclosure, purchase.
- **PR/evidência:** `codex/nuv-11-orders`; `feat(nuvemshop): read normalized orders`; revisão PII, fixtures e CI.

### NUV-12 · Busca exata por número

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** `q` pode encontrar nome/e-mail e truncar.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-06/11. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/orders.ts`, `tests/unit/modules/nuvemshop/order-lookup.test.ts`.
- **RED:** falsos matches, normalização decimal insegura, páginas seguintes, ambiguidade e budget esgotado falham. **GREEN:** `findOrderByNumber` usa `q` server-side, percorre páginas dentro de orçamento, compara `Order.number` canônico; `null` só após busca completa, senão LookupIncompleteError. **REFACTOR:** helper decimal sem coerção.
- **Aceite:** [ ] nenhum match aproximado; [ ] incompleto ≠ ausente; [ ] consumer `orders` recebe erro para exigir índice se necessário.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/order-lookup.test.ts`; `npm run check`. **Segurança/privacidade:** `q` e dados de Order não logados. **Fora:** `/rastreio`, índice de domínio.
- **PR/evidência:** `codex/nuv-12-order-number`; `feat(nuvemshop): find exact order number`; PR de lookup, mock multi-page e CI.

### NUV-13 · Contrato de busca de pedidos por e-mail

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · M. **Racional:** `q` é descoberta de candidatos, não prova de cobertura nem identidade.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-06/11. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/orders.ts`, `tests/unit/modules/nuvemshop/order-email-search.test.ts`.
- **RED:** página intermediária sem match, `q` falso positivo, truncamento, e-mail não verificado e contato divergente falham no contrato. **GREEN:** API server-only aceita filtro fornecido pelo caller confiável, expõe páginas/candidatos com `contactEmail` e estado de incompletude, e fornece comparação exata testável sem declarar cobertura que a API não comprova; `orders` percorre todas as páginas, filtra pelo e-mail verificado de `identity` e decide projeção durável. **REFACTOR:** não repetir pager.
- **Aceite:** [ ] nenhuma página truncada é marcada final pelo adapter; [ ] `q` não é prova de identidade/cobertura; [ ] contrato de handoff e testes esperados de `orders` documentados.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/order-email-search.test.ts`; `npm run check`. **Segurança/privacidade:** e-mail em `q`/logs/erro redigido. **Fora:** identidade, OTP, página `/conta/pedidos`.
- **PR/evidência:** `codex/nuv-13-order-email`; `feat(nuvemshop): report complete order search`; revisão PII, casos negativos e CI.

## Wave 3 — eventos e durabilidade

### NUV-15 · Schemas de evento de negócio

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01 · S. **Racional:** separar eventos de recurso dos callbacks de privacidade.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-07/14; HR-02 antes de tópicos reais. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/schemas/webhook.ts`, `tests/unit/modules/nuvemshop/webhook-schema.test.ts`.
- **RED:** quatro eventos, loja errada, ID de recurso inválido, unknown event e privacy body no parser de negócio falham; classificar unknown como elegível a ACK sem decisão do owner falha. **GREEN:** união discriminada de quatro eventos autenticados; unknown só é elegível à política `ignored_unknown_event`/2xx sem efeito após HMAC quando não for callback obrigatório de privacidade **e** o owner tiver validado e registrado essa política. Sem validação do owner, a política de ACK para unknown permanece bloqueada. **REFACTOR:** allowlist fechada.
- **Aceite:** [ ] `id` tratado como recurso, nunca delivery ID; [ ] decisão do owner registrada antes de habilitar ACK 2xx para unknown; [ ] não buscar API por URL do body; [ ] sem raw fields públicos.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/webhook-schema.test.ts`; `npm run check`. **Segurança/privacidade:** store assinado coincide com config. **Fora:** dispatcher e privacy parser.
- **PR/evidência:** `codex/nuv-15-event-schema`; `feat(nuvemshop): type verified business events`; revisão segurança, fixtures e CI.

### NUV-16 · Ledger durável de intake

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_07 · M. **Racional:** 2xx antes de persistência perde eventos.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-15, **HR-07**. **Escopo/arquivos prováveis:** interface em `src/modules/nuvemshop/server/durability/**` e backend/schema/migration **TBD somente após HR-07**; `tests/unit/modules/nuvemshop/durability-intake.test.ts`.
- **RED:** persistência falha → sem ACK; entrega de negócio aceita → recibo `received` com ID local e trabalho mínimo verificado (evento, loja, recurso e correlação) persistidos atomicamente; após perda do processo, o trabalho ainda pode ser recuperado; duplicata ganha rastreio sem hash permanente. **GREEN:** implementar backend adjudicado, retenção e transação/commit verificáveis do recibo e da intenção normalizada; callbacks de privacidade mantêm seu contrato mínimo próprio sob HR-08. **REFACTOR:** isolar adapter de backend.
- **Aceite:** [ ] 2xx somente após commit atômico do recibo e trabalho recuperável; [ ] falha de store permite 5xx/retry provedor; [ ] payload bruto não persistido por default; [ ] teste usa backend selecionado.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/durability-intake.test.ts`; `npm run check`. **Segurança/privacidade:** retenção/PII/segredo conforme HR-07. **Fora:** escolha automática Supabase/Redis/Postgres ou fila.
- **PR/evidência:** `codex/nuv-16-ledger`; `feat(nuvemshop): persist webhook receipt`; revisão arquitetura/security, HR-07 anexado e CI. **DEPENDENCY_DECISION_REQUIRED; Perguntar antes** se pacote.

### NUV-17 · Claim, lease e recuperação

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_07 · M. **Racional:** registro durável sem worker recuperável não prova processamento.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-16, HR-07. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/durability/**` e `tests/unit/modules/nuvemshop/durability-worker.test.ts`; caminho real depende do backend escolhido.
- **RED:** dois workers, lease expirado, crash pós-ACK com reclaim e despacho do trabalho normalizado persistido, retry limitado, replay e quarentena falham. **GREEN:** claim atômico, `claimed/processing/succeeded/retryable/quarantined`, reclaim e recovery observáveis. **REFACTOR:** reduzir transições duplicadas.
- **Aceite:** [ ] sem claim duplo ativo; [ ] falha não some; [ ] operador pode reconciliar/quarentenar; [ ] retenção supera janela aprovada.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/durability-worker.test.ts`; `npm run check`. **Segurança/privacidade:** acesso mínimo à fila e logs sem payload. **Fora:** consumer effect/analytics.
- **PR/evidência:** `codex/nuv-17-recovery`; `feat(nuvemshop): recover durable webhook work`; revisão concorrência/ops, crash test e CI.

### NUV-18 · Dispatcher e sinais reconciliáveis

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_07 · M. **Racional:** sinais devem chegar a consumers sem assumir ordem ou exactly-once.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-15/17; HR-07. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/dispatcher.ts`, `tests/unit/modules/nuvemshop/dispatcher.test.ts`.
- **RED:** duplicate concorrente, atualização posterior idêntica de produto, pedido fora de ordem e falha do handler falham. **GREEN:** registry de handlers verificados, coalescing só de trabalho concorrente com geração pendente; pedido sinaliza reconciliação canônica/quarentena. **REFACTOR:** separar entrega e efeito de consumer.
- **Aceite:** [ ] nenhuma atualização legítima perdida por hash permanente; [ ] nenhuma transição presumida do webhook; [ ] consumer `orders` possui matriz/idempotência de efeitos futura.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/dispatcher.test.ts`; `npm run check`. **Segurança/privacidade:** handler recebe apenas evento mínimo, sem body. **Fora:** `revalidateTag`, purchase, domínio pedido.
- **PR/evidência:** `codex/nuv-18-dispatch`; `feat(nuvemshop): dispatch verified signals`; revisão concorrência, replay test e CI.

## Wave 4 — rotas, privacidade e operação

### NUV-19 · Route Handler de negócios e manutenção

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_07 · M. **Racional:** endpoint público precisa autenticar, persistir e sobreviver a manutenção.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-14/15/16; HR-07, HR-03 apenas para uso operacional. **Escopo/arquivos prováveis:** `src/app/api/webhooks/nuvemshop/events/route.ts`, `src/lib/proxy/rules.ts`, `src/proxy.ts`, `tests/unit/app/api/webhooks/nuvemshop/events.test.ts` e proxy tests.
- **RED:** business events bloqueados pelo 503 genérico de manutenção, callback de privacidade permitido sem HMAC, endpoint Nuvemshop não allowlisted ou rota comum indevidamente liberados falham; assinatura/body/schema inválidos 4xx, JSON assinado profundamente aninhado ou com objetos abusivos, storage down 5xx sem ACK, ACK antes de commit, unknown sem validação do owner ou callback de privacidade indevidamente roteado recebendo 2xx também falham com custo limitado. **GREEN:** POST fino, bytes brutos → HMAC → parse bounded → schema/store validation → ledger → 2xx somente para evento permitido; unknown só recebe `ignored_unknown_event`/2xx após decisão registrada do owner e exclusão dos callbacks obrigatórios, sem efeito externo; sem essa decisão, não habilitar o ACK de unknown. Estabelecer allowlist exata e fail-closed de manutenção somente para `/api/webhooks/nuvemshop/events`, `/api/webhooks/nuvemshop/store-redact`, `/api/webhooks/nuvemshop/customers-redact` e `/api/webhooks/nuvemshop/customers-data-request`; não liberar `/api/webhooks/**` ou `/api/webhooks/nuvemshop/**` por prefixo. A exceção encaminha ao intake com a mesma segurança e durabilidade, sem chamada lenta antes do ACK; demais rotas não allowlisted continuam 503, preservada a exceção Foundation de health. Fixar limites de body/estrutura com fixtures e teste de custo antes do merge. NUV-20 prova os handlers dos três callbacks sob HR-08; esta task estabelece o boundary comum. **REFACTOR:** compartilhar error response via `problem()` e boundary de manutenção sem ampliar a allowlist.
- **Aceite:** [ ] health permanece 200 em manutenção conforme Foundation; [ ] os quatro endpoints Nuvemshop aprovados permanecem alcançáveis durante manutenção; [ ] demais rotas não-webhook/não allowlisted continuam 503, sem liberar endpoint futuro; [ ] manutenção não reduz HMAC, bytes brutos, validação de schema/store, body size/limites estruturais de JSON, durable-before-ACK, semântica de privacidade ou redaction; [ ] business events têm comportamento normal + manutenção testado; [ ] quatro eventos permitidos; [ ] unknown recebe `ignored_unknown_event`/2xx só após validação registrada do owner e nunca para callback obrigatório de privacidade; [ ] corpo válido porém abusivo é rejeitado sem persistência e dentro do budget; [ ] tempo de ACK medido contra 3 s.
- **Validação:** `npm run test -- tests/unit/app/api/webhooks/nuvemshop/events.test.ts`; `npm run test -- tests/unit/lib/proxy.test.ts`; `npm run check`. **Segurança/privacidade:** HMAC obrigatório, body cap, sem raw log. **Fora:** registro na app.
- **PR/evidência:** `codex/nuv-19-business-route`; `feat(nuvemshop): accept durable business webhooks`; revisão security/proxy, testes normal/manutenção e CI.

### NUV-20 · Callbacks de privacidade

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_08 · M. **Racional:** payload, retenção e resposta precisam de owner humano.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-14/16/17/19, **HR-08**, HR-07; HR-03 para operação. **Escopo/arquivos prováveis:** três `src/app/api/webhooks/nuvemshop/{store-redact,customers-redact,customers-data-request}/route.ts`, schema e `tests/unit/app/api/webhooks/nuvemshop/privacy.test.ts`.
- **RED:** matriz normal + manutenção para cada callback: `store-redact`, `customers-redact` e `customers-data-request` recebendo 503 pelo bloqueio genérico falham; callback em manutenção sem HMAC ou com HMAC inválido, três payloads distintos/parser cruzado, ACK antes de persistência recuperável e perda do processo após ACK sem recuperação falham. Resposta/retention e falha de handler são testadas conforme contrato adjudicado em HR-08, sem defini-lo aqui. **GREEN:** endpoints separados com verificador HMAC comum e parsers próprios, reutilizando a exceção estrita de manutenção estabelecida em NUV-19; owner/retention/response aprovados em HR-08 e intenção de privacidade mínima e recuperável persistida antes do ACK, sem forçar o envelope `{event,id}` nem usar `ignored_unknown_event` dos eventos de negócio. Preservar bytes brutos, limites de body/estrutura JSON, schema/store validation e redaction em ambos os modos. **REFACTOR:** boundary HTTP e testes de proxy compartilhados sem fundir parsers nem duplicar cobertura.
- **Aceite:** [ ] `store-redact` funciona em normal + manutenção; [ ] `customers-redact` funciona em normal + manutenção; [ ] `customers-data-request` funciona em normal + manutenção; [ ] todos preservam HMAC e durable-before-ACK com recuperação após crash; [ ] nenhuma outra rota é liberada como efeito colateral; [ ] nenhum callback cai em unknown business event; [ ] HR-08 continua obrigatório para contrato operacional final; [ ] ensaio autorizado antes de instalação.
- **Validação:** `npm run test -- tests/unit/app/api/webhooks/nuvemshop/privacy.test.ts`; `npm run test -- tests/unit/lib/proxy.test.ts`; `npm run check`. Evidence conjunta de privacy route + maintenance/proxy tests demonstra os três callbacks nos dois modos, reutilizando cobertura comum de NUV-19 sem duplicação desnecessária. **Segurança/privacidade:** exclusão/acesso e PII por política HR-08, sem raw default. **Fora:** decidir política sem humano.
- **PR/evidência:** `codex/nuv-20-privacy`; `feat(nuvemshop): handle approved privacy callbacks`; revisão privacy/security, HR-08 e CI.

### NUV-21 · Observabilidade, alerta e runbook

- **Estado/tamanho:** BLOCKED_BY_NUV_HR_07 · M. **Racional:** falhas depois do ACK exigem detecção e recuperação acionável.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-05/17/18/19/20, HR-07/08. **Escopo/arquivos prováveis:** `src/modules/nuvemshop/server/observability.ts`, `docs/runbooks/nuvemshop.md` (novo somente se convenção aceita), `tests/unit/modules/nuvemshop/observability.test.ts`; Sentry privacy só se necessário.
- **RED:** falha de fila, assinatura/schema em surto, 429/5xx persistente, 402 com interrupção simulada de webhooks e retry esgotado sem alerta falham. **GREEN:** log seguro com correlation/event/store/status/latência/tentativa/resultado; alert owner e runbook de replay/quarentena/suspensão. **REFACTOR:** cardinalidade controlada.
- **Aceite:** [ ] Sentry recebe tags/argumentos sanitizados; [ ] operador consegue recuperar claim expirado; [ ] suspensão conhecida por 402 mais ausência de entregas aciona diagnóstico/alerta sem alegar causalidade só pela ausência; [ ] sem promessa de SLA após webhook perdido.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/observability.test.ts`; `npm run check`. **Segurança/privacidade:** nunca token, signature, body, query ou `contactEmail`. **Fora:** canal de alerta não adjudicado.
- **PR/evidência:** `codex/nuv-21-observability`; `feat(nuvemshop): observe and recover webhook work`; revisão ops/privacy, teste de alerta e CI.

### NUV-22 · Suíte negativa de segurança

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01_AND_DEPENDENCIES · M. **Racional:** ataques cruzam limites de tasks e precisam de prova integrada.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-04/06/12/13/14/17/18/19/20; HR-07/08 para backend e privacy. **Escopo/arquivos prováveis:** `tests/unit/modules/nuvemshop/security.test.ts` e `tests/unit/app/api/webhooks/nuvemshop/security.test.ts`, sem runtime novo salvo correção no boundary dono.
- **RED:** testes hostil Link/redirect, segredo em erro/Sentry, HMAC forjado, body gigante, loja cruzada, replay que alcança o dispatcher, despacho concorrente duplicado, sinais verificados fora de ordem, falha de handler na fronteira de reconciliação, busca incompleta e maintenance bypass falham onde houver lacuna. NUV-18 continua owner dos testes específicos do dispatcher; esta suíte prova a integração negativa cross-boundary, sem duplicar aquela suíte. **GREEN:** corrigir somente boundary responsável em PR separada quando a falha for material. **REFACTOR:** reduzir fixture duplicada.
- **Aceite:** [ ] matriz negativa das seções 16 e 18 da spec coberta somente com durabilidade/recovery, dispatcher NUV-18 e rotas/privacy presentes; [ ] zero egress externo; [ ] zero secret/PII leak; [ ] nenhum teste depende de API real.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/security.test.ts`; `npm run check`; `npm run build`. **Segurança/privacidade:** fixture provenance e revisão adversarial. **Fora:** mudar spec ou decidir infraestrutura.
- **PR/evidência:** `codex/nuv-22-security-tests`; `test(nuvemshop): cover cross-boundary attacks`; PR teste, failures/proofs e CI.

### NUV-23 · Mock HTTP integration + validation against existing CI gates

- **Estado/tamanho:** READY_AFTER_AUTH_AND_HR_01_AND_DEPENDENCIES · M. **Racional:** prova de transporte completo e evidência dos gates existentes antes do rollout.
- **Dependências/gates:** AUTH + HR-01 CLOSED, NUV-05/12/13/19/20/21/22; HR-07/08 para fluxo completo. **Escopo/arquivos prováveis:** `tests/unit/modules/nuvemshop/http-integration.test.ts`, fixtures sintéticas/documentadas e evidência se necessária; `.github/workflows/ci.yml` é READ-ONLY.
- **RED:** mock server cobre headers, timeout, 429/5xx, paginação/Link e schema; testes de integração falham para comportamento incorreto do adapter. **GREEN:** suíte mock passa sem API real ou secrets; executar os gates CI existentes e examinar a evidência dos scans de segredos e bundle. **REFACTOR:** reduzir duplicação do mock.
- **Aceite:** [ ] `npm run check`/build/E2E/CI verdes; [ ] Gitleaks/history e bundle scans existentes operam e fornecem evidência suficiente para o critério 18; [ ] nenhuma chamada real ou secret em PR CI. Se os gates atuais forem insuficientes, `BLOCKED_SPEC_SCOPE_EXPANSION` antes de declarar GREEN.
- **Validação:** `npm run test -- tests/unit/modules/nuvemshop/http-integration.test.ts`; `npm run check`; `npm run build`; `npm run test:e2e` via CI; verificar resultados dos scanners existentes e registrar evidência. **Segurança/privacidade:** fixtures sintéticas, sem output de token. **Fora:** provider smoke, deploy, alteração de workflow/CI/Foundation; eventual mudança exige autorização humana explícita, escopo próprio, revisão Foundation/CI e PR separada.
- **PR/evidência:** `codex/nuv-23-integration-ci`; `test(nuvemshop): verify mock integration and existing CI gates`; revisão CI/security, run URL e CI verde.

## Wave 5 — operação humana e fechamento

### NUV-24 · Release autorizado, smoke real e dossiê do adapter

- **Estado/tamanho:** HUMAN_ONLY · M (evidência/coordenação, sem implementação de consumer). **Racional:** validação local não prova configuração da app nem recuperação em operação.
- **Dependências/gates:** AUTH para o histórico de execução; NUV-01–23 core concluídas, revisão final, CI verde; HR-01/02/03/04/07/08 aplicáveis fechados para iniciar; HR-06 fecha **dentro** desta task, somente após deploy autorizado e antes do smoke webhook e do marco operacional. Deploy, registro e smoke exigem autorizações **específicas**; comprovar também as adjudicações de release anteriores a cada merge de implementação, sem autorização retroativa. HR-05 não bloqueia o marco operacional do adapter; bloqueia `cart`. Antes de qualquer deploy que ative leituras Nuvemshop, comprovar instância única ou adjudicar/testar orçamento de leitura compartilhado; consolidar a evidência nesta task. **Escopo/arquivos prováveis:** dossiê e runbook do capability; nenhum código por default.
- **Sequência humana (não TDD):** documentar e executar bootstrap humano Authorization Code conforme spec §19 (state de uso único, callback conferido, troca em até 5 minutos, nunca imprimir code/token/secret, injeção em secret manager e procedimento de revogação/reinstalação) → revisar commit/CI e aprovar deploy → verificar SHA/config/health via fluxo Coolify → inventariar webhooks existentes → autorizar HR-06 e registrar quatro tópicos/endpoints após segurança/durabilidade/privacy prontos → entrega assinada real, leitura real mínima e crash/recovery/alert rehearsal com cleanup → revisão adversarial e gate humano do marco operacional.
- **Aceite:** [ ] critérios do adapter têm evidência, e critérios 3/10 e meta de cache mantêm consumer pendente explícito; [ ] bootstrap redigido com app/store ID, scopes, versão, data e resultado, sem code/token/secret; [ ] release identity/health e smoke redigidos; [ ] HMAC real, ACK durável/recovery e callbacks aplicáveis comprovados; [ ] owner pode aprovar `ADAPTER OPERATIONAL / SPEC CLOSURE PENDING CONSUMERS`, nunca `IMPLEMENTATION COMPLETE` nesta task.
- **Validação:** `npm run check`, PR CI `ci` e run IDs; probes reais somente com autorização; registro de resultados e cleanup sem segredos. **Segurança/privacidade:** nenhum payload real em Git/PR, credenciais fora da CI. **Fora:** merge automático, `cart`, `catalog` e `orders` consumers.
- **PR/evidência:** branch `codex/nuv-24-operational-evidence` apenas se documentação versionada for necessária; commit `docs(nuvemshop): record authorized operational evidence`; PR documental separada com links redigidos, revisão ops/security e CI. HR-06 é mutação da conta e nunca trabalho automático.

### NUV-25 · Closure integral da spec

- **Estado/tamanho:** HUMAN_ONLY / BLOCKED_BY_CONSUMER_EVIDENCE · S documental. **Racional:** handoff não prova critérios 3/10 ou atualização do catálogo.
- **Dependências/gates:** NUV-24 concluída; evidência real do futuro `orders` para vínculo/posse/disclosure, cobertura completa de `/conta/pedidos` e idempotência de efeitos; evidência do futuro `catalog` para revalidação/meta quando webhook entregue. Gates dos consumers e revisão humana próprios, sem implementar esses capabilities aqui. **Escopo/arquivos prováveis:** dossiê de critérios e status, paths decididos pela execução futura.
- **Sequência humana (não TDD):** conferir cada um dos 18 critérios com teste ou ensaio de comportamento efetivo, revisitar gates/risks, revisão adversarial final e adjudicação humana de fechamento.
- **Aceite:** [ ] 18/18 critérios satisfeitos com evidência verificável, não apenas owner; [ ] CI e observabilidade/recovery atuais comprovados; [ ] P0/P1/P2 material = 0; [ ] humano declara `IMPLEMENTATION COMPLETE`.
- **Validação:** `npm run check` e CI das PRs relevantes, testes dos consumers e smoke autorizados, links redigidos. **Segurança/privacidade:** nenhum segredo/PII no dossiê. **Fora:** implementar `orders`, `catalog` ou `cart` nesta task.
- **PR/evidência:** `codex/nuv-25-spec-closure` apenas para sincronização documental futura; `docs(nuvemshop): record full criterion closure`; PR documental, revisão humano/security e CI. Nenhum fechamento automático.

## Capability opcional e consumer handoffs

`getCustomer`/`listCustomers` não pertencem ao core. Se um consumer provar necessidade adicional e `read_customers` for adjudicado/concedido em HR-02 ou novo gate humano, criar **novo planejamento aprovado** para Customer com schema mínimo, privacy/PII e PR própria; não marcar READY aqui. `NUV-OPEN-CHECKOUT`/HR-05 exigem plano de `cart` separado. `orders` deve implementar e provar vínculo por e-mail verificado, cobertura de busca/índice, OTP/posse, disclosure mínimo, timeline, matriz de transições e idempotência de efeitos; `catalog` decide tags/revalidation e mede a meta de um minuto. Esses handoffs são obrigações registradas, não tasks ocultas deste adapter.
