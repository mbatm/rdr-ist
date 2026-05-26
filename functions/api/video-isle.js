/**
 * POST /api/video-isle
 * Body: { video_url, baslik, spot, kategori, tarih, source_id, format }
 * format: 'dikey' | 'yatay' | 'her_ikisi'
 */
export async function onRequestPost({ request, env }) {
  try {
    const { video_url, baslik, spot, kategori, tarih, source_id, format = 'dikey' } = await request.json()
    if (!video_url) return Response.json({ hata: 'video_url gerekli' }, { status: 400 })

    const apiKey = env.CREATOMATE_API_KEY
    if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

    const tarihStr  = tarih    || new Date().toLocaleDateString('tr-TR')
    const katStr    = (kategori || 'GÜNCEL').toUpperCase()
    const baslikStr = (baslik   || '').slice(0, 120)
    const spotStr   = spot      || ''

    const TEMPLATES = {
      dikey: 'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
      yatay: '438ee267-ad53-4627-8126-e50ffb30f395',
    }

    const modifications = {
      'video.source':        video_url,
      'baslik.text':         baslikStr,
      'baslikss.text':       baslikStr,
      'spot-baslik.text':    spotStr,
      'spot-baslik-ss.text': spotStr,
      'kategori.text':       katStr,
      'tarih.text':          tarihStr,
    }

    const renders = []
    const formatlar = format === 'her_ikisi' ? ['dikey', 'yatay'] : [format]

    for (const fmt of formatlar) {
      const res = await fetch('https://api.creatomate.com/v2/renders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          template_id: TEMPLATES[fmt],
          output_format: 'mp4',
          frame_rate: 30,
          modifications,
        }),
      })
      const data = await res.json()
      if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })
      const render = Array.isArray(data) ? data[0] : data
      renders.push({ format: fmt, render_id: render.id, status: render.status })
    }

    return Response.json({ ok: true, renders })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
