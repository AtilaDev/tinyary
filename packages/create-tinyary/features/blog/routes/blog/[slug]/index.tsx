// routes/blog/[slug]/index.tsx
//
// Role: individual post. The loader reads the .md and renders HTML.

import { notFound } from 'tinyary'
import type { PageProps, RequestCtx } from 'tinyary'
import { getPost } from '../../../lib/posts'

export const loader = async (ctx: RequestCtx) => {
  const post = getPost(ctx.params.slug)
  if (!post) notFound()
  return { post }
}

export default function PostPage({ data }: PageProps<{ post: NonNullable<ReturnType<typeof getPost>> }>) {
  return (
    <section class="page">
      <article class="post">
        <h1>{data.post.title}</h1>
        {data.post.date && <p class="date">{data.post.date}</p>}
        <div class="post-body" dangerouslySetInnerHTML={{ __html: data.post.html }} />
      </article>
      <p><a href="/blog">← Back to blog</a></p>
    </section>
  )
}
