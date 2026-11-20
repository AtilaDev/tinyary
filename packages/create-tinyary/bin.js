#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALIASES,
  DEFAULT_TEMPLATE,
  TEMPLATES,
  chooseTemplate,
} from './templates.js'
import { FEATURES } from './features.js'

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  printHelp()
  process.exit(0)
}

const templateFlagIndex = args.findIndex((arg) => arg === '--template' || arg === '-t')
const templateFromFlag =
  templateFlagIndex === -1 ? undefined : args[templateFlagIndex + 1]
const templateFromEquals = args
  .find((arg) => arg.startsWith('--template='))
  ?.slice('--template='.length)
const requestedTemplate = templateFromEquals ?? templateFromFlag
const wizardFlag = args.includes('--wizard') || args.includes('-w')

let template
if (requestedTemplate) {
  template = ALIASES[requestedTemplate] ?? requestedTemplate

  if (!(template in TEMPLATES)) {
    console.error(
      `Unknown template: "${requestedTemplate}". Options: ${Object.keys(TEMPLATES).join(', ')}.`,
    )
    process.exit(1)
  }
}

const name = args.find((arg, index) => {
  if (arg.startsWith('-')) return false
  if (templateFlagIndex !== -1 && index === templateFlagIndex + 1) return false
  return true
})

if (!name) {
  printHelp(console.error)
  process.exit(1)
}

if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
  console.error('El nombre del proyecto tiene que ser una sola carpeta, sin rutas.')
  process.exit(1)
}

const cwd = process.cwd()
const destination = resolve(cwd, name)

if (existsSync(destination)) {
  console.error(`No se puede crear "${name}": el directorio ya existe (${destination}).`)
  process.exit(1)
}

// Decide: wizard o template tradicional
const useWizard = wizardFlag || (!requestedTemplate && process.stdin.isTTY)

let selectedFeatures = []
if (useWizard) {
  selectedFeatures = await chooseFeatures()
}

// Sin --template y con terminal interactiva (y sin wizard), se pregunta qué template.
if (!requestedTemplate && !useWizard) {
  template ??= await chooseTemplate()
}
if (!template && !useWizard) template = DEFAULT_TEMPLATE

const __dirname = dirname(fileURLToPath(import.meta.url))

// Copiar base
const baseTemplate = useWizard ? 'wizard-base' : template
const templateDir = fileURLToPath(new URL(`./templates/${baseTemplate}/`, import.meta.url))
cpSync(templateDir, destination, { recursive: true })

// Aplicar features seleccionadas
if (useWizard && selectedFeatures.length > 0) {
  applyFeatures(destination, selectedFeatures, __dirname)
}

// Reemplazar {{name}} en todos los archivos
for (const file of walk(destination)) {
  const content = readFileSync(file, 'utf8')
  writeFileSync(file, content.replaceAll('{{name}}', name))
}

// Consumir el paquete local
const packageFile = join(destination, 'package.json')
const pkg = JSON.parse(readFileSync(packageFile, 'utf8'))
pkg.dependencies.tinyary = pkg.dependencies.tinyary.replace('%TINYARY_ROOT%', join(__dirname, '..', 'tinyary'))
writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`\nCreated ${name} with ${useWizard ? `wizard (${selectedFeatures.length} features)` : `template "${template}"`}.\n`)
console.log('Next steps:\n')
console.log(`  cd ${name}`)
console.log('  pnpm install')
console.log('  pnpm dev\n')

