# HR-08 — dossiê de decisões sobre Privacy Callbacks

## A. Executive Summary

| Registro              | Valor                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Checkpoint            | **`HR08_OPEN / NUV20_BLOCKED_BY_HR08`**                                                                     |
| Natureza              | Proposta documental para adjudicação; nenhuma decisão humana atribuída                                      |
| Baseline inspecionada | `cf9bf04e2c7351d01786ca4e489a429703d6815b`                                                                  |
| Branch                | `docs/nuv-hr-08-decision-dossier`                                                                           |
| Consulta pública      | 2026-11-05, America/Sao_Paulo; 2026-11-06 UTC                                                               |
| Decisões              | **HR08-D1–HR08-D9: `PROPOSED / HUMAN_PENDING`**                                                             |
| Resultado pretendido  | `HR08_DOSSIER_READY_FOR_HUMAN_REVIEW`, condicionado à revisão concluída e publicação da PR Draft documental |

Recomenda-se ratificar um contrato próprio de privacy: três rotas e parser separados, autenticação fail-closed proposta, projeção mínima recuperável e COMMIT antes do ACK, coordenação humana de atendimento e execução pelos sistemas que realmente armazenarem os dados. A retenção precisa ser decidida por categoria/finalidade; não se aplicam automaticamente os prazos nem a projeção de HR-07. As alternativas e as lacunas estão em HR08-D1–D9; aprovar o desenho não comprova comportamento do provedor nem autoriza operação.

Há quatro divergências materiais: trigger de Store Redact, cobertura de HMAC, extensão de prazo/retries a privacy e alcance da ferramenta Postman. Elas permitem uma proposta conservadora e testes locais posteriores, mantendo a prova real em NUV-24. Não justificam implementar fallback sem autenticação, equiparar uninstall a exclusão ou adiar a decisão documental até existir NUV-20.

O inventário é estático. Demonstra contratos de persistência e limites do código, sem comprovar tabelas implantadas, linhas reais, retenção em produção ou ausência de outros sistemas. O ledger atual rejeita privacy: reutilizá-lo exigirá extensão coordenada futura, depois da ratificação. Nenhum handler, código, SQL, migration, configuração, credencial, loja, banco remoto, OAuth, callback, worker, merge ou deploy é alterado/executado por este dossiê. Publicação Git/PR e pedido de revisão documental são ações separadas autorizadas no pedido.

## B. Fontes e precedência

As fontes normativas locais foram lidas **antes da pesquisa externa**: [AGENTS][N0], [SPEC §§11, 17 e 19][N1], [PLAN][N2], [TODO][N3], [HR-07][N4], [NUV-19][N5] e [ADR-004][N6]. Ratificações e suplementos de precedência desses documentos continuam vigentes; snapshots antigos de task não são prova de estado remoto atual. Este dossiê não materializa alterações na SPEC, PLAN ou TODO.

| ID / fonte oficial consultada           | Versão / atualização exibida                                             | Escopo e limite                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 — [Webhook][S1]                      | Admin API **2025-03 Stable**; 2026-10-29                                 | Required Webhooks contém nomes/payloads; Verifying a webhook delimita autenticação API; Retry policies descreve transporte geral. Exemplos não são schema formal. |
| S2 — [Authentication][S2]               | Guia público; 2026-10-27                                                 | Descrição das três URLs no painel e fluxo/scopes OAuth. Preserva conflito de trigger com S1.                                                                      |
| S3 — [FAQ Nuvemshop][S3]                | Guia público PT; 2026-10-27                                              | Confirma três nomes atuais e orientação HMAC genérica; não resolve expressamente a extensão às URLs privacy.                                                      |
| S4 — [LGPD Webhooks Testing Tool][S4]   | Predecessora oficial, **2025-03**; 2026-10-08                            | Publica teste parcial induzido e ressalva sobre `data_request`. Exibe mudança para [URL moderna][S4M], cuja abertura falhou nesta consulta.                       |
| S5 — [Changelog][S5]                    | Predecessora oficial, **2025-03**; entradas 2025-12-09 e 2026-07-29      | Histórico de documentação, não prova de mudança na API. Exibe [sucessora][S5M], cuja abertura também falhou nesta consulta.                                       |
| S6 — [ANPD: direitos dos titulares][S6] | Página institucional vigente; sem data de atualização exibida na leitura | Direitos e exceções; sucessora oficial da URL com `titular-de-dados-1` indicada no pedido.                                                                        |
| S7 — [ANPD: perguntas frequentes][S7]   | Publicada 2024-07-25; modificada **2026-09-09 16:21**                    | §§5.5, 5.9 e 6.1–6.6: atendimento, direitos e conservação; não fixa um prazo único de eliminação para todo tratamento.                                            |

Consulta das sete fontes em 2026-11-05 local. As predecessoras S4/S5 são fallback documental oficial identificado, sem superioridade presumida sobre a documentação atual. S1 mais recente orienta nomes/exemplos; S4 mantém uma limitação do ensaio, sem transformar `data_request.id` em contrato estável. Confirmar novamente fontes inacessíveis e contratos antes da implementação/operação dependente. Não foi executada coleção Postman nem acessada a loja.

**Rastreabilidade de nomes:** SPEC §11 e fixtures históricas usam `store/redact` e `customers/redact`; S1/S3 atuais usam, respectivamente, **`app/store_redact`** e **`customer/redact`**. Estes são os nomes oficiais documentados neste levantamento. O plural de `/customers-redact` é parte do path interno aprovado, não prova do nome externo. Nome do callback, label de URL no painel, discriminante interno e campo `event` externo são conceitos distintos. Nenhum `event` é mostrado nos três exemplos privacy. Preservar a discrepância histórica e submetê-la à materialização normativa posterior, sem editar a SPEC agora.

## C. Matriz factual dos três callbacks

As células abaixo inventariam **campos exemplificados**, sem copiar pseudopayload como JSON válido. Os exemplos de S1 contêm sintaxe ilustrativa; não comprovam obrigatoriedade individual, nulabilidade, limites, completude dos arrays, ordem ou representação numérica exata em entregas reais. **Não há schema formal completo de campos obrigatórios comprovado nas fontes consultadas.** A necessidade semântica de identificar loja/alvo não prova que um campo exemplificado esteja sempre presente. O perfil mínimo local proposto aparece separadamente em HR08-D3.

