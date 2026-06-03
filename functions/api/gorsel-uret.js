/**
 * POST /api/gorsel-uret
 * Creatomate ile kayserim.net görseli üretir
 */

const SABLON = {
  yatay: '8e59d93f-579f-4808-a39b-46d006c3ccd2',
  dikey: 'aad1d3c0-4378-4dd0-8133-93a4b61c28b7',
}

export async function onRequestPost({ request, env }) {
  try {
    const { gorsel_url, baslik, spot, kategori, tarih, format = 'yatay' } = await request.json()
    if (!gorsel_url || !baslik) return Response.json({ hata: 'gorsel_url ve baslik zorunlu' }, { status: 400 })

    const sablonId = SABLON[format] || SABLON.yatay
    const tarihStr = tarih || new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })

    const modifications = {
      'video':           gorsel_url,
      'baslik':          baslik,
      'baslikss':        baslik,
      'spot-baslik':     spot || '',
      'spot-baslik-ss':  spot || '',
      'kategori':        (kategori || 'GÜNCEL').toUpperCase(),
      'tarih':           tarihStr,
    }

    // Render başlat
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
      return Response.json({ hata: `Creatomate: ${renderRes.status} — ${err}` }, { status: 500 })
    }

    const renderData = await renderRes.json()
    const render     = Array.isArray(renderData) ? renderData[0] : renderData

    // Tamamlanana kadar bekle (max 60 saniye)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const checkRes  = await fetch(`https://api.creatomate.com/v1/renders/${render.id}`, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })
      const checkData = await checkRes.json()
      const r2        = Array.isArray(checkData) ? checkData[0] : checkData

      if (r2.status === 'succeeded') return Response.json({ ok: true, url: r2.url, format })
      if (r2.status === 'failed')    return Response.json({ hata: 'Render başarısız: ' + r2.error }, { status: 500 })
    }

    return Response.json({ hata: 'Render zaman aşımı' }, { status: 504 })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
