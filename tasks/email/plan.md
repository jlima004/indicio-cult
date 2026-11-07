# EMAIL-01 — plano proposto e análise de alternativas

Data: 2026-11-06. Status: **EMAIL-01-A documental; decisões humanas pendentes**. Contrato: [SPEC-email](../../docs/specs/SPEC-email.md). Checklist: [todo](./todo.md). Nenhuma etapa B/C/D está autorizada por este plano.

## 1. Direção, owners e dependências

`foundation → EMAIL-01-A → adjudicação → B → C → D`. EMAIL-H07 resolve o pré-requisito externo do mapa antes de B. C depende da escolha de provider e dos contratos de segurança/resiliência; D depende de autorizações de configuração e envio, responsáveis nominais e integração Auth com `identity`. Consumers de troca, saldo, convite e newsletter são trabalhos posteriores com seus contratos próprios, sem dependência reversa do módulo `email` no DAG Nuvemshop.

PO decide escopo e ratificações; técnico mantém contrato/testes; operação responde por DNS, quotas, incidentes e runbook; privacidade/jurídico decide finalidade, retenção e transferência. Pessoas ainda não designadas. Não atribuir essas funções a alguém apenas por acesso ao repositório.

A `main` remota foi conferida em `11d52cf05b5a60160f00c815111838e0e474d1bf`, igual ao baseline. Lockfile é a referência de dependências; a instalação local divergente está registrada em SPEC-email §1. Nenhum commit posterior exigiu reconciliação normativa no início. PR Draft em branch `docs/email-01-contract`, sem promoção para Ready, merge ou deploy.

## 2. Pesquisa oficial e alternativas

Todas as fontes abaixo foram consultadas em **2026-11-06**. São páginas públicas mutáveis; sem versão de SDK selecionada. Preços em USD publicados, sem converter câmbio ou presumir imposto, elegibilidade, crédito promocional ou contratação no Brasil. Números devem ser reconferidos em C/D e vinculados ao plano/conta selecionados. A pesquisa não usou contas nem credenciais de Supabase/Resend/Postmark/AWS.