| Dimensão                       | Store Redact                                                                                           | Customer Redact                                                                                                                                     | Customers Data Request                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Nome oficial S1/S3             | `app/store_redact`                                                                                     | `customer/redact`                                                                                                                                   | `customers/data_request`                                                                                                                |
| Path interno NUV-19            | `/api/webhooks/nuvemshop/store-redact`                                                                 | `/api/webhooks/nuvemshop/customers-redact`                                                                                                          | `/api/webhooks/nuvemshop/customers-data-request`                                                                                        |
| Label em S2                    | URL Webhook Store Redact                                                                               | URL Webhook Customer Redact                                                                                                                         | URL Customers Data Request Webhook                                                                                                      |
| Contexto documentado           | S1 associa envio à desinstalação; S2 à solicitação do merchant no painel. **DVG-01 aberta.**           | S2 associa ao pedido do merchant no painel. S1 descreve janela condicionada ao histórico de pedidos, cuja interpretação/execução exige confirmação. | Solicitação de informações; S1 atribui à aplicação o encaminhamento ao merchant. Canal e destinatário específico não informados.        |
| Campos mostrados               | `store_id`                                                                                             | `store_id`; `customer.id`, `.email`, `.phone`, `.identification`; `orders_to_redact`                                                                | `store_id`; os mesmos campos de `customer`; `orders_requested`, `checkouts_requested`, **`drafts_orders_requested`**; `data_request.id` |
| Identificação documentada      | ID da loja                                                                                             | ID da loja; ID e atributos do consumidor; IDs de pedidos                                                                                            | ID da loja/consumidor; IDs dos recursos solicitados e ID exemplificado de solicitação                                                   |
| Dados pessoais possíveis       | ID da loja pode identificar pessoa/contexto; não é anônimo por definição                               | Contato e documento; IDs de cliente/pedidos podem ser associáveis a pessoa                                                                          | Mesmo conjunto, acrescido de referências de checkout/rascunho/solicitação                                                               |
| Ação esperada                  | Tratar pedido de eliminação dos dados da loja que a aplicação detenha, com escopo/exceções adjudicados | Tratar eliminação dos dados do consumidor e recursos associados no escopo aprovado                                                                  | Levantar dados efetivamente detidos no escopo, preparar relatório e entregá-lo ao merchant validado                                     |
| Campos opcionais/desconhecidos | Campos adicionais e formalização de `store_id` não estabelecidos                                       | Presença individual de atributos/array, listas vazias/ausentes/null e completude desconhecidas                                                      | Mesmas lacunas; estabilidade/unicidade de `data_request.id` desconhecidas; S4 registra objeto ainda em definição                        |
| Ensaio posterior               | Trigger, autenticação, payload, transporte e configuração reais                                        | Mesmas provas, incluindo semântica temporal e escopo de pedidos                                                                                     | Mesmas provas, sem usar coleção induzida como pedido efetivo ou prova de entrega de relatório                                           |

Fonte dos campos e da responsabilidade de encaminhar: [S1, Required Webhooks][S1]; labels/triggers: [S2][S2]; confirmação de nomes: [S3][S3]. Não há evidência para exigir `event`, `resourceId` ou `deliveryId`. `customer.id`, IDs dos arrays e `data_request.id` não são delivery IDs demonstrados. Os nomes `drafts_orders_requested` e `orders_to_redact` devem ser preservados exatamente, sem corrigir a grafia por intuição.

## D. Divergências e perguntas de confirmação

### DVG-01 — Trigger de Store Redact

S2 (guia público, 2026-10-27) diz “only be triggered if the Merchant requests”; S1 (Admin API 2025-03, atualizada 2026-10-29) diz “After a merchant uninstall your app”. O primeiro trecho restringe a descrição à solicitação do merchant no painel; o segundo associa o envio à desinstalação. São afirmações distintas. S5, entrada **2025-12-09**, registra retirada de uma antiga demora de 48 horas para Store Redact, adotando a descrição após uninstall; não restaurar essa demora histórica nem confundi-la com a janela geral de retries.

Hipóteses compatíveis, **não fatos**: a desinstalação poderia incluir solicitação de exclusão, ou haver fluxos/condições diferentes no painel. Pode existir conflito real de documentação. Escolher uma hipótese silenciosamente arrisca apagar sem condição aprovada ou deixar de atender uma solicitação válida. Pergunta ao provedor/ensaio autorizado: **em que ação e condições cada app recebe `app/store_redact`, e como isso se distingue de `app/uninstalled`?** Até confirmação, lifecycle apenas interrompe/reconcilia operação conforme seu contrato; não autoriza eliminação irreversível. A chegada de callback privacy autenticado pode registrar trabalho recuperável, mas efeitos dependem da policy ratificada HR08-D2/D5.

### DVG-02 — Autenticação

S1 delimita o verificador a webhooks criados pela API; S3 oferece orientação HMAC geral junto às perguntas sobre callbacks, sem afirmar expressamente cobertura individual das três URLs privacy. Não há prova específica de entrega real para cada uma. **Proposta local:** shared-verifier de NUV-14, HMAC-SHA256 sobre bytes originais, segredo da app, header `x-linkedstore-hmac-sha256`, hexadecimal conforme contrato local; autenticação antes do parse. A reutilização é desenho fail-closed, **não garantia operacional privacy**.

Não inventar outro header, algoritmo ou fallback sem assinatura. Entrega real incompatível deve produzir **`BLOCKED_SPEC_CONTRADICTION`**, contenção e adjudicação humana de segurança antes de retomar/alterar contrato. HMAC também não prova frescor, identidade do titular ou autorização para apagar todos os dados de uma pessoa. HR-03 continua independente para rotação; NUV-24 deverá confirmar autenticação de cada callback.

### DVG-03 — Prazo e retries

S1 descreve, no transporte geral da API, espera por 2xx em **3 segundos** e até **16 tentativas em 48 horas**; S5 registra a revisão documental de 18 para 16 tentativas em 2026-07-29. Não há prova específica suficiente para herdar esse contrato nos callbacks privacy configurados no painel. **Três segundos pode ser alvo interno conservador proposto**, com ACK durável rápido e sem efeitos lentos na request; não é SLA privacy comprovado nem prazo de atendimento do direito. Prazo/retries privacy permanecem **`UNPROVEN / NUV24_EVIDENCE_REQUIRED`**. Aprovar resposta HTTP não promete reentrega nem conclusão em prazo operacional ainda não ensaiado.

### DVG-04 — Ferramenta LGPD/Postman

S4 caracteriza o teste como parcial e induzido, sem refletir efeitos reais em banco, painel ou loja, e ressalva a definição de `data_request`. Pode orientar fixtures e planejamento. Não prova origem/autenticação real, trigger, prazo/retries, configuração produtiva, solicitação efetiva do titular ou entrega do relatório. Seus nomes históricos não prevalecem sobre S1/S3 atuais. Aprovar um futuro ensaio da coleção exige autorização própria e não fecha sozinho nenhum desses gates.

## E. Inventário estático de dados do Indicio Cult

**Critério:** “comprovado” significa caminho/estrutura explícitos no repositório da baseline. Não significa que haja dados persistidos em produção. “Potencial” exige inventário operacional autorizado posterior. “Não armazenado pelo adapter” descreve o fluxo inspecionado, sem afirmar ausência em toda a organização.

