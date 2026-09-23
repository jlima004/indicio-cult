import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ErrorPage from '@/app/error'
import { copy } from '@/lib/copy'

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException }))

describe('Error boundary da aplicação', () => {
  it('reporta uma vez por erro, mesmo após rerender, e reporta um novo erro', () => {
    captureException.mockClear()
    const first = new Error('primeira falha')
    const second = new Error('segunda falha')
    const reset = vi.fn()
    const view = render(<ErrorPage error={first} reset={reset} />)

    expect(captureException).toHaveBeenCalledExactlyOnceWith(first)
    view.rerender(<ErrorPage error={first} reset={reset} />)
    expect(captureException).toHaveBeenCalledTimes(1)
    view.rerender(<ErrorPage error={second} reset={reset} />)
    expect(captureException).toHaveBeenNthCalledWith(2, second)
  })

  it('renderiza a copy canônica e executa reset exatamente uma vez ao tentar novamente', () => {
    const reset = vi.fn()

    render(<ErrorPage error={new Error('falha de teste')} reset={reset} />)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(screen.getByText(copy.system.error)).toBeInTheDocument()

    const retry = screen.getByRole('button', { name: copy.system.retry })
    fireEvent.click(retry)
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
