/**
 * GET /api/oto-isle
 * 1ha RSS → Claude (Ahrefs keyword stratejisi ile) → KV → rdr.ist/api/feed
 * Hedef: kayserim.net günlük 60.000 ziyaretçi
 */

// ── AHREFS VERİ MODELİ ────────────────────────────────────────────────────
// Ahrefs'ten gelen veriler KV'de saklanır. Her keyword için:
//   { keyword, volume, difficulty, traffic_potential }
// Strateji: volume yüksek + difficulty düşük = fırsat
//           volume yüksek + difficulty yüksek = uzun kuyruk hedefle
//           Her kategorinin kendi fırsat penceresi var

const STRATEJI_FALLBACK = {
  // Kategori bazlı keyword grupları — her grup: [keyword, volume_tahmini, difficulty_tahmini]
  kategori: {
    'Asayiş':  [
      ['kayseri trafik kazası', 2400, 15],
      ['kayseri kaza', 1800, 20],
      ['kayseri olay', 900, 10],
      ['kayseri polis', 600, 12],
    ],
    'Ekonomi': [
      ['kayseri altın fiyatları', 5400, 8],
      ['kayseri akaryakıt', 1200, 5],
      ['kayseri ekonomi', 800, 15],
      ['kayseri market', 600, 7],
    ],
    'Güncel':  [
      ['kayseri son dakika', 12000, 45],
      ['kayseri haber', 8400, 40],
      ['kayseri gündem', 1200, 18],
      ['kayseri olay haber', 900, 12],
    ],
    'Kayseri': [
      ['kayseri haber', 8400, 40],
      ['kayseri son dakika', 12000, 45],
      ['kayseri radar', 3200, 20],
      ['kayserim', 2100, 15],
    ],
    'Spor':    [
      ['kayserispor', 22000, 65],
      ['kayserispor haberleri', 4800, 30],
      ['kayseri spor', 1600, 20],
    ],
    'Siyaset': [
      ['kayseri büyükşehir', 2200, 25],
      ['kayseri belediye', 1800, 22],
      ['kayseri siyaset', 600, 15],
    ],
    'Trafik':  [
      ['kayseri trafik', 3200, 18],
      ['kayseri trafik kazası son dakika', 1800, 12],
      ['kayseri yol', 800, 8],
    ],
    'default': [
      ['kayseri haber', 8400, 40],
      ['kayseri son dakika', 12000, 45],
      ['kayseri güncel', 1200, 15],
    ],
  }
}

// En iyi keyword'ü seç: volume/difficulty oranı en yüksek = en büyük fırsat
function firsat_keyword_sec(keywordler, limit = 3) {
  return [...keywordler]
    .sort((a, b) => (b[1] / (b[2] + 1)) - (a[1] / (a[2] + 1)))
    .slice(0, limit)
    .map(k => k[0])
}