| Classe / superfície                                                               | Evidência estática verificável                                                                                                                                                                                                             | Tratamento e responsável propostos                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comprovado no desenho:** receipts/work PostgreSQL privado                       | [Migration NUV-16][R1] define projection, loja, correlação, recurso/app quando aplicável, timestamps, política e hold; [persistência][R2] faz transação. [NUV-17][R3] acrescenta recovery/claim/lease.                                     | IDs e correlações podem ser associáveis a pessoa; incluí-los no mapa de finalidade/retention. Engenharia do ledger executa ações autorizadas sem quebrar receipt→work nem apagar trabalho pendente. Não persistem raw body por contrato. |
| **Comprovado no desenho:** estado de dispatch NUV-18                              | [Migration dispatch][R4] define loja e consumer técnico do dispatcher (`consumer_id`, não `customer_id` de pessoa física), alvo `product`/`order`, `resource_id`, gerações, incerteza e referências de receipt.                            | Metadados relacionados precisam de análise no atendimento; não são automaticamente anônimos. Owner do dispatcher comprova ações sob escopo aprovado.                                                                                     |
| **Barreira atual a privacy**                                                      | [projection][R5] limita famílias e rejeita nomes privacy; R1 restringe família/event/chaves e exclui privacy de unknown; [recovery-store][R6] valida a projeção atual. [retention][R7] contém somente policies business/lifecycle/unknown. | NUV-20 exige extensão coordenada futura e testes do contrato compartilhado, constraints e leitores, após ratificação. Não usar unknown como desvio, injetar `event` externo ou escolher schema agora.                                    |
| **Não demonstrado:** tabelas locais de identidade/pedidos do e-commerce           | [Tipos Supabase][R8] mostram `public.Tables` vazio; não abrangem schema privado/Auth nem estado remoto. No diretório de módulos inspecionado, existe `nuvemshop`; [ADR-004][N6] trata índice de pedidos como capacidade futura.            | Não inventar banco local de pedidos nem afirmar inexistência de usuários Auth. Futuros identity/orders possuem vínculo, cobertura e disclosure; ausência de consumer não autoriza resposta de ausência global.                           |
| **Não armazenados pelo adapter no fluxo inspecionado:** dados canônicos de pedido | [orders][R9] atribui identidade/vínculo aos consumers; [types][R10] inclui e-mail e endereço mínimo; [request][R11] usa `no-store`. São leituras transitórias sem gravação local desses campos encontrada no adapter.                      | Não criar cópia de PII para depois apagá-la. O fluxo não prova ausência em infraestrutura/consumers. Não expandir scopes nem buscar clientes/checkouts/rascunhos apenas porque seus IDs aparecem no callback.                            |
| **Potencial:** Auth, favoritos, endereços, consentimentos, assinantes e vínculos  | [PRD][R12] descreve requisitos, sem demonstrar implementação ou linhas reais dessas entidades.                                                                                                                                             | Coordenador humano encaminha a cada sistema efetivamente confirmado; owners executam sob contrato próprio. Callback Nuvemshop não autoriza apagar automaticamente conta da vitrine por coincidência de e-mail.                           |
| **Potencial:** logs, Sentry e coletores                                           | [rate-budget][R13] registra metadados; [Sentry server][R14] é condicional; [privacy config][R15] desativa coleta automática de várias categorias. SPEC §17 proíbe raw/PII/segredos.                                                        | Configuração estática não comprova destino/retention/ausência de vazamento. Operações deve inventariar cópias e validar sanitização; IDs também precisam de classificação.                                                               |
| **Potencial:** cache persistente/browser                                          | [ADR-001][R16] prevê cache de catálogo e estado de carrinho; [ADR-002][R17] descreve volume Next reconstruível. Request do adapter é `no-store`.                                                                                           | Não presumir PII em todo cache nem ausência absoluta. Confirmar categorias/chaves/donos antes de ação; nenhum purge genérico ou responsabilidade global automática de NUV-20.                                                            |
| **Não comprovado:** backups/réplicas/PITR                                         | HR-07 exige prova futura; [deploy README][R18] distingue rollback de restauração de banco/volume.                                                                                                                                          | Inventariar existência, cobertura, expiração e restauração autorizadamente. Se existirem, owner de operação aprova estratégia de expiração/reaplicação de exclusões para evitar reintrodução. Não prometer remoção seletiva ou RPO/RTO.  |
| **Serviços externos**                                                             | Código comprova cliente Nuvemshop e integração condicional Supabase/Sentry; [ADR-001][R16] também prevê Reserva Ink. Nenhuma configuração efetiva ou dados externos foram consultados.                                                     | Separar integração implementada, intenção arquitetural e uso efetivo não provado. Coordenar com donos/fornecedores confirmados, sem atribuir a NUV-20 poderes de deleção nesses serviços.                                                |

Fronteira proposta: NUV-20 possui intake privacy, projeção/work e coordenação recuperável conforme contrato ratificado; sistemas que detenham dados respondem pelo seu levantamento/eliminação e prova. Owner humano de privacy valida escopo, exceções e atendimento; owner operacional do MVP em HR-07 continua responsável por alertas/recovery, sem equivaler automaticamente a owner funcional ou qualificação jurídica. Falta de prova de um sistema deve constar como lacuna, nunca “nenhum dado” ou atendimento completo.

## F. Matriz de decisões humanas HR08-D1–HR08-D9

Todas as decisões abaixo estão **`PROPOSED / HUMAN_PENDING`**. “Recomendar” significa submeter uma escolha ao Product Owner; não confere autorização. Os IDs são exclusivos de HR-08 e não reutilizam decisões HR-07 ou NUV-DAG-01.

### HR08-D1 — Responsabilidade

**Pergunta:** quem coordena o atendimento e quem executa em cada sistema? **Opções:** (A) owner humano de privacy coordena, com executores por domínio e apoio de segurança/jurídico conforme necessário; (B) delegação a responsável/equipe formalmente nomeados, com escalonamento e interface com o owner operacional; (C) tratar cada solicitação manualmente sem coordenação central, com risco de perder escopo e prazo.

**Recomendação:** A para o planejamento MVP, exigindo nomeação expressa, canal de escalonamento e responsáveis dos sistemas confirmados; migrar a B se a capacidade disponível exigir. Não se presume disponibilidade 24×7 ou substituto. Papéis jurídicos de controlador/operador dependem das circunstâncias de cada tratamento e não são declarados pelo cargo técnico. **Riscos:** concentração, atendimento incompleto e qualificação jurídica incorreta. **Fontes:** S6/S7, HR-07 D7/D9, inventário E. **Dependência externa:** confirmação de responsáveis, contratos e circunstâncias do tratamento; nome/cobertura ficam `HUMAN_DECISION_REQUIRED`.

### HR08-D2 — Triggers e autorização do efeito

**Pergunta:** quando cada callback permite iniciar levantamento/exclusão? **Opções:** (A) intake durável do callback autenticado, seguido de execução somente sob escopo/policy ratificados e resolução de ambiguidade material; (B) triagem humana de toda exclusão antes de efeitos, com deadlines/escalonamento definidos; (C) aguardar esclarecimento oficial para qualquer efeito ambíguo, preservando localmente o contrato de intake proposto.

