/**
 * POST /api/paylas-sil
 * Body: { platform, post_id, page_id? }
 * Facebook veya Instagram'dan paylaşımı siler
 */
export async function onRequestPost({ request, env }) {
  try {
    const { platform, post_id, page_id } = await request.json()
    if (!platform || !post_id) return Response.json({ hata: 'platform ve post_id gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    const hesap    = hesaplar.find(h => h.page_id === page_id) || hesaplar[0]
    if (!hesap) return Response.json({ hata: 'Hesap bulunamadı' }, { status: 404 })

    const token = platform === 'instagram' ? (meta.longToken || hesap.page_token) : hesap.page_token

    const res  = await fetch(`https://graph.facebook.com/v19.0/${post_id}`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ access_token: token }),
    })
    const data = await res.json()

    if (data.error) return Response.json({ hata: data.error.message }, { status: 500 })

    // Log'dan da kaldır
    const log = await env.HABERLER.get('paylas_log', 'json') || []
    const yeniLog = log.filter(l => l.post_id !== post_id)
    await env.HABERLER.put('paylas_log', JSON.stringify(yeniLog))

    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
