# EMAIL-01 — tarefas e gates propostos

Contrato: [SPEC-email](../../docs/specs/SPEC-email.md). Alternativas e riscos: [plan](./plan.md). Data: 2026-11-06. **Somente A autorizada.** Caixas futuras abertas não são autorização de execução. Owners são funções propostas, com pessoas pendentes em EMAIL-H06.

## EMAIL-01-A — contrato para adjudicação

- [x] A1 — Reconciliar baseline e fontes normativas locais.
  - Aceite: main remota igual a `11d52cf05b5a60160f00c815111838e0e474d1bf`; dependência somente foundation; conflitos N01–N03 delimitados.
  - Verificação: fetch/rev-parse, PRD/mapa/foundation/ADRs, env/http/sentry e CI/deploy lidos. Lockfile e instalação local diferenciados.
  - Owner: técnico/orquestrador. Arquivos: leitura apenas.
- [x] A2 — Pesquisar provedores e Auth com fontes oficiais públicas.
  - Aceite: Resend/Postmark/SES comparados; custos/quotas/dados/limites e incertezas datados; SMTP versus Hook justificado.
  - Verificação: registro de fontes no plano; sem contas, credenciais, SDK, DNS ou envio.
  - Owners: pesquisa provedores e segurança. Arquivos: leitura apenas.
- [x] A3 — Elaborar proposta revisável.
  - Aceite: sete fluxos mapeados; API server-only, autorização, idempotência/unknown, templates, riscos, matriz positiva/negativa e decisões humanas.
  - Verificação: rastrear pedido para SPEC-email §§1–11 e plan §§1–6.
  - Owner: orquestrador. Arquivos: somente os três documentos desta etapa.
- [x] A4 — Revisão adversarial independente e higiene documental.
  - Aceite: required findings resolvidos, fontes/links e segurança verificados; Prettier/diff-check passam.
  - Verificação: revisão sem autoria, comandos do plano §5 e escopo do diff.
  - Owner: revisor independente + orquestrador. Depende: A3. Resultado: um P2 de autorização do convite corrigido; revisor confirmou ausência de P1/P2 remanescentes. 39 URLs públicas HTTP 200 e nenhum link local ausente.
- A5 — Gate externo: publicar PR Draft e acompanhar o candidate HEAD.
  - Aceite: Draft contra main, SHA registrado, Codex Review solicitado, CI e resultado de revisão registrados com vínculo ao SHA.
  - Verificação: metadados da PR e checks/reviews do HEAD. Falha/pending permanece explícito, sem exceção transferida de outra tarefa.
  - Owner: orquestrador. Depende: A4. Resultado final registrado na PR por SHA, conforme plano §5, para não criar commit circular de metadados. Nenhum Ready/merge/deploy.

Checkpoint A: `EMAIL01_CONTRACT_READY_FOR_HUMAN_ADJUDICATION` somente após contrato revisado e publicação; CI/review remoto devem ser reportados como observados, sem inferir aprovação humana. `EMAIL01_IMPLEMENTATION_NOT_AUTHORIZED` e `EMAIL_PROVIDER_NOT_RATIFIED` permanecem.

## Adjudicação antes de implementar

- [ ] Ratificar EMAIL-H01–H07 com responsáveis nominais e resolver EMAIL-N01 antes de B.
- [ ] Resolver N02 antes do convite e N03 antes do template ao gerente; não alterar PRD/mapa silenciosamente.
- [ ] Autorizar separadamente implementação local, adapter, configuração remota, envio real, persistência eventual e release.

## EMAIL-01-B — infraestrutura local (não autorizada)

Dependências: contrato local ratificado, EMAIL-H07 resolvido e autorização B. Provider real/domínio seguem pré-requisito do mapa salvo decisão humana expressa.

- [ ] B1 — Contrato validado e autorização interna com fake.
  - Aceite: solicitação discriminada por template, destino/remetente aprovados e resultado seguro; dados inválidos não causam egress.
  - Verificação futura: `npm run test -- tests/unit/modules/email/contracts.test.ts tests/unit/modules/email/submission.test.ts`; T01/T02/T04/T05/T09. Os arquivos de teste são propostos, ainda inexistentes.
  - Owner: técnico. Arquivos previstos (até 5): contratos, validação, fachada, fake e teste; dividir em dois commits se separar os dois testes.
- [ ] B2 — Layout e confirmação Auth sintética.
  - Aceite: HTML/texto e placeholders Supabase, identidade aprovada, preview local; nenhum token/link real.
  - Verificação futura: `npm run test -- tests/unit/modules/email/templates.test.ts`; T01/T03/T11 e inspeção do preview sem rede.
  - Owner: técnico + PO/identidade visual. Arquivos previstos: layout, template confirmação, fixtures, teste e preview local (até 5).