**Recomendação:** A, com B/C para ambiguidades como DVG-01 e exceções legais; o humano deve aprovar explicitamente o caminho e condições antes da implementação. Store Redact trata pedido relativo à loja; Customer Redact ao consumidor/escopo validado; Data Request inicia preparação de relatório, não exclusão. `app/uninstalled` não substitui callback nem dispara eliminação irreversível. **Riscos:** apagar cedo, atrasar direito ou reter desnecessariamente; triagem não é hold sem fim. **Fontes:** S1/S2/S5, DVG-01, SPEC §11. **Dependência externa:** confirmação oficial/ensaio autorizado das condições reais em NUV-24; divergência que afete segurança bloqueia operação, sem bloquear esta decisão de desenho.

### HR08-D3 — Payload e validação local

**Pergunta:** qual perfil mínimo local será aceito e como lidar com variantes desconhecidas? **Opções:** (A) perfil mínimo por callback, com campos/estado de presença definidos e rejeição segura quando não houver intenção recuperável; (B) ampliar seletores por exceção após necessidade e contrato específicos; (C) copiar todo payload, rejeitado por exposição e ausência de finalidade.

**Recomendação:** A. Allowlist de candidatos: Store `store_id`; Customer `store_id`, `customer.id`, `orders_to_redact`; Data Request `store_id`, `customer.id`, três listas de recursos de C e `data_request.id` se presente. Esses campos são **perfil local proposto**, não `REQUIRED` do provedor. Recomenda-se exigir localmente loja válida e seletor de alvo/escopo suficiente para execução recuperável; escolher se `customer.id` sozinho é suficiente ou se listas/referências adicionais são necessárias depende do mapeamento adjudicado. Nenhum contato/documento entra por default. Campo ausente/null não vira array vazio nem significa “todos”/“nenhum”; preservar a distinção semanticamente no trabalho ou recusar o perfil sem ACK. IDs recebidos numericamente exigem decode sem perda antes de qualquer conversão e representação interna decimal exata em string; não supor strings no wire. Limites de tamanho/estrutura/contagem e rejeição de valores malformados serão documentados e testados, sem inventar limites oficiais. Discriminante interno vem da rota, não de `event` externo. Descartar campos desconhecidos somente se isso não reduzir escopo necessário; caso relevante/desconhecido requer triagem, sem guardar raw indiscriminado.

**Riscos:** exigir exemplo como contrato universal, perder escopo silenciosamente, arredondar IDs, rejeitar entrega legítima ou ampliar exclusão. **Fontes:** S1/S4, C, NUV-19 e projection atual. **Dependência externa:** schema oficial mais preciso e fixtures/entregas reais futuras. Perfil definitivo, semântica de campos ausentes e limites locais: `HUMAN_DECISION_REQUIRED` antes de NUV-20.

### HR08-D4 — Projeção mínima e PII recuperável

**Pergunta:** o que precisa sobreviver ao ACK e à queda do processo? **Opções:** (A) IDs/escopo mínimos na intenção durável, com política própria; (B) referência interna a registro mínimo durável com acesso e ciclo de vida garantidos; (C) atributos pessoais mínimos somente quando A/B comprovadamente não identificarem o alvo; (D) contexto só em memória, inviável após ACK.

**Recomendação:** A ou B conforme o mapeamento comprovado, com C excepcional, justificado e ratificado. Store preserva loja/tipo da solicitação; Customer preserva seletor de consumidor e escopo de pedidos; Data Request preserva seletores/listas/estado de presença e referência da solicitação quando existente. Somar identidade local de intake, versão do contrato/policy, estado e correlação mínima. Referência B não pode apontar para memória, cache efêmero ou dado apagado antes do processamento. Não substituir IDs por hash sem demonstrar lookup autorizado e recovery; pseudonimização não é anonimização automática. Preservar somente o necessário, sem e-mail, telefone, identificação ou endereço por conveniência; necessidade real desses atributos reabre esta decisão com finalidade, acesso e descarte definidos. Provar por leitura independente e reinício que o trabalho reconstrói o atendimento sem raw body e sem o processo HTTP original.

**Riscos:** minimização que inutiliza a solicitação, retenção excessiva e perda da referência ao apagar o próprio alvo. **Fontes:** HR-07 D2/D3/D9, SPEC §11/17, S6/S7, E. **Dependência externa:** donos e mapeamento dos armazenamentos confirmados; seleção A/B/C e exceções PII pendentes.

### HR08-D5 — Retenção, eliminação e exceções

**Pergunta:** por qual finalidade, condição e prazo cada categoria será conservada/eliminada? **Opções fundamentadas:** (A) política por categoria/finalidade com exceção identificada e revisão; (B) política por solicitação quando o mapa de dados ainda exigir avaliação individual, com owner e controle de pendências; (C) prazo único herdado do provedor/HR-07, rejeitado por não atender às diferenças de finalidade e prova.

**Recomendação:** A; B como fluxo explícito de exceção, nunca autorização para retenção indefinida ou exclusão cega. ANPD distingue direitos, finalidade e hipóteses de conservação do art.16; sua orientação de acesso/confirmação imediato ou declaração detalhada em até 15 dias tem escopo próprio, não é prazo universal de redaction. Aplicabilidade, contagem e eventual regime específico exigem avaliação humana. A descrição de 5 dias/6 meses de S1 é regra de contexto/envio do provedor com linguagem a esclarecer, não retention universal do Indicio Cult. Janelas de 14/7 dias de HR-07 não se aplicam automaticamente a privacy.

| Categoria                                | Proposta de condição e salvaguarda                                                                                                                                                         | Pendência de ratificação                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| PII sujeita a exclusão                   | Eliminar/anonimizar conforme pedido validado e finalidade encerrada, após verificar exceções aplicáveis; não apagar indiscriminadamente todos os registros pelo e-mail                     | Categorias, fundamento, escopo e prazo de execução justificado                           |
| Registros eventualmente preserváveis     | Conservação restrita somente com fundamento aplicável documentado, campos mínimos, responsável, acesso limitado e termo de revisão/eliminação; obrigação fiscal/contratual não é presumida | Exceção por categoria e fundamento verificável; prazo ou condição de término             |
| Evidence/auditoria mínima                | Resultado por etapa/sistema, versão da policy, datas, exceções aprovadas e referência mínima; sem relatório/contato/documento por default. IDs também podem ser pessoais                   | Finalidade, acesso, necessidade de identificadores e prazo próprio                       |
| Trabalho pendente/in-flight              | Proteger material indispensável ao atendimento/recovery; minimizar PII, acompanhar idade e escalar bloqueios                                                                               | Prazo de atendimento/alerta, revisão e responsável; sem manter pendência indefinidamente |
| Quarentena/falha/resultado indeterminado | Isolar, alertar e reconciliar com owner; não expurgar intenção necessária silenciosamente nem usar falha como autorização para reter tudo                                                  | Condição de saída, revisão, minimização/segregação e limite justificado                  |
| Backups/réplicas, se existentes          | Inventário, acesso restrito, expiração aprovada e prevenção de reintrodução após restore; escolher mecanismo compatível com capacidade real                                                | Existência, retenção, possibilidade de ação seletiva, política de restauração e prazo    |
| Pedidos de acesso e relatório            | Separar intenção, artefato e evidência de entrega; eliminar cópias transitórias após finalidade/atendimento e conservar só evidência justificada                                           | Canal, validade/acesso do artefato, prazo de atendimento, descarte e prova de entrega    |

