/**
 * POST /api/creatomate-webhook
 * Creatomate render tamamlanınca çağrılır
 * Creatomate Dashboard → Settings → Webhooks → https://rdr.ist/api/creatomate-webhook
 */
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json()

    // Creatomate webhook payload
    const { id: renderId, status, url, snapshot_url, template_id, metadata: metadataRaw } = data

    if (status !== 'succeeded' || !url) {
      return Response.json({ ok: true, skipped: true })
    }

    if (!env.HABERLER) {
      return Response.json({ ok: false, hata: 'KV bağlı değil' }, { status: 500 })
    }

    // metadata string veya obje olabilir
    let meta = {}
    try {
      meta = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : (metadataRaw || {})
    } catch(e) {}

    const sourceId = meta.source_id
    const format   = meta.format
    const tip      = meta.tip // 'gorsel' veya 'video'

    if (sourceId && format) {
      if (tip === 'gorsel') {
        // Görsel KV cache güncelle
        await env.HABERLER.put(`gorsel:${sourceId}:${format}`, url, {
          expirationTtl: 60 * 60 * 24 * 10 // 30 gün
        })
      } else if (tip === 'video') {
        // Video URL KV güncelle
        const mevcut = await env.HABERLER.get(`video:${sourceId}`, 'json') || {}
        mevcut[format] = { url, snapshot: snapshot_url || '', tarih: new Date().toISOString() }
        await env.HABERLER.put(`video:${sourceId}`, JSON.stringify(mevcut))

        // render_id → url mapping (video-durum için)
        await env.HABERLER.put(`render:${renderId}`, JSON.stringify({
          status: 'succeeded',
          url,
          render_url: url,
          snapshot: snapshot_url || '',
        }), { expirationTtl: 60 * 60 * 24 * 10 }) // 7 gün
      }
    } else {
      // source_id yoksa sadece render_id ile kaydet
      if (renderId) {
        await env.HABERLER.put(`render:${renderId}`, JSON.stringify({
          status: 'succeeded',
          url,
          render_url: url,
          snapshot: snapshot_url || '',
        }), { expirationTtl: 60 * 60 * 24 * 10 })
      }
    }

    return Response.json({ ok: true, renderId, sourceId, format })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
