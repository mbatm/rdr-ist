/**
 * POST /api/video-isle
 * Body: { video_url, gorsel_url, genislik, yukseklik, baslik, spot, kategori, tarih, source_id, format }
 * format: 'dikey' | 'yatay' | 'her_ikisi'
 */

// Kadraj hesaplama — video kaynağı şablona cover ile sığdırılır
// Video kadraj — cover + y_anchor:20% her iki format için
// Üstten %20 sabit → kafalar kesilmez, en boy oranı bozulmaz
function kadrajHesapla(genislik, yukseklik, format) {
  return {
    'video.width':    '100%',
    'video.height':   '100%',
    'video.x':        '50%',
    'video.y':        '50%',
    'video.x_anchor': '50%',
    'video.y_anchor': '20%',
    'video.fit':      'cover',
  }
}

import { renderHash, cacheGet, cacheSet } from './_render-cache.js'

// MP4 dosyasından gerçek süreyi oku — moov/mvhd atom'dan
// İlk 512KB yeterli (moov genellikle başta olur) ama bazı dosyalarda sonda
async function videoSureKontrol(url) {
  try {
    // Önce HEAD ile dosya boyutunu al
    const head = await fetch(url, { method: 'HEAD' })
    const fileSize = parseInt(head.headers.get('content-length') || '0')

    // İlk 512KB oku — moov atom genellikle başta
    const res  = await fetch(url, { headers: { Range: 'bytes=0-524287' } })
    const buf  = await res.arrayBuffer()
    const view = new DataView(buf)

    const sure = mp4SureOku(view, buf.byteLength)
    if (sure > 0) return sure

    // moov sonda olabilir — son 512KB oku
    if (fileSize > 524288) {
      const start = Math.max(0, fileSize - 524288)
      const res2  = await fetch(url, { headers: { Range: `bytes=${start}-${fileSize - 1}` } })
      const buf2  = await res2.arrayBuffer()
      const view2 = new DataView(buf2)
      const sure2 = mp4SureOku(view2, buf2.byteLength)
      if (sure2 > 0) return sure2
    }

    return 0  // Bulunamadı
  } catch { return 0 }
}

// MP4 atom'larını tarayarak mvhd'den süre çıkar
function mp4SureOku(view, length) {
  try {
    let offset = 0
    while (offset + 8 < length) {
      const size = view.getUint32(offset, false)
      if (size < 8 || offset + size > length) break

      const type = String.fromCharCode(
        view.getUint8(offset+4), view.getUint8(offset+5),
        view.getUint8(offset+6), view.getUint8(offset+7)
      )

      if (type === 'mvhd') {
        // mvhd version 0: offset+8=version, +12=creation, +16=modification, +20=timescale, +24=duration
        // mvhd version 1: offset+8=version, +12=creation(8), +20=modification(8), +28=timescale(4), +32=duration(8)
        const version = view.getUint8(offset + 8)
        if (version === 0) {
          const timescale = view.getUint32(offset + 20, false)
          const duration  = view.getUint32(offset + 24, false)
          if (timescale > 0) return duration / timescale
        } else if (version === 1) {
          const timescale = view.getUint32(offset + 28, false)
          // duration 64-bit — yüksek 32 bit yeterince büyük değilse sadece düşük 32 bit
          const durationHi = view.getUint32(offset + 32, false)
          const durationLo = view.getUint32(offset + 36, false)
          const duration   = durationHi === 0 ? durationLo : durationHi * 4294967296 + durationLo
          if (timescale > 0) return duration / timescale
        }
        return 0
      }

      // Container atom'larına gir (moov, trak, mdia, minf, stbl)
      if (['moov','trak','mdia','minf','stbl','udta'].includes(type)) {
        const inner = mp4SureOku(new DataView(view.buffer, view.byteOffset + offset + 8, size - 8), size - 8)
        if (inner > 0) return inner
      }

      offset += size
    }
  } catch {}
  return 0
}

// 1ha CDN / Backblaze URL'lerini R2'ye kopyala — Creatomate erişemiyor
async function videoR2Kopyala(url, env) {
  if (!url) return url
  if (!url || url.includes('medya.rdr.ist')) return url
  const sorunlu = ['1ha.com.tr', 'backblazeb2.com', 'cdn.']
  if (!sorunlu.some(d => url.includes(d))) return url
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const buf = await res.arrayBuffer()
    const ext = (url || '').includes('.mp4') ? 'mp4' : 'jpg'
    const key = `video_isle/${Date.now()}.${ext}`
    await env.MEDYA.put(key, buf, { httpMetadata: { contentType: ext === 'mp4' ? 'video/mp4' : 'image/jpeg' } })
    return `https://medya.rdr.ist/${key}`
  } catch { return url }
}

