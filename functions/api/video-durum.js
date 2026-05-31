/**
 * GET /api/video-durum?render_id=xxx
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  // Önce v2 dene, olmadıysa v1 dene (JPG snapshot için)
  let render = null
  try {
    const res2 = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
    })
    if (res2.ok) {
      const data2 = await res2.json()
      render = Array.isArray(data2) ? data2[0] : data2
    }
  } catch(e) {}

  if (!render) {
    try {
      const res1 = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })
      if (res1.ok) {
        const data1 = await res1.json()
        render = Array.isArray(data1) ? data1[0] : data1
      }
    } catch(e) {}
  }

  if (!render) return Response.json({ hata: 'Render bulunamadı' }, { status: 404 })

  const url2   = render.url || render.output_url || null
  const status = render.status || (url2 ? 'succeeded' : 'planned')

  return Response.json({
    status,
    url:      url2,
    render_url: url2,
    snapshot:   render.snapshot_url || null,
    progress:   render.progress || 0,
  })
}
