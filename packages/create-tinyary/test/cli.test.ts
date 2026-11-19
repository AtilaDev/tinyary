import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const bin = fileURLToPath(new URL('../bin.js', import.meta.url))
let cwd: string

function run(name = 'demo', args: string[] = []) {
  return spawnSync(process.execPath, [bin, name, ...args], { cwd, encoding: 'utf8' })
}

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'tinyary-cli-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

describe('create-tinyary', () => {
  it('copia los archivos esenciales del template por defecto', () => {
    const result = run()

    expect(result.status).toBe(0)
    expect(existsSync(join(cwd, 'demo/package.json'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/vite.config.ts'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/server.ts'))).toBe(true)
  })

  it('usa el template example por defecto, con isla y layout', () => {
    const result = run()

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "example"/)
    expect(existsSync(join(cwd, 'demo/routes/islands/counter.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/layout.tsx'))).toBe(true)
  })

  it('genera un proyecto mínimo con --template minimal', () => {
    const result = run('demo', ['--template', 'minimal'])

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "minimal"/)
    expect(existsSync(join(cwd, 'demo/routes/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/islands/counter.tsx'))).toBe(false)
    expect(existsSync(join(cwd, 'demo/routes/layout.tsx'))).toBe(false)
  })

  it('acepta --template=minimal', () => {
    const result = run('demo', ['--template=minimal'])

    expect(result.status).toBe(0)
    expect(existsSync(join(cwd, 'demo/routes/islands/counter.tsx'))).toBe(false)
  })

  it('falla con un template desconocido', () => {
    const result = run('demo', ['--template', 'otro'])

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/template desconocido/i)
    expect(result.stderr).toMatch(/example, minimal/)
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
    expect(result.stderr).toMatch(/example/)
    expect(result.stderr).toMatch(/minimal/)
  })

  it('muestra la ayuda con --help', () => {
    const result = spawnSync(process.execPath, [bin, '--help'], { cwd, encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/uso: create-tinyary/i)
    expect(result.stdout).toMatch(/example/)
    expect(result.stdout).toMatch(/minimal/)
  })
})
