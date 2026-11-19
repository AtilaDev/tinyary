import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { once } from 'node:events'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const helloDir = join(root, 'examples/hello')
const PORT = 3456
const base = `http://localhost:${PORT}`

let failures = 0

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`✓ ${name}`)
  } else {
    failures++
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1'], {
  cwd: helloDir,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
})

let serverLog = ''
server.stdout.on('data', (chunk) => (serverLog += chunk))
server.stderr.on('data', (chunk) => (serverLog += chunk))

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) break
    try {
      const res = await fetch(`${base}/`)
      if (res.ok) return
    } catch {
      // todavía no levantó
    }
    await sleep(100)
  }
  throw new Error(`El server no respondió en 10s:\n${serverLog}`)
}

try {
  await waitForServer()

  const home = await fetch(`${base}/`)
  const homeHtml = await home.text()
  check('GET / responde 200', home.status === 200, `status ${home.status}`)
  check('GET / incluye el mensaje del loader', homeHtml.includes('Hola desde el servidor'))
  check('GET / incluye el script de datos', homeHtml.includes('id="__tinyary_data__"'))

  const dataMatch = homeHtml.match(
    /<script id="__tinyary_data__" type="application\/json">([\s\S]*?)<\/script>/,
  )
  let payload = null
  try {
    payload = dataMatch ? JSON.parse(dataMatch[1]) : null
  } catch {
    payload = null
  }
  check('el JSON de datos es parseable', payload !== null)
  check('el payload incluye data.page.mensaje', typeof payload?.data?.page?.mensaje === 'string')

  // Simular el request de <link rel="stylesheet"> para que Vite no lo
  // transforme en un módulo JS (comportamiento para import CSS).
  const css = await fetch(`${base}/styles/global.css`, {
    headers: { accept: 'text/css,*/*;q=0.1' },
  })
  check('GET /styles/global.css responde 200', css.status === 200, `status ${css.status}`)
  check(
    'el CSS se sirve como text/css',
    (css.headers.get('content-type') ?? '').includes('text/css'),
    css.headers.get('content-type') ?? '',
  )

  const nope = await fetch(`${base}/nope`)
  check('GET /nope responde 404', nope.status === 404, `status ${nope.status}`)

  const counter = await fetch(`${base}/counter`)
  const counterHtml = await counter.text()
  check('GET /counter responde 200', counter.status === 200, `status ${counter.status}`)
  check('GET /counter incluye el botón server-side', counterHtml.includes('<button'))

  const signals = await fetch(`${base}/signals`)
  const signalsHtml = await signals.text()
  check('GET /signals responde 200', signals.status === 200, `status ${signals.status}`)
  check(
    'GET /signals usa el valor del loader',
    signalsHtml.includes('<strong>10</strong>'),
  )

  const arykit = await fetch(`${base}/arykit`)
  const arykitHtml = await arykit.text()
  check('GET /arykit responde 200', arykit.status === 200, `status ${arykit.status}`)
  check(
    'GET /arykit renderiza el átomo inicial en el servidor',
    arykitHtml.includes('Valor compartido: <strong>0</strong>'),
  )
  check(
    'GET /arykit incluye el botón de DevTools',
    arykitHtml.includes('Abrir AryAtoms DevTools'),
  )

  check('GET / incluye el client-entry', homeHtml.includes('<script type="module"'))
} catch (error) {
  failures++
  console.error(`✗ smoke abortado: ${error.message}`)
} finally {
  // Detener también al proceso Vite hijo de pnpm, no sólo al wrapper.
  if (server.pid && process.platform !== 'win32') {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  } else {
    server.kill('SIGTERM')
  }
  await Promise.race([once(server, 'exit'), sleep(2000)])
}

if (failures > 0) {
  console.error(`\n${failures} caso(s) fallaron`)
  process.exit(1)
}

console.log('\nsmoke OK')
process.exit(0)
