export type Params = Record<string, string>

export interface RequestCtx {
  request: Request
  url: URL
  params: Params
  query: URLSearchParams
  cookies: Map<string, string>
  user: { id: string; name: string } | null
}

export interface ActionCtx extends RequestCtx {
  form: FormData
}

export type LoaderResult = Record<string, unknown>

export interface PageProps<D = LoaderResult, R = LoaderResult> {
  data: D
  result?: R
  params: Params
}
