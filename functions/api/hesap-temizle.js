/**
 * POST /api/hesap-temizle
 * Body: { ig_id } → geçersiz ig_id'yi hesaplar listesinden kaldırır
 * GET  /api/hesap-temizle → mevcut ig_id'leri listeler (debug)
 */
export async function onRequestGet({ env }) {
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  const hesaplar = meta.hesaplar || []
  return Response.json({
    toplam: hesaplar.length,
    instagram: hesaplar.filter(h=>h.ig_id).map(h=>({
      page_id: h.page_id, page_name: h.page_name,
      ig_id: h.ig_id, ig_username: h.ig_username
    }))
  })
}

export async function onRequestPost({ request, env }) {
  const { ig_id, page_id } = await request.json()
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  const once = meta.hesaplar?.length || 0

  if (ig_id) {
    // ig_id eşleşen hesabın ig_id'sini temizle (hesabı silme, sadece ig_id'yi null yap)
    meta.hesaplar = (meta.hesaplar||[]).map(h =>
      String(h.ig_id) === String(ig_id) ? { ...h, ig_id: null, ig_username: null } : h
    )
  } else if (page_id) {
    meta.hesaplar = (meta.hesaplar||[]).filter(h => h.page_id !== page_id)
  }

  await env.HABERLER.put('meta_tokens', JSON.stringify(meta))
  return Response.json({ ok: true, once, sonra: meta.hesaplar?.length })
}
