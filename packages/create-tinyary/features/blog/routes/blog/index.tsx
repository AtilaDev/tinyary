// routes/blog/index.tsx
//
// Role: post list. The loader reads .md files from content/posts/.

import type { PageProps } from 'tinyary'
import { listPosts } from '../../lib/posts'

export const loader = async () => ({
  posts: listPosts(),
})

export default function BlogIndex({ data }: PageProps<{ posts: ReturnType<typeof listPosts> }>) {
  return (
    <section class="page">
      <h1>Blog</h1>
      {data.posts.length === 0 ? (
        <p class="empty">No posts yet. Add a .md file in content/posts/.</p>
      ) : (
        <ul class="post-list">
          {data.posts.map((post) => (
            <li key={post.slug}>
              <a href={`/blog/${post.slug}`}>{post.title}</a>
              {post.date && <small> — {post.date}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
