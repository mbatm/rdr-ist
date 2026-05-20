function parseRSS(xml) {
  const items = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const node = m[1]
    const link = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
    const id   = link.split('/').pop() || link
    const bas  = node.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
                   ?.replace(/<[^>]*>/g,'').trim() || ''
    const icerik = node.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
                   ?.replace(/<[^>]*>/g,'').trim() || ''
    const enc  = node.match(/<enclosure[^>]*url="([^"]*)"/)
    const kat  = node.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/)?.[1]?.trim() || 'Genel'
    const dt   = node.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''
    if (bas.length > 5) items.push({
      source_id: id, source_url: link,
      baslik: bas, icerik, gorsel: enc?.[1] || '',
      kategori: kat, tarih_iso: new Date(dt || Date.now()).toISOString()
    })
  }
  return items
}

export async function onRequestGet({ env }) {
  try {
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } })
    if (!rssRes.ok) return Response.json({ hata: `RSS ${rssRes.status}` })
    const xml = await rssRes.text()
    const items = parseRSS(xml)

    const mevcut = (await env.HABERLER.get('liste', 'json')) || []
    const mevcutIds = new Set(mevcut.map(h => h.source_id))

    const yeni = items.find(i => !mevcutIds.has(i.source_id))
    if (!yeni) return Response.json({ islendi: 0, mesaj: 'Yeni haber yok' })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'Sen kayserim.net icin SEO editorusun. SADECE gecerli JSON dondur.',
        messages: [{ role: 'user', content:
`Baslik: ${yeni.baslik}
Icerik: ${yeni.icerik.slice(0,500)}
Kategori: ${yeni.kategori}

Asagidaki JSON yapisini dondur (baska hicbir sey yazma):
{"site_basligi":"max 70 kar","h1_basligi":"h1","meta_description":"max 155 kar","url_slug":"slug","optimize_icerik":"min 200 kelime haber","ozet":"2 cumle","instagram":"emoji hashtag 150 kar","facebook":"100 kar","x_twitter":"230 kar","youtube_baslik":"80 kar","youtube_aciklama":"250 kar","hedef_kelimeler":["k1","k2","k3"],"kategori":"${yeni.kategori}","oncelik":"orta","gorsel_prompt":"news photo prompt English 10 words"}`
        }]
      })
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return Response.json({ hata: `Claude ${claudeRes.status}`, detay: errText.slice(0,200) })
    }
    const claudeData = await claudeRes.json()
    const raw = claudeData.content?.[0]?.text || '{}'
    const seo = JSON.parse(raw.replace(/```json\n?|\n?```/g,'').trim())

    const kayit = {
      ...seo, source_id: yeni.source_id, source_url: yeni.source_url,
      baslik: yeni.baslik, icerik: yeni.icerik,
      gorsel: yeni.gorsel, gorsel_url: yeni.gorsel,
      tarih_iso: yeni.tarih_iso, kaydedildi: new Date().toISOString(),
      kayserim_link: '', durum: 'islendi'
    }
    const yeniListe = [kayit, ...mevcut].slice(0, 200)
    await env.HABERLER.put('liste', JSON.stringify(yeniListe))

    return Response.json({ islendi: 1, slug: kayit.url_slug, baslik: yeni.baslik })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
