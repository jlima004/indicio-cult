import { describe, expect, it } from 'vitest'

import { copy } from '@/lib/copy'

describe('copy.system', () => {
  it('mantém todas as chaves obrigatórias das telas de sistema', () => {
    expect(Object.keys(copy.system).sort()).toEqual([
      'backHome',
      'empty',
      'error',
      'maintenance',
      'notFound',
      'retry',
    ])
  })

  it('preserva a copy aprovada para 404 e estado vazio', () => {
    expect(copy.system.notFound).toBe('Esse rastro não leva a lugar nenhum.')
    expect(copy.system.empty).toBe('Nada aqui ainda.')
  })
})
