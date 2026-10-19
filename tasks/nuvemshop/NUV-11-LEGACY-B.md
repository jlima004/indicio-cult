# NUV-11-LEGACY-B — ratificação e exceção documental

- **Decisão:** `HUMAN APPROVED` em 2026-10-19 (America/Sao_Paulo), alternativa B aprovada pelo owner.
- **Estado da emenda:** `RATIFIED / DOCUMENTAL_AMENDMENT_PENDING_HUMAN_MERGE`; não é aceite técnico atual de NUV-11.
- **Baseline de referência:** `main @ a11ff4f0a453f33d60f922f41cc600c546a67b5f` (merge PR #44).
- **Proveniência humana:** documento fornecido pelo owner `NUV-11-LEGACY-B-ratificada.md`, que registra a aprovação explícita na conversa após a proposta NUV-11-LEGACY. SHA-256 dos bytes recebidos: `74bb7a30ae1a947b3fba31fff2b018ae469c2efcd9e3dee9a1a6299ee75797a4`.
- **Autorização de execução:** prompt fornecido `CODEX-NUV-11-LEGACY-DOC.md`, SHA-256 `6ebc19c5e47249bd61bd5282fce9852e01eb4636ecf365acb5f84ceb0bed04d4`.

## Decisão e alcance

A obrigação original exigia reconciliação bounded do formato fiscal legado. As fontes oficiais mencionam chave/link em dois metafields separados, mas não comprovam nomes, formato, pareamento, coexistência, precedência ou cobertura. A alternativa B permite manter essa compatibilidade `UNVERIFIED / DEFERRED` **somente para avaliar a conclusão técnica local de NUV-11**, com leitor moderno obrigatório e coleção fiscal global honestamente incompleta. O exemplo `201` com `key=link` não prova o contrato legado.

O leitor moderno usa GET de metafields Order com `owner_id` exato, `namespace=nfe`, `key=list` e `fields=value` fixos, JSON-string bounded e validação de todas as 0..N referências, preservando chave/link e `fulfillment_order_id` opcional exato, sem associação inventada. Toda leitura exclusivamente moderna bem-sucedida retorna `invoices.completeness='incomplete'`, inclusive resposta `[]` ou `value='[]'`. `not_consulted` significa não lido; payload presente malformado gera `ProtocolError`. Nenhum desses casos prova ausência fiscal global. Não inferir parser, nomes, aliases, pareamento ou precedência legados nem enumerar metafields cegamente.

Preservam-se transporte/paginação/budget, links absolutos HTTP/HTTPS válidos sem credenciais como referências server-only, sem fetch/proxy/download/redirect/egress. Endereço/recipient/notas/contactEmail continuam sujeitos à minimização e às proibições de PII em logs, erros públicos, analytics, Sentry, shared cache, webhook evidence e tipos/raw de cliente. `/rastreio` continua sem endereço, notas, e-mail, itens, valores ou pagamento; sessão/vínculo/ownership/authorization/disclosure continuam em `orders`/`identity`.

## Sequência de gates

1. A autorização atual permite preparar, validar e publicar PR **documental separada e Draft**, com revisão adversarial independente. A aprovação da decisão não é merge da emenda.
2. Exigir checks/review remotos e **merge humano da emenda documental antes de retomar a branch técnica** `codex/nuv-11-orders`.
3. Só depois reconciliar a branch técnica, revalidar evidências, reexecutar gates sobre o novo candidate HEAD e obter revisão adversarial final; eventual PR técnica exige seus próprios gates. Nenhum checkbox técnico é satisfeito por esta ratificação.
4. NUV-23 prova modern-only `incomplete` com refs e vazio, não lido versus malformado, sem falsa ausência. NUV-25 e consumers provam tratamento honesto da incompletude antes de liberar suas próprias obrigações. O DAG e os critérios 3/17/18 permanecem aplicáveis.
5. HR-02 permanece **OPEN** para acesso autenticado real, capabilities efetivas e scopes; os demais HR/gates não são fechados. Uso real, mudança de scopes, merge/deploy técnico e ativação operacional exigem autorizações separadas.

## Pendência e reabertura

**`DEFERRED_PROVIDER_EVIDENCE_REQUIRED` — owner product/integrador Nuvemshop; adjudicação posterior conjunta com engenharia e privacidade.**

Gatilhos: documentação oficial específica; resposta oficial verificável de suporte; ou ensaio read-only expressamente autorizado após HR-02 em conta compatível, com evidência anonimizada e aprovação humana. A prova deve demonstrar nomes/namespace/key/value, ownership, cardinalidade/pareamento, coexistência/precedência frente a `nfe/list`, paginação, limites, completude e PII. Qualquer retomada exige contrato, fixtures, implementação, revisão independente e aprovação próprios; a decisão atual não antecipa uma solução nem considera a pendência resolvida.

## Fontes e evidência reportada

Fontes oficiais públicas consultadas em 2026-10-19, sem API autenticada:

- [Order 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order): leitura moderna e menção ao formato anterior; não fornece o contrato legado necessário.
- [Metafields 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/metafields): campos genéricos, sem definir nomes NF-e legados.
- [Invoice Management / guia ERP](https://nuvemshop.dev/en-US/apps/erp-guide/orders/invoices): formato moderno, sem comprovar o mapeamento legado.
- [SPEC §10 — Orders](../../docs/specs/SPEC-nuvemshop.md#orders) e subseção NUV-11-LEGACY; [PLAN](./plan.md#nuv-11-legacy-b-human-approved--2026-10-19); [TODO NUV-11](./todo.md#nuv-11--order-getlist-e-contactemail), NUV-23 e NUV-25: contratos e obrigações downstream desta emenda.

O relatório **local da branch técnica**, `tasks/nuvemshop/NUV-11-evidence.md`, foi apenas lido e permanece fora desta PR. SHA-256 observado: `cf087e54b1a11c8c1e1d3f693e1d08830d83e1e310657b47bcf5d8cf2a8784c2`. Ele reporta fingerprint técnico `994569c4bd913fddfcc05af8ce87c31cc223249417c86f88d9ce2d7667e9b7c3`, 2.525/2.525 testes, 141 checks, build PASS e revisão adversarial técnica **parcial**, sem commit/PR/CI remoto naquele snapshot. Esses resultados não foram reexecutados nem concedem aceite nesta adjudicação; não provam o novo candidate HEAD, integração operacional, coverage fiscal completa ou liberação de consumers. O relatório histórico não é alterado nem copiado integralmente para o Git.
