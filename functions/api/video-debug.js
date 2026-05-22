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
    let gorsel = '', video = ''
    for (const enc of node.matchAll(/<enclosure[^>]*/g)) {
      const eUrl  = enc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const eType = enc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      if (!eUrl) continue
      if (eType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(eUrl)) { if (!video) video = eUrl }
      else { if (!gorsel) gorsel = eUrl }
    }
    for (const mc of node.matchAll(/<media:content[^>]*/g)) {
      const mcUrl = mc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const mcType = mc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      const mcMedium = mc[0].match(/\bmedium="([^"]*)"/)?.[1] || ''
      if (!mcUrl) continue
      const isVid = mcType.startsWith('video/') || mcMedium === 'video' || /\.mp4|\.mov|\.webm/i.test(mcUrl)
      if (isVid && !video) video = mcUrl
      else if (!isVid && !gorsel) gorsel = mcUrl
    }
    const isVideo = !!video
    const mediaContent = [...node.matchAll(/<media:content[^>]*/g)].map(m=>m[0].slice(0,150))

    sonuclar.push({
      baslik: bas,
      source_id: link.split('/').pop(),
      encRaw: encRaw.slice(0, 120),
      gorsel: gorsel.slice(0, 80),
      video: video.slice(0, 80),
      isVideo,
      mediaContent,
      rawNode: bas.toLowerCase().includes('deneme') ? node.slice(0,1000) : undefined
    })
  }

  // Sadece video olanları göster
  const videoler = sonuclar.filter(s => s.isVideo)
  return Response.json({ toplam: sonuclar.length, video_sayisi: videoler.length, videoler, hepsi: sonuclar.slice(0,5) })
}
