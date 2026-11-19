import { describe, it, expect } from 'vitest'
import type { ComponentChildren } from '../src/index'

describe('API pública de tipos', () => {
  it('reexporta ComponentChildren desde tinyary', () => {
    // La anotación sólo compila si el reexport existe.
    const children: ComponentChildren = ['hola']
    expect(children).toEqual(['hola'])
  })
})
