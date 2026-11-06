import { getNuvemshopIntakeLedger } from '@/lib/server/nuvemshop-intake-runtime'
import { handleNuvemshopIntake } from '@/modules/nuvemshop/server/webhook-intake'

// Node.js is the default; Cache Components rejects an explicit runtime export.

export async function POST(request: Request): Promise<Response> {
  return handleNuvemshopIntake(request, getNuvemshopIntakeLedger)
}
