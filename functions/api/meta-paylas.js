/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, video_url, metin, platform, is_video }
 */
export async function onRequestPost({ request, env }) {
  try {
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video } = await request.json()
    if (!gorsel_url && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    const userToken = env.META_PAGE_TOKEN
    const pageId    = env.META_PAGE_ID
    const igId      = env.META_IG_ID

    if (!userToken || !pageId) {
      return Response.json({ hata: 'META_PAGE_TOKEN veya META_PAGE_ID eksik' }, { status: 401 })
    }

    // Page Access Token al
    const pageRes  = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${userToken}`)
    const pageData = await pageRes.json()
    const pageToken = pageData.access_token || userToken

    const sonuclar = {}

    // ── FACEBOOK ──────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      if (is_video && video_url) {
        // Video post — /videos endpoint
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            file_url:    video_url,
            description: metin,
            published:   true,
            access_token: pageToken,
          }),
        })
        const data = await res.json()
        sonuclar.facebook = data.error
          ? { hata: data.error.message }
          : { ok: true, post_id: data.id }
      } else if (gorsel_url) {
        // Fotoğraf post — /photos endpoint (feed'de tam görüntü olarak çıkar)
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            url:          gorsel_url,
            caption:      metin,
            published:    true,
            access_token: pageToken,
          }),
        })
        const data = await res.json()
        sonuclar.facebook = data.error
          ? { hata: data.error.message, detay: JSON.stringify(data.error) }
          : { ok: true, post_id: data.post_id || data.id }
      }
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'her_ikisi') && igId) {
      if (is_video && video_url) {
        // Reels video
        const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            video_url,
            caption:      metin,
            media_type:  'REELS',
            access_token: pageToken,
          }),
        })
        const cData = await cRes.json()
        if (cData.error) {
          sonuclar.instagram = { hata: cData.error.message }
        } else {
          // Reels için container hazırlanmasını bekle
          await new Promise(r => setTimeout(r, 8000))
          const pRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ creation_id: cData.id, access_token: pageToken }),
          })
          const pData = await pRes.json()
          sonuclar.instagram = pData.error
            ? { hata: pData.error.message }
            : { ok: true, media_id: pData.id }
        }
      } else if (gorsel_url) {
        // Fotoğraf post
        const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            image_url:    gorsel_url,
            caption:      metin,
            access_token: pageToken,
          }),
        })
        const cData = await cRes.json()
        if (cData.error) {
          sonuclar.instagram = { hata: cData.error.message }
        } else {
          await new Promise(r => setTimeout(r, 2000))
          const pRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ creation_id: cData.id, access_token: pageToken }),
          })
          const pData = await pRes.json()
          sonuclar.instagram = pData.error
            ? { hata: pData.error.message }
            : { ok: true, media_id: pData.id }
        }
      }
    }

    return Response.json({ basarili: true, sonuclar })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