export async function onRequestPost({ request, env }) {
  try {
    const {
      video_url, gorsel_url,
      genislik, yukseklik,
      baslik, spot, kategori, tarih, source_id,
      format = 'dikey', kadraj = null
    } = await request.json()

    if (!video_url && !gorsel_url)
      return Response.json({ hata: 'video_url veya gorsel_url gerekli' }, { status: 400 })

    const apiKey = env.CREATOMATE_API_KEY
    if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

    // 1ha CDN / Backblaze URL'leri R2'ye kopyala — Creatomate erişemiyor
    const video_url_r2  = video_url  ? await videoR2Kopyala(video_url, env)  : null
    const gorsel_url_r2 = gorsel_url ? await videoR2Kopyala(gorsel_url, env) : null

    const mediaUrl  = video_url_r2 || gorsel_url_r2 || video_url || gorsel_url
    const isVideo   = !!video_url_r2

    // Video süresi kontrolü — 3 dakikadan uzun videoları Creatomate'e gönderme
    if (isVideo && video_url_r2) {
      const sureSaniye = await videoSureKontrol(video_url_r2)
      console.log(`[video-isle] Video süresi: ${sureSaniye.toFixed(1)}sn (${(sureSaniye/60).toFixed(1)}dk)`)
      if (sureSaniye > 0 && sureSaniye > 180) {
        // Creatomate'e gönderme — vidoyu olduğu gibi döndür
        return Response.json({
          ok: true,
          renders: [{
            format,
            render_id: `direkt_${Date.now()}`,
            status:    'succeeded',
            url:       video_url_r2,
            tip:       'video',
            direkt:    true,
            sure_sn:   sureSaniye,
          }]
        })
      }
    }
    const tarihStr  = tarih    || new Date().toLocaleDateString('tr-TR')
    const katStr    = (kategori || 'GÜNCEL').toUpperCase()
    const baslikStr = (baslik   || '').slice(0, 120)
    const spotStr   = spot      || ''

    // Şablonlar
    const TEMPLATES = {
      dikey_video:  'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
      yatay_video:  '438ee267-ad53-4627-8126-e50ffb30f395',
      dikey_gorsel: 'd8655c6b-e08d-45e4-8277-64b074164ac6', // kayserim.net görsel şablonu
    }

    const renders = []
    const formatlar = format === 'her_ikisi' ? ['dikey', 'yatay'] : [format]

    for (const fmt of formatlar) {
      // Görsel ise sadece dikey, yatay şablon yok
      if (!isVideo && fmt === 'yatay') continue

      // Kadraj — her format için ayrı odak noktası
      const kadrajMods = kadrajHesapla(genislik, yukseklik, fmt)
      const kadrajFmt  = kadraj?.[fmt] ?? null
      if (kadrajFmt?.x !== undefined) {
        // Yeni format: { x, y } — doğrudan merkez koordinat
        kadrajMods['video.x_anchor'] = `${(kadrajFmt.x * 100).toFixed(1)}%`
        kadrajMods['video.y_anchor'] = `${(kadrajFmt.y * 100).toFixed(1)}%`
      } else if (kadrajFmt?.oranX !== undefined) {
        // Eski format uyumluluğu
        kadrajMods['video.x_anchor'] = `${((kadrajFmt.oranX + kadrajFmt.oranW/2) * 100).toFixed(1)}%`
        kadrajMods['video.y_anchor'] = `${((kadrajFmt.oranY + kadrajFmt.oranH/2) * 100).toFixed(1)}%`
      }

      const baseMods = {
        'video.source':        mediaUrl,
        'baslik.text':         baslikStr,
        'baslikss.text':       baslikStr,
        'spot-baslik.text':    spotStr,
        'spot-baslik-ss.text': spotStr,
        'kategori.text':       katStr,
        'tarih.text':          tarihStr,
        ...kadrajMods,
      }

      const templateId = isVideo
        ? (fmt === 'dikey' ? TEMPLATES.dikey_video  : TEMPLATES.yatay_video)
        : TEMPLATES.dikey_gorsel

      const outputFormat = isVideo ? 'mp4' : 'jpg'

      // Hash cache — aynı video+başlık+kadraj tekrar render edilmez
      const vHash = renderHash(templateId, baseMods)
      const vCached = await cacheGet(env, vHash)
      if (vCached) {
        renders.push({ format: fmt, render_id: 'cached', status: 'succeeded', url: vCached, tip: isVideo ? 'video' : 'gorsel', cached: true })
        continue
      }

      const res = await fetch(
        isVideo
          ? 'https://api.creatomate.com/v2/renders'
          : 'https://api.creatomate.com/v1/renders',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            template_id:   templateId,
            output_format: outputFormat,
            ...(isVideo ? { frame_rate: 30 } : {}),
            modifications: baseMods,
            webhook_url: `https://rdr.ist/api/creatomate-webhook`,
            metadata:    source_id ? JSON.stringify({ source_id, format: fmt, tip: 'video' }) : undefined,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })
      const render = Array.isArray(data) ? data[0] : data
      // Render anında tamamlandıysa hash cache'e kaydet
      if (render.url) await cacheSet(env, vHash, render.url, { template: templateId, format: fmt })
      renders.push({
        format:    fmt,
        render_id: render.id,
        status:    render.status || (render.url ? 'succeeded' : 'planned'),
        url:       render.url || null,
        tip:       isVideo ? 'video' : 'gorsel',
        hash:      vHash,
      })
    }

    return Response.json({ ok: true, renders })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