**Todos os prazos concretos acima permanecem `HUMAN_DECISION_REQUIRED`**, com justificativa por finalidade, obrigação aplicável, capacidade/recovery e risco. Operação privacy não pode ser ativada com retention indefinida por omissão. Não se define scheduler nem expurgo nesta etapa. **Riscos:** perda de dado legalmente necessário, preservação de PII sem finalidade e restauração que reintroduz dado eliminado. **Fontes:** S6/S7, S1, HR-07 D4/D9 e E. **Dependência externa:** avaliação humana/jurídica contextual e inventário operacional autorizado, inclusive fornecedores/backups.

### HR08-D6 — HTTP, ACK e falhas

**Pergunta:** qual resposta confirma somente recebimento durável? **Opções:** (A) 204 sem conteúdo após COMMIT confirmado de receipt+work recuperáveis; (B) outro 2xx mínimo compatível após a mesma garantia; (C) resposta após executar todo atendimento, desaconselhada pelo custo e risco na request.

**Recomendação:** A, sujeita à ratificação e à comprovação futura privacy do transporte. Ordem: bytes bounded → autenticação → decode/parse bounded → perfil privacy e loja autorizada → intenção mínima+receipt atômicos → confirmação de COMMIT → ACK → processamento recuperável. Normal e manutenção seguem o mesmo contrato. Não fazer chamadas lentas, relatório ou exclusão antes do ACK. Assinatura/perfil/loja inválidos: 4xx mínimo, sem eco de PII; limite excedido: erro seguro; falha de storage/deadline ou COMMIT indeterminado: 5xx/sem ACK, sem alegar que nada foi gravado. Códigos de falha específicos pertencem ao perfil aprovado e testes futuros. Reconciliação de COMMIT ambíguo usa a mesma identidade local no primário; não repetir write silenciosamente com outra identidade. ACK é recebimento durável, **não eliminação concluída nem relatório entregue**. Não depender de retries privacy não provados.

**Riscos:** falso sucesso, perda pós-ACK e resposta que divulga dados. **Fontes:** SPEC §11, HR-07 D2, NUV-19, S1 e DVG-03. **Dependência externa:** ratificação da resposta, comprovação operacional NUV-24 e gates do ledger; nenhum SLA privacy é prometido.

### HR08-D7 — Relatório e entrega ao Merchant

**Pergunta:** quem recebe e por qual canal seguro? **Opções:** (A) owner coordena entrega manual autenticada ao merchant validado em canal institucional aprovado; (B) entrega via interface autenticada já existente ou integração específica futura, após contrato próprio; (C) encaminhar ao contato do `customer`, rejeitado como inferência de destinatário.

**Recomendação:** A enquanto B não existir, mediante definição humana do destinatário, vínculo com loja, autenticação, autorização, conteúdo mínimo e evidência de entrega. S1 atribui à aplicação o encaminhamento ao merchant; não fornece endereço nem endpoint de resposta. Não inventar e-mail, URL ou usar dados do callback para redirecionamento. Não enviar PII a logs, PR, comentário ou mensagem arbitrária. Owner aprova relatório/cobertura e acompanha entrega; executores fornecem dados no escopo autorizado. Distinguir **solicitado → levantamento → relatório preparado → entrega confirmada**, com estados de falha/indeterminação. Ausência de persistência encontrada no adapter não prova relatório global vazio. Recursos fora do armazenamento comprovado devem ser classificados com limites, sem ampliar scopes ou criar cópia de dados remotos para responder.

**Riscos:** vazamento para destinatário errado, relatório incompleto e considerar geração/ACK como entrega. **Fontes:** S1, S6/S7, inventário E, SPEC §20. **Dependência externa:** recipient/canal, validação, formato, acesso/expiração, retenção e mecanismo de prova: `HUMAN_DECISION_REQUIRED`; automação futura não se presume autorizada.

### HR08-D8 — Recovery e idempotência

**Pergunta:** como preservar solicitações sem confundir reentrega com novo pedido? **Opções:** (A) ledger de intake com identidade local por chegada, operações recuperáveis por solicitação/etapa e reconciliação; (B) vincular tentativas externas somente quando houver identidade e semântica confiáveis comprovadas; (C) deduplicação permanente por body hash ou `(loja,tipo,cliente)`, rejeitada porque pode suprimir solicitação legítima.

**Recomendação:** A; B somente após prova/adjudicação da identidade. Reutilizar NUV-16/17, com extensão coordenada futura do contrato privacy, sem fila paralela. Repetição interna da mesma persistência usa ID estável; nova chegada recebe receipt próprio. Não equiparar `data_request.id` a delivery ID nem impor sua presença. A mesma pessoa pode solicitar novo relatório com corpo igual, inclusive após atendimento anterior; não devolver sucesso herdado nem impedir novo levantamento por hash/conteúdo. Um pedido de exclusão repetido reavalia o escopo atual e registra seu resultado; “já eliminado” exige prova atual por sistema e não prova ausência em todos os sistemas.

| Falha/cenário                                  | Comportamento proposto                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Callback possivelmente duplicado/concorrente   | Preservar intake; coordenar somente efeitos equivalentes comprovados. Ambiguidade permanece rastreável e não elimina solicitação nova.                   |
| Queda após ACK                                 | Work confirmado é lido por outro processo; claim/lease/heartbeat/fencing permitem retomar sem depender da memória HTTP.                                  |
| Exclusão parcial                               | Registrar etapa/escopo e retomar o que falta; minimizar dados e manter a identificação indispensável até resolver.                                       |
| Resultado externo indeterminado/perda de lease | Registrar incerteza, interromper efeitos sem autoridade e reconciliar antes de repetir; fencing do ledger não torna efeito externo exactly-once.         |
| Replay autorizado                              | Autorização e policy próprias de privacy, escopo mínimo, estado/capacidade verificados; não herdar sete dias de HR-07.                                   |
| Atendimento/relatório anteriormente concluído  | Separar evidência passada do novo pedido e do estado presente; entrega incerta vai para reconciliação, nunca sucesso automático.                         |
| Evidência de conclusão                         | Resultado por sistema/etapa, política/exceção aprovada e entrega quando aplicável; sem PII desnecessária, sem alegação global além da cobertura provada. |

