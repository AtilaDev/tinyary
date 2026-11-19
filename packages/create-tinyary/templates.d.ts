export type TemplateId = 'bare' | 'global-state' | 'server-state' | 'fullstack'

export declare const TEMPLATES: Record<TemplateId, string>
export declare const ALIASES: Record<string, TemplateId>
export declare const DEFAULT_TEMPLATE: TemplateId

/** Traduce la respuesta del prompt a un template; `null` si no es válida. */
export declare function resolveTemplateAnswer(
  answer: string,
  entries?: string[],
): string | null

/** Pregunta qué template crear. Sin TTY usa el default sin bloquear. */
export declare function chooseTemplate(options?: {
  input?: { isTTY?: boolean }
  output?: { isTTY?: boolean }
  log?: (message: string) => void
}): Promise<string>
