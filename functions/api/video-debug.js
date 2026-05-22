export async function onRequestGet({ env }) {
  const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
    { headers: { 'User-Agent': 'rdr.ist/1.0' } })
  const xml = await rssRes.text()

  const sonuclar = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const node    = m[1]
    const link    = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
    const bas     = node.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.replace(/<[^>]*>/g,'').trim().slice(0,60) || ''
    
    const encRaw  = node.match(/<enclosure[^>]*/)?.[0] || 'YOK'
    const encUrl  = node.match(/<enclosure[^>]*\burl="([^"]*)"/)?.[1] || ''
    const encType = node.match(/<enclosure[^>]*\btype="([^"]*)"/)?.[1] || ''
    const mediaContent = [...node.matchAll(/<media:content[^>]*/g)].map(m=>m[0].slice(0,120))
    const isVideo = encType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(encUrl)

    sonuclar.push({
      baslik: bas,
      source_id: link.split('/').pop(),
      encRaw: encRaw.slice(0, 120),
      encUrl: encUrl.slice(0, 80),
      encType,
      isVideo,
      mediaContent,
      // "deneme" için tam raw node
      rawNode: bas.toLowerCase().includes('deneme') ? node.slice(0,800) : undefined
    })
  }

  // Sadece video olanları göster
  const videoler = sonuclar.filter(s => s.isVideo)
  return Response.json({ toplam: sonuclar.length, video_sayisi: videoler.length, videoler, hepsi: sonuclar.slice(0,5) })
}
