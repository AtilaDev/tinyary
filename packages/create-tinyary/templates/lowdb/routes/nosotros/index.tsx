// routes/nosotros/index.tsx  (ruta "/nosotros")
//
// Rol: página informativa. No tiene loader ni action: es contenido estático
// renderizado en el servidor. Demuestra que una ruta puede ser sólo JSX.

export default function Nosotros() {
  return (
    <section class="page">
      <h1>Nosotros</h1>
      <p class="lead">
        TinyAry es un mini framework fullstack para entender cómo funciona un
        request de punta a punta: servidor, HTML, hidratación y cliente.
      </p>

      <h2>Qué incluye este ejemplo</h2>
      <ul>
        <li>Un store de todos persistente en disco (<code>lib/db.ts</code> con LowDB).</li>
        <li>Un loader que lee el store y una action que lo muta.</li>
        <li>Tres rutas compartiendo un layout común.</li>
        <li>Un formulario de contacto que también usa action.</li>
      </ul>

      <h2>Cómo fluye un todo</h2>
      <ol>
        <li>El navegador envía <code>POST /</code> con el formulario.</li>
        <li>El servidor corre el <code>action</code>, muta el store y redirige.</li>
        <li>El navegador hace <code>GET /</code>; el servidor corre el <code>loader</code>.</li>
        <li>El HTML sale completo con la lista actualizada.</li>
      </ol>
    </section>
  )
}
