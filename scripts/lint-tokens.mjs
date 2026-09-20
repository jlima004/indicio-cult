import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sourceExtensions = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.html',
  '.js',
  '.jsx',
  '.less',
  '.mjs',
  '.mdx',
  '.mts',
  '.pcss',
  '.sass',
  '.scss',
  '.svg',
  '.ts',
  '.tsx',
])

const authorizedTokenFile = path.resolve('src/styles/globals.css')
const require = createRequire(import.meta.url)

function loadTailwindPalette() {
  const theme = readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8')
  const names = new Set(['transparent'])

  for (const match of theme.matchAll(/--color-([a-z0-9-]+)\s*:/g)) {
    names.add(match[1].replace(/-(?:50|[1-9]00|950)$/, ''))
  }

  return [...names].sort((left, right) => right.length - left.length).join('|')
}

const palette = loadTailwindPalette()
const cssNamedColors = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'transparent',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
].join('|')
const utility = [
  'accent',
  'bg',
  'border(?:-(?:[trblxyse]|bs|be))?',
  'caret',
  'decoration',
  'divide(?:-[xy])?',
  'drop-shadow',
  'fill',
  'from',
  'inset-ring',
  'inset-shadow',
  'mask-(?:top|right|bottom|left|linear|radial|conic)-(?:from|to)',
  'outline',
  'placeholder',
  'ring-offset',
  'ring',
  'shadow',
  'stroke',
  'text',
  'text-shadow',
  'to',
  'via',
].join('|')
const arbitraryUtility = [utility, 'backdrop-filter', 'filter', 'mask'].join('|')
const paletteUtilityPattern = new RegExp(
  `(?:^|[^A-Za-z0-9_-])((?:${utility})-(?:${palette})(?:-[0-9]{1,3})?(?:/[0-9]{1,3})?)(?![A-Za-z0-9_-])`,
  'gm',
)
const arbitraryColorUtilityStartPattern = new RegExp(
  `(?:^|[^A-Za-z0-9_-])((?:${arbitraryUtility})-\\[)`,
  'gim',
)
const arbitraryPropertyStartPattern = new RegExp(
  `(?:^|[^A-Za-z0-9_-])(\\[((?:--[A-Za-z_][A-Za-z0-9_-]*|-?[A-Za-z][A-Za-z0-9-]*)):)`,
  'gim',
)
const colorAttribute = [
  'accent(?:-color|Color)?',
  'bgcolor',
  'caret(?:-color|Color)?',
  'color',
  'fill',
  'flood(?:-color|Color)',
  'lighting(?:-color|Color)',
  'outline(?:-color|Color)?',
  'stop(?:-color|Color)',
  'stroke',
  'text(?:-decoration-color|DecorationColor)',
].join('|')
const colorFunction = '(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)\\s*\\([^)]*\\)'
const hexColor = '#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})(?![A-Za-z0-9_-])'
const colorLiteral = `(?<![A-Za-z0-9_-])(?:${hexColor}|${colorFunction}|(?:${cssNamedColors})(?![A-Za-z0-9_-]))`
const colorLiteralPattern = new RegExp(colorLiteral, 'gim')
const colorAttributePattern = new RegExp(
  `(?:^|[^A-Za-z0-9_-])(?:${colorAttribute})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{([^{}]*)\\})`,
  'gim',
)
const cssEscape = '\\\\(?:[0-9A-Fa-f]{1,6}[\\t\\n\\f\\r ]?|[^\\r\\n\\f])'
const cssPropertyName = `(?:--|-)?(?:${cssEscape}|[A-Za-z_])(?:${cssEscape}|[A-Za-z0-9_-])*`
const declarationStartPattern = new RegExp(
  `(?:^|[;{,])\\s*(["']?)(${cssPropertyName})\\1\\s*:\\s*`,
  'gm',
)
const fragmentUrlPattern = /url\(\s*["'`]?#[A-Za-z0-9_.:-]+["'`]?\s*\)/gim
const urlFunctionStartPattern = /url\(\s*/gim
const urlAttributePattern =
  /(?:^|[^A-Za-z0-9_-])(?:action|cite|data|formAction|href|ping|poster|src|srcSet|xlinkHref|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\}|([^\s"'=<>`]+))/gim
const styleAttributePattern =
  /(?:^|[^A-Za-z0-9_-])style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`{}]+))/gim
const arbitraryVariableNamePattern = /var\(\s*--[A-Za-z0-9_-]+/gim
const stylesheetExtensions = new Set(['.css', '.less', '.pcss', '.sass', '.scss'])
const scriptStylePropertyPattern =
  /^(?:-webkit-(?:box-shadow|mask(?:-(?:box-image|image))?|tap-highlight-color|text-(?:fill-color|stroke(?:-color)?))|accent-color|backdrop-filter|background(?:-(?:color|image))?|border(?:-(?:(?:block|inline)(?:-(?:start|end))?|top|right|bottom|left))?(?:-color)?|border-image|box-shadow|caret-color|color|column-rule(?:-color)?|fill|filter|flood-color|lighting-color|mask(?:-image|-border(?:-source)?)?|outline(?:-color)?|scrollbar-color|stop-color|stroke|text-(?:decoration|emphasis)(?:-color)?|text-shadow)$/i

function stripComments(source) {
  let state = 'code'
  let output = ''

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (state === 'line-comment') {
      if (character === '\n') {
        state = 'code'
        output += character
      } else {
        output += ' '
      }
      continue
    }

    if (state === 'block-comment') {
      if (character === '*' && nextCharacter === '/') {
        output += '  '
        index += 1
        state = 'code'
      } else {
        output += character === '\n' ? '\n' : ' '
      }
      continue
    }

    if (state !== 'code') {
      output += character
      if (character === '\\') {
        if (nextCharacter !== undefined) {
          output += nextCharacter
          index += 1
        }
      } else if (
        (state === 'single-quote' && character === "'") ||
        (state === 'double-quote' && character === '"') ||
        (state === 'template' && character === '`')
      ) {
        state = 'code'
      }
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      output += '  '
      index += 1
      state = 'line-comment'
    } else if (character === '/' && nextCharacter === '*') {
      output += '  '
      index += 1
      state = 'block-comment'
    } else {
      output += character
      if (character === "'") state = 'single-quote'
      if (character === '"') state = 'double-quote'
      if (character === '`') state = 'template'
    }
  }

  return output
}

function locationAt(source, index) {
  const before = source.slice(0, index)
  const line = before.split('\n').length
  const lastLineBreak = before.lastIndexOf('\n')
  const column = index - lastLineBreak

  return { line, column }
}

function expandTailwindCandidate(source, match, index) {
  let start = index

  while (start > 0 && /[A-Za-z0-9_@.&*<>()[\]!:/-]/.test(source[start - 1])) {
    start -= 1
  }

  return { match: source.slice(start, index + match.length), index: start }
}

function addMatches(violations, source, pattern, kind, capture = 0, expandCandidate = false) {
  pattern.lastIndex = 0

  for (const result of source.matchAll(pattern)) {
    let match = result[capture]
    if (match === undefined || result.index === undefined) continue

    let index = result.index + result[0].indexOf(match)
    if (expandCandidate) ({ match, index } = expandTailwindCandidate(source, match, index))
    violations.push({ kind, match, index, ...locationAt(source, index) })
  }
}

function maskRanges(source, violations) {
  const characters = source.split('')

  for (const { index, match } of violations) {
    for (let offset = 0; offset < match.length; offset += 1) {
      if (characters[index + offset] !== '\n') characters[index + offset] = ' '
    }
  }

  return characters.join('')
}

function maskPattern(source, pattern) {
  const ranges = []
  pattern.lastIndex = 0

  for (const result of source.matchAll(pattern)) {
    if (result.index === undefined) continue
    ranges.push({ index: result.index, match: result[0] })
  }

  return maskRanges(source, ranges)
}

function findUrlFunctionRanges(source) {
  const ranges = []
  urlFunctionStartPattern.lastIndex = 0
  let result

  while ((result = urlFunctionStartPattern.exec(source)) !== null) {
    if (result.index === undefined) continue
    let quote
    let closed = false

    for (let index = urlFunctionStartPattern.lastIndex; index < source.length; index += 1) {
      const character = source[index]

      if (quote !== undefined) {
        if (character === '\\') {
          index += 1
        } else if (character === quote) {
          quote = undefined
        }
      } else if (character === '\\') {
        index += 1
      } else if (character === '"' || character === "'") {
        quote = character
      } else if (character === ')') {
        ranges.push({
          index: result.index,
          match: source.slice(result.index, index + 1),
        })
        urlFunctionStartPattern.lastIndex = index + 1
        closed = true
        break
      }
    }

    if (!closed) break
  }

  return ranges
}

function findUrlAttributeValueRanges(source) {
  const ranges = []
  urlAttributePattern.lastIndex = 0

  for (const result of source.matchAll(urlAttributePattern)) {
    if (result.index === undefined) continue
    const value = result.slice(1).find((capture) => capture !== undefined)
    if (value === undefined) continue
    ranges.push({
      index: result.index + result[0].lastIndexOf(value),
      match: value,
    })
  }

  return ranges
}

function maskUrlFunctions(source) {
  return maskRanges(source, findUrlFunctionRanges(source))
}

function maskUrls(source) {
  const withoutFunctions = maskUrlFunctions(source)
  return maskRanges(withoutFunctions, findUrlAttributeValueRanges(withoutFunctions))
}

function stripCommentsPreservingUrls(source) {
  const ranges = [...findUrlFunctionRanges(source), ...findUrlAttributeValueRanges(source)]
  const protectedCharacters = source.split('')

  for (const { index, match } of ranges) {
    for (let offset = 0; offset < match.length; offset += 1) {
      if (protectedCharacters[index + offset] !== '\n') protectedCharacters[index + offset] = 'x'
    }
  }

  const strippedCharacters = stripComments(protectedCharacters.join('')).split('')

  for (const { index, match } of ranges) {
    for (let offset = 0; offset < match.length; offset += 1) {
      if (strippedCharacters[index + offset] === 'x') {
        strippedCharacters[index + offset] = source[index + offset]
      }
    }
  }

  return strippedCharacters.join('')
}

function normalizeCssEscapes(value) {
  let text = ''
  const indexMap = []

  function append(replacement, sourceIndex) {
    text += replacement
    for (let index = 0; index < replacement.length; index += 1) indexMap.push(sourceIndex)
  }

  for (let index = 0; index < value.length;) {
    if (value[index] !== '\\') {
      append(value[index], index)
      index += 1
      continue
    }

    const escapeIndex = index
    index += 1
    if (index >= value.length) {
      append('\\', escapeIndex)
      break
    }

    if (value[index] === '\n' || value[index] === '\f') {
      index += 1
      continue
    }
    if (value[index] === '\r') {
      index += value[index + 1] === '\n' ? 2 : 1
      continue
    }

    let hexadecimal = ''
    while (hexadecimal.length < 6 && /[0-9A-Fa-f]/.test(value[index] ?? '')) {
      hexadecimal += value[index]
      index += 1
    }

    if (hexadecimal.length > 0) {
      const codePoint = Number.parseInt(hexadecimal, 16)
      if (/[\t\n\f\r ]/.test(value[index] ?? '')) {
        if (value[index] === '\r' && value[index + 1] === '\n') index += 1
        index += 1
      }
      append(
        codePoint === 0 || codePoint > 0x10ffff ? '\uFFFD' : String.fromCodePoint(codePoint),
        escapeIndex,
      )
      continue
    }

    append(value[index], escapeIndex)
    index += 1
  }

  return { text, indexMap }
}

function normalizePropertyName(property, cssSyntax = false) {
  const decoded = normalizeCssEscapes(property).text
  if (cssSyntax || decoded.startsWith('--')) return decoded.toLowerCase()
  return decoded.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).toLowerCase()
}

