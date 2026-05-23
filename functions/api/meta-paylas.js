/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, metin, platform: 'facebook'|'instagram'|'her_ikisi', page_id? }
 * Görsel + metin → Facebook Page + Instagram
 */
export async function onRequestPost({ request, env }) {
  try {
    const { gorsel_url, metin, platform = 'her_ikisi', page_id } = await request.json()
    if (!gorsel_url) return Response.json({ hata: 'gorsel_url gerekli' }, { status: 400 })

    const meta = await env.HABERLER.get('meta_tokens', 'json')
    if (!meta) return Response.json({ hata: 'Meta bağlantısı yok — /api/meta-auth ile bağlanın' }, { status: 401 })

    const hesap = page_id
      ? meta.hesaplar.find(h => h.page_id === page_id)
      : meta.hesaplar[0]

    if (!hesap) return Response.json({ hata: 'Sayfa bulunamadı' }, { status: 404 })

    const sonuclar = {}

    // ── FACEBOOK PAYLAŞIMI ──────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      const fbRes = await fetch(`https://graph.facebook.com/v19.0/${hesap.page_id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:          gorsel_url,
          caption:      metin,
          access_token: hesap.page_token,
        }),
      })
      const fbData = await fbRes.json()
      sonuclar.facebook = fbData.error
        ? { hata: fbData.error.message }
        : { ok: true, post_id: fbData.post_id || fbData.id }
    }

    // ── INSTAGRAM PAYLAŞIMI ─────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'her_ikisi') && hesap.ig_id) {
      // Adım 1: Container oluştur
      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${hesap.ig_id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url:    gorsel_url,
          caption:      metin,
          access_token: hesap.page_token,
        }),
      })
      const container = await containerRes.json()

      if (container.error) {
        sonuclar.instagram = { hata: container.error.message }
      } else {
        // Adım 2: Publish
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${hesap.ig_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: hesap.page_token,
          }),
        })
        const publish = await publishRes.json()
        sonuclar.instagram = publish.error
          ? { hata: publish.error.message }
          : { ok: true, media_id: publish.id }
      }
    }

    return Response.json({ basarili: true, hesap: hesap.page_name, sonuclar })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
