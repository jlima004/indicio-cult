import { connection } from 'next/server'

// Liveness only: this does not check external dependencies or application health.
export async function GET(): Promise<Response> {
  await connection()
  return Response.json({ status: 'live' }, { headers: { 'Cache-Control': 'no-store' } })
}
