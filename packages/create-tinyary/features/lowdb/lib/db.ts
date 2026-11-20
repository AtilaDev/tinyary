// lib/db.ts
//
// Role: real persistence with LowDB. Unlike `fullstack` (which uses an in-memory
// array), here todos are saved to `db.json` on disk. State survives server
// restarts and page reloads.
//
// LowDB is a JSON file with a nice API: db.data.todos.push(...),
// db.data.todos.find(...), etc. No SQL, no migrations, no infrastructure.
//
// This file is ONLY imported from loaders/actions (server). Never from the
// browser (TinyAry golden rule).

import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

export type Todo = {
  id: number
  text: string
  done: boolean
}

type Data = { todos: Todo[]; nextId: number }

const adapter = new JSONFile<Data>('db.json')
export const db = new Low<Data>(adapter, { todos: [], nextId: 1 })

export async function ensureDb(): Promise<void> {
  await db.read()
  if (!db.data) db.data = { todos: [], nextId: 1 }
  if (!db.data.todos) db.data.todos = []
  if (!db.data.nextId) db.data.nextId = 1
}

export async function listTodos(): Promise<Todo[]> {
  await ensureDb()
  return db.data.todos.map((todo) => ({ ...todo }))
}

export async function addTodo(text: string): Promise<Todo> {
  await ensureDb()
  const todo: Todo = { id: db.data.nextId++, text, done: false }
  db.data.todos.push(todo)
  await db.write()
  return { ...todo }
}

export async function toggleTodo(id: number): Promise<void> {
  await ensureDb()
  const todo = db.data.todos.find((item) => item.id === id)
  if (todo) {
    todo.done = !todo.done
    await db.write()
  }
}

export async function deleteTodo(id: number): Promise<void> {
  await ensureDb()
  const index = db.data.todos.findIndex((item) => item.id === id)
  if (index !== -1) {
    db.data.todos.splice(index, 1)
    await db.write()
  }
}
