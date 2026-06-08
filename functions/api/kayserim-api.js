/**
 * GET /api/kayserim-api?endpoint=<path>
 * kayserim.net Daktilo API proxy
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const endpoint = url.searchParams.get('endpoint') || 'info'
  const apiKey   = '5925200cf4f21521b33d5b3b213c651f'
  const base     = 'https://www.kayserim.net/api/v1'

  const res  = await fetch(`${base}/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  const text = await res.text()

  return new Response(text, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