**Riscos:** duplicar efeito externo, perder novo pedido, reintroduzir dados ou manter intenção sem solução. **Fontes:** HR-07 D2/D5/D6/D9, S1 (orientação geral de idempotência), NUV-17 e E. **Dependência externa:** contratos de efeitos/donos de sistemas, identidade de solicitação se disponível e policy de replay/reconciliação; exactly-once externo não é prometido.

### HR08-D9 — Configuração e prova operacional

**Pergunta:** quais URLs e sequência suportada serão aprovadas para a modalidade real? **Opções:** (A) inventário por callback no painel e ensaio individual sob HR-02/03/08 e NUV-24; (B) configuração temporária de ensaio somente quando suportada, autorizada e com cleanup deliberado; (C) presumir sequência/URLs vazias ou usar subscriptions API como prova das três URLs, rejeitado.

**Recomendação:** A; B só com evidência específica. Inventariar para cada linha de C: app/modalidade/ambiente, label do painel, URL HTTPS real autorizada, path interno, estado e resultado redigido. Não há URL pública/domínio escolhidos neste dossiê. Configuração no painel não é subscription business/lifecycle. A ordem exata criação/configuração/instalação/OAuth/ensaio permanece **`SUPPORTED_SEQUENCE_UNPROVEN / HUMAN_DECISION_REQUIRED`**: S2 descreve campos e fluxo, sem resolver todas as pré-condições da modalidade real.

**Riscos:** bootstrap impossível, app operando sem callbacks provados, limpeza que desativa integração necessária e rollback rotulado como operação normal. **Fontes:** S1/S2/S4, SPEC §19, PLAN, ADR-004, NUV-19. **Dependência externa:** HR-02 modalidade/scopes/instalabilidade e sequência; HR-03 e reconciliação condicional de verifier; release por HEAD, endpoints implementados e comprovação em NUV-24. Plano H não é autorização para executá-lo.

## G. `NUV20_IMPLEMENTATION_CONTRACT_PROPOSED`

**Somente desenho, condicionado à ratificação HR08-D1–D9 e à autorização da implementação futura.** Não é schema, código ou SQL. Decisões materiais ainda pendentes não podem ser escolhidas silenciosamente pelo implementador.

1. **Três Route Handlers distintos**, nos paths de C, mantendo a allowlist exata de NUV-19; sem wildcard ou reaproveitamento do parser business/lifecycle. Discriminante privacy interno confiável vem da rota. Consultar guias locais Next aplicáveis antes de escrever código.
2. **Shared-verifier preparado**, com autenticação dos bytes bounded antes de parse e fail-closed. HMAC privacy continua não provado; ausência/contradição real bloqueia operação e exige segurança, sem fallback.
3. **Parser/projeções específicos e versionados**, conforme perfil ratificado D3/D4: IDs exatos, loja autorizada, escopo/presença recuperáveis, campos mínimos e sem raw default. Ausência de seletor suficiente não recebe ACK de trabalho inexequível. Não importar requisitos `event/resourceId/deliveryId` do envelope business.
4. **Ledger durável NUV-16/17** como autoridade única. Extensão futura coordenada de tipos, policies, constraints e leitores/recovery atuais é necessária porque rejeitam privacy. Preservar atomicidade receipt+intenção/vínculo e invariante inverso no banco, acesso mínimo e isolamento; nenhuma fila paralela. Design de schema/migration e sua execução têm revisão/autorização próprias posteriores.
5. **HTTP após COMMIT confirmado**, com resposta mínima sem PII; falha/indeterminação/deadline sem ACK. Modo normal e manutenção têm autenticação/durabilidade equivalentes. ACK não certifica atendimento/entrega. Alvo interno de tempo não vira SLA privacy.
6. **Worker recuperável**, claim/lease/heartbeat/fencing, retentativa bounded e reconciliação conforme primitives existentes, preservando autoridade antes de efeitos. Coordenação de executores apenas dentro dos sistemas/contratos aprovados; pausas de integração/uninstall não descartam trabalho de privacidade nem justificam novas chamadas API sem acesso válido.
7. **Efeitos e conclusão por etapa**, com falha parcial, resultado indeterminado, revisão humana, replay autorizado e evidência mínima. Relatório separa preparação e entrega; duplicata não suprime nova solicitação. Sem promessa exactly-once externo.
8. **Retenção própria**, sem herdar 14/7 dias ou seis meses. Policy, exceções, holds revisáveis e descarte por categoria precisam de aprovação antes de ativação. PII indispensável ao recovery não pode desaparecer prematuramente; pendência não vira conservação irrestrita.
9. **Incidentes e observabilidade**, sem raw/PII/segredos em logs/erros/Sentry/respostas; correlação segura, alertas para storage/COMMIT indeterminado, backlog/idade, lease perdido, falha parcial, quarentena e entrega não confirmada. Owner/canal/runbook operacional NUV-21 continuam necessários. Contradição de entrega real → `BLOCKED_SPEC_CONTRADICTION` e adjudicação.

Matriz mínima de testes futuros, sem execução nesta etapa:

| Eixo                   | Casos a comprovar na implementação autorizada                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fronteira/auth         | Três paths e parser próprios; assinatura ausente/malformada/inválida, corpo alterado, parse só após auth; contrato local HMAC não apresentado como prova real; loja errada e payload na rota errada falham.              |
| Payload bounded        | IDs acima de MAX_SAFE_INTEGER exatos, valores inválidos, pseudopayload oficial não aceito como JSON; profundidade/custo/arrays bounded; ausência/null/vazio distintos, sem requisitos fictícios nem ampliação de escopo. |
| Durabilidade/HTTP      | COMMIT confirmado antes do ACK, rollback, storage indisponível, COMMIT indeterminado/late, leitura independente, normal/manutenção e nenhuma resposta com PII.                                                           |
| Recovery               | Crash pós-ACK, reclaim/lease/heartbeat/fencing, intenção recuperável sem raw/contato em memória, referência mínima ainda resolvível, perda de autoridade e falha parcial.                                                |
| Solicitações/efeitos   | Corpos iguais como novos pedidos, concorrência/duplicatas sem perda, exclusão repetida com dados atuais, data_request ID ausente/não estável, entrega incerta e replay sem exactly-once.                                 |
| Privacidade/retention  | Nenhum contato/documento/endereço por conveniência, exceções legais avaliadas, dados necessários protegidos até resolução, descarte/hold/revisão próprios e nenhum vazamento em logs/Sentry/PR.                          |
| Relatório e fronteiras | Recipient merchant validado, canal aprovado, geração distinta de entrega; cobertura desconhecida explícita, nenhum acesso/scopes adicional ou efeito em identity/orders por inferência.                                  |

Testes locais não substituem prova operacional. Permanecem sem prova: autenticação/trigger/payloads/tempo/retries de cada privacy callback, sequência suportada da modalidade real, inventários ativos, canal/entrega do relatório, compatibilidade operacional do backend e retenção/backups efetivos.

