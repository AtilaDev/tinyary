// routes/index.tsx  (ruta "/")
//
// Rol: página HOME. Demuestra el ciclo fullstack con persistencia real:
//   1. El loader corre en el servidor y lee los todos desde db.json (LowDB).
//   2. El HTML sale completo con la lista ya renderizada.
//   3. Cada acción (agregar/toggle/borrar) es un POST que corre el action.
//   4. El action muta el store en disco y redirige (PRG) para re-renderizar
//      con datos frescos.
//
// Diferencia con `fullstack`: acá los todos persisten en db.json. Si reiniciás
// el servidor, los todos siguen ahí.

import { redirect } from 'tinyary'
import type { ActionCtx, PageProps } from 'tinyary'
import { addTodo, deleteTodo, listTodos, toggleTodo } from '../lib/db'

type HomeData = { todos: Awaited<ReturnType<typeof listTodos>> }

export const loader = async () => ({
  todos: await listTodos(),
})

export const action = async ({ form }: ActionCtx) => {
  const intent = String(form.get('intent') ?? '')

  if (intent === 'add') {
    const text = String(form.get('text') ?? '').trim()
    if (text) await addTodo(text)
  } else if (intent === 'toggle') {
    await toggleTodo(Number(form.get('id')))
  } else if (intent === 'delete') {
    await deleteTodo(Number(form.get('id')))
  }

  redirect('/')
}

export default function Home({ data }: PageProps<HomeData>) {
  const todos = data.todos

  return (
    <section class="page">
      <h1>Lista de tareas</h1>
      <p class="lead">
        Las tareas viven en <code>db.json</code> (LowDB). Cada botón envía un{' '}
        <code>POST</code> y el servidor re-renderiza la página con datos frescos.
        Reiniciá el servidor: los todos siguen ahí.
      </p>

      <form method="post" class="add-form">
        <input type="hidden" name="intent" value="add" />
        <input
          type="text"
          name="text"
          placeholder="¿Qué hay que hacer?"
          autocomplete="off"
          required
        />
        <button type="submit">Agregar</button>
      </form>

      {todos.length === 0 ? (
        <p class="empty">No hay tareas. ¡Agregá la primera!</p>
      ) : (
        <ul class="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} class={todo.done ? 'todo done' : 'todo'}>
              <form method="post" class="inline">
                <input type="hidden" name="intent" value="toggle" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit" class="toggle" title="Marcar como hecha">
                  <span class="check">{todo.done ? '✓' : '○'}</span>
                  <span class="text">{todo.text}</span>
                </button>
              </form>

              <form method="post" class="inline">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit" class="delete" title="Borrar">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p class="hint">
        Tip: abrí dos pestañas y agregá una tarea en una: la otra se actualiza al
        recargar, porque el estado está en el servidor (y en disco).
      </p>
    </section>
  )
}