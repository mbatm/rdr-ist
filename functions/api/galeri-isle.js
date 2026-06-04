/**
 * POST /api/galeri-isle
 * Galeri görsellerini 1350x1080 şablonuyla render eder
 * Body: { gorsel_urls: string[], kaynak: 'kayserim' | 'radar', source_id: string }
 * Kapak görseli hariç, diğerleri işlenir
 */

const GALERI_SABLON = {
  kayserim: 'c6851b61-3d03-4959-a3ea-892d851d1b25',
  radar:    'fbded9e2-2538-4045-80d6-6df2c8c60a94',
}

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token') || request.headers.get('X-API-Key')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  // Token doğrula
  const apiKey = env.RSS_API_KEY
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici && token !== apiKey) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })

  try {
    const { gorsel_urls = [], kaynak = 'kayserim', source_id } = await request.json()

    if (!gorsel_urls.length) return Response.json({ hata: 'gorsel_urls gerekli' }, { status: 400 })
    if (!env.CREATOMATE_API_KEY) return Response.json({ hata: 'Creatomate API key yok' }, { status: 500 })

    const templateId = GALERI_SABLON[kaynak] || GALERI_SABLON.kayserim

    // KV cache key
    const cacheKey = source_id ? `galeri_render:${source_id}` : null

    // Önce cache'e bak
    if (cacheKey) {
      try {
        const cached = await env.HABERLER.get(cacheKey, 'json')
        if (cached?.length) return Response.json({ renderler: cached, cached: true })
      } catch(e) {}
    }

    // Her görsel için paralel render başlat
    const renderBaslat = async (gorselUrl) => {
      const res = await fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${env.CREATOMATE_API_KEY}`,
        },
        body: JSON.stringify({
          template_id:   templateId,
          output_format: 'png',
          modifications: {
            // İsmi olmayan dynamic image element — farklı yollar dene
            '[0].source': gorselUrl,     // index bazlı
            'source':     gorselUrl,     // global
          },
        }),
      })
      const data = await res.json()
      const r = Array.isArray(data) ? data[0] : data
      return { render_id: r.id, kaynak_url: gorselUrl, status: r.status, url: r.url || null }
    }

    // Tüm görseller için render başlat
    const renderler = await Promise.all(gorsel_urls.map(renderBaslat))

    // Render'ları bekle — polling
    const bekle = async (renderId) => {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const res  = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
          headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
        })
        const data = await res.json()
        const r    = Array.isArray(data) ? data[0] : data
        if (r.status === 'succeeded') return r.url
        if (r.status === 'failed')    return null
      }
      return null
    }

    // Tamamlanmış render URL'lerini al
    const sonuclar = await Promise.all(
      renderler.map(async (r) => {
        if (r.url) return { ...r, status: 'succeeded' }
        if (!r.render_id) return { ...r, status: 'failed' }
        const url = await bekle(r.render_id)
        return { ...r, url, status: url ? 'succeeded' : 'failed' }
      })
    )

    // KV'ye kaydet — 30 gün
    if (cacheKey && sonuclar.some(r => r.url)) {
      try {
        await env.HABERLER.put(cacheKey, JSON.stringify(sonuclar), {
          expirationTtl: 60 * 60 * 24 * 30
        })
      } catch(e) {}
    }

    return Response.json({ renderler: sonuclar })

  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
