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

function extractJSON(text) {
  // JSON bloğunu bul ve parse et
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  // İlk { ile son } arasını al
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON bulunamadi')
  return JSON.parse(clean.slice(start, end + 1))
}

export async function onRequestGet({ env }) {
  try {
    // 1. RSS çek
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } })
    if (!rssRes.ok) return Response.json({ hata: `RSS ${rssRes.status}` })
    const xml = await rssRes.text()
    const items = parseRSS(xml)

    // 2. Mevcut KV
    const mevcut = (await env.HABERLER.get('liste', 'json')) || []
    const mevcutIds = new Set(mevcut.map(h => h.source_id))

    // 3. İlk yeni item
    const yeni = items.find(i => !mevcutIds.has(i.source_id))
    if (!yeni) return Response.json({ islendi: 0, mesaj: 'Yeni haber yok' })

    // 4. Claude ile SEO paketi (Haiku - hızlı)
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: 'Bir SEO editöründen sadece JSON formatında yanıt döndürmesini istiyoruz. Yanıtın tamamı tek bir JSON objesi olmalı, başka hiçbir şey içermemeli.',
        messages: [{ role: 'user', content:
`Şu haberi işle ve JSON döndür:
Başlık: ${yeni.baslik.slice(0, 200)}
Özet: ${yeni.icerik.slice(0, 300)}

Tam olarak şu JSON formatını kullan:
{
  "site_basligi": "SEO başlık max 70 karakter",
  "h1_basligi": "H1 başlık",
  "meta_description": "meta açıklama max 155 karakter",
  "url_slug": "kisa-url-slug",
  "optimize_icerik": "haber metni min 150 kelime",
  "ozet": "2 cümle özet",
  "instagram": "instagram metni",
  "facebook": "facebook metni",
  "x_twitter": "twitter metni",
  "youtube_baslik": "youtube başlık",
  "youtube_aciklama": "youtube açıklama",
  "hedef_kelimeler": ["kelime1", "kelime2", "kelime3"],
  "kategori": "${yeni.kategori}",
  "oncelik": "orta",
  "gorsel_prompt": "English photo prompt"
}`
        }]
      })
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return Response.json({ hata: `Claude ${claudeRes.status}`, detay: err.slice(0, 200) })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || '{}'

    let seo
    try {
      seo = extractJSON(rawText)
    } catch (parseErr) {
      return Response.json({
        hata: 'JSON parse hatasi',
        detay: parseErr.message,
        claude_yanit: rawText.slice(0, 500)
      })
    }

    // 5. KV kaydet
    const kayit = {
      ...seo,
      source_id: yeni.source_id, source_url: yeni.source_url,
      baslik: yeni.baslik, icerik: yeni.icerik,
      gorsel: yeni.gorsel, gorsel_url: yeni.gorsel,
      tarih_iso: yeni.tarih_iso, kaydedildi: new Date().toISOString(),
      kayserim_link: '', durum: 'islendi'
    }
    await env.HABERLER.put('liste', JSON.stringify([kayit, ...mevcut].slice(0, 200)))

    return Response.json({ islendi: 1, slug: kayit.url_slug, baslik: yeni.baslik })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
