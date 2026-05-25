/**
 * POST /api/ig-publish
 * Body: { container_id }
 * Container durumunu kontrol eder, FINISHED ise publish eder
 */
export async function onRequestPost({ request, env }) {
  try {
    const { container_id } = await request.json()
    if (!container_id) return Response.json({ hata: 'container_id gerekli' }, { status: 400 })

    const userToken = env.META_PAGE_TOKEN
    const pageId    = env.META_PAGE_ID
    const igId      = env.META_IG_ID

    const pageRes   = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${userToken}`)
    const pageData  = await pageRes.json()
    const pageToken = pageData.access_token || userToken

    // Container durumunu kontrol et
    const sRes   = await fetch(`https://graph.facebook.com/v19.0/${container_id}?fields=status_code&access_token=${pageToken}`)
    const sData  = await sRes.json()
    const status = sData.status_code || 'IN_PROGRESS'

    if (status === 'IN_PROGRESS') {
      return Response.json({ bekliyor: true, status })
    }

    if (status === 'ERROR' || status === 'EXPIRED') {
      return Response.json({ hata: `Container hatası: ${status}` }, { status: 500 })
    }

    if (status === 'FINISHED') {
      const pRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ creation_id: container_id, access_token: pageToken }),
      })
      const pData = await pRes.json()
      if (pData.error) return Response.json({ hata: pData.error.message }, { status: 500 })
      return Response.json({ ok: true, media_id: pData.id })
    }

    return Response.json({ bekliyor: true, status })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
