import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from '@/components/brand/EmptyState'
import { Symbol } from '@/components/brand/Symbol'
import { Wordmark } from '@/components/brand/Wordmark'

describe('Symbol', () => {
  it('mede 24px e fica oculto da árvore de acessibilidade por padrão', () => {
    const { container } = render(<Symbol data-testid="symbol" />)
    const symbol = screen.getByTestId('symbol')

    expect(symbol).toHaveAttribute('width', '24')
    expect(symbol).toHaveAttribute('height', '24')
    expect(symbol).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('title')).not.toBeInTheDocument()
  })

  it('aceita um nome acessível quando o símbolo comunica conteúdo', () => {
    render(<Symbol aria-label="Indicio Cult" />)

    expect(screen.getByRole('img', { name: 'Indicio Cult' })).not.toHaveAttribute('aria-hidden')
  })
})

describe('Wordmark', () => {
  it.each(['stacked', 'horizontal'] as const)('renderiza a variante %s', (variant) => {
    render(<Wordmark variant={variant} data-testid={`wordmark-${variant}`} />)

    const wordmark = screen.getByRole('img', { name: 'Indicio Cult' })
    expect(wordmark).toHaveAttribute('data-variant', variant)
    expect(wordmark).toHaveTextContent('indicio')
    expect(wordmark).toHaveTextContent('cult')
  })
})

describe('EmptyState', () => {
  it('expõe a mensagem como status e mantém o símbolo decorativo', () => {
    render(<EmptyState message="Nada encontrado." />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Nada encontrado.')
    expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
