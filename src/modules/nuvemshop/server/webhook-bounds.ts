import 'server-only'

import { NuvemshopWebhookError } from './errors'

// Local HTTP intake limits, not provider guarantees or changes to the shared decoder.
const MAX_DEPTH = 32
const MAX_CONTAINERS = 1024
const MAX_TOKENS = 8192
const MAX_PROPERTIES = 4096
const MAX_PRIMITIVE_CHARS = 256

/** Linear lexical cost preflight; JSON syntax and numeric semantics remain the decoder's. */
export function assertWebhookJsonBounds(raw: string): void {
  let depth = 0
  let containers = 0
  let tokens = 0
  let properties = 0
  let primitiveLength = 0
  let quoted = false
  let escaped = false
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') {
      quoted = true
      primitiveLength = 0
      tokens += 1
    } else if (char === '{' || char === '[') {
      depth += 1
      containers += 1
      tokens += 1
      primitiveLength = 0
    } else if (char === '}' || char === ']') {
      depth -= 1
      primitiveLength = 0
    } else if (char === ':') {
      properties += 1
      primitiveLength = 0
    } else if (char === ',' || char === ' ' || char === '\n' || char === '\r' || char === '\t') {
      primitiveLength = 0
    } else {
      if (primitiveLength === 0) tokens += 1
      primitiveLength += 1
    }
    if (
      depth < 0 ||
      depth > MAX_DEPTH ||
      containers > MAX_CONTAINERS ||
      tokens > MAX_TOKENS ||
      properties > MAX_PROPERTIES ||
      primitiveLength > MAX_PRIMITIVE_CHARS
    ) {
      throw new NuvemshopWebhookError()
    }
  }
}
