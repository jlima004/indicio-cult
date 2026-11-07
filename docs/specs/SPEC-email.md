# Proposta: `email` — fundação de e-mail transacional

| Campo                  | Valor                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Etapa                  | EMAIL-01-A — Contract & Provider Decision                                                                                                                |
| Status                 | PROPOSTA; adjudicação humana pendente; implementação não autorizada                                                                                      |
| Data de referência     | 2026-11-06, America/Sao_Paulo                                                                                                                            |
| Depende de             | `foundation`, conforme [CAPABILITY-MAP](./CAPABILITY-MAP.md)                                                                                             |
| Responsáveis propostos | PO: ratificação; responsável técnico: contratos/testes; operação: domínio/entrega; privacidade/jurídico: dados e transferência. Pessoas ainda a designar |
| Plano e tarefas        | [plan](../../tasks/email/plan.md), [todo](../../tasks/email/todo.md)                                                                                     |

## 1. Objetivo, autoridade e limites

Preparar a fundação reutilizável de envio transacional da Indicio Cult, com templates da marca, contratos tipados e diagnóstico seguro. Esta etapa entrega somente três documentos. Não instala SDK, implementa runtime, consumer, endpoint, migration, fila, worker, autenticação, configuração remota ou envio.

Estados desta proposta: `EMAIL01_IMPLEMENTATION_NOT_AUTHORIZED`, `EMAIL_PROVIDER_NOT_RATIFIED`, `NO_REAL_EMAIL_SEND`, `NO_REMOTE_CONFIGURATION`, `MERGE_NOT_AUTHORIZED`, `DEPLOY_NOT_AUTHORIZED`. `EMAIL01_CONTRACT_READY_FOR_HUMAN_ADJUDICATION` significa proposta documental revisada e publicada, sem aprovar o provedor nem concluir EMAIL-01.

Fontes normativas locais: [PRD §§6, 10, 13, 14, 16 e Apêndice B](../PRD.md), [SPEC-foundation](./SPEC-foundation.md), [ADR-001](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md) e sua supersession de deploy pelo [ADR-002](../decisions/ADR-002-coolify-traefik-deploy.md). A escolha de iniciar `email` em NUV-MVP-C01 é autorização declarada no pedido desta execução; não foi encontrado registro local desse checkpoint. Nenhuma dessas fontes será alterada nesta etapa.

`foundation → email`. Os consumers futuros dependem de seus próprios contratos de negócio; `email` não depende de NUV-10, HR-04, HR-08 ou NUV-24. Não herda o armazenamento nem os workers do adapter Nuvemshop. Decisões de privacidade de e-mail têm IDs EMAIL-Hxx e não resolvem HR-08.

### Reconciliação do baseline

`git fetch origin main` confirmou `main` e `origin/main` em `11d52cf05b5a60160f00c815111838e0e474d1bf`, igual ao baseline solicitado, sem commits posteriores no início da execução. Árvore inicial limpa; branch documental `docs/email-01-contract`.

Stack versionada no lockfile: Next 16.4.1, React 19.3.0, TypeScript 5.9.3, Zod 4.6.6, supabase-js 2.116.0 e supabase/ssr 0.12.7. Runtime local Node 22.23.1 (engine `>=22.22.2 <23`). A instalação preexistente diverge: Next 16.4.5, React 19.3.1, Zod 4.6.7 e supabase-js 2.119.0; não representa o candidate reproduzível com `npm ci`. SPEC-foundation §2 ainda menciona Next 16.3.x. Registrar ambas as divergências sem modificar dependências ou especificação aprovada. Nenhum SDK dos três provedores foi selecionado ou validado nesta execução.

### Conflitos delimitados, sem materialização

| ID        | Evidência                                                                                                                                                                                     | Tratamento nesta proposta                                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMAIL-N01 | CAPABILITY-MAP, dependências externas: provedor e domínio autenticado devem existir **antes de implementar** `email`; o fatiamento solicitado coloca infraestrutura local em B e domínio em D | A pode prosseguir. B permanece condicionado à adjudicação explícita sobre preparação local com fake antes desse pré-requisito, ou ao cumprimento prévio do requisito. Não presumir exceção                                                    |
| EMAIL-N02 | PRD §9.8 prevê convite por e-mail quando não houver retorno; Apêndice B diz “se houver retorno”                                                                                               | Não definir gatilho definitivo nem implementar convite; PO deve reconciliar antes desse consumer                                                                                                                                              |
| EMAIL-N03 | PRD §12 exige e-mail ao gerente “com todos os dados”; Apêndice B inclui cliente e motivo no assunto                                                                                           | Manter requisito registrado; propor minimização/link autenticado apenas para adjudicação. Template de troca ao gerente fica suspenso até decisão sobre conteúdo/assunto. A restrição de logs técnicos sem PII já vale independentemente disso |

