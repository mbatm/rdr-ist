/**
 * GET /api/oto-isle
 * 1ha RSS → Claude (Ahrefs keyword stratejisi ile) → KV → rdr.ist/api/feed
 * Hedef: kayserim.net günlük 60.000 ziyaretçi
 */

// ── AHREFS VERİSİNDEN ÇIKARILAN KEYWORD STRATEJİSİ ─────────────────────
// Güncelleme: /api/ahrefs-sync ile KV'den okunur, yoksa bu fallback kullanılır
const STRATEJI_FALLBACK = {
  global: {
    yuksek: ['kayseri son dakika','kayseri haber','kayseri altın fiyatları','kayseri radar'],
    firsat: ['kayseri son dakika haberleri','kayseri olay haber','kayseri trafik kazası son dakika'],
    slug_prefix: 'kayseri-',
  },
  kategori: {
    'Asayiş':  ['kayseri trafik kazası son dakika','kayseri asayiş','kayseri polis haberleri'],
    'Ekonomi': ['kayseri altın fiyatları','kayseri ekonomi','istikbal kayseri'],
    'Güncel':  ['kayseri son dakika','kayseri haber bugün','kayseri gündem'],
    'Kayseri': ['kayseri son dakika','kayseri haber','kayseri radar haber'],
    'Spor':    ['kayserispor son dakika','kayseri spor haberleri'],
    'Siyaset': ['kayseri siyaset','kayseri büyükşehir belediyesi'],
    'default': ['kayseri son dakika','kayseri haber','kayseri güncel'],
  }
}

