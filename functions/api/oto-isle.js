function parseRSS(xml) {
  const items = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const node = m[1]
    const link = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
    const id   = link.split('/').pop() || link
    const bas  = node.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    const icerik = node.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    const enc  = node.match(/<enclosure[^>]*url="([^"]*)"/)
    const kat  = node.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/)?.[1]?.trim() || 'Genel'
    const dt   = node.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''
    if (bas.length > 5) items.push({
      source_id: id, source_url: link, baslik: bas, icerik,
      gorsel: enc?.[1] || '', kategori: kat,
      tarih_iso: new Date(dt || Date.now()).toISOString()
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
        max_tokens: 2000,
        system: 'Sen kayserim.net SEO editörüsün. Yanıtın SADECE geçerli bir JSON objesi olmalı. Markdown, açıklama veya başka metin kesinlikle yazma.',
        messages: [{ role: 'user', content:
`Haber:
BAŞLIK: ${yeni.baslik.slice(0,150)}
ÖZET: ${yeni.icerik.slice(0,250)}
KATEGORİ: ${yeni.kategori}

Tam olarak şu JSON formatını döndür:
{
  "site_basligi": "kısa SEO başlık",
  "h1_basligi": "H1 başlık",
  "meta_description": "kısa açıklama",
  "url_slug": "url-slug",
  "optimize_icerik": "100 kelimelik haber özeti",
  "ozet": "1 cümle özet",
  "instagram": "instagram paylaşım metni #hashtag",
  "facebook": "facebook paylaşım metni",
  "x_twitter": "twitter metni #hashtag",
  "youtube_baslik": "youtube başlık",
  "youtube_aciklama": "youtube açıklama",
  "hedef_kelimeler": ["kelime1","kelime2","kelime3"],
  "kategori": "${yeni.kategori}",
  "oncelik": "orta",
  "gorsel_prompt": "English photo description"
}`
        }]
      })
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return Response.json({ hata: `Claude ${claudeRes.status}`, detay: err.slice(0,300) })
    }

    const claudeData = await claudeRes.json()
    let rawText = claudeData.content?.[0]?.text || ''

    // Markdown code block varsa temizle
    rawText = rawText.replace(/^```json\s*/,'').replace(/\s*```\s*$/,'').trim()

    // { ile } arasını çıkar
    const start = rawText.indexOf('{')
    const end   = rawText.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      return Response.json({ hata: 'JSON bulunamadi', yanit_uzunluk: rawText.length, yanit_bas: rawText.slice(0,200) })
    }

    let seo
    try {
      seo = JSON.parse(rawText.slice(start, end + 1))
    } catch (e) {
      return Response.json({ hata: 'JSON parse hatasi', detay: e.message, yanit: rawText.slice(0,400) })
    }

    const kayit = {
      ...seo,
      source_id: yeni.source_id, source_url: yeni.source_url,
      baslik: yeni.baslik, icerik: yeni.icerik,
      gorsel: yeni.gorsel, gorsel_url: yeni.gorsel,
      tarih_iso: yeni.tarih_iso, kaydedildi: new Date().toISOString(),
      kayserim_link: '', durum: 'islendi'
    }
    await env.HABERLER.put('liste', JSON.stringify([kayit, ...mevcut].slice(0,200)))

    return Response.json({ islendi: 1, slug: kayit.url_slug, baslik: yeni.baslik })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
