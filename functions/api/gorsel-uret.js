/**
 * POST /api/gorsel-uret
 * Creatomate ile kayserim.net görseli üretir
 */

const SABLON = {
  yatay: '8e59d93f-579f-4808-a39b-46d006c3ccd2',
  dikey: 'aad1d3c0-4378-4dd0-8133-93a4b61c28b7',
}

// Kadraj önizleme şablonları — sadece görsel, bant/yazı yok
const KADRAJ_SABLON = {
  yatay: 'd1eb4857-9801-474d-a65b-b7aef4d8cfe5',
  dikey: '0ff5b73d-9639-419d-bafd-2b359faf3ace',
}

// Şablondaki element ID'leri (tarih text elementleri)
// Yatay: track 9 = "99f283bc-..." = tarih text
// Dikey: track 9 = "99f283bc-..." = tarih text
const TARIH_TEXT_ID = {
  yatay: '99f283bc-29cc-42d5-afe4-eb4e0a6de15d',
  dikey: '99f283bc-29cc-42d5-afe4-eb4e0a6de15d',
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, baslik, spot, kategori, tarih, format = 'yatay', kadraj = null, source_id = null, force_refresh = false } = body

    if (!gorsel_url || !baslik) {
      return Response.json({ hata: 'gorsel_url ve baslik zorunlu' }, { status: 400 })
    }

    if (!env.CREATOMATE_API_KEY) {
      return Response.json({ hata: 'CREATOMATE_API_KEY tanımlı değil' }, { status: 500 })
    }

    const sablonId = SABLON[format] || SABLON.yatay
    const tarihStr = tarih || new Date().toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })

    // Kadraj artık { yatay, dikey } objesi — formata göre doğru kadrajı kullan
    const kadrajFmt = kadraj?.[format] || kadraj  // eski tek kadraj uyumluluğu
    const cx = kadrajFmt ? (kadrajFmt.oranX + kadrajFmt.oranW / 2) : 0.5
    const cy = kadrajFmt ? (kadrajFmt.oranY + kadrajFmt.oranH / 2) : 0.5

    const videoMods = {
      'video':            gorsel_url,
      'video.x_anchor':   `${(cx * 100).toFixed(1)}%`,
      'video.y_anchor':   `${(cy * 100).toFixed(1)}%`,
      'video.fit':        'cover',
    }

    const modifications = {
      ...videoMods,
      'baslik':                       baslik,
      'baslikss':                     baslik,
      'spot-baslik':                  spot || '',
      'spot-baslik-ss':               spot || '',
      'kategori':                     (kategori || 'GÜNCEL').toUpperCase(),
      [`${TARIH_TEXT_ID[format] || TARIH_TEXT_ID.yatay}.text`]: tarihStr,
    }

    // KV'de kayıtlı görsel var mı kontrol et (force_refresh ise atla)
    if (source_id && env.HABERLER && !force_refresh) {
      try {
        const kvKey = `gorsel:${source_id}:${format}`
        const kayitli = await env.HABERLER.get(kvKey)
        if (kayitli) {
          return Response.json({ ok: true, url: kayitli, format, cached: true })
        }
      } catch(e) { /* KV hatası — devam et */ }
    }

    const renderRes = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.CREATOMATE_API_KEY}`,
      },
      body: JSON.stringify({
        template_id:   sablonId,
        output_format: 'png',
        modifications,
        webhook_url:   `https://rdr.ist/api/creatomate-webhook`,
        metadata:      source_id ? JSON.stringify({ source_id, format, tip: 'gorsel' }) : undefined,
      }),
    })

    if (!renderRes.ok) {
      const err = await renderRes.text()
      return Response.json({
        hata: `Creatomate başlatma hatası: ${renderRes.status} — ${err}`
      }, { status: 500 })
    }

    const renderData = await renderRes.json()
    const render     = Array.isArray(renderData) ? renderData[0] : renderData

    if (!render?.id) {
      return Response.json({
        hata: 'Render ID alınamadı: ' + JSON.stringify(renderData)
      }, { status: 500 })
    }

    // Polling
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000))

      const checkRes  = await fetch(`https://api.creatomate.com/v1/renders/${render.id}`, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })
      const checkData = await checkRes.json()
      const r2        = Array.isArray(checkData) ? checkData[0] : checkData

      if (r2.status === 'succeeded') {
        // KV'ye kaydet
        if (source_id && env.HABERLER) {
          try {
            await env.HABERLER.put(`gorsel:${source_id}:${format}`, r2.url, { expirationTtl: 60*60*24*30 }) // 30 gün
          } catch(e) { /* KV hatası */ }
        }
        return Response.json({ ok: true, url: r2.url, format })
      }
      if (r2.status === 'failed') {
        return Response.json({
          hata: `Render başarısız: ${r2.error_message || JSON.stringify(r2)}`
        }, { status: 500 })
      }
    }

    return Response.json({ hata: 'Render zaman aşımı (60s)' }, { status: 504 })

  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

/**
 * GET /api/gorsel-uret?kadraj_onizleme=1&gorsel_url=...
 * Kadraj önizleme için hızlı render — sadece görsel, bant/yazı yok
 * Her iki format için paralel render başlatır
 */
export async function onRequestGet({ request, env }) {
  try {
    const url      = new URL(request.url)
    const gorselUrl = url.searchParams.get('gorsel_url')
    const videoUrl  = url.searchParams.get('video_url')   // video varsa öncelikli kullan
    const kaynakUrl = videoUrl || gorselUrl
    if (!kaynakUrl) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })
    if (!env.CREATOMATE_API_KEY) return Response.json({ hata: 'API key yok' }, { status: 500 })

    // Video ise mp4 → Creatomate otomatik kare alır
    // Her iki format için paralel render başlat
    const [yatayRes, dikeyRes] = await Promise.all([
      fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
        body: JSON.stringify({
          template_id: KADRAJ_SABLON.yatay,
          output_format: 'png',
          modifications: { 'video': kaynakUrl },
        }),
      }),
      fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
        body: JSON.stringify({
          template_id: KADRAJ_SABLON.dikey,
          output_format: 'png',
          modifications: { 'video': kaynakUrl },
        }),
      }),
    ])

    const [yatayData, dikeyData] = await Promise.all([yatayRes.json(), dikeyRes.json()])
    const yatayRender = Array.isArray(yatayData) ? yatayData[0] : yatayData
    const dikeyRender = Array.isArray(dikeyData) ? dikeyData[0] : dikeyData

    // Tamamlanana kadar polling
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

    const [yatayUrl, dikeyUrl] = await Promise.all([
      bekle(yatayRender.id),
      bekle(dikeyRender.id),
    ])

    return Response.json({ yatay: yatayUrl, dikey: dikeyUrl })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
