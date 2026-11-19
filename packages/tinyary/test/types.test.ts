import { describe, it, expect } from 'vitest'
import type { ComponentChildren } from '../src/index'
import { island, signal, useSignal, useState } from '../src/index'

describe('API pública', () => {
  it('reexporta ComponentChildren desde tinyary', () => {
    // La anotación sólo compila si el reexport existe.
    const children: ComponentChildren = ['hola']
    expect(children).toEqual(['hola'])
  })

  it('reexporta hooks de Preact', () => {
    expect(typeof useState).toBe('function')
  })

  it('reexporta signals', () => {
    expect(typeof useSignal).toBe('function')

    const count = signal(1)
    count.value++
    expect(count.value).toBe(2)
  })

  it('reexporta island', () => {
    const Component = () => null
    expect(island(Component)).toBe(Component)
  })
})