function buildPrompt(haber, strateji) {
  const kat       = haber.kategori || 'Güncel'
  const katKwList = strateji.kategori[kat] || strateji.kategori['default']
  const isVideo   = !!haber.video

  // En iyi fırsat keyword'leri seç (volume/difficulty oranına göre)
  const firsatKw  = firsat_keyword_sec(katKwList, 3)
  const hedefKw1  = firsatKw[0] || 'kayseri haber'
  const hedefKw2  = firsatKw[1] || 'kayseri son dakika'
  const hedefKw3  = firsatKw[2] || ''

  // Kayseri kuralı: haber zaten Kayseri'deyse organik, değilse local angle
  const haberKayseriIlgili = /kayseri|kayserim|kayserispor/i.test(haber.baslik + haber.icerik)
  const kayseriKurali = haberKayseriIlgili
    ? `Bu haber zaten Kayseri ile ilgili — "Kayseri" kelimesini başlıkta organik olarak kullan, zorla tekrar etme.`
    : `Bu haber doğrudan Kayseri ile ilgili değil — başlığa "Kayseri" ekleme, içerikte yerel bağlantı varsa (Kayserili şirket, Kayserililer'in tepkisi vb.) 1-2 kez doğal kullan.`

  return `Sen kayserim.net için kıdemli bir haber editörü ve SEO uzmanısın.

## TEMEL GÖREV
Verilen haberi; bağlamından koparmadan, gerçekleri değiştirmeden, SEO uyumlu ve okuyucu odaklı şekilde düzenle. Gerekirse haberi mantıklı bağlamsal bilgilerle genişlet.

## HABER BİLGİSİ
Başlık: ${haber.baslik.slice(0,200)}
İçerik: ${haber.icerik.slice(0,500)}
Kategori: ${kat}
${isVideo ? 'Format: VİDEO HABER' : ''}

## SEO STRATEJİSİ (Ahrefs fırsat analizi)
Bu kategori için en yüksek fırsat keywordleri (volume/difficulty oranına göre):
- Birincil hedef: "${hedefKw1}"
- İkincil hedef: "${hedefKw2}"
${hedefKw3 ? `- Destekleyici: "${hedefKw3}"` : ''}

${kayseriKurali}

## BAŞLIK KURALLARI
- Başlık 55-65 karakter
- Birincil hedef keyword başlıkta organik geçmeli — ama kelimeyi mekanik yapıştırma
- Haber ne hakkındaysa onu anlatsın, bağlamı koruyun
- Soru, rakam, sonuç odaklı başlıklar tıklanma oranını artırır
- Örnekler (iyi): "Kayseri'de 5 araç birbirine girdi: 3 yaralı" / "Altın fiyatları bugün ne kadar?" / "Kayserispor'da sürpriz transfer"
- Örnekler (kötü): "Kayseri haber: Kayseri'de Kayseri'li şoför..." (tekrar)

## İÇERİK KURALLARI
- Türk haber ajansı dili: AA/DHA formatı
- Kim, ne, nerede, ne zaman — ilk cümlede
- Spekülasyon, editöryal yorum, dolgu metin YASAK
- Sayıları kullan: "35 araç" > "çok sayıda araç"
- Unvan ve özel isimleri ASLA değiştirme: "Kocasinan Kaymakamı" → olduğu gibi kal
- Hedef: 400-600 kelime (orijinalden kısaysa, habere uygun bağlamsal bilgi ekle)
  * Geçmiş benzer olaylar, bölge bilgisi, yetkili açıklamaları genişlet
  * Uydurulan bilgi değil, haber bağlamını mantıklı şekilde tamamla
${isVideo ? '- Video haber: "İzlemek için tıklayın", "Videolu haber" ifadelerini kullan' : ''}

## ÇIKTI FORMATI (Sadece JSON, başka hiçbir şey)
{
  "site_basligi": "55-65 karakter, ${hedefKw1} içeren doğal başlık — haberin özünü yansıtsın",
  "h1_basligi": "H1: site_basligi ile aynı veya çok yakın",
  "sosyal_baslik": "5-8 kelime, merak uyandırıcı, konuyu net anlatan — Kayseri zorunlu değil",
  "meta_description": "max 155 karakter, ${hedefKw1} ve haberin özü — tıklamayı tetiklesin",
  "url_slug": "${hedefKw1.replace(/ /g,'-')}-ile-baslayan-benzersiz-slug",
  "optimize_icerik": "400-600 kelime, Türk haber ajansı dilinde, bağlam korunmuş ve mantıklı şekilde genişletilmiş haber metni",
  "ozet": "1 cümle, haberin özü, ${hedefKw1} geçsin",
  "instagram": "Dikkat çekici, merak uyandırıcı. İlk cümle sürükleyici. Kayserim.net adresi sonda. 6-10 hashtag sonda. Kayseri zorunlu değil ama konuya uygunsa kullan. 1200-2000 karakter.",
  "facebook": "Dikkat çekici ilk cümle + özet. Max 300 karakter. 2-3 hashtag. Site linki ayrıca eklenir.",
  "x_twitter": "Çarpıcı tweet. Max 230 karakter. 1-2 emoji. 2-3 hashtag. Site linki ayrıca eklenir.",
  "youtube_baslik": "max 80 karakter, ${hedefKw1} içersin, arama odaklı",
  "youtube_aciklama": "250-300 karakter özet. Sonuna 'Detaylar için: [LINK]'",
  "hedef_kelimeler": ["${hedefKw1}", "${hedefKw2}", "${hedefKw3}"],
  "kategori": "${kat}",
  "oncelik": "yuksek veya orta veya dusuk — ${hedefKw1} volume/difficulty oranına göre",
  "gorsel_prompt": "realistic Turkish news photo, max 12 words, specific scene",
  "alternatif_basliklar": [
    "Merak/soru odaklı: rakam veya sürpriz detay içeren 5-8 kelimelik başlık",
    "Sonuç odaklı: ne oldu, kim etkilendi — 5-8 kelimelik başlık",
    "Yerel kimlik/bağlantı: Kayseri bağlamı uygunsa 5-8 kelimelik başlık"
  ],
  "optimize_icerik_kwh": "Birincil keyword '${hedefKw1}' doğal yerleştirilmiş, unvanlar/rakamlar korunmuş, 400-600 kelime haber ajansı dili"
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

    // Tüm enclosure ve media:content görsellerini topla
    let gorsel = '', video = ''
    const gorseller = []  // tüm görseller listesi

    for (const enc of node.matchAll(/<enclosure[^>]*/g)) {
      const eUrl  = enc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const eType = enc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      if (!eUrl) continue
      if (eType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(eUrl)) {
        if (!video) video = eUrl
      } else {
        if (!gorsel) gorsel = eUrl
        if (!gorseller.includes(eUrl)) gorseller.push(eUrl)
      }
    }

    for (const mc of node.matchAll(/<media:content[^>]*/g)) {
      const mcUrl    = mc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const mcType   = mc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      const mcMedium = mc[0].match(/\bmedium="([^"]*)"/)?.[1] || ''
      if (!mcUrl) continue
      const isVid = mcType.startsWith('video/') || mcMedium === 'video' || /\.mp4|\.mov|\.webm/i.test(mcUrl)
      if (isVid && !video) video = mcUrl
      else if (!isVid) {
        if (!gorsel) gorsel = mcUrl
        if (!gorseller.includes(mcUrl)) gorseller.push(mcUrl)
      }
    }

    // description içindeki tüm img'leri de topla
    if (!gorsel && !video) gorsel = node.match(/<img[^>]*src="([^"]*)"/)?.[ 1] || ''
    for (const imgMatch of node.matchAll(/<img[^>]*src="([^"]*)"/g)) {
      const iUrl = imgMatch[1]
      if (iUrl && !gorseller.includes(iUrl)) gorseller.push(iUrl)
    }

    if (bas.length > 5) items.push({ source_id:id, source_url:link, baslik:bas, icerik, gorsel, gorseller, video, kategori:kat, tarih_iso: new Date(dt||Date.now()).toISOString() })
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
      max_tokens: 4000,
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
    const liste    = url.searchParams.get('liste') === '1'

    // Sadece liste istendi — RSS'ten son haberleri döndür
    if (liste) {
      const listeAdet = Math.min(parseInt(url.searchParams.get('adet')||'20'), 50)
      const rssRes2 = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
        { headers:{ 'User-Agent':'rdr.ist/1.0' } })
      if (!rssRes2.ok) return Response.json({ hata:`RSS ${rssRes2.status}` })
      const xml2  = await rssRes2.text()
      const items2 = parseRSS(xml2).slice(0, listeAdet)
      return Response.json({ haberler: items2.map(h=>({
        source_id: h.source_id,
        baslik:    h.baslik,
        icerik:    h.icerik?.substring(0, 200),
        gorsel:    h.gorsel,
        gorseller: h.gorseller || (h.gorsel ? [h.gorsel] : []),
        video:     h.video || '',
        kategori:  h.kategori,
        tarih:     h.tarih_iso,
      })) })
    }

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
          gorsel:haber.gorsel, gorsel_url:haber.gorsel, gorsel_url_orijinal:haber.gorsel, video:haber.video||'',
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
