// Executado antes de cada arquivo de teste (vitest.config.mts → setupFiles).
// Registra os matchers do jest-dom (toBeInTheDocument, toHaveTextContent, ...)
// e limpa o DOM entre testes.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