function normalizeArbitraryValue(value) {
  const withoutUrls = maskUrlFunctions(value)
  const withoutVariableNames = maskPattern(withoutUrls, arbitraryVariableNamePattern)
  let normalized = ''

  for (let index = 0; index < withoutVariableNames.length; index += 1) {
    const character = withoutVariableNames[index]

    if (character === '\\' && withoutVariableNames[index + 1] === '_') {
      normalized += 'xx'
      index += 1
    } else {
      normalized += character === '_' ? ' ' : character
    }
  }

  return normalizeCssEscapes(normalized).text
}

function containsColorLiteral(value) {
  colorLiteralPattern.lastIndex = 0
  return colorLiteralPattern.test(normalizeArbitraryValue(value))
}

function arbitraryValueEnd(source, start) {
  let brackets = 1
  let quote

  for (let index = start; index < source.length; index += 1) {
    const character = source[index]

    if (quote !== undefined) {
      if (character === '\\') {
        index += 1
      } else if (character === quote) {
        quote = undefined
      }
      continue
    }

    if (character === '\\') {
      index += 1
    } else if (character === '"' || character === "'" || character === '`') {
      quote = character
    } else if (character === '[') {
      brackets += 1
    } else if (character === ']') {
      brackets -= 1
      if (brackets === 0) return index
    } else if (character === '\n') {
      return -1
    }
  }

  return -1
}

