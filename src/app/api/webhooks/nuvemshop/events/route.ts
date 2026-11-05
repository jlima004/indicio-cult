import { getNuvemshopIntakeLedger } from '@/lib/server/nuvemshop-intake-runtime'
import { handleNuvemshopIntake } from '@/modules/nuvemshop/server/webhook-intake'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return handleNuvemshopIntake(request, getNuvemshopIntakeLedger)
}
