/**
 * GET /api/kv-sil?source_id=xxx
 * KV listesinden belirli bir haberi siler → oto-isle yeniden işler
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const sourceId = url.searchParams.get('source_id')
  if (!sourceId) return Response.json({ hata: 'source_id gerekli' }, { status: 400 })

  const liste = (await env.HABERLER.get('liste', 'json')) || []
  const yeni  = liste.filter(h => h.source_id !== sourceId)

  if (yeni.length === liste.length) {
    return Response.json({ hata: 'Haber bulunamadı', source_id: sourceId }, { status: 404 })
  }

  await env.HABERLER.put('liste', JSON.stringify(yeni))
  return Response.json({
    ok: true,
    silindi: sourceId,
    kalan: yeni.length,
    mesaj: 'Haber KVden silindi — oto-isle tekrar işleyecek'
  })
}