function addArbitraryColorUtilities(violations, source) {
  arbitraryColorUtilityStartPattern.lastIndex = 0
  let result

  while ((result = arbitraryColorUtilityStartPattern.exec(source)) !== null) {
    if (result.index === undefined) continue
    const prefix = result[1]
    const baseIndex = result.index + result[0].indexOf(prefix)
    const valueIndex = baseIndex + prefix.length
    const valueEnd = arbitraryValueEnd(source, valueIndex)
    if (valueEnd === -1) break

    arbitraryColorUtilityStartPattern.lastIndex = valueEnd + 1
    const value = source.slice(valueIndex, valueEnd)
    if (!containsColorLiteral(value)) continue

    const baseMatch = source.slice(baseIndex, valueEnd + 1)
    const { match, index } = expandTailwindCandidate(source, baseMatch, baseIndex)
    violations.push({
      kind: 'tailwind-arbitrary-color',
      match,
      index,
      ...locationAt(source, index),
    })
  }
}

function addArbitraryPropertyColors(violations, source) {
  arbitraryPropertyStartPattern.lastIndex = 0
  let result

  while ((result = arbitraryPropertyStartPattern.exec(source)) !== null) {
    if (result.index === undefined) continue
    const prefix = result[1]
    const baseIndex = result.index + result[0].indexOf(prefix)
    const valueIndex = baseIndex + prefix.length
    const valueEnd = arbitraryValueEnd(source, valueIndex)
    if (valueEnd === -1) break

    arbitraryPropertyStartPattern.lastIndex = valueEnd + 1
    const property = result[2]
    if (
      !property.startsWith('--') &&
      !scriptStylePropertyPattern.test(normalizePropertyName(property, true))
    ) {
      continue
    }

    const value = source.slice(valueIndex, valueEnd)
    if (!containsColorLiteral(value)) continue

    const baseMatch = source.slice(baseIndex, valueEnd + 1)
    const { match, index } = expandTailwindCandidate(source, baseMatch, baseIndex)
    violations.push({
      kind: 'tailwind-arbitrary-property-color',
      match,
      index,
      ...locationAt(source, index),
    })
  }
}