## 2. Responsabilidade dos fluxos

| Fluxo e assunto do Apêndice B                             | Dono do gatilho, destinatário e dados                                                                                             | Classe e escopo inicial                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Verificação — “Confirme seu e-mail.”                      | Supabase Auth gera token/link; `identity` futuro inicia fluxo autorizado; endereço em verificação pode ainda não estar verificado | Transacional de autenticação; artefato de template em B, ativação em D                                       |
| Recuperação — “Redefinir sua senha.”                      | Supabase Auth gera token/link e controla validade; `identity` mantém resposta neutra e limites de abuso                           | Transacional de autenticação; artefato de template em B, ativação em D                                       |
| Convite — “Acompanhe sua peça.”                           | Consumer pós-compra futuro, condicionado a `orders` e associação autorizada; EMAIL-N02 pendente                                   | Mensagem de serviço proposta; texto sem oferta comercial; classificação/finalidade em EMAIL-H03; fora de B/C |
| Troca cliente — “Sobre a sua troca.”                      | `exchanges` comprova solicitação e destinatário autorizado pelo contrato de pedidos                                               | Transacional; consumer e template fora de B/C                                                                |
| Troca gerente — “[Troca] Pedido #NNNN — motivo — cliente” | `exchanges`; gerente configurado pelo servidor, autorização administrativa                                                        | Transacional; conteúdo suspenso por EMAIL-N03                                                                |
| Saldo — “[Saldo] Reserva Ink abaixo de R$ X”              | `fulfillment-monitor`; operadora aprovada, identidade do episódio de alerta                                                       | Transacional operacional; fora de B/C                                                                        |
| Double opt-in — “Confirme para receber novos indícios.”   | `newsletter` comprova solicitação e mantém consentimento/challenge do próprio fluxo                                               | Confirmação de consentimento; não é autorização para campanhas; fora de B/C                                  |

Pedidos recebido/pago/enviado/entregue são responsabilidade da Nuvemshop. Mudança/reverificação de endereço, notificações de segurança e outros tipos habilitados no Supabase precisam ser inventariados em D; não podem receber template de recuperação por fallback. Tipo desconhecido bloqueia a ativação correspondente até cobertura aprovada. `email` não cria tokens, URLs de recuperação ou confirmações independentes do Supabase, nem desafios de newsletter.

Campanhas e sincronização de marketing estão fora de EMAIL-01. Consentimento válido, finalidade, revogação e suppression são gates separados; nenhum envio de autenticação ou confirmação de troca inclui promoção.

## 3. Comparação de provedores e fontes

