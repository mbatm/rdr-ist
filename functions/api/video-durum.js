/**
 * GET /api/video-durum?render_id=xxx
 * Önce KV'den kontrol et (webhook yazmış olabilir), yoksa Creatomate'e sor
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  // 1. KV'den kontrol et — webhook tamamlandıysa burada olur
  if (env.HABERLER) {
    try {
      const kvData = await env.HABERLER.get(`render:${renderId}`, 'json')
      if (kvData?.status === 'succeeded') {
        return Response.json({
          status:     'succeeded',
          succeeded:  true,
          url:        kvData.url,
          render_url: kvData.render_url || kvData.url,
          snapshot:   kvData.snapshot || '',
          progress:   100,
          _source:    'kv_webhook',
        })
      }
    } catch(e) {}
  }

  // 2. KV'de yoksa Creatomate'e sor
  let render = null
  let rawStatus = null

  try {
    const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      render = Array.isArray(data) ? data[0] : data
      rawStatus = render?.status
    }
  } catch(e) {}

  if (!render) return Response.json({ hata: 'Render bulunamadı' }, { status: 404 })

  const succeeded = rawStatus === 'succeeded'
  const renderUrl = succeeded ? (render.url || null) : null

  // Tamamlandıysa KV'ye de yaz (webhook gelmemiş olabilir)
  if (succeeded && renderUrl && env.HABERLER) {
    try {
      await env.HABERLER.put(`render:${renderId}`, JSON.stringify({
        status: 'succeeded',
        url: renderUrl,
        render_url: renderUrl,
        snapshot: render.snapshot_url || '',
      }), { expirationTtl: 60 * 60 * 24 * 10 })
    } catch(e) {}
  }

  return Response.json({
    status:     rawStatus || 'planned',
    succeeded,
    url:        renderUrl,
    render_url: renderUrl,
    progress:   render.progress || 0,
    snapshot:   render.snapshot_url || '',
    _source:    'creatomate_api',
  })
}
