// @vitest-environment node

import { expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({ connection: vi.fn() }))

import { GET } from '@/app/api/live/route'

it('reports process liveness without caching', async () => {
  const response = await GET()

  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({ status: 'live' })
})
