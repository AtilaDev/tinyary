import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const bin = fileURLToPath(new URL('../bin.js', import.meta.url))
let cwd: string

function run(name = 'demo') {
  return spawnSync(process.execPath, [bin, name], { cwd, encoding: 'utf8' })
}

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'tinyary-cli-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

describe('create-tinyary', () => {
  it('copia los archivos esenciales del template', () => {
    const result = run()

    expect(result.status).toBe(0)
    expect(existsSync(join(cwd, 'demo/package.json'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/vite.config.ts'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/server.ts'))).toBe(true)
  })

  it('reemplaza el nombre en package.json', () => {
    expect(run().status).toBe(0)

    const pkg = JSON.parse(readFileSync(join(cwd, 'demo/package.json'), 'utf8'))
    expect(pkg.name).toBe('demo')
    expect(pkg.dependencies.tinyary).toMatch(/^link:\//)
  })

  it('reemplaza el nombre en index.html sin dejar placeholders', () => {
    expect(run().status).toBe(0)

    const html = readFileSync(join(cwd, 'demo/index.html'), 'utf8')
    expect(html).toContain('demo')
    expect(html).not.toContain('{{name}}')
  })

  it('falla con un mensaje claro si el destino ya existe', () => {
    expect(run().status).toBe(0)
    const second = run()

    expect(second.status).toBe(1)
    expect(second.stderr).toMatch(/demo.*ya existe/i)
  })

  it('exige un nombre de proyecto', () => {
    const result = spawnSync(process.execPath, [bin], { cwd, encoding: 'utf8' })

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/uso: create-tinyary <nombre>/i)
  })
})
