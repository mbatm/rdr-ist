/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, video_url, metin, platform, is_video, fb_page_id?, ig_id?, source_id?, baslik? }
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video,
            fb_page_id, ig_id: reqIgId, source_id, baslik } = body

    if (!gorsel_url && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []

    // Seçili sayfa — belirtilmemişse ilk hesabı kullan
    const secilenSayfa = hesaplar.find(h => h.page_id === fb_page_id) || hesaplar[0]
    if (!secilenSayfa) return Response.json({ hata: 'Bağlı hesap bulunamadı. /api/meta-auth ile hesap ekleyin.' }, { status: 401 })

    const pageToken = secilenSayfa.page_token
    const pageId    = secilenSayfa.page_id
    const igId      = reqIgId || secilenSayfa.ig_id
    const userToken = meta.longToken || pageToken

    const sonuclar = {}

    // ── FACEBOOK ──────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      if (is_video && video_url) {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: video_url, description: metin, published: true, access_token: pageToken }),
        })
        const data = await res.json()
        sonuclar.facebook = data.error
          ? { hata: data.error.message }
          : { ok: true, post_id: data.id }
      } else if (gorsel_url) {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: gorsel_url, caption: metin, published: true, access_token: pageToken }),
        })
        const data = await res.json()
        sonuclar.facebook = data.error
          ? { hata: data.error.message }
          : { ok: true, post_id: data.post_id || data.id }
      }
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'her_ikisi') && igId) {
      if (is_video && video_url) {
        const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url, caption: metin, media_type: 'REELS', share_to_feed: true, access_token: userToken }),
        })
        const cData = await cRes.json()
        sonuclar.instagram = cData.error
          ? { hata: `Container(${cData.error.code}): ${cData.error.message}` }
          : { bekliyor: true, container_id: cData.id, mesaj: 'Video işleniyor…' }
      } else if (gorsel_url) {
        const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: gorsel_url, caption: metin, access_token: userToken }),
        })
        const cData = await cRes.json()
        if (cData.error) {
          sonuclar.instagram = { hata: cData.error.message }
        } else {
          await new Promise(r => setTimeout(r, 2000))
          const pRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: cData.id, access_token: userToken }),
          })
          const pData = await pRes.json()
          sonuclar.instagram = pData.error
            ? { hata: pData.error.message }
            : { ok: true, media_id: pData.id }
        }
      }
    }

    // Paylaşım logu
    try {
      const kullanici = request.headers.get('X-Kullanici') || 'admin'
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      for (const [plt, sonuc] of Object.entries(sonuclar)) {
        if (sonuc.ok || sonuc.bekliyor) {
          all.unshift({
            source_id: source_id || '',
            baslik: (baslik || '').slice(0, 80),
            platform: plt,
            post_id: sonuc.post_id || sonuc.media_id || '',
            kullanici,
            tip: is_video ? 'video' : 'foto',
            hesap: plt === 'facebook' ? secilenSayfa.page_name : (secilenSayfa.ig_username || igId),
            tarih: new Date().toISOString(),
          })
        }
      }
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0, 500)))
    } catch(e) { console.warn('Log hatası:', e.message) }

    return Response.json({ basarili: true, sonuclar })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