A matriz de evidências e custos está no [plano, §2](../../tasks/email/plan.md#2-pesquisa-oficial-e-alternativas). Recomendação técnica provisória: avaliar **Resend**, pela API tipada, integração SMTP documentada com Supabase e idempotência limitada. **Não ratificada**: dependem de decisão humana custo, dados, transferência internacional, operação e retenção. Postmark e SES permanecem alternativas viáveis; nenhum teste de reputação real foi feito.

No Node 22/Next 16, uma API HTTPS server-only é opção comum aos três, sem exigir SDK. Compatibilidade exata de SDK/transportes, engines, licença e lockfile será demonstrada em C após seleção. SMTP do Supabase é executado pelo Auth, fora do runtime Next. Disponibilidade de endpoint/região não comprova acesso comercial de uma conta brasileira, faturamento local, conformidade LGPD ou entrega em caixa de entrada.

## 4. Supabase Auth: SMTP versus Send Email Hook

| Dimensão          | A — SMTP personalizado (recomendado inicialmente)                                                            | B — Send Email Hook                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Controle          | Supabase gera tokens/links, renderiza seus templates e submete por SMTP                                      | Supabase continua dono do Auth e chama serviço aprovado para renderizar/entregar                                                                 |
| Segurança         | Segredo SMTP no Supabase; sem endpoint de entrega próprio; redirects e templates sob controle administrativo | Novo endpoint recebe material de Auth; exige verificação de assinatura sobre corpo bruto, proteção a replay e nenhum log de token/link           |
| Templates         | Formato Go Templates do Supabase; reutiliza identidade visual exportada, não executa componentes React       | Renderer próprio e mais flexibilidade; aumenta a superfície que manipula tokens                                                                  |
| Falhas/manutenção | Menos componentes próprios; quotas de Auth e SMTP continuam aplicáveis; aceite SMTP não prova entrega        | Depende da disponibilidade do hook e transporte; HTTP deve concluir em até 5s segundo documentação atual; sem presumir retry/fallback automático |
| Idempotência      | Não assumir que Supabase expõe cabeçalho customizado de idempotência Resend                                  | Permite mapear identidade do evento, mas requer contrato de replay/timeout próprio e persistência aprovada                                       |

Recomendar **A** para reduzir operação de uma pessoa e preservar o dono do Auth. Essa recomendação não autoriza configurar SMTP. O módulo de submissão da aplicação não intercepta mensagens Auth no caminho A; observações de entrega Auth e de negócio permanecem separadas. Um resultado aceito pela API do Supabase, inclusive resposta neutra de recuperação, não deve ser convertido em comprovante de aceite pelo provedor.

O [SMTP padrão Supabase](https://supabase.com/docs/guides/auth/auth-smtp) é restrito, sem SLA de produção, com limite publicado de 2 mensagens/hora e destinatários da equipe; SMTP customizado começa com limite publicado de 30 mensagens/hora. São limites distintos do provedor e devem ser revalidados em D, sem consultar a conta agora. Os [templates Supabase](https://supabase.com/docs/guides/auth/auth-email-templates) e a allowlist de redirects devem ser testados com PKCE e consumers de `identity`, inclusive scanners que pré-abrem links. Tracking de aberturas/cliques fica desativado nos fluxos Auth.

Fontes consultadas em 2026-11-06: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [limites dos hooks](https://supabase.com/docs/guides/auth/auth-hooks), [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp). As páginas de Hooks indicam atualização em 2026-10-22; SMTP indica 2026-10-31. Hook fica como alternativa posterior; sua página apresenta `email` na referência e `email_data` no exemplo, exigindo schema/versionamento e teste de contrato antes de qualquer implementação. Não copiar exemplo como contrato validado.

## 5. Fronteira e API proposta

Futura estrutura: `src/modules/email/server/` com `index.ts` (fachada), `contracts.ts`, `validation.ts`, `templates/`, `providers/fake.ts` e, apenas em C, adapter escolhido. Testes espelham o módulo em `tests/unit/modules/email/`; artefatos Supabase separados em `templates/auth/`. Nomes são proposta, nenhum arquivo de runtime é criado em A.

Entradas executáveis, renderer e adapters importam `server-only`. A fachada não é Server Action nem endpoint público genérico. Um consumer aprovado autentica/autoriza a ação, resolve destinatário e finalidade no servidor e só então chama a fachada. O renderer não aceita HTML, assunto, remetente, headers, attachments, CC/BCC ou destinos arbitrários fornecidos pelo navegador. Um destinatário por intenção, impedindo vazamento entre clientes.

Contrato conceitual (nomes a ratificar; tipos opacos construídos apenas por validação/autorização em runtime):

```typescript
type SubmissionResult =
  | { status: 'ACCEPTED_BY_PROVIDER'; messageRef: MessageRef; correlationId: CorrelationId }
  | { status: 'NOT_SUBMITTED'; code: LocalFailureCode; correlationId: CorrelationId }
  | { status: 'REJECTED_PERMANENT'; code: PermanentFailureCode; correlationId: CorrelationId }
  | {
      status: 'REJECTED_TRANSIENT'
      code: TransientFailureCode
      retryAfterMs?: number
      correlationId: CorrelationId
    }
  | { status: 'INDETERMINATE'; code: UnknownOutcomeCode; correlationId: CorrelationId }

interface TransactionalEmail {
  submit(request: AuthorizedSend): Promise<SubmissionResult>
}
```

| Contrato              | Regra de validação e responsabilidade                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TemplateId` e versão | Registro fechado e versionado; relação discriminada entre identidade e schema de variáveis Zod estrito. Sem `Record<string, unknown>` como contrato final; tipo desconhecido rejeitado                                                                                                                                                                                                                                                                 |
| Variáveis             | Limites explícitos de tamanho, quantidade e caracteres por template; rejeitar campos extras. Escape HTML/texto/atributos; nunca interpolar markup do usuário. C define teto do transporte, sem anexos inicialmente                                                                                                                                                                                                                                     |
| `AuthorizedSend`      | União por template contendo variáveis correspondentes, um `AuthorizedRecipient`, `SenderId`, `LogicalSendId`, `IdempotencyKey`, `CorrelationId` e prazo de validade                                                                                                                                                                                                                                                                                    |
| Destinatário          | Resolução server-side ligada à ação, principal e finalidade; formato válido não é autorização. Tipagem opaca não substitui verificação runtime. Verificação e opt-in podem usar endereço ainda não verificado quando legitimamente solicitados. Convite pós-compra pode requerer autorização por finalidade a partir do pedido legítimo, sem comprovar posse ou tornar o endereço verificado; essa política depende de EMAIL-H03/N02 antes do consumer |
| Remetente             | Alias interno mapeado a domínio/endereço aprovados em configuração; Reply-To também fixo. Sem espelhamento de valor enviado pelo cliente; CR/LF e múltiplos endereços rejeitados                                                                                                                                                                                                                                                                       |
| Links                 | HTTPS absoluto, origem/path permitidos por finalidade, sem userinfo ou esquemas alternativos. Links Auth pertencem ao Supabase e a sua configuração de redirects, não são reconstruídos pelo renderer da aplicação                                                                                                                                                                                                                                     |
| Identidade lógica     | Um evento de negócio imutável + finalidade + destinatário lógico + versão da intenção. Identificador opaco, sem e-mail, nome, número comercial ou token. Gerado uma vez e preservado em retries                                                                                                                                                                                                                                                        |
| Idempotência          | Chave estável derivada da intenção, até limite do provider; fingerprint de payload canônico inclui template/versão, remetente, destino, variáveis e links. HMAC com segredo/versão controlados quando fingerprint de PII for persistido; não usar hash simples de e-mail                                                                                                                                                                               |
| `MessageRef`          | Referência opaca do aceite, não comprovante de entrega; ID real do provider restrito ao adapter/store aprovado, nunca exposto ao navegador                                                                                                                                                                                                                                                                                                             |
| Falhas                | Códigos fechados locais: validação/autorização/suppression; configuração/credencial; quota/rate limit; indisponibilidade; protocolo inválido; timeout/resultado desconhecido. Não retornar `Error`, `cause`, headers ou body do provider                                                                                                                                                                                                               |
| Correlação            | UUID opaco criado no servidor. Somente template/versão, classe de falha, tentativa, duração limitada e correlação em telemetria allowlist; sem destinatário, assunto renderizado ou payload                                                                                                                                                                                                                                                            |

B expõe somente fake e renderer sintéticos, sem catálogo ativo de envios de negócio. Os dois templates Auth são artefatos para o caminho SMTP; não habilitam envio Auth via `submit`. Consumers futuros adicionam sua variante tipada somente após contrato, finalidade e autorização próprios.

### Integração com a foundation existente

`src/lib/env/index.ts` já é server-only; `parseEnv` normaliza vazio e falha na inicialização. A proteção específica de prefixo hoje cobre apenas `NEXT_PUBLIC_NUVEMSHOP_*`: proteção de segredos de e-mail ainda precisa ser implementada e testada em C. Variáveis propostas `EMAIL_PROVIDER`, `EMAIL_FROM`, credencial privada do provider e allowlist de links devem ser validadas apenas no escopo habilitado, sem quebrar build sem integração. Nenhuma credencial `NEXT_PUBLIC_*`, ARG Docker ou fixture real. SMTP Auth não requer copiar a chave para o Next se nenhum envio da aplicação estiver habilitado.

`src/lib/http/index.ts` contém somente `json`/`problem`; não fornece retries, timeout, transporte ou redaction automática. Reutilizar suas respostas neutras apenas nos consumers futuros, sem enviar diagnóstico privado a `detail`.

`src/lib/sentry/privacy.ts` desliga coleta automática de PII, mas não sanitiza payloads manuais, exceptions e breadcrumbs. O adapter terá de construir diagnóstico por allowlist antes de Sentry/logger; nenhum erro bruto, `user.email`, token, URL Auth, header, resposta ou conteúdo integral. Telemetria também não inclui hash do endereço.

Guias locais Next 16.4.5 lidos: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (environment poisoning), `02-guides/environment-variables.md` e `03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`. O último orienta usar Node padrão sem export `runtime` com Cache Components; revalidar no ambiente reproduzido do lockfile antes de B. Nenhum envio/renderer personalizado entra em `use cache`, prerender, Proxy ou import de cliente; envio também não ocorre em GET, render RSC, metadata ou healthcheck.

## 6. Submissão, entrega e eventos futuros

`ACCEPTED_BY_PROVIDER` significa resposta validada de aceite com referência do provider. `DELIVERED` significa evento verificado indicando aceite pelo servidor de destino, não leitura nem chegada à caixa principal. `BOUNCED`, `COMPLAINED` e `FAILED` são observações distintas; reclamação pode ocorrer após entrega. Ausência de evento significa entrega desconhecida, nunca sucesso presumido.

Separar estado de submissão de evidências de entrega: não usar um enum linear que apague `DELIVERED` quando surgir complaint. Reservar envelope futuro com provider, eventId opaco, messageRef, tipo allowlist, occurredAt/receivedAt e schemaVersion. Eventos assinados duplicados, atrasados ou fora de ordem precisam de dedupe, correlação e precedência conservadora: complaint/hard bounce impedem novos envios segundo política aprovada, mesmo após entrega.

Nenhum webhook de e-mail existe por esta proposta. Sua implementação exige autorização própria, corpo bruto limitado, assinatura/timestamp/replay verificados conforme provider, resolução segura de correlation e persistência durável antes de ACK. Não reutilizar contrato de webhook Nuvemshop. Payload bruto com endereço não vai para logs nem armazenamento geral. No início de D, definir ingestão automatizada ou procedimento humano demonstrável para bounce/complaint/suppression; ausência de ambos bloqueia envio real.

## 7. Idempotência, retries e durabilidade

A [Resend retém chaves por 24h](https://resend.com/docs/dashboard/emails/idempotency-keys), suporta header HTTP e cabeçalho SMTP próprio e detecta mesma chave com payload divergente. A janela do provider não é retenção de regra de negócio. A política vale para a API da aplicação; não atribuí-la automaticamente ao caminho Supabase SMTP, cuja customização de headers não está demonstrada.

| Situação                                                                        | Política proposta                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mesma intenção e fingerprint                                                    | Reapresentar resultado durável conhecido; em voo, devolver estado pendente interno/indeterminado e não criar outra submissão concorrente                                                         |
| Mesma chave e outro payload                                                     | Conflito definitivo para esta chamada; investigar. Atualizar template não cria nova intenção automaticamente; eventual reenvio é decisão explícita, sem retry com chave nova                     |
| Sem I/O: inválido, não autorizado, suprimido ou configuração ausente            | `NOT_SUBMITTED`, nenhuma chamada externa. Corrigir causa, sem loop                                                                                                                               |
| 400/401/403/422 e rejeições documentadas                                        | Classificar conteúdo/configuração por código documentado; permanente para a chamada. Credencial/domínio exige operador; não alterar chave silenciosamente                                        |
| 429 com recusa comprovada                                                       | `REJECTED_TRANSIENT`; respeitar Retry-After e quota global, backoff com jitter e orçamento finito. Quota diária esgotada não recebe retry a cada segundo                                         |
| 5xx, conexão interrompida, timeout após possível envio, resposta 2xx malformada | `INDETERMINATE` se não houver prova de não aceite. Só repetir com mesma chave/payload dentro de janela ainda comprovada e margem conservadora; sem capacidade de idempotência, reconciliar antes |
| Crash depois de I/O e antes do registro                                         | Estado pendente de reconciliação, nunca “falhou, pode reenviar”                                                                                                                                  |
| Janela do provider expirada ou início da primeira tentativa desconhecido        | Não reenviar automaticamente; investigar por referência/evidência e decidir manualmente perda versus duplicata                                                                                   |
| Hard bounce/complaint                                                           | Sem retry ao endereço; suppression com acesso restrito. Soft bounce/atraso após aceite é tratado pelo provider e não vira nova intenção da aplicação                                             |

Valores iniciais propostos para C, ainda sujeitos a EMAIL-H04: timeout 5s por chamada, no máximo 3 tentativas totais, orçamento 20s, full jitter com base 1s e teto 8s. Se Retry-After exceder orçamento ou validade da intenção, retornar falha/indeterminação sem tarefa em memória após resposta. Budget deve ser menor que prazo do consumer. Janela de idempotência conta desde a primeira tentativa conservadora, nunca reinicia no retry. Abort limita espera local e não desfaz aceite remoto; failover após resultado incerto é proibido sem reconciliação. Consultas não enviadoras para reconciliação também requerem autorização de operação futura. Não prometer exactly-once ou inbox delivery.

### Direto controlado versus outbox

| Alternativa                          | Benefício                                                                                 | Limite/gate                                                                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direto, sem persistência própria     | Menor operação; adequado ao fake local e experimento controlado                           | Não sobrevive a crash nem deduplica além da janela; não pode declarar confirmação de troca/alerta entregue. Uso real só após aceite explícito de perda/duplicata e suppression operacional |
| Direto com registro durável aprovado | Intenção gravada antes do I/O, identidade única, replay do resultado e recuperação manual | Já requer desenho de persistência, concorrência, retenção e reconciliação; não é “só HTTP” e não está autorizado em A                                                                      |
| Outbox transacional futura           | Intenção no commit de negócio, unicidade e recuperação por worker                         | Exige ADR/decisão nova, autorização de schema/fila/worker e custo operacional; ainda não remove indeterminação no provider nem garante exactly-once                                        |

Recomendação: B permanece inteiramente local; C prova adapter com mocks; envio confiável de negócio só é habilitado depois de EMAIL-H04 decidir persistência por consumer. Quando uma regra exigir dedupe durável ou não perder envio após commit, exigir intenção persistida antes de I/O, claim atômico/concorrência e resultado/reconciliação duráveis, com retenção maior que todo horizonte de replay. Não criar uma outbox antecipadamente nem herdar a do adapter Nuvemshop. Supabase Auth permanece dono das tentativas de autenticação no caminho SMTP.

## 8. Segurança, privacidade e retenção

Ativos: credenciais, destinatários, tokens/links Auth e histórico de intenções. Fronteiras: navegador → consumer autorizado → módulo → provider; provedor → futuro webhook; operador → configuração. Proteções: autorização runtime por finalidade, remetentes fixos, tamanho limitado, escape, links permitidos, quotas por principal/finalidade e globais, segredo apenas servidor e suppression antes de submissão. O rate limiter em memória da foundation não é controle distribuído/durável; a capacidade real será escolhida com o consumer.

| Categoria                       | Proposta de minimização/retenção, sem ratificação                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logs técnicos                   | Correlação opaca e código allowlist; proposta 14 dias para diagnóstico, sem PII nem material Auth; confirmar Sentry/proxy/exportações e finalidade em EMAIL-H05                                                                                  |
| Ledger de idempotência eventual | Intenção opaca, versão/fingerprint protegido, status, timestamps, providerRef restrita e prazo; reter por `máximo(horizonte de replay do consumer, reconciliação aprovada)` com margem explícita; prazo numérico bloqueado até conhecer consumer |
| Endereço necessário ao envio    | Preferir resolução na fonte autorizada; se outbox precisar snapshot, criptografia/acesso mínimo, finalidade e TTL próprios. Não usar conteúdo completo como registro de auditoria                                                                |
| Tokens e URLs Auth              | Memória efêmera do fluxo Supabase; nunca ledger/log/fixture real. Provider SMTP inevitavelmente processa mensagem: essa retenção externa deve ser aceita antes de D                                                                              |
| Suppression                     | Endereço/fingerprint protegido estritamente necessário para impedir reenvio, com versão e categoria mínima; não retenção infinita presumida. Definir prazo/base e efeito da exclusão em EMAIL-H05                                                |
| Backups e provider              | Prazo e local distintos do app; verificar exclusão/exportação, subprocessadores, acesso e contrato antes de dados reais                                                                                                                          |

Resend declara armazenamento nos EUA independentemente da região de envio, retenção de e-mail/log de 30 dias nos planos públicos e ausência de assinatura de cláusulas específicas brasileiras LGPD/ANPD. Isso exige análise humana do instrumento de transferência e contrato; não concluir conformidade nem incompatibilidade automaticamente. A região São Paulo não equivale a residência brasileira. [Segurança Resend](https://resend.com/security), consulta 2026-11-06.

Acesso a dados operacionais apenas por papel autorizado, separação entre ambiente sintético/produção, credenciais com menor escopo e rotação/revogação testadas em D. Sem analytics de abertura/clique por padrão, especialmente Auth. Recuperação mantém resposta neutra; nenhum diagnóstico permite enumerar contas. Suprimir complaint/hard bounce, alertar operadora por canal aprovado e não ignorar suppression para “forçar” e-mail transacional. Política de desbloqueio exige validação humana.

## 9. Templates e identidade visual

B propõe entregar apenas layout base e dois artefatos Auth: confirmação de endereço e recuperação de senha, com assuntos do Apêndice B, HTML e alternativa plain text sintéticos. Publicação/configuração no Supabase só em D. Esses artefatos usam placeholders oficiais de templates Supabase; não fabricam links. A capacidade real de plain text no SMTP Auth deve ser comprovada no MIME em D; se a configuração gerenciada não permitir a alternativa exigida, registrar conflito e readjudicar antes de ativar, sem afirmar equivalência pelo preview.

Usar os tokens de `src/styles/globals.css`, mapa `src/styles/tokens.md` e assets aprovados descritos no PRD §15/DESIGN, sem mudar paleta, tipografia, marca ou SVG. HTML de e-mail não pode depender de CSS custom properties, Tailwind ou fonte externa disponíveis no navegador: futura exportação de valores semânticos aprovados para estilos inline, sob regras de tokens, precisa passar `lint:tokens`. Caso precise exceção de tooling, decisão explícita antes de alterar, sem supressões automáticas.

Layout PT-BR responsivo, largura fluida e leitura em 320px; hierarquia de headings, `lang="pt-BR"`, texto legível, contraste AA, alt descritivo, imagens decorativas com alt vazio, tabelas de apresentação com papel apropriado, CTA com destino compreensível e URL alternativa. Usar fallbacks seguros para Inter/Cormorant e imagem raster aprovada se o cliente não suportar SVG. HTML e texto oferecem mesma ação; sem anexos, tracking ou promoção. Rodapé de serviço e contato dependem da identidade/remetente ratificados.

Preview somente local e dados sintéticos (`example.invalid`, IDs fictícios), sem rota pública de renderização/envio, links Auth reais ou acesso ao provider. Testar escape de placeholders, links, HTML/texto e renderização representativa em clientes (Gmail/Outlook/Apple Mail em D), além do snapshot local em B. React Email é alternativa de renderer a avaliar posteriormente; não é dependência aprovada nem requisito para templates SMTP Go.

## 10. Matriz de verificação proposta

| ID  | Positivo                                                   | Negativo/limite                                                                                                       | Etapa                            |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| T01 | Template e variáveis correspondentes renderizam HTML/texto | Tipo desconhecido, extra, falta e excesso de tamanho rejeitados antes de I/O                                          | B                                |
| T02 | Destinatário resolvido por ação autorizada                 | E-mail digitado, prova forjada/expirada, CRLF, multi-recipient e troca de principal bloqueados                        | B e consumer                     |
| T03 | Link HTTPS de origem/path permitidos                       | `javascript:`, userinfo, domínio parecido, redirect fora da lista e markup escapados/rejeitados                       | B                                |
| T04 | Fake determinístico e preview sintético                    | Rede bloqueada; imports de cliente falham no build; nenhuma env obrigatória do provider em B                          | B                                |
| T05 | Mesma intenção/payload recupera resultado                  | Payload divergente, concorrência e primeira tentativa desconhecida não duplicam I/O                                   | B/C; durável depende H04         |
| T06 | 2xx válido com ID → ACCEPTED                               | 2xx sem ID/protocolo inválido → INDETERMINATE; nenhum caminho produz DELIVERED a partir de aceite                     | C                                |
| T07 | 429 respeita Retry-After/jitter/budget                     | Retry-After enorme, quota diária, 401/403/422, 5xx e timeout sem idempotência não causam loop inseguro                | C                                |
| T08 | Retry seguro com mesma chave dentro da janela              | Expiração 24h, crash antes/depois de aceite e resultado perdido bloqueiam replay automático sem prova                 | C e persistência futura          |
| T09 | Logs allowlist preservam correlação                        | Canários de endereço/token/URL/header/body/exception ausentes em logs/Sentry/bundle                                   | B/C/D                            |
| T10 | Confirmação/recuperação Auth geradas pelo Supabase         | Link inválido/expirado/reutilizado, tipo não coberto, scanner, redirect hostil e falha SMTP testados sem auth própria | D + identity                     |
| T11 | Layout/texto/assunto acessíveis e coerentes                | Imagem/fonte indisponível, viewport estreita e variável hostil preservam leitura/ação                                 | B/D                              |
| T12 | Evento verificado correlaciona sem PII                     | Assinatura inválida, replay, desordem/duplicata, body excessivo e crash antes do ACK                                  | Webhook futuro, não implementado |
| T13 | Hard bounce/complaint impede próximo envio                 | Entrega anterior não remove suppression; nenhum opt-in confirmado cria campanha automaticamente                       | D e consumers                    |
| T14 | DNS/remetente/quota/MIME e recebimento comprovados         | SPF/DKIM/DMARC ausente, limite esgotado ou indisponibilidade mantém gate fechado                                      | D, autorização posterior         |

Ferramentas existentes: Vitest (`tests/unit`, ambiente jsdom configurado; testes de transporte futuros devem usar ambiente Node), Playwright (`tests/e2e`, smoke de build local) e testes Node de tooling. Não adicionar testes artificiais para Markdown. A usa `git diff --check`, Prettier dos três arquivos, links locais/fontes e revisão independente; CI existente executa a suíte do repositório para o SHA candidato. Mocks não provam compatibilidade remota, entregabilidade ou operação.

## 11. Decisões humanas e gates

| ID        | Decisão pendente                                                                                               | Responsável proposto e etapa bloqueada                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| EMAIL-H01 | Provedor, plano, orçamento, pagamento/acesso Brasil, remetente e domínio                                       | PO + operação; C e configuração D                                                             |
| EMAIL-H02 | SMTP inicial ou Hook; tipos Auth cobertos, redirects, tracking e MIME plain text                               | PO + técnico/identity; ativação Auth em D                                                     |
| EMAIL-H03 | Finalidade/classificação de convite e DOI, EMAIL-N02/N03, conteúdo mínimo                                      | PO + privacidade; consumers/templates afetados                                                |
| EMAIL-H04 | Perda/duplicata aceitáveis, horizonte de replay, persistência direta/outbox, orçamento de retries              | PO + técnico/operação; envio real de negócio, schema/worker sempre exigem autorização própria |
| EMAIL-H05 | Base/finalidade, retenção numérica por categoria, exclusão/backups, suppression e instrumento de transferência | PO + privacidade/jurídico; qualquer PII no provider e operação D                              |
| EMAIL-H06 | Owners nominais, canal de alerta, runbook, acesso, rotação, suspensão e desbloqueio                            | PO + operação; readiness D                                                                    |
| EMAIL-H07 | Resolver EMAIL-N01 sem alterar o mapa silenciosamente; autorizar escopo local B                                | PO; qualquer implementação B                                                                  |

Nenhum nome ou aceite humano é presumido. A recomendação arquitetural é proposta localizada nestes arquivos; não cria ADR aceito nem altera contratos existentes.

Critérios por etapa: A = fontes oficiais, contratos, alternativas e decisões revisáveis, três arquivos e PR Draft revisada/CI acompanhada. B = contrato local ratificado, renderer/fake/templates sintéticos e testes negativos, sem provedor ativo. C = provider ratificado, adapter/env privados e resiliência aprovados, somente mocks. D = autorizações específicas de configuração e envio, domínio/remetente/DNS verificados, Supabase demonstrado com `identity`, recebimento controlado, suppression/observabilidade/runbook e aceite humano. Implementação, configuração e operação são evidências separadas.

Release exige integração de consumers aprovada, resolução dos conflitos aplicáveis, CI/review do candidate HEAD, readiness operacional e autorização explícita de merge/deploy. CI verde de PR não libera produção; `.github/workflows/deploy.yml` só aceita CI de push em `main`; `.github/workflows/ci.yml` mantém `db-types` desabilitado. Não executar `db:*`, SMTP ou inspeção de conta nesta etapa.
