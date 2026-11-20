// routes/todos/index.tsx
//
// Role: HOME page. Demonstrates the fullstack cycle with real persistence:
//   1. The loader runs on the server and reads todos from db.json (LowDB).
//   2. The HTML ships complete with the list already rendered.
//   3. Each action (add/toggle/delete) is a POST that runs the action.
//   4. The action mutates the store on disk and redirects (PRG) to re-render
//      with fresh data.
//
// Difference from `fullstack`: here todos persist in db.json. If you restart
// the server, the todos are still there.

import { redirect } from 'tinyary'
import type { ActionCtx, PageProps } from 'tinyary'
import { addTodo, deleteTodo, listTodos, toggleTodo } from '../../lib/db'

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

  redirect('/todos')
}

export default function Home({ data }: PageProps<HomeData>) {
  const todos = data.todos

  return (
    <section class="page">
      <h1>Todo list</h1>
      <p class="lead">
        Todos live in <code>db.json</code> (LowDB). Each button sends a{' '}
        <code>POST</code> and the server re-renders the page with fresh data.
        Restart the server: the todos are still there.
      </p>

      <form method="post" class="add-form">
        <input type="hidden" name="intent" value="add" />
        <input
          type="text"
          name="text"
          placeholder="What needs to be done?"
          autocomplete="off"
          required
        />
        <button type="submit">Add</button>
      </form>

      {todos.length === 0 ? (
        <p class="empty">No todos yet. Add the first one!</p>
      ) : (
        <ul class="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} class={todo.done ? 'todo done' : 'todo'}>
              <form method="post" class="inline">
                <input type="hidden" name="intent" value="toggle" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit" class="toggle" title="Mark as done">
                  <span class="check">{todo.done ? '✓' : '○'}</span>
                  <span class="text">{todo.text}</span>
                </button>
              </form>

              <form method="post" class="inline">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={todo.id} />
                <button type="submit" class="delete" title="Delete">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p class="hint">
        Tip: open two tabs and add a todo in one: the other updates on reload,
        because state lives on the server (and on disk).
      </p>
    </section>
  )
}
