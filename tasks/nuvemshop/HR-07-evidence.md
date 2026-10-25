# HR-07 — evidência da materialização documental

Data: 2026-10-24 (America/Sao_Paulo). Repositório `jlima004/indicio-cult`.

## Proveniência e preflight

- Baseline conhecida e `origin/main`, após `git fetch origin main` e conferência remota: `e96ac9763f77056fc2c7acdf01af4394ea0cf188`.
- Worktree isolada: `/home/jlima/.codex/worktrees/hr-07-human-ratification/indicioCult`; branch `codex/hr-07-human-ratification`. Checkout principal e arquivos alheios preservados.
- Fonte humana recebida em `docs/HR-07-DECISAO-HUMANA-MVP.md` no checkout principal; cópia exata arquivada em [sources/HR-07-DECISAO-HUMANA-MVP.txt](./sources/HR-07-DECISAO-HUMANA-MVP.txt). SHA-256: `22d45b474fd67321a14804c6908f18f15f1656e0592c4c585765e6288a4d4b7f`.
- Dossiê v2 recebido em `/tmp/nuv-16/HR-07-DECISION-DOSSIER.md`; cópia exata arquivada em [sources/HR-07-DECISION-DOSSIER-v2.txt](./sources/HR-07-DECISION-DOSSIER-v2.txt). SHA-256: `abdf7b7589dab1985ef9193f49c819a732f1ae3cc330b70b6c6cf937fffe4e1c`.
- A extensão `.txt` conserva os bytes das fontes, inclusive Markdown original, sem normalização pelo formatador. Somente os dois hashes acima são atestados aqui. Relatos de ambiente e referências auxiliares das fontes são históricos; não representam novas verificações nem autorização operacional.
- Node local e `.nvmrc`: `22.23.1`; solicitação humana `22.23.0` registrada para reconciliação futura. Dependências locais existentes copiadas sem instalação, alteração de pacote ou lockfile; nenhum arquivo de credenciais copiado.

## Escopo do candidato

Sete arquivos exclusivamente documentais: [HR-07.md](./HR-07.md), este recibo, as duas fontes arquivadas e suplementos mínimos em [SPEC](../../docs/specs/SPEC-nuvemshop.md), [PLAN](./plan.md) e [TODO](./todo.md). Os suplementos preservam as linhas históricas e delimitam a precedência da ratificação de direção, sem liberar implementação.

Não há migrations, schemas SQL executáveis, cliente de persistência, worker, rota, ACK, testes de banco, roles, usuários, credenciais, secrets ou alteração de CI/Docker/infraestrutura. Nenhum teste remoto Supabase, chamada real Nuvemshop, Ready, merge ou deploy faz parte desta execução.

## Auditoria e revisão independentes

Subagentes reais: `contract_audit` auditou contrato e fontes; `document_author` escreveu o registro e os suplementos; `adversarial_review` faz revisão independente; `final_validation` confere o candidato final. A aprovação arquitetural humana de 2026-10-24 é reconhecida e não foi solicitada novamente.

Auditoria de contrato: hashes conferidos; matriz D1–D10 exclusiva de HR-07, separada de D1–D5 do DAG; atomicidade, acesso mínimo e fronteira HR-08 preservados; ensaios avançados dispensados identificados como `DEFERRED_UNPROVEN`.

Parecer adversarial independente r1: **APTO_PARA_PR_DRAFT**, zero findings P0/P1/P2/P3. Leitura integral dos sete arquivos candidatos e comparação com os originais; hashes e ausência de credenciais conferidos. O revisor reproduziu a validação documental e `git diff --check`; não executou banco, provider ou CI. Parecer externo: `/tmp/hr-07-materialization/adversarial-r1.md`, SHA-256 `a4279e525ea322c324f9f26da9831305dd2fcb4082035f32c4638cc9b6e5d705`.

O parecer confirmou precedência limitada e preservação histórica; ratificação D1–D10 sem reaprovação; atomicidade/invariante inverso/acesso mínimo não dispensados; unknown terminal e fronteira HR-08; redução de ensaios restrita ao aceite MVP de NUV-16; provas das demais tasks antes do ACK público; transporte/Node/isolamento pendentes e owner único sem cobertura 24×7. Os seis arquivos de contrato/fontes foram congelados com seus hashes no parecer. Atualizar apenas este recibo com resultados reais exige nova conferência de evidência, sem mudar o contrato revisado.

## Gates locais

