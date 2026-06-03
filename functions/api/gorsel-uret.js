/**
 * POST /api/gorsel-uret
 * Creatomate ile kayserim.net görseli üretir
 */

const SABLON = {
  yatay: '8e59d93f-579f-4808-a39b-46d006c3ccd2',
  dikey: 'aad1d3c0-4378-4dd0-8133-93a4b61c28b7',
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
    const { gorsel_url, baslik, spot, kategori, tarih, format = 'yatay', kadraj = null } = body

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

    // Kadraj varsa odak noktasını ayarla — Creatomate fit:cover ile x_anchor/y_anchor kullanır
    // Kadraj seçilmemişse görsel merkezi varsayılan (50% 50%)
    const cx = kadraj ? (kadraj.oranX + kadraj.oranW / 2) : 0.5  // 0..1
    const cy = kadraj ? (kadraj.oranY + kadraj.oranH / 2) : 0.5  // 0..1

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
