/**
 * GET /api/gorsel-getir?id=gorsel_slug_instagram
 * KV'den görseli serve eder
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const id  = url.searchParams.get('id')
  if (!id) return new Response('id gerekli', { status: 400 })

  const data = await env.HABERLER.get(id)
  if (!data) return new Response('Görsel bulunamadı', { status: 404 })

  // base64'ten binary'e çevir
  const base64 = data.replace(/^data:image\/\w+;base64,/, '')
  const binary  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

  return new Response(binary, {
    headers: {
      'Content-Type':  'image/jpeg',
      'Cache-Control': 'public, max-age=604800',
    }
  })
}
