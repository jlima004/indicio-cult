import { fireEvent, render, screen } from '@testing-library/react'
import { Children, isValidElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import GlobalError from '@/app/global-error'
import { copy } from '@/lib/copy'

vi.mock('next/font/google', () => ({
  Cormorant_Garamond: () => ({ variable: 'font-cormorant' }),
  Inter: () => ({ variable: 'font-inter' }),
}))

describe('Global Error', () => {
  it('é autossuficiente em html/body, usa a copy canônica e permite retry por reset', () => {
    const reset = vi.fn()
    const documentElement = GlobalError({
      error: new Error('falha global de teste'),
      reset,
    })

    expect(documentElement.type).toBe('html')
    const body = Children.only(documentElement.props.children)
    expect(isValidElement(body) && body.type).toBe('body')

    if (!isValidElement<{ children: ReactNode }>(body)) {
      throw new Error('Global Error deve renderizar um body válido')
    }

    render(body.props.children)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(screen.getByText(copy.system.error)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: copy.system.retry }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
