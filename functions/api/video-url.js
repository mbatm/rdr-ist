/**
 * GET  /api/video-url?source_id=xxx  → video URL'lerini döner
 * POST /api/video-url                → { source_id, format, url, snapshot } kaydeder
 */
export async function onRequestGet({ request, env }) {
  const sid = new URL(request.url).searchParams.get('source_id')
  if (!sid) return Response.json({})
  const data = await env.HABERLER.get('video_url:' + sid, 'json') || {}
  return Response.json(data)
}

export async function onRequestPost({ request, env }) {
  const { source_id, format, url, snapshot } = await request.json()
  if (!source_id || !format || !url) return Response.json({ hata: 'eksik alan' }, { status: 400 })
  const key  = 'video_url:' + source_id
  const mevcut = await env.HABERLER.get(key, 'json') || {}
  mevcut[format]            = url
  mevcut[format + '_snapshot'] = snapshot || ''
  await env.HABERLER.put(key, JSON.stringify(mevcut))
  return Response.json({ ok: true })
}
