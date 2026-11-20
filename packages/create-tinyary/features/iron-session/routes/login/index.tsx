// routes/login/index.tsx
//
// Role: login page. The form POSTs to /auth/login (Hono route),
// which validates credentials, sets the signed cookie, and redirects.

import type { PageProps } from 'tinyary'

export default function LoginPage({ result }: PageProps<{}, { error?: string }>) {
  return (
    <section class="page">
      <h1>Login</h1>
      <p class="lead">Demo: username <code>admin</code>, password <code>tinyary</code>.</p>

      {result?.error && <p class="error">{result.error}</p>}

      <form method="post" action="/auth/login" class="login-form">
        <label>
          Username
          <input type="text" name="username" required autocomplete="username" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  )
}