function buildPrompt(haber, strateji) {
  const kat    = haber.kategori || 'Güncel'
  const katKw  = (strateji.kategori[kat] || strateji.kategori['default']).join(', ')
  const isVideo = !!haber.video

  const videoNot = isVideo ? `

## VİDEO HABER NOTU
Bu haber bir VIDEO içermektedir. İçerik hazırlanırken:
- "Haberi izlemek için tıklayın", "Videolu haber" gibi ifadeler kullan
- YouTube içeriğine özellikle önem ver
- Instagram için "Reels" formatına uygun kısa metin yaz
- gorsel_prompt: video thumbnail tasarımı için açıklama yaz` : ''

  return `Sen kayserim.net için kıdemli SEO editörüsün. Hedef: günlük 60.000 ziyaretçi.

## HABER DİLİ KURALLARI (ZORUNLU)

**Haber metni için:**
- İlk cümle olayın tüm özünü içermeli: Kim, ne, nerede, ne zaman
- Türk haber ajansı dili (AA/DHA): "gözaltına alındı", "yakalandı", "kaldırıldı"
- Spekülasyon YASAK: "olmuş olabilir", "muhtemelen" yazılmaz
- Editöryal yorum YASAK: "önlem alınmalıdır", "dikkat çekilmektedir" yazılmaz
- Dolgu metin YASAK: anlamsız tekrar, genel tavsiye cümleleri yazılmaz
- Sayıları kullan: "35 araç" > "çok sayıda araç"

**Kategori örnekleri:**
- Trafik: "Kaza saat 16.00 sıralarında Mimarsinan OSB'de meydana geldi. [Araç] [sonuç]. Yaralılar [hastane]ye kaldırıldı. Soruşturma başlatıldı."
- Asayiş: "Kayseri'de [birim] tarafından [operasyon] kapsamında [sayı] şüpheli gözaltına alındı."
- Konuşma: "[Unvan Ad Soyad], '[alıntı]' dedi."

**YANLIŞ örnek (bu şekilde YAZMA):**
"Kazada 3 kişi hafif yaralanmıştır. Benzer kazaları önlemek için güvenlik önlemleri alınmalıdır. OSB'de trafik güvenliğine dikkat çekilmektedir."

**DOĞRU örnek (bu şekilde YAZ):**
"Kaza saat 16.00 sıralarında Mimarsinan OSB 1'nci Cadde'de meydana geldi. Araçta bulunan 3 kişi hafif yaralandı. Yaralılar Kayseri Eğitim Araştırma Hastanesi'ne kaldırıldı. Kazayla ilgili soruşturma başlatıldı."

## KRİTİK KURAL — UNVAN VE MAKAM KORUMA
Haberdeki kişi unvanlarını, görev tanımlarını ve yer adı+unvan kombinasyonlarını ASLA değiştirme:
- "Kocasinan Kaymakamı" → olduğu gibi kal (Kayseri Kaymakamı yapma)
- "Melikgazi Belediye Başkanı" → olduğu gibi kal
- İlçe adı + unvan kombinasyonları kişinin görevini tanımlar, SEO için değiştirilemez
- Şahıs adları, kurumlar, resmi unvanlar haberdeki orijinal haliyle kullanılmalı

## HABER BİLGİSİ
Başlık: ${haber.baslik.slice(0,200)}
Özet: ${haber.icerik.slice(0,300)}
Kategori: ${kat}
${isVideo ? 'İçerik Tipi: VİDEO HABER — sosyal medya metinlerine "izle", "videolu haber" ekle' : ''}

## SEO STRATEJİSİ (Ahrefs verisi — hedef: günlük 60K ziyaretçi)
Bu kategori için hedef kelimeler: ${katKw}
- "Kayseri" ilk 3 kelimede geçmeli
- Başlık 55-65 karakter
- URL slug "kayseri-" ile başlamalı

SADECE şu JSON formatını döndür:
{
  "site_basligi": "55-65 karakter, Kayseri içeren SEO başlık",
  "h1_basligi": "H1 başlık",
  "sosyal_baslik": "max 7 kelime, Kayseri ile başlayan sosyal medya başlığı",
  "meta_description": "max 155 karakter, ${katKw.split(',')[0].trim()} içersin",
  "url_slug": "kayseri-ile-baslayan-slug",
  "optimize_icerik": "250-400 kelime, Türk haber ajansı dilinde, gerçek haber metni formatında — spekülasyon ve editöryal yorum olmadan",
  "ozet": "1 cümle, haberin özü",
  "instagram": "Haberi Instagram için yeniden yaz. Kurallar: 1) Kaynak öneklerini kaldır, 2) İLK CÜMLE dikkat çekici ve merak uyandırıcı olsun — Kayseri kelimesini kullanmak zorunda değilsin, 3) Doğal akıcı dil, konuya uygun emoji, 4) 1200-2000 karakter, 5) Sondan önce satır 'Haber detayları kayserim.net\\'te 🔗', 6) Son satırda 6-10 hashtag (#kayseri #kayserihaber ve konuya özel), 7) URL ekleme",
  "facebook": "Dikkat çekici ilk cümle + özet + 1-2 detay. Kayseri kelimesini zorunlu tutma. Konuya uygun emoji. Max 300 karakter. Sonuna konuya özel 2-3 hashtag. Site linki ayrıca eklenir.",
  "x_twitter": "Çarpıcı ve merak uyandırıcı tweet. Kayseri zorunlu değil. Max 230 karakter. 1-2 emoji. Konuya özel 2-3 hashtag. Site linki ayrıca eklenir.",
  "youtube_baslik": "max 80 karakter, arama odaklı",
  "youtube_aciklama": "Haberin tam özeti 250-300 karakter. Sonuna 'Detaylar için: [LINK]' ibaresi eklenecek.",
  "hedef_kelimeler": ["${katKw.split(',')[0].trim()}","kayseri son dakika","kayseri haber"],
  "kategori": "${kat}",
  "oncelik": "orta",
  "gorsel_prompt": "realistic Turkish news photo, Kayseri Turkey, max 12 words",
  "alternatif_basliklar": [
    "Merak uyandıran, soru veya sürpriz içeren 5-8 kelimelik başlık",
    "Rakam veya çarpıcı detay öne çıkaran 5-8 kelimelik başlık",
    "Duygusal bağ kuran veya yerel kimlik vurgulayan 5-8 kelimelik başlık"
  ],
  "optimize_icerik_kwh": "Orijinal metnin ünvanlarını, rakamlarını, özel isimleri değiştirmeden; hedef kelimeleri doğal biçimde metne yedirerek SEO optimize edilmiş 250-400 kelime Türk haber ajansı dili"
}`
}

// ── RSS PARSE ──────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const node = m[1]
    const link = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
    const id   = link.split('/').pop() || link
    const bas  = node.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    const icerik = node.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    const kat  = node.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/)?.[1]?.trim() || 'Genel'
    const dt   = node.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''

    // Tüm enclosure etiketlerini tara (birden fazla olabilir)
    let gorsel = '', video = ''
    for (const enc of node.matchAll(/<enclosure[^>]*/g)) {
      const eUrl  = enc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const eType = enc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      if (!eUrl) continue
      if (eType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(eUrl)) {
        if (!video) video = eUrl
      } else {
        if (!gorsel) gorsel = eUrl
      }
    }

    // media:content'i de tara (bazı RSS'lerde buradan gelir)
    for (const mc of node.matchAll(/<media:content[^>]*/g)) {
      const mcUrl    = mc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const mcType   = mc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      const mcMedium = mc[0].match(/\bmedium="([^"]*)"/)?.[1] || ''
      if (!mcUrl) continue
      const isVid = mcType.startsWith('video/') || mcMedium === 'video' || /\.mp4|\.mov|\.webm/i.test(mcUrl)
      if (isVid && !video) video = mcUrl
      else if (!isVid && !gorsel) gorsel = mcUrl
    }

    // Son çare: description içindeki img
    if (!gorsel && !video) gorsel = node.match(/<img[^>]*src="([^"]*)"/)?.[ 1] || ''
    if (bas.length > 5) items.push({ source_id:id, source_url:link, baslik:bas, icerik, gorsel, video, kategori:kat, tarih_iso: new Date(dt||Date.now()).toISOString() })
  }
  return items
}

