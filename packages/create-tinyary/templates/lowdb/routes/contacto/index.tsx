// routes/contacto/index.tsx  (ruta "/contacto")
//
// Rol: página con formulario. Demuestra otro uso de `action`: validar campos,
// devolver un resultado y renderizar un mensaje de éxito sin redirigir.
// El `result` del action se pasa al componente como prop y también viaja en el
// payload de hidratación.

import type { ActionCtx, PageProps } from 'tinyary'

type ContactResult = { ok: true; name: string } | { error: string }

export const action = async ({ form }: ActionCtx): Promise<ContactResult> => {
  const name = String(form.get('name') ?? '').trim()
  const message = String(form.get('message') ?? '').trim()

  if (!name) return { error: 'Ingresá tu nombre.' }
  if (!message) return { error: 'Ingresá un mensaje.' }

  // En un proyecto real acá enviarías un email o guardarías en la DB.
  // Para el ejemplo nos basta con devolver el resultado.
  return { ok: true, name }
}

export default function Contacto({ result }: PageProps<{}, ContactResult>) {
  return (
    <section class="page">
      <h1>Contacto</h1>

      {result && 'ok' in result ? (
        <div class="success">
          <p>¡Gracias, {result.name}! Recibimos tu mensaje.</p>
          <a href="/contacto">Enviar otro</a>
        </div>
      ) : (
        <form method="post" class="contact-form">
          {result?.error && <p class="error">{result.error}</p>}

          <label>
            Nombre
            <input type="text" name="name" required />
          </label>

          <label>
            Mensaje
            <textarea name="message" rows={4} required />
          </label>

          <button type="submit">Enviar</button>
        </form>
      )}
    </section>
  )
}
