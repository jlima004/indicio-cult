# Migrações do Supabase

A fundação **não cria tabelas** — cada módulo cria as suas por migração
([SPEC-foundation §1 e §7](../../docs/specs/SPEC-foundation.md)). Esta pasta
começa vazia de propósito.

## Convenção

- **Um arquivo por mudança.** Criar sempre com o CLI, nunca à mão (o prefixo
  de data/hora é o que ordena a aplicação):

  ```bash
  npm run db:new -- <modulo>_<descricao>
  # → supabase/migrations/YYYYMMDDHHMMSS_<modulo>_<descricao>.sql
  # ex.: 20261001120000_catalog_products.sql
  ```

  `<modulo>` é o id do módulo dono no
  [mapa de capacidades](../../docs/specs/CAPABILITY-MAP.md) (`catalog`,
  `identity`, `orders`, ...); `<descricao>` em inglês, `snake_case`, curta.

- **RLS habilitado em toda tabela nova**, na mesma migração que a cria, com
  políticas que reflitam o acesso real (não copiar `auth.uid()` em tudo):

  ```sql
  alter table public.<tabela> enable row level security;
  ```

  Views: `create view ... with (security_invoker = true)`. Funções
  `security definer` fora de schemas expostos pela API.

- **Só para frente.** Sem editar migração já aplicada no projeto remoto; para
  corrigir, nova migração. Renomear/remover coluna segue expand → migrate →
  contract.

- **Uma tarefa do módulo por migração** e a migração no mesmo PR do código que
  a consome. Após aplicar, regenerar os tipos e commitar.

## Comandos

| Comando                    | O que faz                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:new -- <nome>` | Cria `supabase/migrations/<timestamp>_<nome>.sql` vazio.                                                                                                              |
| `npm run db:migrate`       | `supabase db push --project-ref $SUPABASE_PROJECT_ID`: aplica as migrações pendentes no projeto remoto. Pede a senha do banco (ou `SUPABASE_DB_PASSWORD`).            |
| `npm run db:types`         | `supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public` → `src/lib/supabase/database.types.ts`. A CI falha se o arquivo commitado divergir. |

Os scripts `db:*` rodam via `dotenv -e .env --` porque npm não carrega o `.env`:
`SUPABASE_PROJECT_ID` vem do `.env` local (ou do ambiente, que tem
precedência — é assim que a CI injeta o segredo). O CLI exige autenticação:
`npx supabase login` uma vez por máquina, ou `SUPABASE_ACCESS_TOKEN` no
ambiente (CI). `database.types.ts` é gerado: não editar e não formatar (está no
`.prettierignore` para bater byte a byte com a saída do CLI).

`supabase/config.toml` descreve o stack **local** (`supabase start`, exige
Docker — indisponível neste WSL, então não é usado hoje); `major_version = 17`
acompanha o Postgres do projeto remoto.
