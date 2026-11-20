export const TEMPLATES = {
  bare: 'hola mundo, sin AryKit ni código de relleno',
  'global-state': 'estado global con átomos y DevTools',
  'server-state': 'useAryQuery con caché, refetch y DevTools',
  fullstack: 'todo list fullstack: 3 rutas (home, nosotros, contacto), todos en el servidor',
  lowdb: 'todo list persistente con LowDB: los todos sobreviven a reinicios del servidor',
}

// Alias de compatibilidad: el template antes se llamaba "minimal".
export const ALIASES = {
  minimal: 'bare',
}

export const DEFAULT_TEMPLATE = 'bare'

/**
 * Traduce la respuesta del prompt a un id de template.
 * Devuelve `null` si la respuesta no es válida.
 */
export function resolveTemplateAnswer(answer, entries = Object.keys(TEMPLATES)) {
  const value = answer.trim()

  if (!value) return DEFAULT_TEMPLATE

  if (/^\d+$/.test(value)) {
    return entries[Number(value) - 1] ?? null
  }

  if (value in TEMPLATES) return value

  return ALIASES[value] ?? null
}

/**
 * Pregunta qué template crear. Sin TTY (tests, CI, pipes) usa el default,
 * así el comando nunca queda esperando una respuesta que no va a llegar.
 */
export async function chooseTemplate({
  input = process.stdin,
  output = process.stdout,
  log = console.log,
} = {}) {
  if (!input.isTTY || !output.isTTY) return DEFAULT_TEMPLATE

  const entries = Object.keys(TEMPLATES)

  log('\n¿Qué ejemplo querés crear?\n')
  entries.forEach((id, index) => {
    const suffix = id === DEFAULT_TEMPLATE ? ' (default)' : ''
    log(`  ${index + 1}. ${id.padEnd(14)} ${TEMPLATES[id]}${suffix}`)
  })
  log('')

  const { createInterface } = await import('node:readline/promises')
  const rl = createInterface({ input, output })

  const onSigint = () => {
    rl.close()
    log('\nCancelado.')
    process.exit(130)
  }
  rl.on('SIGINT', onSigint)

  try {
    while (true) {
      const answer = await rl.question(`Elegí un número (1-${entries.length}) [1]: `)
      const resolved = resolveTemplateAnswer(answer, entries)

      if (resolved) return resolved

      log(`Opción inválida: "${answer.trim()}". Elegí un número del 1 al ${entries.length}.`)
    }
  } finally {
    rl.off('SIGINT', onSigint)
    rl.close()
  }
}
