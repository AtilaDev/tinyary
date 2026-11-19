// lib/todos.ts
//
// Rol: estado compartido del SERVIDOR. En un proyecto real esto sería una base
// de datos; acá es un array en memoria para que el ejemplo sea autocontenido.
//
// Importante: este módulo se carga una sola vez por proceso del servidor. Por
// eso el estado persiste entre requests (y entre usuarios). Eso es exactamente
// lo que queremos para un todo list compartido; para estado por usuario
// habría que keyear por sesión/usuario.
//
// Este archivo NO se importa desde el navegador: sólo lo usan los loaders y
// actions de las rutas, que corren en el servidor.

export type Todo = {
  id: number
  text: string
  done: boolean
}

// Contador de ids. Vive en memoria junto al array.
let nextId = 1

// El store. Mutamos este array en las actions.
const todos: Todo[] = [
  { id: nextId++, text: 'Leer el README de TinyAry', done: false },
  { id: nextId++, text: 'Probar el SSR en /', done: true },
  { id: nextId++, text: 'Agregar un todo nuevo', done: false },
]

/** Devuelve una copia para no filtrar la referencia interna. */
export function listTodos(): Todo[] {
  return todos.map((todo) => ({ ...todo }))
}

export function addTodo(text: string): Todo {
  const todo: Todo = { id: nextId++, text, done: false }
  todos.push(todo)
  return { ...todo }
}

export function toggleTodo(id: number): void {
  const todo = todos.find((item) => item.id === id)
  if (todo) todo.done = !todo.done
}

export function deleteTodo(id: number): void {
  const index = todos.findIndex((item) => item.id === id)
  if (index !== -1) todos.splice(index, 1)
}
