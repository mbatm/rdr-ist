/**
 * GET /api/haberler
 * KV'deki işlenmiş haberleri döndürür — panel senkronizasyonu için
 */
export async function onRequestGet({ env }) {
  const liste = (await env.HABERLER.get('liste', 'json')) || []
  return Response.json(liste, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