- [ ] B3 — Recuperação Auth e prova de fronteira.
  - Aceite: segundo artefato Go compatível, nenhum token criado localmente; import cliente falha em build real, sem depender do mock de server-only do Vitest.
  - Verificação futura: teste focado de template, fixture de build negativo local e `npm run check`; zero SDK/credencial/envio.
  - Owner: técnico. Arquivos previstos: recuperação, teste, fixture e harness de fronteira (até 4); tooling novo exige revisão própria.

Checkpoint B: fake/renderer e testes locais aprovados; EMAIL-01 continua sem configuração real ou prova de entrega. Ainda não há consumers ativos.

## EMAIL-01-C — adapter do provedor (não autorizada)

Dependências: B aceito, EMAIL-H01/H04 ratificados no escopo C e autorização do transporte/dependência. Sem autorização implícita para conta, DNS, banco ou e-mail real.

- [ ] C1 — Transporte selecionado e configuração privada por operação.
  - Aceite: versão/engines/licença e lockfile verificados; env validado sem vazar valores; provider desabilitado não exige segredo no build; prefixos públicos proibidos.
  - Verificação futura: mocks sem rede, testes de env/bundle, `npm run lint:runtime` e `npm run check`; T04/T06/T09.
  - Owner: técnico. Arquivos previstos: adapter, env, teste adapter, teste env e eventual package/lock em fatia separada.
- [ ] C2 — Retry limitado, identidade e indeterminação.
  - Aceite: chave/payload congelados, limites por provider, timeout/quota e janela tratados; sem failover inseguro ou persistência improvisada.
  - Verificação futura: relógio fake/mocks com casos T05–T09, incluindo quota diária, 409 distintos e crash simulado. `npm run test -- tests/unit/modules/email/provider.test.ts` (nome futuro proposto).
  - Owner: técnico + revisão segurança. Arquivos previstos: política, adapter, dois testes (até 4).

Checkpoint C: compatibilidade técnica reproduzível e mocks aprovados. Nem C nem seu CI comprovam conta, reputação, DNS, entrega ou banco remoto. Se negócio exigir ledger/outbox, obter decisão e autorização próprias antes de materializar.

## EMAIL-01-D — readiness operacional (não autorizada)

Dependências: C aceito, EMAIL-H01–H06 aplicáveis resolvidos, owners designados e autorizações específicas de configuração/envio. Integração Auth depende do contrato/ambiente aprovado de `identity`; isso não cria dependência reversa de email.

- [ ] D1 — Domínio, remetente e autenticação DNS.
  - Aceite: conta/plano aprovados, SPF/DKIM e alinhamento DMARC demonstrados sem afetar emissores existentes; quota e contrato de dados confirmados.
  - Verificação futura: evidência DNS/provider sanitizada pelo operador autorizado. Nenhuma execução nesta etapa A.
  - Owner: operação + privacidade. Alterações externas somente no escopo autorizado; evidência em runbook futuro.
- [ ] D2 — Supabase SMTP e templates Auth.
  - Aceite: configuração aprovada, tipos habilitados cobertos, redirects/PKCE e prazo do Supabase respeitados; MIME HTML/plain text comprovado ou conflito readjudicado antes da ativação.
  - Verificação futura: T10/T11/T14 com destinatário de teste consentido; link expirado/reusado e falha SMTP; sem auth própria.
  - Owner: operação + técnico/identity. Arquivos previstos: artefatos Auth finais, evidência e runbook (até 4).
- [ ] D3 — Ensaio, suppression, observabilidade e recuperação.
  - Aceite: autorização e orçamento de envios, aceite e recebimento separados, bounce/complaint tratados por rotina demonstrável, logs sem PII, suspensão e rollback provados.
  - Verificação futura: T09/T13/T14, evidências sanitizadas vinculadas ao SHA/configuração, canal de alerta e responsáveis. T12 só se um webhook for autorizado como trabalho próprio.
  - Owner: operação + segurança + PO. Arquivos previstos: runbook, evidência e checklist operacional (até 3).

Checkpoint D: aceite humano distingue implementação/configuração/operação, registra limites residuais e autoriza eventual integração de consumers. Mock ou simples resposta HTTP não fecha EMAIL-01. Ready, merge e deploy continuam decisões explícitas posteriores.

Estados preservados nesta execução: `NO_REAL_EMAIL_SEND`, `NO_REMOTE_CONFIGURATION`, `MERGE_NOT_AUTHORIZED`, `DEPLOY_NOT_AUTHORIZED`.
