/**
 * GET /api/video-durum?render_id=xxx
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  const res = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
    headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
  })
  const data = await res.json()
  const render = Array.isArray(data) ? data[0] : data

  return Response.json({
    status:     render.status,
    render_url: render.url || null,
    snapshot:   render.snapshot_url || null,
    progress:   render.progress || 0,
  })
}
