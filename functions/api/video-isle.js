/**
 * POST /api/video-isle
 * Body: { video_url, gorsel_url, genislik, yukseklik, baslik, spot, kategori, tarih, source_id, format }
 * format: 'dikey' | 'yatay' | 'her_ikisi'
 */

// Kadraj hesaplama — video kaynağı şablona cover ile sığdırılır
// Odak noktası x_anchor/y_anchor ile belirlenir (varsayılan merkez)
function kadrajHesapla(genislik, yukseklik, sablonW=720, sablonH=1280) {
  // Video boyutları bilinmese de fit:cover ile Creatomate halleder
  // x/y: şablonun merkezi, x_anchor/y_anchor: videonun hangi noktası oraya gelsin
  return {
    'video.width':    '100%',
    'video.height':   '100%',
    'video.x':        '50%',
    'video.y':        '50%',
    'video.x_anchor': '50%',
    'video.y_anchor': '50%',
    'video.fit':      'cover',
  }
}

import { renderHash, cacheGet, cacheSet } from './_render-cache.js'

// Video süresini kontrol et — HEAD request ile Content-Length'ten tahmin
// Tam süre için ffprobe gerekir ama Workers'ta yok; Content-Length / tahmini bit rate
// Alternatif: video URL'den süre başlığı oku (bazı sunucular X-Duration döndürür)
async function videoSureKontrol(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    // X-Duration veya Content-Duration header'ı varsa kullan
    const xDuration = res.headers.get('x-duration') || res.headers.get('x-video-duration')
    if (xDuration) return parseFloat(xDuration)
    
    // Content-Length üzerinden tahmini süre (mp4, ~2 Mbps ortalama bit rate)
    const contentLength = parseInt(res.headers.get('content-length') || '0')
    if (contentLength > 0) {
      const tahminiSure = contentLength / (2 * 1024 * 1024 / 8)  // 2 Mbps
      return tahminiSure
    }
    return 0  // Bilinmiyor — güvenli tarafta kal, Creatomate'e gönder
  } catch { return 0 }
}

// 1ha CDN / Backblaze URL'lerini R2'ye kopyala — Creatomate erişemiyor
async function videoR2Kopyala(url, env) {
  if (!url) return url
  if (url.includes('medya.rdr.ist')) return url
  const sorunlu = ['1ha.com.tr', 'backblazeb2.com', 'cdn.']
  if (!sorunlu.some(d => url.includes(d))) return url
  try {
    const res = await fetch(url)
    if (!res.ok) return url
    const buf = await res.arrayBuffer()
    const ext = url.includes('.mp4') ? 'mp4' : 'jpg'
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

    // Video süresi/boyutu kontrolü — 3 dakikadan uzun (tahminen >45MB) Creatomate'e gönderme
    if (isVideo && video_url_r2) {
      const sureSaniye = await videoSureKontrol(video_url_r2)
      // sureSaniye 0 ise bilinmiyor — boyuta bak (45MB = ~3dk @ 2Mbps)
      const r2Obj = await env.MEDYA.head(video_url_r2.replace('https://medya.rdr.ist/', '')).catch(()=>null)
      const boyutMB = r2Obj ? r2Obj.size / (1024 * 1024) : 0
      const uzunVideo = (sureSaniye > 180) || (sureSaniye === 0 && boyutMB > 45)
      if (uzunVideo) {
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
      const kadrajMods = kadrajHesapla(genislik, yukseklik)
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
