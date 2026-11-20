// lib/validate.ts
//
// Rol: validación de schemas con valibot. Más liviano que zod (~5KB vs ~15KB).
// Útil para validar forms en actions.

import * as v from 'valibot'

export { v }

// Ejemplo de schema para un formulario de contacto
export const contactSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Ingresá tu nombre.')),
  message: v.pipe(v.string(), v.minLength(1, 'Ingresá un mensaje.')),
})

export type ContactInput = v.InferOutput<typeof contactSchema>
