/**
 * GET  /api/paylas-log?source_id=xxx  → haberin paylaşım logunu döner
 * GET  /api/paylas-log?admin=1        → tüm logları döner (admin)
 * POST /api/paylas-log                → log kaydeder
 */
export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url)
  const sourceId = url.searchParams.get('source_id')
  const admin    = url.searchParams.get('admin')

  if (admin) {
    // Admin kontrolü
    const token = request.headers.get('X-Token') || url.searchParams.get('token')
    if (token) {
      const data = await env.HABERLER.get(`token:${token}`, 'json')
      if (!data || data.rol !== 'admin')
        return Response.json({ hata: 'Yetkisiz erişim' }, { status: 403 })
    }
    const all = await env.HABERLER.get('paylas_log', 'json') || []
    return Response.json(all)
  }

  if (sourceId) {
    const all = await env.HABERLER.get('paylas_log', 'json') || []
    return Response.json(all.filter(l => l.source_id === sourceId))
  }

  return Response.json([])
}

export async function onRequestPost({ request, env }) {
  try {
    const { source_id, platform, post_id, kullanici, tip, baslik } = await request.json()
    if (!source_id || !platform) return Response.json({ hata: 'eksik alan' }, { status: 400 })

    const all = await env.HABERLER.get('paylas_log', 'json') || []
    all.unshift({
      source_id,
      platform,
      post_id: post_id || '',
      kullanici: kullanici || 'admin',
      tip: tip || 'foto',
      baslik: (baslik || '').slice(0, 80),
      tarih: new Date().toISOString(),
    })
    // Son 500 log tut
    await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0, 500)))
    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
