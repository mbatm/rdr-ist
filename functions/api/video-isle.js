/**
 * POST /api/video-isle
 * Body: { video_url, gorsel_url, genislik, yukseklik, baslik, spot, kategori, tarih, source_id, format }
 * format: 'dikey' | 'yatay' | 'her_ikisi'
 */

// Kadraj hesaplama — yükseklik min 1350px, genişlik referans, ortala
function kadrajHesapla(genislik, yukseklik, sablonW=720, sablonH=1280) {
  const gw = genislik  || 1
  const gh = yukseklik || 1
  const oran = gw / gh
  let wPct, hPct
  if (gh >= 1350) {
    const olcekliH = sablonW / oran
    wPct = '100%'
    hPct = `${((olcekliH / sablonH) * 100).toFixed(2)}%`
  } else {
    const gerekliW = 1350 * oran
    wPct = `${((gerekliW / sablonW) * 100).toFixed(2)}%`
    hPct = `${((1350 / sablonH) * 100).toFixed(2)}%`
  }
  return {
    'video.width':    wPct,
    'video.height':   hPct,
    'video.x':        '50%',
    'video.y':        '50%',
    'video.x_anchor': '50%',
    'video.y_anchor': '50%',
    'video.fit':      'cover',
  }
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

    const mediaUrl  = video_url || gorsel_url
    const isVideo   = !!video_url
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

    // Kadraj modifikasyonları
    // Kullanıcı kadrajı varsa merkez noktasını kullan, yoksa otomatik hesapla
    const kadrajMods = kadrajHesapla(genislik, yukseklik)
    if (kadraj) {
      kadrajMods['video.x_anchor'] = `${((kadraj.oranX + kadraj.oranW/2) * 100).toFixed(1)}%`
      kadrajMods['video.y_anchor'] = `${((kadraj.oranY + kadraj.oranH/2) * 100).toFixed(1)}%`
    }
    const kadraj_mods = kadrajMods

    const baseMods = {
      'video.source':        mediaUrl,
      'baslik.text':         baslikStr,
      'baslikss.text':       baslikStr,
      'spot-baslik.text':    spotStr,
      'spot-baslik-ss.text': spotStr,
      'kategori.text':       katStr,
      'tarih.text':          tarihStr,
      ...kadraj_mods,
    }

    const renders = []
    const formatlar = format === 'her_ikisi' ? ['dikey', 'yatay'] : [format]

    for (const fmt of formatlar) {
      // Görsel ise sadece dikey, yatay şablon yok
      if (!isVideo && fmt === 'yatay') continue

      const templateId = isVideo
        ? (fmt === 'dikey' ? TEMPLATES.dikey_video  : TEMPLATES.yatay_video)
        : TEMPLATES.dikey_gorsel

      const outputFormat = isVideo ? 'mp4' : 'jpg'

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
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })
      const render = Array.isArray(data) ? data[0] : data
      renders.push({
        format:    fmt,
        render_id: render.id,
        status:    render.status || (render.url ? 'succeeded' : 'planned'),
        url:       render.url || null,
        tip:       isVideo ? 'video' : 'gorsel',
      })
    }

    return Response.json({ ok: true, renders })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
