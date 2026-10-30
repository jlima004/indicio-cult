import 'server-only'

const mvpPolicy = Object.freeze({
  minimumDaysFromIntake: 14,
  minimumDaysAfterTerminal: 14,
  manualReplayWindowDaysFromIntake: 7,
} as const)

/**
 * HR-07 D4: preserve until the later minimum; never purge nonterminal work or
 * incident holds. Received work's eventual terminal time belongs to NUV-17.
 * These policies define metadata only, without scheduling purge or replay.
 * A privacy policy requires HR-08 and must not inherit these windows.
 */
export const intakeRetentionPolicies = Object.freeze({
  'business-v1': mvpPolicy,
  'lifecycle-v1': mvpPolicy,
  'unknown-v1': mvpPolicy,
})