| Eixo                      | Resend                                                                                                                                     | Postmark                                                                                                                                     | Amazon SES                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API e SMTP                | API HTTPS, SDK Node e SMTP [R1/R2]                                                                                                         | API, biblioteca Node/TS oficial e SMTP [P1/P2]                                                                                               | API v2, SDK AWS ou SMTP com credencial própria regional [S1/S3]                                                                   |
| Node 22 / Next 16         | Guia Next oficial; API server-only viável; SDK exato/engines a provar em C [R1]                                                            | Biblioteca oficial declara Node 18+, compatível com requisito Node 22; integração Next a provar em C [P1]                                    | API HTTPS não depende do framework; engine/versão SDK a selecionar/testar em C [S1]                                               |
| Supabase Auth             | Guia SMTP específico [R3]                                                                                                                  | SMTP genérico é compatibilidade de interface proposta, não integração testada [P2/A1]                                                        | SMTP genérico regional é compatibilidade proposta, não integração testada [S3/A1]                                                 |
| SPF/DKIM/DMARC            | Verificação de domínio com SPF/DKIM; DMARC exige política/alinhamento corretos [R10/R13]                                                   | DKIM e custom Return-Path para alinhamento; não copiar SPF genérico para domínio principal [P8]                                              | DKIM e domínio MAIL FROM customizado para alinhamento SPF/DMARC [S8]                                                              |
| Entregabilidade/reputação | Suppression e eventos; envio regional. Nenhuma prova de inbox deste domínio [R8/R11/R12]                                                   | Separação de streams transacionais/broadcast, delivery/bounce/complaint; reputação do domínio não testada [P4/P2]                            | Conta/região, reputação, quotas e configuração de eventos exigem mais operação; SES admite duplicatas raras [S2/S9]               |
| Idempotência              | Chave até 256 caracteres, retenção 24h; API e header SMTP próprio [R4]                                                                     | Não oferece chave de idempotência [P3]                                                                                                       | `SendEmail` v2 não expõe `ClientToken` no contrato consultado; não assumir dedup nativa [S1]                                      |
| Limites e quotas          | Padrão atual: **10 requests/s por equipe**, compartilhado entre chaves; quotas mensal/diária distintas [R5/R6]                             | 429 documentado; limite universal numérico não confirmado, capacidade depende de validação futura [P5]                                       | Sandbox: 200 destinatários/24h e 1/s, por região; saída de sandbox/quotas produção exigem aprovação [S2]                          |
| Erros/retry               | 409 concorrência versus payload conflitante; 429 de taxa versus quota; 5xx/timeout requer identidade/janela e possível indeterminação [R6] | 422 inválido, 429 e 5xx; timeout após envio não admite retry seguro automático sem garantia adicional [P3/P5]                                | Throttling/quota/rejeição por código; sem dedup comprovada, efeito incerto exige reconciliação [S1/S2/S9]                         |
| Entrega/bounce/complaint  | Webhooks `sent`, `delivered`, `bounced`, `complained`, `failed`, `suppressed` [R8]                                                         | Webhooks delivery, bounce, spam complaint e suppression [P4]                                                                                 | Configuration sets publicam em SNS/EventBridge/CloudWatch/Firehose; HTTP requer integração adicional [S5]                         |
| Logs, retenção e PII      | E-mail/log 30 dias nos planos públicos; dados armazenados EUA mesmo com envio São Paulo [R12]                                              | Conteúdo/atividade padrão 45 dias; mínimo/customização têm divergência nas fontes; suppression/estatísticas podem persistir além [P7/P9/P10] | Retenção de eventos depende dos destinos configurados; sem prazo universal de conteúdo/log comprovado nas fontes consultadas [S5] |
| Testes                    | Destinatários de simulação `@resend.dev`; **consomem quota** [R9]                                                                          | Sandbox simula sem entrega real; **consome volume mensal** [P6]                                                                              | Mailbox simulator não consome quota diária nem métricas de bounce/complaint [S7]                                                  |
| Custo documentado         | Free 3.000/mês, limite 100/dia; Pro US$20/mês por 50.000, extra US$0,90/1.000 [R7]                                                         | Free 100/mês; na seleção de 10.000/mês: Basic US$15, Pro US$16,50, Platform US$18; extra Basic US$1,80/1.000 [P11]                           | À la carte: outbound US$0,10/1.000 + US$0,12/GB de anexos; planos e outros recursos têm preços próprios [S4]                      |
| Operação no Brasil        | Região de envio São Paulo `sa-east-1`; armazenamento EUA; contratação/pagamento por conta ainda não comprovados [R11/R12]                  | Serviço global API/SMTP; hospedagem primária próxima Chicago/AWS; região Brasil não comprovada [P9]                                          | API e SMTP em `sa-east-1` publicados; disponibilidade e limites da conta não comprovados [S3]                                     |

**Condições SES.** A referência de US$0,10/1.000 é a opção à la carte, sem plano. A mesma página oferece Essentials (US$0,16/1.000 na faixa 0–10M/mês), Pro e Enterprise. A tabela denomina a taxa por GB como dados de anexos; exemplos calculam dados da mensagem. Confirmar a base de cobrança antes de contratar; não estimar TCO só pelo preço unitário [S4]. O simulador é cobrado como outbound, apesar da isenção de quota diária [S4/S7].

**Tradeoff proposto.** Resend reduz o trabalho de integração inicial pela combinação API/SMTP/Supabase e dedup limitada; Postmark favorece operação transacional com streams e diagnóstico, porém sem idempotência nativa; SES tem menor preço unitário publicado e região Brasil, com maior custo de configuração/observabilidade. Essas são inferências arquiteturais, não medições comparativas de entrega, latência ou TCO. O baixo volume de vendas não estima sozinho o volume de Auth, recuperação e tentativas abusivas.

