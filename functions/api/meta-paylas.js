/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, metin, platform: 'facebook'|'instagram'|'her_ikisi' }
 */
export async function onRequestPost({ request, env }) {
  try {
    const { gorsel_url, metin, platform = 'her_ikisi' } = await request.json()
    if (!gorsel_url) return Response.json({ hata: 'gorsel_url gerekli' }, { status: 400 })

    const pageToken = env.META_PAGE_TOKEN
    const pageId    = env.META_PAGE_ID
    const igId      = env.META_IG_ID

    if (!pageToken || !pageId) {
      return Response.json({ hata: 'META_PAGE_TOKEN veya META_PAGE_ID eksik' }, { status: 401 })
    }

    const sonuclar = {}

    // ── FACEBOOK ──────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      const res  = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: gorsel_url, caption: metin, access_token: pageToken }),
      })
      const data = await res.json()
      sonuclar.facebook = data.error
        ? { hata: data.error.message }
        : { ok: true, post_id: data.post_id || data.id }
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'her_ikisi') && igId) {
      // 1. Container
      const cRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image_url: gorsel_url, caption: metin, access_token: pageToken }),
      })
      const cData = await cRes.json()

      if (cData.error) {
        sonuclar.instagram = { hata: cData.error.message }
      } else {
        await new Promise(r => setTimeout(r, 2000))
        // 2. Publish
        const pRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
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

    return Response.json({ basarili: true, sonuclar })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
