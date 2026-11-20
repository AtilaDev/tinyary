// routes/blog/[slug]/index.tsx
//
// Rol: post individual. El loader lee el .md y renderiza el HTML.

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
      <p><a href="/blog">← Volver al blog</a></p>
    </section>
  )
}