function printHelp(log = console.log) {
  log('Uso: create-tinyary <nombre> [--template bare|global-state|server-state|fullstack|lowdb] [--wizard]\n')
  log('Without --template and with an interactive terminal, the CLI asks which template or features you want.\n')
  log('Templates:')
  for (const [id, description] of Object.entries(TEMPLATES)) {
    const suffix = id === DEFAULT_TEMPLATE ? ' (default)' : ''
    log(`  ${id.padEnd(14)} ${description}${suffix}`)
  }
  log('')
  log('Wizard (--wizard): elige features opcionales (LowDB, iron-session, blog, ws, cache, nanoid, valibot).')
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

async function chooseFeatures() {
  const entries = FEATURES

  console.log('\nWhich features do you want to add? (comma-separated numbers, or "all"/"none")\n')
  entries.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.label.padEnd(24)} ${f.description}`)
  })
  console.log('')

  const { createInterface } = await import('node:readline/promises')
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const onSigint = () => { rl.close(); console.log('\nCancelled.'); process.exit(130) }
  rl.on('SIGINT', onSigint)

  try {
    const answer = await rl.question(`Choose (e.g. 1,3,5) [none]: `)
    const value = answer.trim().toLowerCase()

    if (value === '' || value === 'none') return []
    if (value === 'all') return [...entries]

    const nums = value.split(',').map((s) => s.trim()).filter(Boolean)
    const selected = []
    for (const n of nums) {
      const idx = Number(n) - 1
      if (idx >= 0 && idx < entries.length) selected.push(entries[idx])
      else console.log(`  Invalid option: ${n}`)
    }
    return selected
  } finally {
    rl.off('SIGINT', onSigint)
    rl.close()
  }
}

function applyFeatures(destination, selectedFeatures, __dirname) {
  const featuresDir = join(__dirname, 'features')

  // 1. Copiar archivos de cada feature
  for (const feature of selectedFeatures) {
    const featureDir = join(featuresDir, feature.id)
    if (!existsSync(featureDir)) continue

    // Copiar todos los archivos del feature (lib/, routes/, content/, etc.)
    for (const entry of readdirSync(featureDir, { withFileTypes: true })) {
      if (entry.name === 'manifest.json') continue
      const src = join(featureDir, entry.name)
      const dest = join(destination, entry.name)
      cpSync(src, dest, { recursive: true, force: true })
    }
  }

  // 2. Merge de dependencias en package.json
  const packageFile = join(destination, 'package.json')
  const pkg = JSON.parse(readFileSync(packageFile, 'utf8'))
  for (const feature of selectedFeatures) {
    if (feature.deps) {
      Object.assign(pkg.dependencies, feature.deps)
    }
    if (feature.devDeps) {
      Object.assign(pkg.devDependencies, feature.devDeps)
    }
  }
  writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`)

  // 3. Agregar nav links al layout.tsx
  const layoutFile = join(destination, 'routes', 'layout.tsx')
  if (existsSync(layoutFile)) {
    let layout = readFileSync(layoutFile, 'utf8')
    const links = selectedFeatures
      .flatMap((f) => f.navLinks || [])
      .map((l) => `          <a href="${l.href}">${l.label}</a>`)
      .join('\n')
    layout = layout.replace('          {/* NAV_LINKS */}', links || '          {/* NAV_LINKS */}')
    writeFileSync(layoutFile, layout)
  }

  // 4. Agregar secciones de AGENTS.md
  const agentsFile = join(destination, 'AGENTS.md')
  if (existsSync(agentsFile)) {
    let agents = readFileSync(agentsFile, 'utf8')
    const sections = selectedFeatures
      .map((f) => f.agentsSection || '')
      .filter(Boolean)
      .join('\n')
    agents = agents.replace('<!-- FEATURES -->', sections || '<!-- FEATURES -->')
    writeFileSync(agentsFile, agents)
  }

  // 5. Modificar server.ts si hay serverSetup o server-routes.ts
  const serverFile = join(destination, 'server.ts')
  const serverSetups = selectedFeatures
    .map((f) => f.serverSetup || '')
    .filter(Boolean)

  // Buscar server-routes.ts en las features seleccionadas
  const serverRouteFiles = selectedFeatures
    .map((f) => join(featuresDir, f.id, 'server-routes.ts'))
    .filter((p) => existsSync(p))

  if ((serverSetups.length > 0 || serverRouteFiles.length > 0) && existsSync(serverFile)) {
    // Generar un server.ts custom que envuelve las páginas
    let customServer = `import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { app as pages } from 'virtual:tinyary/server-entry'

const app = new Hono()

`

    // Inyectar imports de cada server-routes.ts
    for (const routeFile of serverRouteFiles) {
      const content = readFileSync(routeFile, 'utf8')
      // Extraer los imports (líneas que empiezan con import)
      const imports = content.split('\n').filter((l) => l.trim().startsWith('import '))
      const body = content.split('\n').filter((l) => !l.trim().startsWith('import ')).join('\n')
      customServer += imports.join('\n') + '\n\n'
      customServer += body + '\n\n'
    }

    // Inyectar serverSetup strings
    if (serverSetups.length > 0) {
      customServer += serverSetups.join('\n') + '\n\n'
    }

    customServer += "app.route('/', pages)\n\n"
    customServer += "export { app }\n\n"
    customServer += "export function start() {\n"
    customServer += "  const port = Number(process.env.PORT ?? 3000)\n"
    customServer += "  return serve({ fetch: app.fetch, port }, () => {\n"
    customServer += "    console.log(`tinyary en http://localhost:${port}`)\n"
    customServer += "  })\n"
    customServer += "}\n"

    writeFileSync(serverFile, customServer)
  }
}
