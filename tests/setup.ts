// Executado antes de cada arquivo de teste (vitest.config.mts → setupFiles).
// Registra os matchers do jest-dom (toBeInTheDocument, toHaveTextContent, ...)
// e limpa o DOM entre testes.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// `server-only` lança em qualquer bundle que não seja React Server (inclusive no
// Vitest). Aqui vira no-op para que módulos de servidor (env, supabase/admin)
// possam ser testados; um teste que precise do comportamento real usa
// `vi.doMock('server-only', ...)` localmente.
vi.mock('server-only', () => ({}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})
