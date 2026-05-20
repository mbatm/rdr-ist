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

async function isleHaber(yeni, apiKey) {
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: 'Sen kayserim.net SEO editörüsün. Yanıtın SADECE geçerli bir JSON objesi olmalı. Markdown veya başka metin yazma.',
      messages: [{ role: 'user', content:
`Haber:
BAŞLIK: ${yeni.baslik.slice(0,150)}
ÖZET: ${yeni.icerik.slice(0,250)}
KATEGORİ: ${yeni.kategori}

Şu JSON formatını döndür:
{
  "site_basligi": "SEO başlık max 70 karakter",
  "h1_basligi": "H1 başlık",
  "meta_description": "açıklama max 155 karakter",
  "url_slug": "url-slug",
  "optimize_icerik": "100 kelimelik haber özeti",
  "ozet": "1 cümle özet",
  "instagram": "instagram metni #hashtag",
  "facebook": "facebook metni",
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

  if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}`)
  const data = await claudeRes.json()
  let raw = data.content?.[0]?.text || ''
  raw = raw.replace(/^```json\s*/,'').replace(/\s*```\s*$/,'').trim()
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
  if (s === -1 || e <= s) throw new Error('JSON bulunamadi')
  return JSON.parse(raw.slice(s, e + 1))
}

export async function onRequestGet({ env, request }) {
  try {
    // Kaç haber işleneceğini URL param ile ayarla: ?adet=5
    const url   = new URL(request.url)
    const adet  = Math.min(parseInt(url.searchParams.get('adet') || '3'), 5)

    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } })
    if (!rssRes.ok) return Response.json({ hata: `RSS ${rssRes.status}` })

    const xml    = await rssRes.text()
    const items  = parseRSS(xml)
    let mevcut   = (await env.HABERLER.get('liste', 'json')) || []
    const mevcutIds = new Set(mevcut.map(h => h.source_id))

    // İşlenecek yeni haberler
    const yeniHaberler = items
      .filter(i => !mevcutIds.has(i.source_id))
      .slice(0, adet)

    if (yeniHaberler.length === 0) {
      return Response.json({ islendi: 0, mesaj: 'Yeni haber yok', kv_toplam: mevcut.length })
    }

    const basarili = []
    const hatali   = []

    for (const yeni of yeniHaberler) {
      try {
        const seo = await isleHaber(yeni, env.ANTHROPIC_API_KEY)
        const kayit = {
          ...seo,
          source_id: yeni.source_id, source_url: yeni.source_url,
          baslik: yeni.baslik, icerik: yeni.icerik,
          gorsel: yeni.gorsel, gorsel_url: yeni.gorsel,
          tarih_iso: yeni.tarih_iso, kaydedildi: new Date().toISOString(),
          kayserim_link: '', durum: 'islendi'
        }
        mevcut = [kayit, ...mevcut.filter(h => h.source_id !== yeni.source_id)].slice(0, 200)
        await env.HABERLER.put('liste', JSON.stringify(mevcut))
        basarili.push(kayit.url_slug || yeni.source_id)
      } catch (e) {
        hatali.push({ id: yeni.source_id, hata: e.message })
      }
    }

    return Response.json({
      islendi: basarili.length,
      sluglar: basarili,
      hatali,
      kv_toplam: mevcut.length
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
