/**
 * POST /api/ig-publish
 * Body: { container_id, ig_id? }
 */
export async function onRequestPost({ request, env }) {
  try {
    const { container_id, ig_id } = await request.json()
    if (!container_id) return Response.json({ hata: 'container_id gerekli' }, { status: 400 })

    const meta      = await env.HABERLER.get('meta_tokens', 'json') || {}
    const pageToken = meta.longToken || env.META_PAGE_TOKEN
    const igId      = ig_id || env.META_IG_ID

    // Container durumunu kontrol et
    const sRes   = await fetch(`https://graph.facebook.com/v19.0/${container_id}?fields=status_code&access_token=${pageToken}`)
    const sData  = await sRes.json()
    const status = sData.status_code || 'IN_PROGRESS'

    if (sData.error) return Response.json({ hata: `${sData.error.message} (${sData.error.code})` }, { status: 500 })
    if (status === 'IN_PROGRESS') return Response.json({ bekliyor: true, status })
    if (status === 'ERROR' || status === 'EXPIRED') return Response.json({ hata: `Container: ${status}` }, { status: 500 })

    if (status === 'FINISHED') {
      const pRes  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container_id, access_token: pageToken }),
      })
      const pData = await pRes.json()
      if (pData.error) return Response.json({ hata: `Publish: ${pData.error.message} (kod: ${pData.error.code})` }, { status: 500 })
      return Response.json({ ok: true, media_id: pData.id })
    }

    return Response.json({ bekliyor: true, status })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
