/**
 * GET  /api/hesaplar          → tüm bağlı hesapları döner
 * POST /api/hesaplar          → { islem: 'sil', page_id } → hesap siler
 */
export async function onRequestGet({ env }) {
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  const hesaplar = meta.hesaplar || []

  const facebook  = hesaplar.map(h => ({
    page_id:   h.page_id,
    page_name: h.page_name,
    picture:   h.picture || null,
  }))

  // Instagram: aynı ig_id'ye sahip birden fazla FB sayfası olabilir — dedup
  const igMap = new Map()
  hesaplar.filter(h => h.ig_id).forEach(h => {
    if (!igMap.has(h.ig_id)) {
      igMap.set(h.ig_id, {
        ig_id:    h.ig_id,
        username: h.ig_username || '',
        page_id:  h.page_id,
        page_name: h.page_name,
        picture:  h.ig_picture || null,
      })
    }
  })
  const instagram = [...igMap.values()]

  return Response.json({ facebook, instagram })
}

export async function onRequestPost({ request, env }) {
  try {
    const { islem, page_id } = await request.json()
    if (islem !== 'sil' || !page_id) return Response.json({ hata: 'geçersiz istek' }, { status: 400 })

    const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
    meta.hesaplar = (meta.hesaplar || []).filter(h => h.page_id !== page_id)
    await env.HABERLER.put('meta_tokens', JSON.stringify(meta))
    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
