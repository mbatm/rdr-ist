/**
 * GET /api/oto-isle
 * 1ha RSS'den yeni haberleri otomatik işler ve KV'ye kaydeder.
 * Her dashboard açılışında çağrılır — her seferinde max 3 yeni haber işler.
 *
 * Pipeline:
 *   1ha RSS → yeni item tespiti → Claude SEO paketi → görsel URL → KV kaydet
 *
 * Görsel mantığı:
 *   - 1ha'dan görsel geliyorsa: doğrudan kullan
 *   - Görsel yoksa: FLUX ile üret (REPLICATE_API_KEY gerekli)
 */

// ── RSS parse ──────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const get = (node, tag) => {
    const m = node.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'))
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''
  }
  const attr = (node, tag, attrName) => {
    const m = node.match(new RegExp(`<${tag}[^>]*${attrName}="([^"]*)"`, 'i'))
    return m ? m[1] : ''
  }

  const items = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = re.exec(xml)) !== null) {
    const node = match[1]
    const enc = node.match(/<enclosure[^>]*url="([^"]*)"/)
    const gorsel = enc ? enc[1] : ''
    const link   = get(node, 'link') || ''
    const id     = link.split('-').pop() || String(Date.now())

    items.push({
      source_id:  id,
      source_url: link,
      baslik:     get(node, 'title'),
      icerik:     get(node, 'description').replace(/<[^>]*>/g, '').trim(),
      gorsel,
      kategori:   get(node, 'category') || 'Genel',
      tarih_iso:  new Date(get(node, 'pubDate') || Date.now()).toISOString(),
    })
  }
  return items.filter(i => i.baslik.length > 5)
}

// ── Claude ile SEO paketi üret ─────────────────────────────────────────────
async function claudeIsle(item, apiKey) {
  const prompt = `Bu haberi al ve kayserim.net için tam içerik paketi üret:

Başlık: ${item.baslik}
İçerik: ${item.icerik}
Kategori: ${item.kategori}

Şu JSON yapısını döndür (başka hiçbir şey yazma):
{
  "site_basligi": "max 70 karakter SEO başlık",
  "h1_basligi": "H1 başlığı",
  "meta_description": "max 155 karakter",
  "url_slug": "kisa-slug-tire-ile",
  "optimize_icerik": "H2 başlıklı tam haber min 300 kelime",
  "ozet": "2 cümle özet",
  "instagram": "150-200 karakter emoji hashtag",
  "facebook": "100-150 karakter",
  "x_twitter": "max 230 karakter 2-3 hashtag",
  "youtube_baslik": "max 80 karakter",
  "youtube_aciklama": "250-300 karakter",
  "hedef_kelimeler": ["k1","k2","k3","k4","k5"],
  "kategori": "${item.kategori}",
  "oncelik": "orta",
  "gorsel_prompt": "realistic Turkish news photo prompt in English max 15 words"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'Sen kayserim.net için kıdemli SEO editörüsün. SADECE geçerli JSON döndür.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`)
  const data = await res.json()
  const raw  = data.content?.[0]?.text || '{}'
  const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(clean)
}

// ── FLUX ile görsel üret (görsel yoksa) ────────────────────────────────────
async function fluxGorsel(prompt, apiKey) {
  if (!apiKey) return null
  try {
    const res = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          input: { prompt, width: 1280, height: 720, num_inference_steps: 4, output_format: 'jpg' },
        }),
      }
    )
    const d = await res.json()
    return Array.isArray(d.output) ? d.output[0] : d.output || null
  } catch { return null }
}

// ── Ana handler ─────────────────────────────────────────────────────────────
export async function onRequestGet({ env }) {
  const { HABERLER, ANTHROPIC_API_KEY, RSS_API_KEY, REPLICATE_API_KEY } = env

  try {
    // 1. 1ha RSS çek
    const rssKey = RSS_API_KEY || 'cmp6vldho000210g6tt26pvc5'
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${rssKey}`, {
      headers: { 'User-Agent': 'rdr.ist/1.0' },
    })
    if (!rssRes.ok) return Response.json({ hata: `RSS HTTP ${rssRes.status}` }, { status: 502 })

    const xml    = await rssRes.text()
    const items  = parseRSS(xml).slice(0, 20)

    // 2. KV'deki mevcut haberleri al
    const mevcut     = (await HABERLER.get('liste', 'json')) || []
    const mevcutIds  = new Set(mevcut.map(h => h.source_id).filter(Boolean))

    // 3. Yeni haberleri bul (max 3 — timeout önlemi)
    const yeni = items.filter(i => !mevcutIds.has(i.source_id)).slice(0, 3)

    if (yeni.length === 0) {
      return Response.json({ islendi: 0, mesaj: 'Yeni haber yok' })
    }

    // 4. Her yeni haberi işle
    const islenenler = []
    let liste = [...mevcut]

    for (const item of yeni) {
      try {
        // 4a. Claude SEO paketi
        const seo = await claudeIsle(item, ANTHROPIC_API_KEY)

        // 4b. Görsel belirle
        let gorselUrl = item.gorsel || ''
        if (!gorselUrl && seo.gorsel_prompt && REPLICATE_API_KEY) {
          gorselUrl = (await fluxGorsel(seo.gorsel_prompt, REPLICATE_API_KEY)) || ''
        }

        // 4c. KV kaydı
        const kayit = {
          ...seo,
          source_id:   item.source_id,
          source_url:  item.source_url,
          baslik:      item.baslik,
          icerik:      item.icerik,
          gorsel:      item.gorsel,
          gorsel_url:  gorselUrl,
          kategori:    seo.kategori || item.kategori,
          tarih_iso:   item.tarih_iso,
          kaydedildi:  new Date().toISOString(),
          kayserim_link: '',
          durum:       'islendi',
        }

        liste = [kayit, ...liste.filter(h => h.source_id !== item.source_id)].slice(0, 200)
        await HABERLER.put('liste', JSON.stringify(liste))

        islenenler.push(kayit.url_slug)
      } catch (e) {
        console.error('İşleme hatası:', item.baslik, e.message)
      }
    }

    return Response.json({
      islendi: islenenler.length,
      sluglar: islenenler,
      toplam_kv: liste.length,
    })

  } catch (err) {
    return Response.json({ hata: err.message }, { status: 500 })
  }
}
