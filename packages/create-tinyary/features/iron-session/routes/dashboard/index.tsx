// routes/dashboard/index.tsx
//
// Rol: página protegida. El loader verifica la sesión; si no hay, redirige a /login.

import { redirect } from 'tinyary'
import type { PageProps, RequestCtx } from 'tinyary'

export const loader = async (ctx: RequestCtx) => {
  if (!ctx.user) redirect('/login')
  return { user: ctx.user }
}

export default function DashboardPage({ data }: PageProps<{ user: { id: string; name: string } }>) {
  return (
    <section class="page">
      <h1>Hola, {data.user.name}</h1>
      <p>Página protegida. Si borrás la cookie <code>tinyary-session</code> y recargás, vas a parar a <code>/login</code>.</p>
      <p><code>user id: {data.user.id}</code></p>
      <form method="post" action="/auth/logout">
        <button type="submit">Cerrar sesión</button>
      </form>
    </section>
  )
}