// ── CLAUDE ÇAĞRISI ─────────────────────────────────────────────────────────
async function isleHaber(haber, apiKey, strateji) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: 'Sadece geçerli JSON döndür. Başka hiçbir şey yazma.',
      messages:[{ role:'user', content: buildPrompt(haber, strateji) }]
    })
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const data = await res.json()
  let raw = data.content?.[0]?.text || ''
  raw = raw.replace(/^```json\s*/,'').replace(/\s*```\s*$/,'').trim()
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
  if (s === -1 || e <= s) throw new Error('JSON bulunamadi')
  return JSON.parse(raw.slice(s, e+1))
}

// ── ANA HANDLER ─────────────────────────────────────────────────────────────
export async function onRequestGet({ env, request }) {
  try {
    const url      = new URL(request.url)
    const sourceId = url.searchParams.get('source_id')
    const adet     = Math.min(parseInt(url.searchParams.get('adet')||'3'), 5)

    // Ahrefs cache'i KV'den oku (varsa), yoksa fallback
    let strateji = STRATEJI_FALLBACK
    try {
      const cache = await env.HABERLER.get('ahrefs_strateji', 'json')
      if (cache) strateji = cache
    } catch {}

    // 1ha RSS
    const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers:{ 'User-Agent':'rdr.ist/1.0' } })
    if (!rssRes.ok) return Response.json({ hata:`RSS ${rssRes.status}` })

    const xml    = await rssRes.text()
    const items  = parseRSS(xml)
    let mevcut   = (await env.HABERLER.get('liste','json')) || []
    const mevcutIds = new Set(mevcut.map(h=>h.source_id))

    // Tekil haber işleme (source_id ile)
    if (sourceId) {
      const hedefHaber = items.find(i=>i.source_id===sourceId)
        || mevcut.find(h=>h.source_id===sourceId)
      if (!hedefHaber) return Response.json({ hata:'Haber bulunamadı' }, { status:404 })
      const seo = await isleHaber(hedefHaber, env.ANTHROPIC_API_KEY, strateji)
      const kayit = {
        ...seo,
        source_id:hedefHaber.source_id, source_url:hedefHaber.source_url,
        baslik:hedefHaber.baslik, icerik:hedefHaber.icerik,
        gorsel:hedefHaber.gorsel, gorsel_url:hedefHaber.gorsel, video:hedefHaber.video||'',
        tarih_iso:hedefHaber.tarih_iso, kaydedildi:new Date().toISOString(),
        kayserim_link:hedefHaber.kayserim_link||'', durum:'islendi'
      }
      mevcut = [kayit, ...mevcut.filter(h=>h.source_id!==sourceId)].slice(0,200)
      await env.HABERLER.put('liste', JSON.stringify(mevcut))
      return Response.json(kayit)
    }

    const yeniHaberler = items.filter(i=>!mevcutIds.has(i.source_id)).slice(0, adet)
    if (!yeniHaberler.length) return Response.json({ islendi:0, mesaj:'Yeni haber yok', kv_toplam:mevcut.length })

    const basarili=[], hatali=[]
    for (const haber of yeniHaberler) {
      try {
        const seo = await isleHaber(haber, env.ANTHROPIC_API_KEY, strateji)
        const kayit = {
          ...seo,
          source_id:haber.source_id, source_url:haber.source_url,
          baslik:haber.baslik, icerik:haber.icerik,
          gorsel:haber.gorsel, gorsel_url:haber.gorsel, video:haber.video||'',
          tarih_iso:haber.tarih_iso, kaydedildi:new Date().toISOString(),
          kayserim_link:'', durum:'islendi'
        }
        mevcut = [kayit,...mevcut.filter(h=>h.source_id!==haber.source_id)].slice(0,200)
        await env.HABERLER.put('liste', JSON.stringify(mevcut))
        basarili.push(kayit.url_slug||haber.source_id)
      } catch(e) { hatali.push({ id:haber.source_id, hata:e.message }) }
    }
    return Response.json({ islendi:basarili.length, sluglar:basarili, hatali, kv_toplam:mevcut.length })
  } catch(e) {
    return Response.json({ hata:e.message }, { status:500 })
  }
}
