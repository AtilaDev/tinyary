#!/usr/bin/env node

import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = process.argv[2]

if (!name) {
  console.error('Uso: create-tinyary <nombre>')
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

const templateDir = fileURLToPath(new URL('./template/', import.meta.url))
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
// Publicar queda fuera de alcance.
pkg.dependencies.tinyary = pkg.dependencies.tinyary.replace('%TINYARY_ROOT%', tinyaryDir)
writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`\nCreé ${name}.\n\nPróximos pasos:\n`)
console.log(`  cd ${name}`)
console.log('  pnpm install')
console.log('  pnpm dev\n')

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}
