/**
 * GET /api/ahrefs-sync
 * Ahrefs'ten gerçek keyword verisi çeker → KV'ye kaydeder
 * Cloudflare Cron veya manuel tetikleme ile çalışır
 * 
 * Strateji: volume/difficulty yerine traffic_potential odaklı
 * traffic_potential = o sayfanın gerçekte alabileceği maksimum trafik
 */

// Kategorilere göre çekilecek keyword grupları
const KEYWORD_GRUPLARI = {
  'Asayiş':  [
    'kayseri kaza', 'kayseri trafik kazası', 'kayseri yangın',
    'kayseri olay', 'kayseri polis', 'kayseri asayiş',
    'kayseri gözaltı', 'kayseri hırsızlık',
  ],
  'Trafik': [
    'kayseri kaza', 'kayseri trafik kazası', 'kayseri trafik kazası son dakika',
    'kayseri kaza bugün', 'kayseri zincirleme kaza',
  ],
  'Ekonomi': [
    'kayseri altın fiyatları', 'kayseri iş ilanları', 'kayseri emlak',
    'kayseri akaryakıt', 'kayseri market', 'kayseri ekonomi haberleri',
  ],
  'Güncel':  [
    'kayseri haber', 'kayseri son dakika', 'kayseri olay',
    'kayseri gündem', 'kayseri haber bugün',
  ],
  'Spor':    [
    'kayserispor', 'kayserispor haberleri', 'kayserispor son dakika',
    'kayserispor transfer', 'kayseri spor',
  ],
  'Siyaset': [
    'kayseri büyükşehir', 'kayseri belediye', 'kayseri siyaset',
    'kayseri valisi', 'kayseri milletvekili',
  ],
  'Yangın':  [
    'kayseri yangın', 'kayseri yangın son dakika', 'kayseri itfaiye',
  ],
  'Genel': [
    'kayseri son dakika haberleri', 'kayserim net', 'kayseri radar',
    'kayseri nüfus', 'kayseri uçak', 'kayseri hastane',
  ],
}

// Fırsat skoru hesapla
// traffic_potential öncelikli, difficulty negatif etki
function firsatSkoru(kw) {
  const vol  = kw.volume || 0
  const diff = kw.difficulty ?? 0
  const tp   = kw.traffic_potential || vol
  // difficulty 0 ise çok büyük avantaj
  const diffPenalty = diff === 0 ? 1 : (diff / 10)
  return Math.round(tp / (diffPenalty + 1))
}

// Keyword'e bağlam tespiti
function haberTipiBelirle(keyword) {
  if (/kaza|çarpış|trafik kaza/.test(keyword)) return 'kaza'
  if (/yangın|itfaiye/.test(keyword)) return 'yangin'
  if (/gözaltı|tutuklama|hırsız|kaçak/.test(keyword)) return 'asayis'
  if (/altın|dolar|euro|akaryakıt|fiyat/.test(keyword)) return 'ekonomi'
  if (/kayserispor|transfer|maç|lig/.test(keyword)) return 'spor'
  if (/belediye|vali|milletvekili|başkan/.test(keyword)) return 'siyaset'
  if (/iş ilan|istihdam/.test(keyword)) return 'istihdam'
  return 'genel'
}

export async function onRequestGet({ env, request }) {
  const url    = new URL(request.url)
  const secret = url.searchParams.get('secret')

  // Güvenlik: secret parametresi gerekli
  if (secret !== env.RSS_API_KEY)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const AHREFS_KEY = env.AHREFS_API_KEY
  if (!AHREFS_KEY)
    return Response.json({ hata: 'AHREFS_API_KEY yok' }, { status: 500 })

  const tumKeywordler = [...new Set(Object.values(KEYWORD_GRUPLARI).flat())]
  const sonuclar = []
  const hatalar  = []

  // Ahrefs API — 10'ar keyword grupla (limit)
  for (let i = 0; i < tumKeywordler.length; i += 10) {
    const grup = tumKeywordler.slice(i, i + 10).join(',')
    try {
      const res = await fetch(
        `https://api.ahrefs.com/v3/keywords-explorer/overview?` +
        `country=tr&keywords=${encodeURIComponent(grup)}&select=keyword,volume,difficulty,traffic_potential,cpc`,
        { headers: { 'Authorization': `Bearer ${AHREFS_KEY}` } }
      )
      const data = await res.json()
      if (data.keywords) sonuclar.push(...data.keywords)
    } catch(e) {
      hatalar.push({ grup: grup.substring(0,30), hata: e.message })
    }
    // Rate limit: Ahrefs API'yi ezmemek için
    if (i + 10 < tumKeywordler.length) await new Promise(r => setTimeout(r, 500))
  }

  // Keyword verilerini indeksle
  const kwMap = {}
  for (const kw of sonuclar) {
    kwMap[kw.keyword] = {
      keyword:          kw.keyword,
      volume:           kw.volume || 0,
      difficulty:       kw.difficulty ?? 0,
      traffic_potential: kw.traffic_potential || kw.volume || 0,
      cpc:              kw.cpc || 0,
      firsat:           firsatSkoru(kw),
      tip:              haberTipiBelirle(kw.keyword),
    }
  }

  // Kategori bazlı strateji oluştur
  // Her kategori için: [keyword, volume, difficulty, traffic_potential, firsat]
  const strateji = { kategori: {}, ozelTipler: {}, guncellendi: new Date().toISOString() }

  for (const [kat, kwListesi] of Object.entries(KEYWORD_GRUPLARI)) {
    const katVeriler = kwListesi
      .map(kw => kwMap[kw])
      .filter(Boolean)
      .sort((a, b) => b.firsat - a.firsat)

    strateji.kategori[kat] = katVeriler.map(kw => [
      kw.keyword,
      kw.volume,
      kw.difficulty,
      kw.traffic_potential,
    ])
  }

  // Özel tipler: haber türüne göre en iyi keyword
  const tipGruplari = {}
  for (const kw of Object.values(kwMap)) {
    if (!tipGruplari[kw.tip]) tipGruplari[kw.tip] = []
    tipGruplari[kw.tip].push(kw)
  }
  for (const [tip, kwler] of Object.entries(tipGruplari)) {
    strateji.ozelTipler[tip] = kwler
      .sort((a, b) => b.firsat - a.firsat)
      .slice(0, 3)
      .map(kw => [kw.keyword, kw.volume, kw.difficulty, kw.traffic_potential])
  }

  // KV'ye kaydet (30 gün cache)
  await env.HABERLER.put('ahrefs_strateji', JSON.stringify(strateji), {
    expirationTtl: 60 * 60 * 24 * 30
  })

  // İstatistik
  const topKeywords = Object.values(kwMap)
    .sort((a, b) => b.firsat - a.firsat)
    .slice(0, 10)
    .map(k => ({ keyword: k.keyword, firsat: k.firsat, volume: k.volume, difficulty: k.difficulty, tp: k.traffic_potential }))

  return Response.json({
    ok: true,
    cekilen: sonuclar.length,
    hatalar,
    top10_firsat: topKeywords,
    kategoriler: Object.keys(strateji.kategori).map(k => ({
      kategori: k,
      en_iyi: strateji.kategori[k][0]?.[0],
      firsat: strateji.kategori[k][0] ? Math.round(strateji.kategori[k][0][3] / ((strateji.kategori[k][0][2] || 0) / 10 + 1)) : 0
    }))
  })
}
