/**
 * POST /api/galeri-olustur — render başlatır, render ID döner
 * GET  /api/galeri-olustur?render_ids=id1,id2 — render durumu sorgular
 */

const KAPAK_SABLON = {
  kayserim: { video: '83f5dad5-6c5b-4365-8e99-3a1b0e09c1ba', foto: 'a5c30525-fd42-4a19-9fe5-2703e9f98753' },
  radar:    { video: '6d6855af-c990-4976-80c2-5e858bc3b0ff', foto: '7edeb24b-3ecc-47b7-9d1d-0ad32ea553af' },
}
const GALERI_SABLON = {
  kayserim: { foto: 'c6851b61-3d03-4959-a3ea-892d851d1b25', video: '7edeb24b-3ecc-47b7-9d1d-0ad32ea553af' },
  radar:    { foto: 'fbded9e2-2538-4045-80d6-6df2c8c60a94', video: '4554643a-6222-4e00-9387-6264c33a3eee' },
}

const tarihStr = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

const r2Kopyala = async (url, env, ad) => {
  if (!url || !env.MEDYA) return url
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const buf = await res.arrayBuffer()
    const ext = url.includes('.mp4') ? 'mp4' : 'png'
    const key = `galeri/${ad}.${ext}`
    await env.MEDYA.put(key, buf, { httpMetadata: { contentType: ext === 'mp4' ? 'video/mp4' : 'image/png' } })
    return `https://medya.rdr.ist/${key}`
  } catch { return url }
}

import { renderHash, cacheGet, cacheSet } from './_render-cache.js'

const renderBaslat = async (templateId, modifications, apiKey, fmt = 'png', env = null) => {
  // Hash cache kontrolü
  if (env) {
    const hash = renderHash(templateId, modifications)
    const cached = await cacheGet(env, hash)
    if (cached) return { render_id: 'cached', hash, cachedUrl: cached }
  }
  const res  = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ template_id: templateId, output_format: fmt, modifications }),
  })
  const data = await res.json()
  const r    = Array.isArray(data) ? data[0] : data
  if (!r.id) return null
  const hash = renderHash(templateId, modifications)
  return { render_id: r.id, fmt, hash }
}

// ── GET: render durumu sorgula ─────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url        = new URL(request.url)
  const renderIds  = url.searchParams.get('render_ids')?.split(',').filter(Boolean) || []
  const sourceId   = url.searchParams.get('source_id')
  const apiKey     = env.CREATOMATE_API_KEY

  if (!renderIds.length) return Response.json({ hata: 'render_ids gerekli' }, { status: 400 })

  const sonuclar = await Promise.all(renderIds.map(async id => {
    const res  = await fetch(`https://api.creatomate.com/v1/renders/${id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    const data = await res.json()
    const r    = Array.isArray(data) ? data[0] : data
    return { render_id: id, status: r.status, url: r.url || null }
  }))

  const hepsiTamam = sonuclar.every(r => r.status === 'succeeded')
  const biriHata   = sonuclar.some(r => r.status === 'failed')

  // Tüm renderlar bitti — R2'ye kopyala
  if (hepsiTamam) {
    const ts = Date.now()
    const r2Urls = await Promise.all(sonuclar.map((r, i) =>
      r2Kopyala(r.url, env, `${sourceId || 'galeri'}_${ts}_${i}`)
    ))
    return Response.json({ ok: true, tamam: true, renderlar: sonuclar.map((r, i) => ({
      render_id: r.render_id, url: r2Urls[i], kaynak_url: r.url
    })) })
  }

  return Response.json({ ok: true, tamam: false, hata: biriHata, renderlar: sonuclar })
}

// ── POST: render başlat ────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token') || request.headers.get('X-API-Key')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici && token !== env.RSS_API_KEY)
    return Response.json({ hata: 'Geçersiz token' }, { status: 401 })
  if (!env.CREATOMATE_API_KEY)
    return Response.json({ hata: 'Creatomate API key yok' }, { status: 500 })

  try {
    const { kaynak='kayserim', medya_tipi='foto', kapak, diger=[], baslik='',
            spot_baslik='', kategori='GÜNCEL', tarih, source_id } = await request.json()

    if (!kapak?.url) return Response.json({ hata: 'kapak.url gerekli' }, { status: 400 })

    const apiKey    = env.CREATOMATE_API_KEY
    const tarihYazi = tarih || tarihStr()
    const kapakTpl  = KAPAK_SABLON[kaynak]?.[medya_tipi] || KAPAK_SABLON[kaynak]?.foto
    const kapakFmt  = medya_tipi === 'video' ? 'mp4' : 'png'

    const kapakMods = kaynak === 'kayserim'
      ? { 'Video-79K.source': kapak.url, 'video.source': kapak.url,
          'baslik.text': baslik, 'baslikss.text': baslik,
          'spot-baslik.text': spot_baslik, 'spot-baslik-ss.text': spot_baslik,
          'kategori.text': kategori, 'tarih.text': tarihYazi }
      : { 'video.source': kapak.url, 'baslik.text': baslik,
          'baslik-X6C.text': baslik, 'tarih.text': tarihYazi }

    // Tüm render'ları başlat (beklemeden)
    const [kapakR, ...digerR] = await Promise.all([
      renderBaslat(kapakTpl, kapakMods, apiKey, kapakFmt),
      ...diger.map(g => {
        const tpl = GALERI_SABLON[kaynak]?.[g.tip === 'video' ? 'video' : 'foto']
        const fmt = g.tip === 'video' ? 'mp4' : 'png'
        return renderBaslat(tpl, { '16dbfe06-e201-4aa4-887b-f166f95832af': g.url }, apiKey, fmt)
      }),
    ])

    // Render ID'leri döndür — frontend poll edecek
    return Response.json({
      ok: true,
      bekliyor: true,
      source_id,
      kapak_tip: medya_tipi,
      kaynak_kapak: kapak.url,
      kaynak_diger: diger.map(g => g.url),
      renderlar: [
        kapakR ? { render_id: kapakR.render_id, tip: 'kapak', fmt: kapakFmt } : null,
        ...digerR.map((r, i) => r ? { render_id: r.render_id, tip: 'diger', index: i, fmt: diger[i]?.tip === 'video' ? 'mp4' : 'png' } : null)
      ].filter(Boolean),
    })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
