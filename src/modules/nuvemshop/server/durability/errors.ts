import 'server-only'

export type IntakeErrorCode =
  | 'NUVEMSHOP_INTAKE_STORAGE_ERROR'
  | 'NUVEMSHOP_INTAKE_COMMIT_INDETERMINATE'
  | 'NUVEMSHOP_INTAKE_POLICY_ERROR'
  | 'NUVEMSHOP_INTAKE_INPUT_ERROR'
  | 'NUVEMSHOP_INTAKE_IDENTITY_CONFLICT'
  | 'NUVEMSHOP_INTAKE_CONFIG_ERROR'

/** Deliberately carries no driver cause, SQL, input, connection or credentials. */
export class NuvemshopIntakeError extends Error {
  constructor(readonly code: IntakeErrorCode) {
    super(code)
    this.name = 'NuvemshopIntakeError'
  }
}
