// routes/login/index.tsx
//
// Role: login page. The form POSTs to /auth/login (Hono route),
// which validates credentials, sets the signed cookie, and redirects.
//
// On error, the server redirects to /login?error=...&field=...&username=...
// and this page reads those params to show field-level errors without
// clearing the form.

import type { PageProps, RequestCtx } from 'tinyary'

export const loader = async (ctx: RequestCtx) => {
  if (ctx.user) return { user: ctx.user, error: null, field: null, username: '' }

  return {
    user: null,
    error: ctx.query.get('error'),
    field: ctx.query.get('field'),
    username: ctx.query.get('username') || '',
  }
}

export default function LoginPage({ data }: PageProps<{ user: { id: string; name: string } | null; error: string | null; field: string | null; username: string }>) {
  if (data.user) {
    return (
      <section class="page">
        <h1>Already logged in</h1>
        <p>Active session as <code>{data.user.name}</code>.</p>
        <form method="post" action="/auth/logout">
          <button type="submit">Sign out</button>
        </form>
        <p><a href="/dashboard">Go to dashboard</a></p>
      </section>
    )
  }

  return (
    <section class="page">
      <h1>Login</h1>
      <p class="lead">Demo: username <code>admin</code>, password <code>tinyary</code>.</p>

      {data.error && <p class="error">{data.error}</p>}

      <form method="post" action="/auth/login" class="login-form">
        <label>
          Username
          <input
            type="text"
            name="username"
            value={data.username}
            class={data.field === 'username' ? 'input-error' : ''}
            required
            autocomplete="username"
          />
          {data.field === 'username' && data.error && <span class="field-error">{data.error}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            class={data.field === 'password' ? 'input-error' : ''}
            required
            autocomplete="current-password"
          />
          {data.field === 'password' && data.error && <span class="field-error">{data.error}</span>}
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  )
}
