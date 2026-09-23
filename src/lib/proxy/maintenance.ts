import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { copy } from '@/lib/copy'

const maintenanceHtmlPath = path.join(process.cwd(), '.next', 'server', 'app', 'manutencao.html')

export async function loadMaintenanceHtml(): Promise<string> {
  try {
    return await readFile(maintenanceHtmlPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error

    // Antes do primeiro build (por exemplo, no dev), o HTML pré-renderizado
    // ainda não existe. Mantemos o protocolo 503 e a mesma copy da página.
    return `<!doctype html><html lang="pt-BR"><body><main><h1>${copy.system.maintenance}</h1></main></body></html>`
  }
}
