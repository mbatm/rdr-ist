/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, metin, platform: 'facebook'|'instagram'|'her_ikisi' }
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
        // Video post
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ file_url: video_url, description: metin, access_token: pageToken }),
        })
        const data = await res.json()
        sonuclar.facebook = data.error ? { hata: data.error.message } : { ok: true, post_id: data.id }
      } else {
        // Fotoğraf post
        const photoRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: gorsel_url, caption: metin, published: true, access_token: pageToken }),
        })
        const photoData = await photoRes.json()
        if (photoData.error) {
          // Fallback feed
          const feedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: metin, link: gorsel_url, access_token: pageToken }),
          })
          const feedData = await feedRes.json()
          sonuclar.facebook = feedData.error ? { hata: feedData.error.message } : { ok: true, post_id: feedData.id }
        } else {
          sonuclar.facebook = { ok: true, post_id: photoData.post_id || photoData.id }
        }
      }
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'her_ikisi') && igId) {
      let containerBody
      if (is_video && video_url) {
        containerBody = { video_url, caption: metin, media_type: 'REELS', access_token: pageToken }
      } else {
        containerBody = { image_url: gorsel_url, caption: metin, access_token: pageToken }
      }

      const cRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(containerBody),
      })
      const cData = await cRes.json()

      if (cData.error) {
        sonuclar.instagram = { hata: cData.error.message }
      } else {
        // Video için daha uzun bekle
        await new Promise(r => setTimeout(r, is_video ? 5000 : 2000))
        const pRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ creation_id: cData.id, access_token: pageToken }),
        })
        const pData = await pRes.json()
        sonuclar.instagram = pData.error ? { hata: pData.error.message } : { ok: true, media_id: pData.id }
      }
    }

    return Response.json({ basarili: true, sonuclar })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
