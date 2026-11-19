// routes/index.tsx  (ruta "/")
//
// Rol: página HOME. Es la única que toca el store de todos. Demuestra el ciclo
// completo fullstack:
//   1. El loader corre en el servidor y lee los todos.
//   2. El HTML sale completo con la lista ya renderizada.
//   3. Cada acción (agregar/toggle/borrar) es un POST que corre el action.
//   4. El action muta el store del servidor y redirige (PRG) para re-renderizar
//      con datos frescos.
//
// Lo que está acá se ejecuta en AMBOS lados (servidor para SSR, navegador para
// hidratar). Los handlers onClick no se usan: los formularios usan method="post"
// nativo, que es lo que dispara el action del servidor.

import { redirect } from 'tinyary'
import type { ActionCtx, PageProps } from 'tinyary'
import { addTodo, deleteTodo, listTodos, toggleTodo } from '../lib/todos'

// Tipo del dato que devuelve el loader. Lo usamos para tipar PageProps.
type HomeData = { todos: ReturnType<typeof listTodos> }

// LOADER: corre en el servidor en cada GET (y después de cada POST, porque el
// redirect vuelve a disparar un GET). Lee el store y lo pasa al componente.
export const loader = async () => ({
  todos: listTodos(),
})

// ACTION: corre en el servidor en cada POST. Recibe `form: FormData` (dentro de
// ActionCtx). Mutamos el store y redirigimos a "/" para que el loader se
// re-ejecute y la página se renderice con datos frescos (patrón PRG).
export const action = async ({ form }: ActionCtx) => {
  const intent = String(form.get('intent') ?? '')

  if (intent === 'add') {
    const text = String(form.get('text') ?? '').trim()
    if (text) addTodo(text)
  } else if (intent === 'toggle') {
    toggleTodo(Number(form.get('id')))
  } else if (intent === 'delete') {
    deleteTodo(Number(form.get('id')))
  }

  redirect('/')
}

export default function Home({ data }: PageProps<HomeData>) {
  const todos = data.todos

  return (
    <section class="page">
      <h1>Lista de tareas</h1>
      <p class="lead">
        Las tareas viven en el servidor. Cada botón envía un <code>POST</code> y
        el servidor re-renderiza la página con datos frescos.
      </p>

      {/* Formulario de alta. method="post" dispara el action de esta ruta. */}
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
              {/* Toggle: un form por item para no mezclar campos. */}
              <form method="post" class="inline">
                <input type="hidden" name="intent" value="toggle" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit" class="toggle" title="Marcar como hecha">
                  <span class="check">{todo.done ? '✓' : '○'}</span>
                  <span class="text">{todo.text}</span>
                </button>
              </form>

              {/* Borrar. */}
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
        recargar, porque el estado está en el servidor.
      </p>
    </section>
  )
}
