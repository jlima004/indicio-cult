import 'server-only'

import {
  NuvemshopProtocolError,
  NuvemshopValidationError,
  type NuvemshopErrorContext,
} from '../errors'

export function failProtocol(resourceKind?: NuvemshopErrorContext['resourceKind']): never {
  throw new NuvemshopProtocolError({
    operation: 'read',
    ...(resourceKind ? { resourceKind } : {}),
  })
}

export function failValidation(resourceKind?: NuvemshopErrorContext['resourceKind']): never {
  throw new NuvemshopValidationError({
    operation: 'read',
    ...(resourceKind ? { resourceKind } : {}),
  })
}