function addColorLiterals(violations, source, value, valueIndex) {
  const normalized = normalizeCssEscapes(value)
  colorLiteralPattern.lastIndex = 0

  for (const result of normalized.text.matchAll(colorLiteralPattern)) {
    if (result.index === undefined) continue
    const index = valueIndex + (normalized.indexMap[result.index] ?? result.index)
    violations.push({
      kind: 'css-color-literal',
      match: result[0],
      index,
      ...locationAt(source, index),
    })
  }
}

function declarationValueEnd(source, start, stopAtComma) {
  let quote
  let parentheses = 0
  let brackets = 0

  for (let index = start; index < source.length; index += 1) {
    const character = source[index]

    if (quote !== undefined) {
      if (character === '\\') {
        index += 1
      } else if (character === quote) {
        quote = undefined
      }
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character
    } else if (character === '(') {
      parentheses += 1
    } else if (character === ')') {
      parentheses = Math.max(0, parentheses - 1)
    } else if (character === '[') {
      brackets += 1
    } else if (character === ']') {
      brackets = Math.max(0, brackets - 1)
    } else if (
      parentheses === 0 &&
      brackets === 0 &&
      (character === ';' || character === '}' || (stopAtComma && character === ','))
    ) {
      return index
    }
  }

  return source.length
}

function addDeclarationLiterals(violations, source, filePath) {
  const stylesheet = stylesheetExtensions.has(path.extname(filePath).toLowerCase())
  const stopAtComma = !stylesheet
  declarationStartPattern.lastIndex = 0
  let result

  while ((result = declarationStartPattern.exec(source)) !== null) {
    const property = result[2]
    const normalizedProperty = normalizePropertyName(property, stylesheet)
    const valueIndex = declarationStartPattern.lastIndex
    const valueEnd = declarationValueEnd(source, valueIndex, stopAtComma)

    declarationStartPattern.lastIndex = valueEnd
    if (!property.startsWith('--') && !scriptStylePropertyPattern.test(normalizedProperty)) continue

    const value = source.slice(valueIndex, valueEnd)
    addColorLiterals(violations, source, value, valueIndex)
  }
}

