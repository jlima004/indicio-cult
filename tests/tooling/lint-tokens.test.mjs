import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { after, describe, it } from 'node:test'

import { analyzeSource } from '../../scripts/lint-tokens.mjs'

const temporaryDirectories = []

after(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('lint de tokens', () => {
  const forbiddenPaletteUtilities = [
    'bg-white',
    'text-black',
    'text-red-500',
    'bg-neutral-950',
    'border-zinc-300',
    'fill-blue-600',
    'stroke-white',
    'placeholder-red-500',
    'ring-offset-red-500',
    'drop-shadow-red-500',
    'bg-mauve-500',
    'bg-olive-500',
    'bg-mist-500',
    'bg-taupe-500',
    'text-shadow-red-500',
    'mask-linear-from-red-500',
    'mask-radial-to-red-500',
    'mask-conic-from-red-500',
  ]

  for (const utility of forbiddenPaletteUtilities) {
    it(`rejeita a utility de paleta ${utility}`, () => {
      const violations = analyzeSource(`<div className="${utility}" />`, 'fixture.tsx')

      assert.equal(
        violations.some(({ match }) => match === utility),
        true,
      )
    })
  }

  const forbiddenVariants = [
    'hover:text-red-500',
    'dark:bg-neutral-950',
    '!border-zinc-300',
    'text-red-500/50',
  ]

  for (const utility of forbiddenVariants) {
    it(`rejeita variante ou modifier de paleta ${utility}`, () => {
      const violations = analyzeSource(`<div className="${utility}" />`, 'fixture.tsx')

      assert.notEqual(violations.length, 0)
    })
  }

  const forbiddenArbitraryUtilities = [
    'text-[#fff]',
    'bg-[rgb(1_2_3)]',
    'border-[oklch(0.5_0.2_120)]',
    'bg-[red]',
    'bg-[RGB(1_2_3)]',
    'text-[color:navy]',
    'text-[color:#abcdef]',
    'text-[color:RGB(1_2_3)]',
  ]

  for (const utility of forbiddenArbitraryUtilities) {
    it(`rejeita a cor arbitrária ${utility}`, () => {
      const violations = analyzeSource(`<div className="${utility}" />`, 'fixture.tsx')

      assert.equal(
        violations.some(({ match }) => match === utility),
        true,
      )
    })
  }

  const forbiddenArbitraryProperties = [
    '[color:#fff]',
    '[color:red]',
    '[background:#fff]',
    '[background-color:rgb(1_2_3)]',
    '[border-color:oklch(0.5_0.2_120)]',
    '[fill:blue]',
    '[stroke:#abcdef]',
    '[caret-color:red]',
    '[outline-color:#fff]',
    'hover:[color:#fff]',
    'dark:[background:red]',
    '[color:RGB(1_2_3)]',
    '[background:linear-gradient(#fff,#000)]',
    '[background:color-mix(in_oklab,#fff,#000)]',
    "[background:url('/icons/[id].svg'),linear-gradient(#fff,#000)]",
    '[-webkit-text-fill-color:#fff]',
    '[mask-border:linear-gradient(red,blue)]',
    '[mask-border-source:linear-gradient(#fff,#000)]',
    '[-webkit-mask-image:linear-gradient(#fff,#000)]',
    '[-webkit-mask-box-image:linear-gradient(red,blue)]',
    '[-webkit-mask:linear-gradient(#fff,#000)]',
    '[-webkit-tap-highlight-color:red]',
    '[-webkit-box-shadow:0_0_#fff]',
    '[--brand:#fff]',
  ]

  for (const utility of forbiddenArbitraryProperties) {
    it(`rejeita propriedade arbitrária cromática ${utility}`, () => {
      const violations = analyzeSource(`<div className="${utility}" />`, 'fixture.tsx')

      assert.notEqual(violations.length, 0)
    })
  }

  const acceptedArbitraryProperties = [
    '[color:var(--color-fg)]',
    '[background:var(--color-bg)]',
    '[border-color:var(--color-border)]',
    '[fill:currentColor]',
    '[stroke:currentColor]',
    '[display:grid]',
    '[grid-template-columns:1fr_2fr]',
    "[background:url('/icons/red.svg')]",
    '[background:var(--my_red)]',
    '[width:#fff]',
    '[content:#fff]',
    "[background:url('/assets/text-red-500.svg')]",
    '[--brand:var(--color-accent)]',
  ]

  for (const utility of acceptedArbitraryProperties) {
    it(`aceita propriedade arbitrária não literal ${utility}`, () => {
      assert.deepEqual(analyzeSource(`<div className="${utility}" />`, 'fixture.tsx'), [])
    })
  }

  const forbiddenCompositeArbitraryUtilities = [
    'bg-[linear-gradient(#fff,#000)]',
    'bg-[radial-gradient(red,blue)]',
    'bg-[conic-gradient(from_90deg,#fff,_#000)]',
    'bg-[color-mix(in_oklab,#fff,#000)]',
    'bg-[linear-gradient(rgb(1_2_3),oklch(0.5_0.2_120))]',
    'hover:bg-[image:LiNeAr-GrAdIeNt(RGB(1_2_3),_OkLCh(0.5_0.2_120))]',
    'dark:bg-[COLOR-MIX(in_oklab,red,blue)]',
    'hover:bg-[linear-gradient(#fff,#000)]',
    'bg-[linear-gradient(red_0%,#000_100%)]',
    'bg-[image:LiNeAr-GrAdIeNt(#fff,#000)]',
    "bg-[url('/icons/[id].svg'),linear-gradient(#fff,#000)]",
    'bg-[device-cmyk(0_1_1_0)]',
  ]

  for (const utility of forbiddenCompositeArbitraryUtilities) {
    it(`rejeita literal cromático em função composta ${utility}`, () => {
      const violations = analyzeSource(`<div className="${utility}" />`, 'fixture.tsx')

      assert.notEqual(violations.length, 0)
    })
  }

  const acceptedCompositeArbitraryUtilities = [
    'bg-[linear-gradient(var(--a),var(--b))]',
    'bg-[radial-gradient(var(--color-bg),var(--color-fg))]',
    'bg-[color-mix(in_oklab,var(--a),var(--b))]',
    'hover:bg-[LiNeAr-GrAdIeNt(var(--a),_var(--b))]',
    'bg-[url(#fff)]',
    "bg-[url('/assets/bg-red-500.svg')]",
  ]

  for (const utility of acceptedCompositeArbitraryUtilities) {
    it(`aceita função composta arbitrária baseada em var ${utility}`, () => {
      assert.deepEqual(analyzeSource(`<div className="${utility}" />`, 'fixture.tsx'), [])
    })
  }

  it('aceita data URL SVG sem tratar texto incorporado como cor', () => {
    const utility = 'bg-[url("data:image/svg+xml,<svg fill=\'red\'/>")]'
    const source = '<div className={`' + utility + '`} />'

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  const forbiddenFilterMaskAndLogicalBorderUtilities = [
    'filter-[drop-shadow(0_0_#fff)]',
    'backdrop-filter-[drop-shadow(0_0_#fff)]',
    'mask-[linear-gradient(#fff,#000)]',
    'border-bs-[#fff]',
    'border-be-[red]',
  ]

  for (const utility of forbiddenFilterMaskAndLogicalBorderUtilities) {
    it('rejeita literal cromático em utility especial ' + utility, () => {
      const violations = analyzeSource('<div className="' + utility + '" />', 'fixture.tsx')

      assert.notEqual(violations.length, 0)
    })
  }

  it('aceita nomes de utilities de paleta dentro de atributos de URL', () => {
    const source = `
      <img src="/assets/bg-red-500.svg" alt="" />
      <a href="/assets/text-red-500.html">Link</a>
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('preserva o mascaramento de URL após caracteres Unicode não BMP', () => {
    const source = '<div>😀</div><img src="/assets/bg-red-500.svg" />'

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('detecta cor após URL CSS com protocolo sem transformar // em comentário', () => {
    const violations = analyzeSource(
      '.x{background:url(https://x.test/a);color:red}',
      'fixture.css',
    )

    assert.equal(
      violations.some(({ match }) => match === 'red'),
      true,
    )
  })

  const validPaletteUrlFixtures = [
    {
      name: 'JSX src em expressão',
      source: "<img src={'/assets/bg-red-500.svg'} />",
      filePath: 'fixture.tsx',
    },
    {
      name: 'template href',
      source: '<a href={`/assets/text-red-500.html`}>Link</a>',
      filePath: 'fixture.tsx',
    },
    {
      name: 'HTML src sem aspas',
      source: '<img src=/assets/fill-blue-600.svg />',
      filePath: 'fixture.tsx',
    },
    {
      name: 'CSS url com parêntese escapado',
      source: ".x{background:url('/assets/stroke-white.svg\\)')}",
      filePath: 'fixture.css',
    },
  ]

  for (const { name, source, filePath } of validPaletteUrlFixtures) {
    it('aceita utility de paleta em ' + name, () => {
      assert.deepEqual(analyzeSource(source, filePath), [])
    })
  }

  it('rejeita cor CSS em declaração após escape hexadecimal', () => {
    const violations = analyzeSource('.x{color:r\\65 d}', 'fixture.css')

    assert.equal(
      violations.some(({ match }) => match === 'red'),
      true,
    )
  })

  it('rejeita cor CSS em arbitrary property após escape hexadecimal', () => {
    const violations = analyzeSource('<div className="[color:r\\65_d]" />', 'fixture.tsx')

    assert.notEqual(violations.length, 0)
  })

  it('rejeita propriedades CSS cromáticas em caixa alta ou mista', () => {
    const violations = analyzeSource(
      '.x{COLOR:red;BACKGROUND-COLOR:#fff;CoLoR:blue}',
      'fixture.css',
    )

    assert.equal(violations.length, 3)
  })

  it('rejeita nome de propriedade CSS com escape hexadecimal', () => {
    const violations = analyzeSource('.x{\\63 olor:red}', 'fixture.css')

    assert.equal(
      violations.some(({ match }) => match === 'red'),
      true,
    )
  })

  it('rejeita literais cromáticos em atributos style textuais', () => {
    const source = `
      <div style="color:#fff"></div>
      <path style="fill:red" />
      <div style=color:red></div>
      <div style=background:#fff></div>
    `

    assert.equal(analyzeSource(source, 'fixture.html').length, 4)
  })

  it('aceita tokens em atributos style textuais', () => {
    const source = '<div style="color:var(--color-fg)"></div><path style="fill:currentColor" />'

    assert.deepEqual(analyzeSource(source, 'fixture.html'), [])
  })

  it('rejeita literais em propriedades WebKit no CSS convencional', () => {
    const source = `.x {
      -webkit-mask: linear-gradient(#fff, #000);
      -webkit-tap-highlight-color: red;
      -webkit-box-shadow: 0 0 #fff;
    }`

    assert.equal(analyzeSource(source, 'fixture.css').length, 4)
  })

  it('aceita nomes de utilities de paleta em outros atributos URL', () => {
    const source = `
      <svg><use xlinkHref="/assets/bg-red-500.svg#icon" /></svg>
      <object data="/assets/bg-red-500.svg"></object>
      <blockquote cite="/assets/text-red-500.html"></blockquote>
      <a ping="/assets/fill-blue-600">Link</a>
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  const forbiddenCssLiterals = [
    "const style = { color: '#abcdef' }",
    "const style = { color: 'rgb(1 2 3)' }",
    "const style = { color: 'rgba(1, 2, 3, 0.5)' }",
    "const style = { color: 'hsl(120 50% 50%)' }",
    "const style = { color: 'hsla(120, 50%, 50%, 0.5)' }",
    "const style = { color: 'hwb(120 10% 20%)' }",
    "const style = { color: 'lab(50% 0 0)' }",
    "const style = { color: 'lch(50% 20 120)' }",
    "const style = { color: 'oklab(0.5 0 0)' }",
    "const style = { color: 'oklch(0.5 0.2 120)' }",
    "const style = { color: 'color(display-p3 1 0 0)' }",
    "const style = { color: 'color(from var(--base) srgb r g b)' }",
  ]

  for (const source of forbiddenCssLiterals) {
    it(`rejeita a cor CSS literal em ${source}`, () => {
      assert.notEqual(analyzeSource(source, 'fixture.ts').length, 0)
    })
  }

  it('rejeita cores nomeadas em atributos SVG de cor', () => {
    const violations = analyzeSource('<path fill="white" stroke="red" />', 'fixture.tsx')

    assert.equal(violations.length, 2)
  })

  it('rejeita atributos SVG cromáticos em camelCase e kebab-case', () => {
    const source = `
      <stop stopColor="#fff" />
      <stop stop-color="red" />
      <feFlood floodColor="blue" />
      <feFlood flood-color="#abcdef" />
      <feDiffuseLighting lightingColor="goldenrod" />
      <feDiffuseLighting lighting-color="#fff" />
    `
    const violations = analyzeSource(source, 'fixture.tsx')

    assert.equal(violations.length, 6)
    for (const match of ['#fff', 'red', 'blue', '#abcdef', 'goldenrod']) {
      assert.equal(
        violations.some((violation) => violation.match === match),
        true,
      )
    }
  })

  it('aceita atributos SVG cromáticos com tokens semânticos e currentColor', () => {
    const source = `
      <stop stopColor="currentColor" />
      <stop stop-color="var(--color-accent)" />
      <feFlood floodColor="currentColor" />
      <feFlood flood-color="var(--color-bg)" />
      <feDiffuseLighting lightingColor="var(--color-fg)" />
      <feDiffuseLighting lighting-color="currentColor" />
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('aceita tokens semânticos, tipografia e referências de fragmento', () => {
    const source = `
      <div className="bg-bg text-fg text-muted border-border text-accent text-lg size-[0.72em] bg-whiteish" />
      <a href="#feed-section">Feed</a>
      <a href="#abcdef">Fragmento hexadecimal</a>
      <svg data-commit="#abcdef"><path fill="url(#fade)" stroke="currentColor" /></svg>
      <span style={{ background: 'var(--color-bg)' }} />
      const gitRef = '#abcdef'
      const parsed = color(value)
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('rejeita cores em declarações CSS, inclusive shorthand', () => {
    const source = '.card { background: #abcdef; border: 1px solid rgb(1 2 3); }'
    const violations = analyzeSource(source, 'fixture.css')

    assert.equal(
      violations.some(({ match }) => match === '#abcdef'),
      true,
    )
    assert.equal(
      violations.some(({ match }) => match === 'rgb(1 2 3)'),
      true,
    )
  })

  it('rejeita literais em qualquer declaração CSS, inclusive custom properties', () => {
    const source = `
      .card {
        background-image: linear-gradient(#abcdef, rgb(1 2 3));
        text-shadow: 0 0 #fff;
        --brand: #abcdef;
      }
    `
    const violations = analyzeSource(source, 'fixture.css')

    assert.equal(violations.filter(({ match }) => match === '#abcdef').length, 2)
    assert.equal(
      violations.some(({ match }) => match === 'rgb(1 2 3)'),
      true,
    )
    assert.equal(
      violations.some(({ match }) => match === '#fff'),
      true,
    )
  })

  it('rejeita literais em declarações CSS formatadas em várias linhas', () => {
    const source = `
      .card {
        background-image: linear-gradient(
          #abcdef,
          rgb(1 2 3)
        );
      }
    `
    const violations = analyzeSource(source, 'fixture.css')

    assert.equal(
      violations.some(({ match }) => match === '#abcdef'),
      true,
    )
    assert.equal(
      violations.some(({ match }) => match === 'rgb(1 2 3)'),
      true,
    )
  })

  it('aceita fragmentos e hashes não cromáticos depois de atributos de cor', () => {
    const source = `
      <path fill="currentColor" data-commit="#abcdef" />
      <path stroke="currentColor" data-hash="#abcdef" />
      <a color="currentColor" href="#abcdef">Fragmento</a>
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('aceita nomes e hashes não cromáticos em declarações CSS', () => {
    const source = `
      .copy {
        font-family: "Red Hat Display";
        animation-name: red;
        content: "#abcdef";
      }
    `

    assert.deepEqual(analyzeSource(source, 'fixture.css'), [])
  })

  for (const namedColor of ['navy', 'goldenrod', 'papayawhip']) {
    it(`rejeita a cor CSS nomeada ${namedColor}`, () => {
      const violations = analyzeSource(`.card { color: ${namedColor}; }`, 'fixture.css')

      assert.equal(
        violations.some(({ match }) => match === namedColor),
        true,
      )
    })
  }

  it('preserva linha e coluna no diagnóstico', () => {
    const [violation] = analyzeSource('\n<div className="text-red-500" />', 'fixture.tsx')

    assert.equal(violation.line, 2)
    assert.equal(violation.column, 17)
  })

  it('ignora exemplos em comentários', () => {
    const source = `
      // Evite bg-white e #abcdef.
      /* Evite também rgb(1 2 3). */
      <div className="bg-bg" />
    `

    assert.deepEqual(analyzeSource(source, 'fixture.tsx'), [])
  })

  it('prova por mutação que o CLI falha e volta a passar após a correção', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'indicio-cult-token-lint-'))
    const fixture = path.join(directory, 'fixture.tsx')
    const script = path.resolve('scripts/lint-tokens.mjs')
    temporaryDirectories.push(directory)

    writeFileSync(fixture, '<div className="text-red-500" />\n')
    const failingRun = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })

    assert.equal(failingRun.status, 1)
    assert.match(failingRun.stdout, /text-red-500/)

    writeFileSync(fixture, '<div className="text-accent" />\n')
    const passingRun = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })

    assert.equal(passingRun.status, 0)
    assert.equal(passingRun.stdout, '')
  })

  it('prova pelo CLI que as formas adversariais também bloqueiam o gate', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'indicio-cult-token-adversarial-'))
    const fixture = path.join(directory, 'fixture.tsx')
    const script = path.resolve('scripts/lint-tokens.mjs')
    temporaryDirectories.push(directory)

    writeFileSync(
      fixture,
      '<div className="placeholder-red-500 bg-[RGB(1_2_3)] ring-offset-red-500 text-[color:navy] mask-linear-from-mauve-500" />\n',
    )
    const run = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })

    assert.equal(run.status, 1)
    assert.match(run.stdout, /placeholder-red-500/)
    assert.match(run.stdout, /bg-\[RGB\(1_2_3\)\]/)
    assert.match(run.stdout, /ring-offset-red-500/)
    assert.match(run.stdout, /text-\[color:navy\]/)
    assert.match(run.stdout, /mask-linear-from-mauve-500/)
  })

  it('prova pelo CLI que um arbitrary utility composto não passa pelo gate', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'indicio-cult-token-lint-compound-'))
    const fixture = path.join(directory, 'fixture.tsx')
    const script = path.resolve('scripts/lint-tokens.mjs')
    temporaryDirectories.push(directory)

    writeFileSync(fixture, '<div className="bg-[linear-gradient(#fff,#000)]" />\n')
    const failingRun = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })

    assert.equal(failingRun.status, 1)
    assert.match(failingRun.stdout, /#fff/)

    writeFileSync(fixture, '<div className="bg-[linear-gradient(var(--a),var(--b))]" />\n')
    const passingRun = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' })

    assert.equal(passingRun.status, 0)
    assert.equal(passingRun.stdout, '')
  })
})