## H. Gates operacionais posteriores — plano sem execução

A cronologia preserva **decisão HR-08 → implementação NUV-20 → evidência real dentro de NUV-24**. A decisão não exige NUV-20 pronto nem ensaio real; NUV-24 não pode corrigir contratos por improviso. Primitives NUV-16/17 independem das escolhas privacy; seu hold de compatibilidade/isolamento continua próprio. Este dossiê não remove D0/ISO-03/OPS-02 nem comprova Supabase.

| Gate posterior              | Entrada/prova necessária, sem autorização implícita                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ratificação/materialização  | Product Owner registra escolhas D1–D9, inclusive responsáveis, prazos justificados e canal; materialização normativa posterior específica, sem declarar HR08_CLOSED aqui.                                                                                                               |
| HR-02 e sequência suportada | Confirmar modalidade/distribuição/API-only/SDK, escopos mínimos e ordem criação/configuração/URLs/OAuth/ensaio. Se precisar de SDK/arquitetura diferente, adjudicar. Não expandir `read_customers`/checkouts/rascunhos automaticamente.                                                 |
| HR-03                       | Decidir coexistência/rotação antes de HMAC operacional; reconciliar NUV-02/14 condicionalmente depois, antes do uso, sem ciclo.                                                                                                                                                         |
| NUV-20/21/22/23             | Implementação/segurança/recovery/observabilidade e integração local conforme dependências inalteradas, revisão e CI próprias; fontes reconfirmadas. Sem ativação de workers por esta decisão.                                                                                           |
| Release/deploy              | Aprovação específica vinculada a HEAD e ambiente/topologia/budget; health e backend comprovados. Nenhum merge/deploy nesta execução.                                                                                                                                                    |
| Configuração privacy        | Autorizar e inventariar separadamente três URLs reais no painel, conforme sequência HR-02/08 suportada; registrar antes/depois sem segredos. Não é HR-06 subscription API.                                                                                                              |
| OAuth/instalação            | Somente na ordem comprovada e autorizada, com fluxo oficial, proteção de state e credenciais fora da evidência. Não presumir ensaio pré-OAuth ou URLs vazias.                                                                                                                           |
| HR-06 dentro de NUV-24      | Inventário/subscriptions business+lifecycle e payloads reais sob sua autorização própria; não substituem privacy.                                                                                                                                                                       |
| Privacy dentro de NUV-24    | Ensaio autorizado individual de cada callback, auth, trigger, payload, ACK/durabilidade, delivery/retries e recovery; divergências reabrem tasks donas. Separar teste induzido de prova real. Atendimento/relatório exigem canais e prova próprios, sem solicitação real por suposição. |
| Saída/rollback              | Limpar somente artefatos temporários próprios e confirmar inventários finais necessários ativos. Rollback é deliberado/separado; após desativar integrações não declarar `ADAPTER OPERATIONAL`. Aceite operacional humano próprio.                                                      |

Nenhuma nova aresta para consumers futuros ou segundo roadmap é criada. NUV-24 continua apenas `ADAPTER OPERATIONAL / SPEC CLOSURE PENDING CONSUMERS`; NUV-25 conserva fechamento integral e evidência dos consumers. Inventário E identifica coordenação necessária, sem implementar identity/orders/catalog ou fazer NUV-24 depender de consumer futuro ainda não operacional.

## I. Revisão adversarial e validação documental

### Harness executado

| Papel efetivo              | Modelo / esforço        | Participação                                                                                      |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Orquestração e autoria     | GPT-6.1 Sol / Alto      | Leitura normativa, reconciliação e autoria deste dossiê                                           |
| Contrato/segurança         | GPT-6.1 Terra / Alto    | Pesquisa oficial e avaliação de payload/auth/recovery; relatório separado, sem autoria no arquivo |
| Inventário/rastreabilidade | GPT-6.1 Terra / Médio   | Inspeção estática e limites de persistência; relatório separado, sem autoria no arquivo           |
| Pesquisa/matriz            | GPT-6 Luna / Médio      | Conferência documental e alternativas de decisão; relatório separado                              |
| Revisão independente       | GPT-6 Luna / Extra alto | Concluída; 14 perguntas verificadas, sem autoria nem edição do dossiê                             |

### Parecer independente e reconciliação

A revisão GPT-6 Luna / Extra alto concluiu **APROVAR para adjudicação humana**, com **zero findings materiais P0/P1/P2**. Conferiu fontes normativas, contratos oficiais e a rejeição atual de privacy no código. A aprovação é documental; não ratifica D1–D9, não fecha HR-08 e não inicia NUV-20. Nenhuma opinião de subagent é simulada: os quatro papéis foram executados em rodadas, com relatórios separados de evidência fora do Git. O orquestrador permanece responsável pela autoria e reconciliação.

| Pergunta obrigatória                                         | Resultado independente / evidência neste dossiê                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1. Payload inventado?                                        | **Não**; C distingue campos exemplificados de schema formal e D3 separa o perfil local.                |
| 2. Diferenças entre fontes preservadas?                      | **Sim**; DVG-01–04 e precedência B mantêm conflitos e limites.                                         |
| 3. Trigger afirmado sem comprovação?                         | **Não**; C/DVG-01/D2 distinguem uninstall, callback e efeito autorizado.                               |
| 4. HMAC privacy promovido a garantia?                        | **Não**; DVG-02/G mantêm desenho local e prova real pendente.                                          |
| 5. Retenção escolhida arbitrariamente?                       | **Não**; D5 exige justificativa humana por categoria, sem herança automática.                          |
| 6. Exclusão de registro legalmente necessário sem avaliação? | **Não**; D5 exige exceção aplicável, fundamento, escopo e revisão.                                     |
| 7. Preservação de PII sem finalidade?                        | **Não**; D3–D5 minimizam dados e condicionam exceções a necessidade/ciclo de vida.                     |
| 8. Receipt, ACK e efeito distintos?                          | **Sim**; D6 separa COMMIT, recebimento e conclusão/entrega.                                            |
| 9. Recuperação após ACK?                                     | **Sim**; D4/D8/G cobrem reinício, referência resolvível, lease, falha parcial e incerteza.             |
| 10. Responsabilidade pelo relatório clara?                   | **Sim, com escolhas humanas pendentes**; D7 exige merchant validado e canal aprovado, sem inventá-los. |
| 11. Ciclo HR-08 → NUV-20/24 → HR-08?                         | **Não**; H mantém decisão → implementação → prova operacional.                                         |
| 12. Operação remota autorizada acidentalmente?               | **Não**; A/H/J distinguem proposta/publicação documental dos atos posteriores.                         |
| 13. Campos/desconhecidos explícitos?                         | **Sim**; C/D3 registram ausência de requiredness, nulabilidade e completude provadas.                  |
| 14. HR-07 e fronteira do adapter respeitados?                | **Sim**; E/G/H mantêm retenção própria, extensão coordenada futura e executores por domínio.           |

