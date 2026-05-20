/**
 * GET /api/ahrefs-sync
 * Ahrefs API'dan keyword verisini çeker, KV'e kaydeder.
 * cron-job.org ile günde 1 kez çağrılır.
 *
 * Cloudflare env: AHREFS_API_KEY gerekli
 * Ahrefs API key: app.ahrefs.com → API → Generate key
 */
export async function onRequestGet({ env }) {
  const API_KEY = env.AHREFS_API_KEY
  if (!API_KEY) return Response.json({ hata:'AHREFS_API_KEY eksik. Cloudflare Pages → Settings → Environment Variables.' }, {status:400})

  const BASE   = 'https://api.ahrefs.com/v3'
  const SITE   = 'kayserim.net'
  const TODAY  = new Date().toISOString().split('T')[0]
  const headers = { Authorization:`Bearer ${API_KEY}`, Accept:'application/json' }

  try {
    // 1. Top keywords by traffic
    const kwRes = await fetch(
      `${BASE}/site-explorer/organic-keywords?target=${SITE}&mode=subdomains&country=tr&date=${TODAY}&select=keyword,volume,best_position,keyword_difficulty&limit=50&order_by=sum_traffic:desc`,
      { headers }
    )
    const kwData = await kwRes.json()

    // 2. Keyword opportunities (volume > 500, position 4-20)
    const firsatRes = await fetch(
      `${BASE}/site-explorer/organic-keywords?target=${SITE}&mode=subdomains&country=tr&date=${TODAY}&select=keyword,volume,best_position,keyword_difficulty&limit=30&order_by=volume:desc&where={"and":[{"field":"best_position","is":["gte",4]},{"field":"best_position","is":["lte",20]},{"field":"volume","is":["gte",500]}]}`,
      { headers }
    )
    const firsatData = await firsatRes.json()

    // Strateji nesnesi oluştur
    const strateji = {
      guncellendi: new Date().toISOString(),
      global: {
        yuksek: (kwData.keywords||[]).slice(0,10).map(k=>k.keyword),
        firsat: (firsatData.keywords||[]).slice(0,8).map(k=>k.keyword),
        slug_prefix: 'kayseri-',
      },
      kategori: {
        'Asayiş':  ['kayseri trafik kazası son dakika','kayseri asayiş','kayseri polis haberleri'],
        'Ekonomi': ['kayseri altın fiyatları','kayseri ekonomi haberleri'],
        'Güncel':  ['kayseri son dakika','kayseri haber bugün'],
        'Kayseri': ['kayseri son dakika','kayseri haber'],
        'Spor':    ['kayserispor son dakika','kayseri spor haberleri'],
        'Siyaset': ['kayseri siyaset','kayseri belediye haberleri'],
        'default': ['kayseri son dakika','kayseri haber'],
      },
      ham: { keywords: kwData.keywords?.slice(0,20)||[], firsatlar: firsatData.keywords?.slice(0,10)||[] }
    }

    // KV'ye kaydet (24 saat TTL)
    await env.HABERLER.put('ahrefs_strateji', JSON.stringify(strateji), { expirationTtl: 86400 })

    return Response.json({
      basarili: true,
      keywords_cekilen: strateji.global.yuksek.length,
      firsat_keywords: strateji.global.firsat.length,
      guncellendi: strateji.guncellendi
    })
  } catch(e) {
    return Response.json({ hata: e.message }, { status:500 })
  }
}
