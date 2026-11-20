// lib/posts.ts
//
// Rol: lee posts en Markdown de content/posts/ y los parsea con gray-matter.
// El body se renderiza a HTML con marked en el loader (server-side).

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

export type Post = {
  slug: string
  title: string
  date: string
  body: string
  html: string
}

const POSTS_DIR = 'content/posts'

export function listPosts(): Omit<Post, 'body' | 'html'>[] {
  try {
    const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
    return files.map((file) => {
      const slug = file.replace(/\.md$/, '')
      const raw = readFileSync(join(POSTS_DIR, file), 'utf8')
      const { data } = matter(raw)
      return { slug, title: data.title || slug, date: data.date || '' }
    })
  } catch {
    return []
  }
}

export function getPost(slug: string): Post | null {
  try {
    const raw = readFileSync(join(POSTS_DIR, `${slug}.md`), 'utf8')
    const { data, content } = matter(raw)
    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      body: content,
      html: marked(content) as string,
    }
  } catch {
    return null
  }
}
