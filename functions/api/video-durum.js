/**
 * GET /api/video-durum?render_id=xxx
 * Creatomate render durumunu döner — status: succeeded | failed | planned | rendering
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  let render = null

  // v2 dene
  try {
    const res = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      render = Array.isArray(data) ? data[0] : data
    }
  } catch(e) {}

  // v2 bulamazsa v1 dene
  if (!render) {
    try {
      const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })
      if (res.ok) {
        const data = await res.json()
        render = Array.isArray(data) ? data[0] : data
      }
    } catch(e) {}
  }

  if (!render) return Response.json({ hata: 'Render bulunamadı' }, { status: 404 })

  // Gerçek status'u kullan — URL varsa succeeded saymıyoruz
  const status  = render.status || 'planned' // Creatomate: planned | rendering | succeeded | failed
  const renderUrl = (status === 'succeeded') ? (render.url || render.output_url || null) : null

  return Response.json({
    status,
    url:        renderUrl,
    render_url: renderUrl,
    progress:   render.progress || 0,
  })
}
