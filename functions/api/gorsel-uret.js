/**
 * POST /api/gorsel-uret
 * Creatomate ile kayserim.net görseli üretir
 * Cloudflare Pages Function — setTimeout yok, fetch polling kullanılır
 */

const SABLON = {
  yatay: '8e59d93f-579f-4808-a39b-46d006c3ccd2',
  dikey: 'aad1d3c0-4378-4dd0-8133-93a4b61c28b7',
}

// Cloudflare Workers'da setTimeout çalışmaz, scheduler.wait kullanılır
async function bekle(ms) {
  return new Promise(resolve => {
    // Cloudflare'de setTimeout bazen çalışıyor, bazen değil
    // waitUntil olmadığı için direkt polling yapıyoruz
    const start = Date.now()
    const check = () => { if (Date.now() - start >= ms) resolve(); else setTimeout(check, 100) }
    setTimeout(resolve, ms)
  })
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, baslik, spot, kategori, tarih, format = 'yatay' } = body

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

    // Polling — Cloudflare max 30 saniye CPU süresi var
    // Her 3 saniyede bir kontrol, max 25 deneme = ~75 saniye
    // Cloudflare Pages'da gerçek bekleme için fetch'i zincirleyelim
    for (let i = 0; i < 20; i++) {
      // Kısa fetch ile bekle (network latency kullanır)
      await fetch('https://api.creatomate.com/v1/renders/' + render.id, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })

      await new Promise(r => setTimeout(r, 3000))

      const checkRes  = await fetch('https://api.creatomate.com/v1/renders/' + render.id, {
        headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
      })
      const checkData = await checkRes.json()
      const r2        = Array.isArray(checkData) ? checkData[0] : checkData

      if (r2.status === 'succeeded') {
        return Response.json({ ok: true, url: r2.url, format })
      }
      if (r2.status === 'failed') {
        return Response.json({
          hata: `Render başarısız: ${JSON.stringify(r2)}`
        }, { status: 500 })
      }
      // planned / rendering → devam et
    }

    return Response.json({ hata: 'Render zaman aşımı (60s)' }, { status: 504 })

  } catch (e) {
    return Response.json({ hata: e.message + '\n' + e.stack }, { status: 500 })
  }
}
