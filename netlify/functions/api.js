import serverless from 'serverless-http'
import app from '../../server/app.js'

const baseHandler = serverless(app, {
  binary: ['multipart/form-data', 'image/*', 'video/*', 'application/octet-stream'],
})

function withApiPrefix(event) {
  const next = { ...event }
  const candidates = [next.path, next.rawPath, next.requestContext?.http?.path]
  for (const key of ['path', 'rawPath']) {
    const value = next[key]
    if (typeof value === 'string' && value && !value.startsWith('/api') && !value.includes('functions')) {
      next[key] = value.startsWith('/') ? `/api${value}` : `/api/${value}`
    }
  }
  // splat redirect: /api/portfolio → path "/portfolio"
  if (typeof next.path === 'string' && next.path === '/portfolio') {
    next.path = '/api/portfolio'
  }
  if (candidates.some((p) => typeof p === 'string' && p.endsWith('/portfolio'))) {
    next.path = '/api/portfolio'
  }
  return next
}

export async function handler(event, context) {
  return baseHandler(withApiPrefix(event), context)
}
