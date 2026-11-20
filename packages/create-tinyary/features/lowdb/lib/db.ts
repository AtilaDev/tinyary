// lib/db.ts
//
// Rol: persistencia real con LowDB. A diferencia de `fullstack` (que usa un
// array en memoria), acá los todos se guardan en `db.json` en disco. El estado
// sobrevive a reinicios del servidor y a recargas de página.
//
// LowDB es un JSON file con una API bonita: db.data.todos.push(...),
// db.data.todos.find(...), etc. Sin SQL, sin migraciones, sin infraestructura.
//
// Este archivo se importa desde loaders/actions (servidor). Los imports de
// lowdb/node son dinámicos para que Vite no intente bundlearlos en el cliente
// (node:path / node:fs no existen en el browser).

export type Todo = {
  id: number
  text: string
  done: boolean
}

type Data = { todos: Todo[]; nextId: number }

// Cache del store en memoria del proceso. Se inicializa una sola vez.
let _db: any = null

async function getDb() {
  if (_db) return _db
  // Import dinámico: solo se ejecuta en el servidor (loaders/actions).
  // En el cliente este código nunca se llama, así que el import de
  // lowdb/node (que usa node:fs/node:path) no se ejecuta en el browser.
  const { Low } = await import('lowdb')
  const { JSONFile } = await import('lowdb/node')
  const adapter = new JSONFile<Data>('db.json')
  _db = new Low(adapter, { todos: [], nextId: 1 })
  await _db.read()
  if (!_db.data) _db.data = { todos: [], nextId: 1 }
  if (!_db.data.todos) _db.data.todos = []
  if (!_db.data.nextId) _db.data.nextId = 1
  return _db
}

export async function listTodos(): Promise<Todo[]> {
  const db = await getDb()
  return db.data.todos.map((todo: Todo) => ({ ...todo }))
}

export async function addTodo(text: string): Promise<Todo> {
  const db = await getDb()
  const todo: Todo = { id: db.data.nextId++, text, done: false }
  db.data.todos.push(todo)
  await db.write()
  return { ...todo }
}

export async function toggleTodo(id: number): Promise<void> {
  const db = await getDb()
  const todo = db.data.todos.find((item: Todo) => item.id === id)
  if (todo) {
    todo.done = !todo.done
    await db.write()
  }
}

export async function deleteTodo(id: number): Promise<void> {
  const db = await getDb()
  const index = db.data.todos.findIndex((item: Todo) => item.id === id)
  if (index !== -1) {
    db.data.todos.splice(index, 1)
    await db.write()
  }
}