| Gate                             | Resultado                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Hashes das duas fontes           | PASS — cópias exatas conferidas                                                                                         |
| Formatação do candidato          | PASS — Prettier; conferência final após atualizar este recibo                                                           |
| Validação documental             | PASS — sete documentos, dez IDs, links locais e linhas históricas preservadas                                           |
| `npm run check`                  | PASS final — 2.888/2.888 unitários + 141/141 tooling, zero falhas/skips; falha inicial preservada abaixo                |
| `git diff --check` do candidato  | PASS                                                                                                                    |
| Revisão adversarial independente | PASS documental — APTO_PARA_PR_DRAFT, zero findings P0–P3                                                               |
| Validação final independente     | PASS — APTO_PARA_COMMIT_PUSH_PR_DRAFT; parecer local `5e9fcd77d78b56914a3035b2f154733f681b2974bcb16e2cf2e9d32d3de02493` |

Os comandos de validação usam apenas configuração sintética no processo. Não verificam transporte SQL/TLS, grants reais, atomicidade ou isolamento Supabase, que continuam gates técnicos futuros. Nenhum resultado local transfere evidência de CI privilegiada.

## Falha inicial e controles de timeout

O primeiro `npm run check` integral terminou **FAIL**, exit 1, em **696,283 s**: 2.886/2.888 unitários passaram, com dois timeouts no boundary (`TSTYPES-09-ROOT` e `TSTYPES-15`, limite original 5.000 ms); 141/141 tooling passaram. O log `npm-check-initial-failed.log` foi preservado, SHA-256 `e5659e15b1b60bc6fb57e7e7592caf9e184cb35aa7f22a7fa1a5f1d104c4fbdc`.

Controles focados sequenciais executaram os mesmos dois casos na baseline `e96ac976…` e no candidato, com o mesmo Node, testes/config/lockfile e dependências. A baseline foi extraída por `git archive`, sem arquivos privados, com dependências materializadas idênticas. Ambos reproduziram **dois timeouts**, exit 1; os 596 casos fora da seleção não são PASS. Comando: `npm run test -- tests/unit/modules/nuvemshop/boundary.test.ts -t 'TSTYPES-(09-ROOT|15) cannot fabricate runtime or explicit-marker protection'`.

| Controle                                 | Resultado              | SHA-256 do log                                                     |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| Baseline com dependências materializadas | FAIL timeout, 40,263 s | `6c18a1fbf42203c6719aced21b1ec961dd9c9bf6e628da94a7a988bcad0bcb42` |
| Candidato                                | FAIL timeout, 14,523 s | `98a988f516e9b091d775ea7127d45a812fa4e13766f49765f5082e0aa30fa7be` |

Um primeiro controle da baseline com symlink de dependências falhou por montagem incompatível com o guard de declarações Node; é **falha de setup**, não reprodução de timeout. Seu log foi preservado (`13fde37702c4a05bbed4a98c4e84aba81b500fd5cba37a81ddf1e8e3253303ab`) e o controle foi corrigido apenas materializando as dependências externas ao repositório. Nenhum código, teste, timeout, assertion, pacote, lockfile ou workflow mudou.

Classificação: limite de tempo reproduzido na baseline; causa e eliminação da intermitência não comprovadas. A segunda execução integral inalterada terminou **PASS**, exit 0, em **675,048 s**: **2.888/2.888 unitários em 38 arquivos e 141/141 tooling**, zero falhas/skips. Log `npm-check-final.log`, SHA-256 `0df28b3657a4787652b93fcc083a1c3b198ba5e1c142864c2bcf98838049119e`. Nenhum controle focado substitui o gate completo; o PASS posterior não apaga a falha nem prova eliminação de intermitência. Os dois warnings preexistentes de lint no boundary permanecem, sem erros. Logs e recibos externos: `/tmp/hr-07-materialization/`.

Revisão adversarial independente r2 da narrativa e dos logs: **zero findings P0–P3**, `PUBLICATION_PENDING_LOCAL_GATES`. Os seis hashes contratuais do parecer r1 continuam idênticos. Parecer `/tmp/hr-07-materialization/adversarial-r2.md`, SHA-256 `124dfef4a35f21b9f923f942e4ef6d7b738e9f779348796989970f0046770ea9`. A revisão não converte controles em gate completo nem atesta causalidade, eliminação de intermitência ou ausência geral de regressão.

## Publicação e gates posteriores

PR Draft, candidate HEAD, CI e Codex Review: **PENDING_PUBLICATION** nesta fotografia pré-publicação. A descrição final da PR vinculará o SHA exato, CI e revisão remota aos recibos, sem criar novo commit somente para gravar o próprio SHA.

O objetivo documental é `HR-07 / HUMAN_RATIFIED_DIRECTION / NORMATIVE_MATERIALIZATION_READY_FOR_HUMAN_REVIEW`. A eficácia normativa depende da aprovação humana do merge documental por HEAD, considerando o deploy automático existente. NUV-16 permanece bloqueada até a materialização normativa e a reconciliação dos pré-requisitos aplicáveis descritos em HR-07; a presente PR não concede autorização de implementação ou mutação remota.