function findStyleAttributeValueRanges(source) {
  const ranges = []
  styleAttributePattern.lastIndex = 0

  for (const result of source.matchAll(styleAttributePattern)) {
    if (result.index === undefined) continue
    const value = result[1] ?? result[2] ?? result[3]
    if (value === undefined) continue
    ranges.push({
      index: result.index + result[0].lastIndexOf(value),
      match: value,
    })
  }

  return ranges
}

function addInlineStyleLiterals(violations, source) {
  for (const range of findStyleAttributeValueRanges(source)) {
    const inlineViolations = []
    addDeclarationLiterals(inlineViolations, range.match, 'inline.css')

    for (const violation of inlineViolations) {
      const index = range.index + violation.index
      violations.push({
        ...violation,
        index,
        ...locationAt(source, index),
      })
    }
  }
}

function addAttributeLiterals(violations, source) {
  colorAttributePattern.lastIndex = 0

  for (const result of source.matchAll(colorAttributePattern)) {
    if (result.index === undefined) continue
    const value = result[1] ?? result[2] ?? result[3]
    if (value === undefined) continue
    const valueIndex = result.index + result[0].lastIndexOf(value)
    addColorLiterals(violations, source, value, valueIndex)
  }
}

export function analyzeSource(source, filePath = '<source>') {
  const uncommented = stripCommentsPreservingUrls(source)
  const withoutUrls = maskUrls(uncommented)
  const violations = []
  const arbitraryViolations = []

  addArbitraryColorUtilities(arbitraryViolations, uncommented)
  addArbitraryPropertyColors(arbitraryViolations, uncommented)
  violations.push(...arbitraryViolations)

  addMatches(violations, withoutUrls, paletteUtilityPattern, 'tailwind-palette', 1, true)

  const withoutArbitraryColors = maskRanges(withoutUrls, arbitraryViolations)
  const withoutFragmentUrls = maskPattern(withoutArbitraryColors, fragmentUrlPattern)
  addInlineStyleLiterals(violations, withoutFragmentUrls)
  const withoutInlineStyles = maskRanges(
    withoutFragmentUrls,
    findStyleAttributeValueRanges(withoutFragmentUrls),
  )
  addDeclarationLiterals(violations, withoutInlineStyles, filePath)
  addAttributeLiterals(violations, withoutInlineStyles)

  const uniqueViolations = [
    ...new Map(
      violations.map((violation) => [
        `${violation.kind}:${violation.index}:${violation.match}`,
        violation,
      ]),
    ).values(),
  ]

  return uniqueViolations
    .sort((left, right) => left.index - right.index || left.kind.localeCompare(right.kind))
    .map(({ kind, match, line, column }) => ({ kind, match, line, column, filePath }))
}

function collectFiles(target) {
  const resolvedTarget = path.resolve(target)
  const metadata = statSync(resolvedTarget)

  if (metadata.isFile()) {
    return sourceExtensions.has(path.extname(resolvedTarget)) ? [resolvedTarget] : []
  }

  return readdirSync(resolvedTarget, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => collectFiles(path.join(resolvedTarget, entry.name)))
}

export function lintPaths(targets = ['src']) {
  const files = targets
    .flatMap(collectFiles)
    .filter((filePath) => path.resolve(filePath) !== authorizedTokenFile)
    .sort()

  return files.flatMap((filePath) => analyzeSource(readFileSync(filePath, 'utf8'), filePath))
}

function runCli(targets) {
  try {
    const violations = lintPaths(targets.length === 0 ? ['src'] : targets)

    for (const violation of violations) {
      const relativePath = path.relative(process.cwd(), violation.filePath) || violation.filePath
      console.log(
        `${relativePath}:${violation.line}:${violation.column} [${violation.kind}] ${violation.match}`,
      )
    }

    return violations.length === 0 ? 0 : 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 2
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined
if (entryPoint === import.meta.url) {
  process.exitCode = runCli(process.argv.slice(2))
}
