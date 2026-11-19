import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  DEFAULT_TEMPLATE,
  chooseTemplate,
  resolveTemplateAnswer,
} from '../templates.js'

const bin = fileURLToPath(new URL('../bin.js', import.meta.url))
let cwd: string

function run(name = 'demo', args: string[] = []) {
  return spawnSync(process.execPath, [bin, name, ...args], { cwd, encoding: 'utf8' })
}

function read(relative: string) {
  return readFileSync(join(cwd, 'demo', relative), 'utf8')
}

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'tinyary-cli-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

describe('selección interactiva de template', () => {
  it('resuelve números, nombres, alias y respuesta vacía', () => {
    expect(resolveTemplateAnswer('1')).toBe('bare')
    expect(resolveTemplateAnswer('2')).toBe('global-state')
    expect(resolveTemplateAnswer('3')).toBe('server-state')
    expect(resolveTemplateAnswer('4')).toBe('fullstack')
    expect(resolveTemplateAnswer(' 2 ')).toBe('global-state')
    expect(resolveTemplateAnswer('')).toBe(DEFAULT_TEMPLATE)
    expect(resolveTemplateAnswer('   ')).toBe(DEFAULT_TEMPLATE)
    expect(resolveTemplateAnswer('global-state')).toBe('global-state')
    expect(resolveTemplateAnswer('minimal')).toBe('bare')
  })

  it('devuelve null para números fuera de rango u opciones desconocidas', () => {
    expect(resolveTemplateAnswer('0')).toBeNull()
    expect(resolveTemplateAnswer('5')).toBeNull()
    expect(resolveTemplateAnswer('2.5')).toBeNull()
    expect(resolveTemplateAnswer('otro')).toBeNull()
  })

  it('usa el default sin preguntar cuando no hay TTY', async () => {
    const logs: string[] = []

    const result = await chooseTemplate({
      input: { isTTY: false },
      output: { isTTY: true },
      log: (message) => logs.push(message),
    })

    expect(result).toBe(DEFAULT_TEMPLATE)
    expect(logs).toHaveLength(0)
  })
})

describe('create-tinyary', () => {
  it('genera el template bare por defecto, sin islas ni AryKit', () => {
    const result = run()

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "bare"/)
    expect(existsSync(join(cwd, 'demo/package.json'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/vite.config.ts'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/server.ts'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/islands'))).toBe(false)
    expect(existsSync(join(cwd, 'demo/routes/layout.tsx'))).toBe(false)
    expect(read('routes/index.tsx')).not.toContain('arykit')
  })

  it('genera el ejemplo de estado global con átomos y DevTools', () => {
    const result = run('demo', ['--template', 'global-state'])

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "global-state"/)
    expect(existsSync(join(cwd, 'demo/routes/islands/global-counter.tsx'))).toBe(true)

    const island = read('routes/islands/global-counter.tsx')
    expect(island).toContain("from 'tinyary/arykit'")
    expect(island).toContain('createAry')
    expect(island).toContain('useAryState')
    expect(island).toContain('island(')
    expect(read('routes/index.tsx')).toContain('AryDevTools')
  })

  it('genera el ejemplo de useAryQuery con endpoint y DevTools', () => {
    const result = run('demo', ['--template', 'server-state'])

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "server-state"/)
    expect(existsSync(join(cwd, 'demo/routes/islands/query-panel.tsx'))).toBe(true)

    const island = read('routes/islands/query-panel.tsx')
    expect(island).toContain('useAryQuery')
    expect(island).toContain('invalidateQueries')
    expect(island).toContain("fetch('/api/time')")

    const server = read('server.ts')
    expect(server).toContain("app.get('/api/time'")
    expect(read('routes/index.tsx')).toContain('AryDevTools')
  })

  it('genera el ejemplo fullstack con 3 rutas y todos en el servidor', () => {
    const result = run('demo', ['--template', 'fullstack'])

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "fullstack"/)
    expect(existsSync(join(cwd, 'demo/routes/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/nosotros/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/contacto/index.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/routes/layout.tsx'))).toBe(true)
    expect(existsSync(join(cwd, 'demo/lib/todos.ts'))).toBe(true)

    const home = read('routes/index.tsx')
    expect(home).toContain('listTodos')
    expect(home).toContain('addTodo')
    expect(home).toContain('redirect')

    const todos = read('lib/todos.ts')
    expect(todos).toContain('export function addTodo')

    const contacto = read('routes/contacto/index.tsx')
    expect(contacto).toContain('action')
    expect(contacto).toContain('result')
  })

  it('acepta --template=server-state', () => {
    const result = run('demo', ['--template=server-state'])

    expect(result.status).toBe(0)
    expect(existsSync(join(cwd, 'demo/routes/islands/query-panel.tsx'))).toBe(true)
  })

  it('mantiene minimal como alias de bare', () => {
    const result = run('demo', ['--template', 'minimal'])

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/template "bare"/)
    expect(existsSync(join(cwd, 'demo/routes/islands'))).toBe(false)
  })

  it('falla con un template desconocido y lista las opciones', () => {
    const result = run('demo', ['--template', 'otro'])

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/template desconocido/i)
    expect(result.stderr).toMatch(/bare, global-state, server-state, fullstack/)
  })

  it('reemplaza el nombre en package.json', () => {
    expect(run().status).toBe(0)

    const pkg = JSON.parse(read('package.json'))
    expect(pkg.name).toBe('demo')
    expect(pkg.dependencies.tinyary).toMatch(/^link:\//)
  })

  it('reemplaza el nombre en index.html sin dejar placeholders', () => {
    expect(run().status).toBe(0)

    const html = read('index.html')
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
    expect(result.stderr).toMatch(/bare/)
    expect(result.stderr).toMatch(/global-state/)
    expect(result.stderr).toMatch(/server-state/)
  })

  it('muestra la ayuda con --help', () => {
    const result = spawnSync(process.execPath, [bin, '--help'], { cwd, encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/uso: create-tinyary/i)
    expect(result.stdout).toMatch(/bare/)
    expect(result.stdout).toMatch(/global-state/)
    expect(result.stdout).toMatch(/server-state/)
  })
})
