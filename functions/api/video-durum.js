/**
 * GET /api/video-durum?render_id=xxx
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  let render = null
  let rawStatus = null

  // v2 dene
  try {
    const res = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      render = Array.isArray(data) ? data[0] : data
      rawStatus = render?.status
    }
  } catch(e) {}

  // v1 dene
  if (!render) {
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
  }

  if (!render) return Response.json({ hata: 'Render bulunamadı' }, { status: 404 })

  // Creatomate status değerleri: planned | rendering | succeeded | failed
  // SADECE succeeded ise URL ver
  const succeeded = rawStatus === 'succeeded'
  const renderUrl = succeeded ? (render.url || render.output_url || null) : null

  return Response.json({
    status:     rawStatus || 'planned',
    succeeded,
    url:        renderUrl,
    render_url: renderUrl,
    progress:   render.progress || 0,
    _debug:     { rawStatus, hasUrl: !!(render.url), renderId },
  })
}
