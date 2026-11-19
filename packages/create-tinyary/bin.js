#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEMPLATES = {
  bare: 'hola mundo, sin AryKit ni código de relleno',
  'global-state': 'estado global con átomos y DevTools',
  'server-state': 'useAryQuery con caché, refetch y DevTools',
}

// Alias de compatibilidad: el template antes se llamaba "minimal".
const ALIASES = {
  minimal: 'bare',
}

const DEFAULT_TEMPLATE = 'bare'
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
const requestedTemplate = templateFromEquals ?? templateFromFlag ?? DEFAULT_TEMPLATE
const template = ALIASES[requestedTemplate] ?? requestedTemplate

const name = args.find((arg, index) => {
  if (arg.startsWith('-')) return false
  if (templateFlagIndex !== -1 && index === templateFlagIndex + 1) return false
  return true
})

if (!name) {
  printHelp(console.error)
  process.exit(1)
}

if (!(template in TEMPLATES)) {
  console.error(
    `Template desconocido: "${requestedTemplate}". Opciones: ${Object.keys(TEMPLATES).join(', ')}.`,
  )
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

const templateDir = fileURLToPath(new URL(`./templates/${template}/`, import.meta.url))
const tinyaryDir = fileURLToPath(new URL('../tinyary/', import.meta.url))

cpSync(templateDir, destination, { recursive: true })

for (const file of walk(destination)) {
  const content = readFileSync(file, 'utf8')
  writeFileSync(file, content.replaceAll('{{name}}', name))
}

// DECISIÓN: desde el checkout hay que consumir el paquete local. Publicar el
// CLI y reemplazar esto por una versión de registry queda fuera de esta etapa.
const packageFile = join(destination, 'package.json')
const pkg = JSON.parse(readFileSync(packageFile, 'utf8'))
// DECISIÓN: symlink local para que Node24 no seque a .pnpm con type stripping.
pkg.dependencies.tinyary = pkg.dependencies.tinyary.replace('%TINYARY_ROOT%', tinyaryDir)
writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`\nCreé ${name} con el template "${template}" (${TEMPLATES[template]}).\n`)
console.log('Próximos pasos:\n')
console.log(`  cd ${name}`)
console.log('  pnpm install')
console.log('  pnpm dev\n')

function printHelp(log = console.log) {
  log('Uso: create-tinyary <nombre> [--template bare|global-state|server-state]\n')
  log('Templates:')
  for (const [id, description] of Object.entries(TEMPLATES)) {
    const suffix = id === DEFAULT_TEMPLATE ? ' (default)' : ''
    log(`  ${id.padEnd(14)} ${description}${suffix}`)
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}
