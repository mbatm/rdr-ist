/**
 * POST /api/gorsel-yukle
 * Body: { data: base64jpeg, source_id, format }
 * KV'ye kaydeder, public URL döner
 */
export async function onRequestPost({ request, env }) {
  try {
    const { data, source_id, format } = await request.json()
    if (!data || !source_id || !format) {
      return Response.json({ hata: 'data, source_id, format gerekli' }, { status: 400 })
    }
    // Boyut kontrolü — KV limiti 25MB, base64 ~%33 şişer
    const boyutMB = (data.length * 0.75) / (1024 * 1024)
    if (boyutMB > 20) {
      return Response.json({ hata: `Dosya çok büyük (${boyutMB.toFixed(1)}MB). Maksimum 20MB.` }, { status: 413 })
    }
    const key = `gorsel_${source_id}_${format}`
    await env.HABERLER.put(key, data, { expirationTtl: 86400 * 10 }) // 7 gün
    const url = `https://rdr.ist/api/gorsel-getir?id=${encodeURIComponent(key)}`
    return Response.json({ ok: true, url })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
