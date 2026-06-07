/**
 * GET /api/temizle
 * 10 günden eski Creatomate render'larını siler
 * Manuel veya cron ile tetiklenir
 * 
 * Creatomate API: DELETE /v1/renders/{id}
 * Renders listesi: GET /v1/renders?limit=100
 */
export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url)
  const secret = url.searchParams.get('secret')
  if (secret !== env.RSS_API_KEY)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const apiKey = env.CREATOMATE_API_KEY
  if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY yok' }, { status: 500 })

  const limitGun = parseInt(url.searchParams.get('gun') || '10')
  const sinirTarih = new Date(Date.now() - limitGun * 24 * 60 * 60 * 1000).toISOString()

  let silinenler = 0, hatalar = 0, toplam = 0

  try {
    // Creatomate'ten eski render'ları çek
    const listRes = await fetch(
      `https://api.creatomate.com/v1/renders?limit=100&order=asc`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )
    if (!listRes.ok) return Response.json({ hata: `Creatomate liste hatası: ${listRes.status}` }, { status: 500 })

    const renderler = await listRes.json()
    toplam = renderler.length

    // 10 günden eskilerini sil
    const eskiler = renderler.filter(r => {
      const created = r.created_at || r.completed_at || ''
      return created < sinirTarih && (r.status === 'succeeded' || r.status === 'failed')
    })

    for (const render of eskiler) {
      try {
        const delRes = await fetch(
          `https://api.creatomate.com/v1/renders/${render.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${apiKey}` } }
        )
        if (delRes.ok || delRes.status === 404) silinenler++
        else hatalar++
      } catch { hatalar++ }
    }

    // KV'deki eski render kayıtlarını da temizle (10 günden eskiler zaten expire olmuş)
    // Log kaydı tut
    const log = {
      tarih:     new Date().toISOString(),
      sinir:     sinirTarih,
      toplam,
      eski:      eskiler.length,
      silindi:   silinenler,
      hata:      hatalar,
    }
    try {
      const mevcutLog = JSON.parse(await env.HABERLER.get('temizle_log') || '[]')
      mevcutLog.unshift(log)
      await env.HABERLER.put('temizle_log', JSON.stringify(mevcutLog.slice(0, 30)))
    } catch {}

    return Response.json({ ok: true, ...log })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
