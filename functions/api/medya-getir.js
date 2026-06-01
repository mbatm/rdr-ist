/**
 * GET /api/medya-getir?key=xxx
 * R2'den dosya getirir
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!key) return new Response('key gerekli', { status: 400 })

  const obj = await env.MEDYA.get(key)
  if (!obj) return new Response('Bulunamadı', { status: 404 })

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000')
  headers.set('access-control-allow-origin', '*')

  return new Response(obj.body, { headers })
}