Correções e reconciliações realizadas antes da apresentação:

| Registro                           | Origem e correção                                                                                                                                                                          | Resultado                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| CL-01 — consumer técnico           | Leitura adicional identificou possível ambiguidade em “consumidor” de dispatch. O autor explicitou em E que `consumer_id` identifica consumer técnico, não `customer_id` de pessoa física. | Revisor independente confirmou a redação contra a migration NUV-18; nenhuma alteração de escopo ou finding material residual. |
| TR-01 — texto de DVG-01            | Conferência de rastreabilidade pediu trechos curtos e datas/versão das fontes, além de paráfrase. O autor adicionou os dois fragmentos em DVG-01.                                          | Revisor leu a versão com os trechos e manteve o parecer.                                                                      |
| RC-01 — propostas versus evidência | Autoria reconciliou nomes históricos/atuais, campos exemplificados versus mínimos locais, projeção mínima versus recovery e schema atual que rejeita privacy.                              | Nenhuma requiredness externa, retention ou autenticação real foi promovida por consenso.                                      |

**Incertezas residuais aceitas como lacunas documentais, não como fatos resolvidos:** DVG-01–04; formalização do schema privacy e identidade de solicitação; condições/prazos/canais a ratificar; uso/retention real dos sistemas; sequência suportada e provas NUV-24. Nenhuma questão material foi encerrada por votação dos agentes.

### Validação documental

- Prettier aplicado e conferido somente neste arquivo; `git diff --check` sem erro.
- Verificados os dez blocos A–J, nove decisões e seus estados humanos, DVG-01–04, contrato proposto e fronteiras operacionais.
- **25 links locais existentes**, referências Markdown resolvidas e escopo versionado limitado a `tasks/nuvemshop/HR-08-DECISION-DOSSIER.md`; links externos modernos inacessíveis identificados em B com fallback oficial.
- Baseline/ancestralidade conferida e checkout principal preservado. Nenhum teste de aplicação, `db-types`, banco/loja, callback ou operação de infraestrutura foi necessário ou executado para esta alteração documental.
- Candidate HEAD, publicação Draft e solicitação Codex Review devem ser registrados na PR; merge, promoção para Ready e deploy permanecem fora da autorização.

## J. Decisão humana requerida

O Product Owner deve **aprovar, rejeitar ou emendar cada linha**, registrando data, responsável e escopo. Ausência de resposta não é aprovação; ratificação do desenho não fecha evidência operacional nem autoriza implementação/operação por si só.

| Decisão pendente | Escolha concreta necessária                                                                                                                         | Estado                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **HR08-D1**      | Nomear coordenador funcional, executores/escalonamento e avaliar papéis jurídicos por tratamento                                                    | `PROPOSED / HUMAN_PENDING` |
| **HR08-D2**      | Aprovar condições de início/triagem/efeitos de cada callback e tratamento de DVG-01, preservando uninstall distinto                                 | `PROPOSED / HUMAN_PENDING` |
| **HR08-D3**      | Aprovar perfil mínimo local, seletores/escopo, campos ausentes, limites e comportamento de variante desconhecida, sem declarar requiredness externa | `PROPOSED / HUMAN_PENDING` |
| **HR08-D4**      | Escolher IDs mínimos ou referência durável; justificar exceção PII e provar recuperação pós-ACK sem raw                                             | `PROPOSED / HUMAN_PENDING` |
| **HR08-D5**      | Aprovar por categoria finalidade, exceções, prazo/condição justificados, revisão/hold, descarte e política de backups, se existentes                | `PROPOSED / HUMAN_PENDING` |
| **HR08-D6**      | Aprovar 204 ou outro 2xx mínimo pós-COMMIT, falhas sem ACK e alvo interno separado do SLA não provado                                               | `PROPOSED / HUMAN_PENDING` |
| **HR08-D7**      | Definir merchant/destinatário validado, canal, cobertura, prova de entrega e ciclo de vida do relatório                                             | `PROPOSED / HUMAN_PENDING` |
| **HR08-D8**      | Aprovar ledger/recovery, identidade local, reconciliação/replay e novo pedido com corpo repetido sem exactly-once                                   | `PROPOSED / HUMAN_PENDING` |
| **HR08-D9**      | Aprovar inventário de URLs e responsáveis pela prova/sequência suportada HR-02/03/08 em NUV-24; atos futuros exigem autorizações específicas        | `PROPOSED / HUMAN_PENDING` |

As lacunas externas estão delimitadas para adjudicação e planejamento. Não se exige implementação ou ensaio real para produzir este dossiê; tampouco se converte proposta em ratificação. **HR-08 permanece aberto; NUV-20 não foi iniciado.**

[N0]: ../../AGENTS.md
[N1]: ../../docs/specs/SPEC-nuvemshop.md
[N2]: ./plan.md
[N3]: ./todo.md
[N4]: ./HR-07.md
[N5]: ./NUV-19.md
[N6]: ../../docs/decisions/ADR-004-nuvemshop-dag-consumer-boundaries.md
[S1]: https://nuvemshop.dev/en-US/api/resources/2025-03/webhook
[S2]: https://nuvemshop.dev/en-US/docs-api/authentication
[S3]: https://nuvemshop.dev/docs-api/faq
[S4]: https://tiendanube.github.io/api-documentation/utils/lgpd-webhooks-testing-tool
[S4M]: https://nuvemshop.dev/en-US/api/utils/lgpd-webhooks-testing-tool
[S5]: https://tiendanube.github.io/api-documentation/CHANGELOG
[S5M]: https://nuvemshop.dev/en-US/api/resources/2025-03/CHANGELOG
[S6]: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares
[S7]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes
[R1]: ../../supabase/migrations/20261026193709_nuvemshop_durable_intake.sql
[R2]: ../../src/modules/nuvemshop/server/durability/index.ts
[R3]: ../../supabase/migrations/20261105022142_nuvemshop_recovery.sql
[R4]: ../../supabase/migrations/20261105141754_nuvemshop_dispatch.sql
[R5]: ../../src/modules/nuvemshop/server/durability/projection.ts
[R6]: ../../src/modules/nuvemshop/server/durability/recovery-store.ts
[R7]: ../../src/modules/nuvemshop/server/durability/retention.ts
[R8]: ../../src/lib/supabase/database.types.ts
[R9]: ../../src/modules/nuvemshop/server/orders.ts
[R10]: ../../src/modules/nuvemshop/server/types.ts
[R11]: ../../src/modules/nuvemshop/server/request.ts
[R12]: ../../docs/PRD.md
[R13]: ../../src/modules/nuvemshop/server/rate-budget.ts
[R14]: ../../sentry.server.config.ts
[R15]: ../../src/lib/sentry/privacy.ts
[R16]: ../../docs/decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md
[R17]: ../../docs/decisions/ADR-002-coolify-traefik-deploy.md
[R18]: ../../deploy/README.md
