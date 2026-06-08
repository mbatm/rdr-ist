/**
 * GET /api/video-duzelt
 * KV'deki tüm video haberlerini düzeltir:
 * 1. gorsel alanı mp4 ise video'ya taşır, gorsel'i temizler
 * 2. RSS'teki video haberlerin video alanını doldurur
 * cron-job.org ile günde 1 kez çalıştırılabilir.
 */
export async function onRequestGet({ env }) {
  try {
    let liste = (await env.HABERLER.get('liste', 'json')) || []
    let guncellenen = 0

    // 1. KV'de gorsel alanı mp4 olan haberler → video'ya taşı
    for (const h of liste) {
      const gorselMp4 = h.gorsel?.match(/\.mp4|\.mov|\.webm/i)
      if (gorselMp4) {
        if (!h.video) h.video = h.gorsel
        h.gorsel     = ''
        h.gorsel_url = ''
        guncellenen++
      }
    }

    // 2. RSS'ten video URL'lerini al ve boş olan KV kayıtlarını güncelle
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } })

    if (rssRes.ok) {
      const xml = await rssRes.text()
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
        const node    = m[1]
        const link    = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
        const id      = link.split('/').pop() || link
        const encUrl  = node.match(/<enclosure[^>]*\burl="([^"]*)"/)?.[1] || ''
        const encType = node.match(/<enclosure[^>]*\btype="([^"]*)"/)?.[1] || ''
        const isVideo = encType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(encUrl)

        if (!isVideo || !encUrl) continue

        const idx = liste.findIndex(h => h.source_id === id)
        if (idx !== -1 && !liste[idx].video) {
          liste[idx].video = encUrl
          guncellenen++
        }
      }
    }

    if (guncellenen > 0) {
      await env.HABERLER.put('liste', JSON.stringify(liste))
    }

    const videoSayisi = liste.filter(h => h.video).length

    // Bekleyen IG container'larını publish et
    let yayinlanan = 0
    try {
      const containerKeys = await env.HABERLER.list({ prefix: 'ig_container:' })
      for (const key of (containerKeys.keys || [])) {
        try {
          const containerId = key.name.replace('ig_container:', '')
          const data = await env.HABERLER.get(key.name, 'json')
          if (!data) continue
          const statusRes = await fetch(
            `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${data.pageToken}`
          )
          const statusData = await statusRes.json()
          if (statusData.status_code === 'FINISHED') {
            const pRes = await fetch(`https://graph.facebook.com/v21.0/${data.igId}/media_publish`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ creation_id: containerId, access_token: data.pageToken })
            })
            const pData = await pRes.json()
            if (pData.id) { await env.HABERLER.delete(key.name); yayinlanan++ }
          } else if (statusData.status_code === 'ERROR') {
            await env.HABERLER.delete(key.name)
          }
        } catch {}
      }
    } catch {}

    return Response.json({
      guncellenen,
      yayinlanan,
      toplam_video_haber: videoSayisi,
      toplam_kayit: liste.length
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
