/**
 * GET /api/video-duzelt
 * RSS'te video olan ama KV'de video alanı boş olan haberleri bulup yeniden işler
 */
export async function onRequestGet({ env }) {
  try {
    // 1. Mevcut RSS'i çek
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } })
    const xml = await rssRes.text()

    // 2. RSS'teki video haberleri bul
    const videoHaberler = []
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
      const node    = m[1]
      const link    = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
      const id      = link.split('/').pop() || link
      const encUrl  = node.match(/<enclosure[^>]*\burl="([^"]*)"/)?.[1] || ''
      const encType = node.match(/<enclosure[^>]*\btype="([^"]*)"/)?.[1] || ''
      const isVideo = encType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(encUrl)
      if (isVideo && encUrl) videoHaberler.push({ id, url: encUrl, link })
    }

    if (!videoHaberler.length) {
      return Response.json({ mesaj: 'RSS\'te video haber yok', islendi: 0 })
    }

    // 3. KV'deki listeyi al
    let liste = (await env.HABERLER.get('liste', 'json')) || []

    // 4. Video URL'si boş olan KV haberlerini güncelle
    let guncellenen = 0
    for (const vh of videoHaberler) {
      const idx = liste.findIndex(h => h.source_id === vh.id)
      if (idx !== -1) {
      // video alanı boşsa doldur
      if (!liste[idx].video) {
        liste[idx].video = vh.url
        guncellenen++
      }
      // gorsel alanı mp4 ise temizle
      if (liste[idx].gorsel?.match(/\.mp4|\.mov|\.webm/i)) {
        liste[idx].gorsel     = ''
        liste[idx].gorsel_url = ''
        if (!liste[idx].video) guncellenen++
      }
      } else if (idx === -1) {
        // KV'de yok — source_id'yi sil ki oto-isle yeniden işlesin
        // (yeni haber olarak gelecek)
      }
    }

    if (guncellenen > 0) {
      await env.HABERLER.put('liste', JSON.stringify(liste))
    }

    return Response.json({
      rss_video_sayisi: videoHaberler.length,
      guncellenen,
      video_haberler: videoHaberler.map(v => ({ id: v.id, url: v.url }))
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