**Recomendação condicionada.** Manter Resend como candidato preferencial, SMTP customizado para Auth e API apenas para consumers futuros aprovados. EMAIL-H01/H05 precisam avaliar custo, contrato, subprocessadores e transferência: a FAQ Resend recusa instrumentos nacionais específicos, incluindo LGPD/ANPD. Região de envio não comprova residência nem suficiência jurídica. Se a análise humana não aprovar, comparar instrumentos e custos dos outros candidatos antes de selecionar adapter; não escrever código preso ao candidato.

**Divergências de documentação.** Postmark analytics anuncia retenção 0–365 dias [P10], mas suporte [P7] descreve 7–365 e impossibilidade de desligar retenção de conteúdo; adotar 45 dias padrão como evidência, sem prometer zero. Hook Supabase chama o campo de `email` na referência e `email_data` no exemplo [A2]; não fixar schema de runtime a partir disso. Changelog público Supabase foi consultado: mudança CLI v3 de 2026-11-04 não é aplicável (nenhuma CLI usada); remoção de cifras TLS antigas prevista para 2026-11-10 [A5] deve ser verificada na integração futura.

### Registro de fontes oficiais

| ID  | Fonte/URL e escopo                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | [Resend — Next.js](https://resend.com/docs/send-with-nextjs), integração server-side documental                                                      |
| R2  | [Resend — SMTP](https://resend.com/docs/send-with-smtp), transporte                                                                                  |
| R3  | [Resend — Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), requisitos de domínio/chave e integração                                  |
| R4  | [Resend — idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys), janela/chave/header                                          |
| R5  | [Resend — rate limits](https://resend.com/docs/api-reference/rate-limit), limite por equipe e headers                                                |
| R6  | [Resend — errors](https://resend.com/docs/api-reference/errors), classificação por código                                                            |
| R7  | [Resend — pricing](https://resend.com/pricing), tabela transacional Free/Pro                                                                         |
| R8  | [Resend — event types](https://resend.com/docs/webhooks/event-types), significado das observações                                                    |
| R9  | [Resend — test emails](https://resend.com/docs/dashboard/emails/send-test-emails), simulação e quota                                                 |
| R10 | [Resend — domains](https://resend.com/docs/dashboard/domains/introduction), SPF/DKIM                                                                 |
| R11 | [Resend — regions](https://resend.com/docs/dashboard/domains/regions), região de envio                                                               |
| R12 | [Resend — security](https://resend.com/security), armazenamento, retenção e contratos                                                                |
| R13 | [Resend — DMARC](https://resend.com/docs/dashboard/domains/dmarc), alinhamento/política                                                              |
| R14 | [Resend — webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), corpo original/assinatura                                |
| R15 | [Resend — suppressions](https://resend.com/docs/dashboard/emails/email-suppressions), bounce/complaint e restrições                                  |
| P1  | [Postmark — official libraries](https://postmarkapp.com/developer/integration/official-libraries), Node/TS                                           |
| P2  | [Postmark — SMTP](https://postmarkapp.com/developer/user-guide/send-email-with-smtp), transporte e streams                                           |
| P3  | [Postmark — idempotency](https://postmarkapp.com/support/article/what-is-an-idempotency-key), ausência de suporte                                    |
| P4  | [Postmark — webhooks](https://postmarkapp.com/developer/webhooks/webhooks-overview), delivery/bounce/complaint                                       |
| P5  | [Postmark — API overview](https://postmarkapp.com/developer/api/overview), erros e limites                                                           |
| P6  | [Postmark — sandbox](https://postmarkapp.com/developer/user-guide/sandbox-mode), simulação e volume                                                  |
| P7  | [Postmark — retention add-on](https://postmarkapp.com/support/article/how-does-the-retention-add-on-work), padrão e customização                     |
| P8  | [Postmark — SPF](https://postmarkapp.com/support/article/how-do-i-set-up-spf-for-postmark), SPF/DKIM/DMARC                                           |
| P9  | [Postmark — security/redundancy](https://postmarkapp.com/support/article/is-postmark-secure-and-redundant), hospedagem e dados                       |
| P10 | [Postmark — analytics](https://postmarkapp.com/email-analytics), intervalo de retenção em tensão com P7                                              |
| P11 | [Postmark — pricing](https://postmarkapp.com/pricing), seleção de 10.000 mensagens/mês                                                               |
| S1  | [SES — SendEmail API v2](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html), campos/resultado                                |
| S2  | [SES — quotas](https://docs.aws.amazon.com/ses/latest/dg/quotas.html), sandbox e limites regionais                                                   |
| S3  | [SES — endpoints](https://docs.aws.amazon.com/general/latest/gr/ses.html), API e SMTP São Paulo                                                      |
| S4  | [SES — pricing](https://aws.amazon.com/ses/pricing/), outbound e dados                                                                               |
| S5  | [SES — event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html), destinos/configuration sets                 |
| S7  | [SES — mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html), teste sintético                                |
| S8  | [SES — DMARC](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html), DKIM/SPF/alinhamento                                  |
| S9  | [SES — deliverability](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-deliverability.html), resultado de envio/duplicatas             |
| A1  | [Supabase — custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), restrições e limites iniciais                                             |
| A2  | [Supabase — Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), alternativa e schema; atualização exibida 2026-10-22 |
| A3  | [Supabase — Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks), deadline HTTP 5s; atualização exibida 2026-10-22                          |
| A4  | [Supabase — email templates](https://supabase.com/docs/guides/auth/auth-email-templates), placeholders gerenciados                                   |
| A5  | [Supabase — TLS ciphers](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), verificação futura de conectividade                             |

## 3. Fatiamento e critérios de aceite

| Etapa                           | Entrega técnica proposta                                                                            | Configuração real                                                                 | Operação comprovada e saída                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A — contrato e decisão proposta | Spec, alternativas/fontes, riscos, testes e decisões humanas; revisão independente                  | Nenhuma                                                                           | PR Draft documental, CI do candidate acompanhada; pronto para adjudicação, sem provider ratificado            |
| B — infraestrutura local        | Fachada tipada, validação, renderer/base e dois artefatos Auth, fake e diagnósticos seguros         | Nenhuma; sem SDK/credencial/rede                                                  | Testes sintéticos e build de fronteira cliente; nenhuma prova de entrega. Depende ratificação local/EMAIL-H07 |
| C — adapter                     | Provider ratificado, transporte/env server-only, resultado validado, mocks de erros/retries/unknown | Variáveis apenas especificadas/fixtures sintéticas; sem conta ou DNS presumidos   | Compatibilidade Node/Next do lockfile e testes; envio real continua bloqueado                                 |
| D — readiness                   | Integração Auth aprovada, observabilidade, suppression e runbook                                    | Domínio/remetente/SPF/DKIM/DMARC e Supabase, somente com autorizações específicas | Ensaio controlado e evidência de MIME/recebimento/falha; aceite humano com limitações e rollback              |

B não satisfaz sozinho EMAIL-01; C com mocks não comprova domínio, quotas ou entrega; D não autoriza consumers ausentes. A produção de artefatos Auth em B não autoriza implementar `identity`. Critérios detalhados e casos negativos estão em SPEC-email §§10–11.

## 4. Matriz de riscos e contenção

| Risco                                      | Impacto                                 | Contenção/gate                                                                                  |
| ------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Confundir 2xx/SMTP com caixa de entrada    | Falsa confirmação de serviço            | Separar submissão/evento, nunca marcar DELIVERED por HTTP                                       |
| Timeout/crash e reenvio após 24h           | Duplicata sem prova de falha            | INDETERMINATE, identidade congelada, reconciliação; decisão H04                                 |
| Provider sem chave nativa                  | Retry ambíguo duplica                   | Não retry/failover após possível aceite; ledger não elimina ambiguidade remota                  |
| Envio arbitrário/abuso                     | Exfiltração, custo e dano à reputação   | Fachada interna; autorização por finalidade e destinatário; um destinatário; quotas/suppression |
| Token/endereço em logs                     | Exposição e uso indevido de Auth        | Allowlist de diagnóstico, canários e inspeção de logs/bundle; não passar erro SDK ao Sentry     |
| Transferência/retenção externa inadequada  | Dados reais processados sem adjudicação | EMAIL-H05 e revisão contratual antes de provider/PII; retenção app separada do provider         |
| Conflito PRD/mapa ignorado                 | Implementação com requisito inventado   | EMAIL-N01/N02/N03 registrados, suspensão somente da materialização conflitante                  |
| Domínio sem alinhamento/complaint ignorada | Rejeição e bloqueio reputacional        | DNS/MIME verificados em D, rotina de suppression e suspensão de envio                           |
| Templates locais divergem do Supabase      | Link/MIME de produção incorreto         | Artefato Go, preview sintético e teste Auth real autorizado em D com identity                   |
| Limites globais e excesso de custo         | Indisponibilidade Auth/serviço          | Quotas do Auth e provider separadas, orçamento, alerta e teto de retries                        |
| Instalação local diverge do lockfile       | Verificação não reproduzível            | CI usa npm ci; B/C precisam ambiente do lock, sem upgrade implícito                             |

## 5. Harness, revisão e publicação

Orquestração desta execução: agente principal integra e escreve os três documentos. Subagentes sem autoria dos arquivos: `architecture` (fontes locais/contratos Next/TS), `providers` (fontes públicas/provedores/Auth) e `security` (ameaças/privacidade/durabilidade). Revisor adversarial adicional em contexto novo, sem autoria e sem responsabilidade pela pesquisa anterior, verifica os documentos contra o pedido e fontes.

Configurações comprovadas pelas chamadas: os três pesquisadores receberam contexto integral, sem override de modelo/esforço; revisor recebe contexto novo e configuração herdada sem override. Os identificadores exatos de modelo/backend, esforço efetivo e parâmetros de amostragem não foram expostos pela ferramenta e não são atribuídos. Não declarar diversidade de modelos como evidência quando só existe separação de contexto/responsabilidade.

Skills aplicadas: using-agent-skills, spec-driven-development, planning-and-task-breakdown, documentation-and-adrs, git-workflow-and-versioning, api-and-interface-design, security-and-hardening, code-review-and-quality, Supabase e **Resend email-best-practices 1.0.2**. Exemplos genéricos da skill não prevalecem sobre o pedido: não copiar logs de payload/endereços, ACK antes de persistência, reconstrução JSON para verificar assinatura ou alegação exactly-once.

Verificações desta etapa:

```bash
git diff --check
./node_modules/.bin/prettier --check docs/specs/SPEC-email.md tasks/email/plan.md tasks/email/todo.md
```

Verificar links locais e fontes públicas, ausência de segredos/dados reais e diff limitado aos três arquivos. CI existente roda `npm run check`, build, E2E, Gitleaks, verificação de bundle e Docker. `db-types` permanece skipped por configuração existente, sem prova de banco remoto. Nenhum teste de runtime novo é necessário para três Markdown; runtime/DB/SMTP/provedor não foram ensaiados em A.

Revisão independente local concluída: um P2 sobre destinatário de convite pós-compra foi corrigido e revalidado; nenhum P1/P2 remanescente. Prettier dos três documentos aprovado, 39 URLs públicas responderam HTTP 200 e nenhum link local está ausente. A conferência HTTP complementa a pesquisa de conteúdo, sem provar estabilidade futura das páginas.

Publicar Draft, solicitar `@codex review` e acompanhar CI/review do SHA candidato. Registrar resultado remoto na PR/comentário vinculando SHA, evitando alterar os documentos só para inserir o próprio hash ou uma conclusão futura de CI. Qualquer novo commit por correção invalida o vínculo anterior e exige acompanhar o novo HEAD. Não promover Ready, merge ou deploy. O workflow de produção exige push de `main`; uma PR não autoriza esse evento.

## 6. Adjudicação necessária

Ratificar EMAIL-H01–H07 em SPEC-email §11, com pessoas e decisões concretas: provider/plano/domínio; SMTP ou Hook; finalidade e conflitos do PRD; política de perda/duplicata e persistência; retenção/transferência/suppression; operação e alertas; e interpretação do pré-requisito externo antes de B. Autorizar B/C/D de forma específica. Se mudar arquitetura, registrar nova decisão antes de alterar código/schema/worker. Merge/deploy continuam sem autorização.
