export async function onRequestPost({ request, env }) {
  try {
    const { platform, post_id, page_id } = await request.json()
    if (!platform || !post_id) return Response.json({ hata: 'platform ve post_id gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    const hesap    = hesaplar.find(h => h.page_id === page_id) || hesaplar[0]

    let silindi = false

    if (platform === 'facebook') {
      const token = hesap?.page_token
      const res  = await fetch(`https://graph.facebook.com/v19.0/${post_id}`, {
        method: 'DELETE', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ access_token: token }),
      })
      const data = await res.json()
      if (data.error) return Response.json({ hata: `${data.error.message} (${data.error.code})` }, { status: 500 })
      silindi = true

    } else if (platform === 'instagram' || platform === 'instagram_story') {
      // Instagram Graph API ile silme dene
      const token = meta.longToken || hesap?.page_token
      const res = await fetch(`https://graph.facebook.com/v19.0/${post_id}?access_token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.error) {
        // (#10) = izin yok — sadece logdan kaldır, linke yönlendir
        if (data.error.code === 10 || data.error.code === 200) {
          const log = await env.HABERLER.get('paylas_log', 'json') || []
          await env.HABERLER.put('paylas_log', JSON.stringify(log.filter(l => l.post_id !== post_id)))
          return Response.json({
            ok: false,
            log_silindi: true,
            hata: 'Instagram API silme izni yok. Gönderiyi manuel silin.',
            post_url: `https://www.instagram.com/p/${post_id}/`,
          })
        }
        return Response.json({ hata: `${data.error.message} (${data.error.code})` }, { status: 500 })
      }
      silindi = true
    }

    // Log'dan kaldır
    const log = await env.HABERLER.get('paylas_log', 'json') || []
    await env.HABERLER.put('paylas_log', JSON.stringify(log.filter(l => l.post_id !== post_id)))
    return Response.json({ ok: true })

  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
