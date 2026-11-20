declare module 'virtual:tinyary/server-entry' {
  import type { Hono } from 'hono'

  export const app: Hono
  export function start(): unknown
}
