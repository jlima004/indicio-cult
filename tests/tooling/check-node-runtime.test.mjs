import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'

import { validateNodeRuntime } from '../../scripts/check-node-runtime.mjs'

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

function createRuntimeFixture({
  dependencyEngine = '^22.22.2 || ^24.15.0 || >=26.0.0',
  engine = '>=22.22.2 <23',
  nvm = '22.23.1',
  node = nvm,
} = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'indicio-cult-runtime-'))
  temporaryDirectories.push(directory)
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ engines: { node: engine } }))
  writeFileSync(path.join(directory, '.nvmrc'), `${nvm}\n`)
  writeFileSync(path.join(directory, '.node-version'), `${node}\n`)
  writeFileSync(
    path.join(directory, 'package-lock.json'),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { engines: { node: engine } },
        'node_modules/runtime-floor': {
          version: '1.0.0',
          engines: { node: dependencyEngine },
        },
      },
    }),
  )
  return directory
}

describe('contrato do runtime Node', () => {
  it('aceita pins idênticos e compatíveis com a faixa exclusiva do Node 22', () => {
    const fixture = createRuntimeFixture()

    assert.deepEqual(validateNodeRuntime(fixture, '22.23.1'), [])
  })

  it('rejeita drift entre .nvmrc e .node-version', () => {
    const fixture = createRuntimeFixture({ node: '22.22.2' })

    assert.equal(
      validateNodeRuntime(fixture, '22.23.1').some((error) => /difere/.test(error)),
      true,
    )
  })

  it('rejeita execução fora da major 22', () => {
    const fixture = createRuntimeFixture()

    assert.equal(
      validateNodeRuntime(fixture, '23.0.0').some((error) => /não satisfaz/.test(error)),
      true,
    )
  })

  it('rejeita engine sem teto exclusivo em 23', () => {
    const fixture = createRuntimeFixture({ engine: '>=22.22.2' })

    assert.equal(
      validateNodeRuntime(fixture, '22.23.1').some((error) => /formato/.test(error)),
      true,
    )
  })

  it('rejeita quando o piso declarado não satisfaz o grafo travado', () => {
    const fixture = createRuntimeFixture({ dependencyEngine: '>=22.24.0' })

    assert.equal(
      validateNodeRuntime(fixture, '22.23.1').some((error) =>
        /runtime-floor.*22\.22\.2.*>=22\.24\.0/.test(error),
      ),
      true,
    )
  })

  it('ignora pacote opcional incompatível com a plataforma atual', () => {
    const fixture = createRuntimeFixture()
    const lockPath = path.join(fixture, 'package-lock.json')
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    lock.packages['node_modules/foreign-optional'] = {
      version: '1.0.0',
      optional: true,
      os: ['definitely-not-this-platform'],
      engines: { node: '>=99' },
    }
    writeFileSync(lockPath, JSON.stringify(lock))

    assert.deepEqual(validateNodeRuntime(fixture, '22.23.1'), [])
  })
})
