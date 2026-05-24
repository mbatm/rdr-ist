/**
 * GET /api/video-durum?render_id=xxx
 * Creatomate render durumunu sorgular
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const renderId = url.searchParams.get('render_id')
  if (!renderId) return Response.json({ hata: 'render_id gerekli' }, { status: 400 })

  const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
    headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
  })
  const data = await res.json()

  return Response.json({
    status:    data.status,        // planned / rendering / succeeded / failed
    render_url: data.url || null,  // bitince mp4 URL
    progress:  data.progress || 0,
  })
}
