// lib/id.ts
//
// Rol: generador de IDs únicos y cortos con nanoid.

import { nanoid, customAlphabet } from 'nanoid'

export { nanoid, customAlphabet }

// Ejemplo: ID de 10 caracteres (más corto que el default de 21)
export const shortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)
