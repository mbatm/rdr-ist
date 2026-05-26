/**
 * POST /api/paylas-sil
 * Body: { platform, post_id, page_id?, ig_id? }
 */
export async function onRequestPost({ request, env }) {
  try {
    const { platform, post_id, page_id, ig_id } = await request.json()
    if (!platform || !post_id) return Response.json({ hata: 'platform ve post_id gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    const hesap    = hesaplar.find(h => h.page_id === page_id) || hesaplar[0]
    if (!hesap) return Response.json({ hata: 'Hesap bulunamadı' }, { status: 404 })

    let res, data

    if (platform === 'instagram' || platform === 'instagram_story') {
      // Instagram: access_token query param olarak geçmeli
      const token = meta.longToken || hesap.page_token
      res  = await fetch(`https://graph.facebook.com/v19.0/${post_id}?access_token=${token}`, {
        method: 'DELETE',
      })
      data = await res.json()
    } else {
      // Facebook: body'de access_token
      const token = hesap.page_token
      res  = await fetch(`https://graph.facebook.com/v19.0/${post_id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ access_token: token }),
      })
      data = await res.json()
    }

    if (data.error) return Response.json({ hata: `${data.error.message} (${data.error.code})` }, { status: 500 })

    // Log'dan kaldır
    const log = await env.HABERLER.get('paylas_log', 'json') || []
    await env.HABERLER.put('paylas_log', JSON.stringify(log.filter(l => l.post_id !== post_id)))

    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
