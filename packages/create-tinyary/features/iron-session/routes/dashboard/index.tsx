// routes/dashboard/index.tsx
//
// Role: protected page. The loader checks the session; if none, redirects to /login.

import { redirect } from 'tinyary'
import type { PageProps, RequestCtx } from 'tinyary'

export const loader = async (ctx: RequestCtx) => {
  if (!ctx.user) redirect('/login')
  return { user: ctx.user }
}

export default function DashboardPage({ data }: PageProps<{ user: { id: string; name: string } }>) {
  return (
    <section class="page">
      <h1>Hello, {data.user.name}</h1>
      <p>Protected page. If you delete the <code>tinyary-session</code> cookie and reload, you'll be redirected to <code>/login</code>.</p>
      <p><code>user id: {data.user.id}</code></p>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </section>
  )
}
