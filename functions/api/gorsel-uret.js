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

import { renderHash, cacheGet, cacheSet } from './_render-cache.js'

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
    const kadrajFmt = kadraj?.[format] ?? kadraj ?? null
    // Yeni format: { x, y }, eski: { oranX, oranY, oranW, oranH }
    const cx = kadrajFmt?.x !== undefined ? kadrajFmt.x
             : kadrajFmt?.oranX !== undefined ? (kadrajFmt.oranX + kadrajFmt.oranW / 2) : 0.5
    const cy = kadrajFmt?.y !== undefined ? kadrajFmt.y
             : kadrajFmt?.oranY !== undefined ? (kadrajFmt.oranY + kadrajFmt.oranH / 2) : 0.5

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

    // Hash tabanlı cache — aynı içerik (görsel+başlık+kadraj) tekrar render edilmez
    const renderHashKey = renderHash(sablonId, modifications)
    if (!force_refresh && env.HABERLER) {
      const cachedUrl = await cacheGet(env, renderHashKey)
      if (cachedUrl) return Response.json({ ok: true, url: cachedUrl, format, cached: true })
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
        // Hash cache'e kaydet — gelecekte aynı içerik tekrar render edilmez
        await cacheSet(env, renderHashKey, r2.url, { template: sablonId, format })
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
    const gorselUrl  = url.searchParams.get('gorsel_url')
    const videoUrl   = url.searchParams.get('video_url')   // video varsa öncelikli kullan
    const fmtParam   = url.searchParams.get('fmt')         // 'yatay' | 'dikey' — hangi render alınacak
    const kaynakUrl  = videoUrl || gorselUrl
    if (!kaynakUrl) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })
    if (!env.CREATOMATE_API_KEY) return Response.json({ hata: 'API key yok' }, { status: 500 })

    const cacheKey = fmtParam ? `${kaynakUrl}:${fmtParam}` : kaynakUrl

    // KV cache — aynı kaynak için tekrar render yok (7 gün)
    if (env.HABERLER) {
      try {
        const kvKey  = `kadraj_onizleme:${cacheKey}`
        const cached = await env.HABERLER.get(kvKey, 'json')
        if (cached?.yatay && cached?.dikey) {
          return Response.json(cached)
        }
      } catch(e) { /* devam */ }
    }

    // fmtParam'a göre sadece ilgili formatı render al
    // yatay kaynak → yatay render, dikey kaynak → dikey render
    const renderYatay = !fmtParam || fmtParam === 'yatay'
    const renderDikey = !fmtParam || fmtParam === 'dikey'

    const bekle = async (renderId) => {
      if (!renderId) return null
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

    const renderIste = async (sablonId) => {
      const res = await fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
        body: JSON.stringify({ template_id: sablonId, output_format: 'png', modifications: { 'video': kaynakUrl } }),
      })
      const data = await res.json()
      const r    = Array.isArray(data) ? data[0] : data
      return r.id ? bekle(r.id) : null
    }

    const [yatayUrl, dikeyUrl] = await Promise.all([
      renderYatay ? renderIste(KADRAJ_SABLON.yatay) : Promise.resolve(null),
      renderDikey ? renderIste(KADRAJ_SABLON.dikey) : Promise.resolve(null),
    ])

    const sonuc = { yatay: yatayUrl, dikey: dikeyUrl }

    // KV'ye yaz
    if (env.HABERLER && (yatayUrl || dikeyUrl)) {
      try {
        const kvKey = `kadraj_onizleme:${cacheKey}`
        await env.HABERLER.put(kvKey, JSON.stringify(sonuc), { expirationTtl: 60 * 60 * 24 * 10 })
      } catch(e) { /* devam */ }
    }

    return Response.json(sonuc)
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
