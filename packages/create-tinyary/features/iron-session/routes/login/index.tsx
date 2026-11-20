// routes/login/index.tsx
//
// Rol: página de login. El formulario hace POST a /auth/login (ruta Hono),
// que valida credenciales, setea la cookie firmada y redirige.

import type { PageProps } from 'tinyary'

export default function LoginPage({ result }: PageProps<{}, { error?: string }>) {
  return (
    <section class="page">
      <h1>Login</h1>
      <p class="lead">Demo: usuario <code>admin</code>, contraseña <code>tinyary</code>.</p>

      {result?.error && <p class="error">{result.error}</p>}

      <form method="post" action="/auth/login" class="login-form">
        <label>
          Usuario
          <input type="text" name="username" required autocomplete="username" />
        </label>
        <label>
          Contraseña
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit">Entrar</button>
      </form>
    </section>
  )
}