/**
 * İçerik Zeka Sistemi — RSS Tarayıcı + Fırsat Skoru Motoru
 * Cloudflare Cron Trigger: Her 15 dakikada bir (0,15,30,45 * * * *)
 *
 * GET  /api/icerik-zeka?action=scan      → RSS tara, haberleri skora göre sırala
 * GET  /api/icerik-zeka?action=seasonal  → Aktif sezonsal kampanyaları kontrol et
 * GET  /api/icerik-zeka?action=status    → Tüm aktif kampanyaların durumu
 * POST action=trigger_campaign           → Manuel kampanya tetikle
 */

const RSS_URL   = 'https://www.kayserim.net/rss'
const GRAPH     = 'https://graph.facebook.com/v21.0'
const META_TOK  = 'EAAORauw5t7ABRxGn0VWifCDlUlSJVje9z7eKH9ZCy5X913eKXHfRLwOEdfM70cd64eIlXAJmSvldiLwLy93x23UJtHatnVZBZAtTwIcVNVaykf2YUZCakJf6X2wKHhcuVN8Ogv8jH9UorD0HaCjZAZBLdYBjyOIE841VvjQNX6TT8W20GG67EDUDefZANune5JGz4XGajGHZBu36TsllewlgU8BarzV71dc1D2ttwWnjZANQjA65QdmZBoIF8V74DSZCEIx6mUA4LW0Pb71RL6ZB2JqDkWknpAZDZD'
const META_ACT  = 'act_708028213253830'
const META_PAGE = '506931626168922'

// ── Fırsat Skoru Algoritması ──────────────────────────────────────────────────
const KEYWORD_DB = [
  // { keywords, volume, kd, trend, category, season, camp_key, daily_budget_tl, platform }
  // SÜREKLI FIRSAT
  { keywords: ['taksi','taksi durağı','taksici'],        volume:12000, kd:0,  trend:'stable',   cat:'surekli',  camp:'haber',  budget:15, platform:'meta' },
  { keywords: ['itfaiye','yangın','itfaiyeciler'],       volume:16000, kd:0,  trend:'stable',   cat:'surekli',  camp:'haber',  budget:15, platform:'meta' },
  { keywords: ['vefat','hayatını kaybetti','öldü'],      volume:14000, kd:1,  trend:'stable',   cat:'surekli',  camp:'haber',  budget:20, platform:'meta' },
  { keywords: ['kaza','trafik kazası','çarpışma'],       volume:9000,  kd:0,  trend:'event',    cat:'olay',     camp:'haber',  budget:25, platform:'meta' },
  { keywords: ['deprem','sarsıntı'],                     volume:32000, kd:0,  trend:'event',    cat:'olay',     camp:'haber',  budget:50, platform:'meta' },
  { keywords: ['altın fiyat','çeyrek altın','gram altın'],volume:26000,kd:57, trend:'stable',   cat:'altin',    camp:'altin',  budget:10, platform:'google'},
  // SEZONSAL
  { keywords: ['bayram namazı','namaz saati','bayram'],  volume:322000,kd:0,  trend:'seasonal', cat:'sezonsal', season:'bayram',  budget:100, platform:'both' },
  { keywords: ['okullar tatil','okul kapanış'],          volume:1200,  kd:0,  trend:'seasonal', cat:'sezonsal', season:'okul',    budget:20,  platform:'google'},
  { keywords: ['kpss','yks','lgs','sınav'],              volume:29000, kd:0,  trend:'seasonal', cat:'sezonsal', season:'sinav',   budget:30,  platform:'google'},
]

// Sezonsal aktif mi?
const SEASONAL_CALENDAR = {
  bayram: (now) => {
    // Ramazan Bayramı 2027: 20 Mart, Kurban Bayramı 2027: 27 Mayıs
    const dates = [
      new Date('2027-03-13'), new Date('2027-03-21'), // Ramazan Bayramı ±7 gün
      new Date('2027-05-20'), new Date('2027-05-29'), // Kurban Bayramı ±7 gün
    ]
    for (let i = 0; i < dates.length; i += 2) {
      if (now >= dates[i] && now <= dates[i+1]) return true
    }
    return false
  },
  okul: (now) => {
    const m = now.getMonth() + 1
    return m === 6 || m === 9 // Haziran veya Eylül
  },
  sinav: (now) => {
    const m = now.getMonth() + 1
    return [3, 4, 5, 6].includes(m) // Mart-Haziran sınav sezonu
  }
}

function opportunityScore(kd, volume, trend, currentRank) {
  const volScore  = Math.min(100, Math.log10(Math.max(1, volume)) / Math.log10(500000) * 100)
  const easeScore = (1 - kd / 100) * 100
  const trendMap  = { rising: 90, seasonal: 85, event: 80, stable: 60, falling: 10 }
  const trendScore = trendMap[trend] || 50
  const posBonus  = !currentRank ? 0 : currentRank <= 3 ? 20 : currentRank <= 10 ? 10 : 5
  return Math.round(volScore * 0.25 + easeScore * 0.30 + trendScore * 0.25 + posBonus * 0.20)
}

// Haberi keyword DB ile eşleştir
function matchKeywords(title, description) {
  const text  = (title + ' ' + description).toLowerCase()
  const matches = []
  for (const kw of KEYWORD_DB) {
    const hit = kw.keywords.find(k => text.includes(k.toLowerCase()))
    if (hit) {
      const score = opportunityScore(kw.kd, kw.volume, kw.trend, null)
      matches.push({ ...kw, matched_keyword: hit, score })
    }
  }
  return matches.sort((a, b) => b.score - a.score)
}

// RSS çek ve parse et
async function fetchRSS() {
  const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'KayserimBot/1.0' } })
  const xml = await res.text()

  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const inner = m[1]
    const title = (inner.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || ''
    const link  = (inner.match(/<link[^>]*>(.*?)<\/link>/)  || [])[1] || ''
    const pubDate = (inner.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || ''
    const desc  = (inner.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/) || [])[1] || ''
    items.push({ title: title.trim(), link: link.trim(), pubDate, description: desc.trim() })
  }
  return items.slice(0, 20) // Son 20 haber
}

// Meta kampanyası oluştur (otomasyon)
async function createMetaCampaign(name, budget_tl, duration_hours = 48) {
  // Kampanya
  const camp = await fetch(`${GRAPH}/${META_ACT}/campaigns`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      name, objective: 'OUTCOME_TRAFFIC',
      daily_budget: budget_tl * 100,
      status: 'ACTIVE', // Direkt aktif — olay kampanyası
      special_ad_categories: [],
      access_token: META_TOK
    })
  }).then(r => r.json())
  if (!camp.id) throw new Error('Kampanya oluşturulamadı: ' + JSON.stringify(camp))

  // Ad set
  const adset = await fetch(`${GRAPH}/${META_ACT}/adsets`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      name: name + ' - Kayseri',
      campaign_id: camp.id,
      destination_type: 'WEBSITE',
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      bid_amount: 200,
      promoted_object: { page_id: META_PAGE },
      targeting: {
        geo_locations: { cities: [{ key:'789723', name:'Kayseri', country:'TR' }] },
        age_min: 18, age_max: 65
      },
      dsa_beneficiary: 'Kayserim.net',
      dsa_payor: 'Mustafa Bayram',
      status: 'ACTIVE',
      access_token: META_TOK
    })
  }).then(r => r.json())

  return { campaign_id: camp.id, adset_id: adset.id, duration_hours }
}

// ── Ana endpoint ──────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const cors = { 'Access-Control-Allow-Origin':'*','Content-Type':'application/json' }
  const url    = new URL(request.url)
  const action = url.searchParams.get('action') || 'scan'
  const now    = new Date()

  try {
    // RSS tara + fırsat sırala
    if (action === 'scan') {
      const items     = await fetchRSS()
      const scored    = items.map(item => ({
        ...item,
        keyword_matches: matchKeywords(item.title, item.description),
        top_score: Math.max(0, ...matchKeywords(item.title, item.description).map(m => m.score))
      })).sort((a, b) => b.top_score - a.top_score)

      return Response.json({ ok:true, scanned: items.length, results: scored.slice(0,10) }, { headers:cors })
    }

    // Sezonsal durum kontrolü
    if (action === 'seasonal') {
      const status = {}
      for (const [key, checker] of Object.entries(SEASONAL_CALENDAR)) {
        status[key] = checker(now)
      }
      const active = Object.entries(status).filter(([,v]) => v).map(([k]) => k)
      return Response.json({ ok:true, now: now.toISOString(), seasonal_active: active, status }, { headers:cors })
    }

    // Kampanya durumu (KV'den)
    if (action === 'status') {
      const saved = await env.HABERLER.get('auto_campaigns', 'json') || []
      return Response.json({ ok:true, active_campaigns: saved }, { headers:cors })
    }

    throw new Error('Geçersiz action: ' + action)
  } catch(e) {
    return Response.json({ ok:false, error:e.message }, { status:500, headers:cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors = { 'Access-Control-Allow-Origin':'*','Content-Type':'application/json' }
  try {
    const body = await request.json()
    const { action, reason, budget_tl = 50, duration_hours = 48 } = body

    if (action === 'trigger_campaign') {
      const name = `KayserimNet - Otomatik - ${reason} - ${new Date().toLocaleDateString('tr-TR')}`
      const result = await createMetaCampaign(name, budget_tl, duration_hours)

      // KV'ye kaydet (otomatik durdurma için)
      const saved = await env.HABERLER.get('auto_campaigns', 'json') || []
      saved.push({ ...result, name, reason, started: new Date().toISOString() })
      await env.HABERLER.put('auto_campaigns', JSON.stringify(saved))

      return Response.json({ ok:true, campaign: result, message: `${budget_tl}₺/gün × ${duration_hours} saat kampanya başlatıldı` }, { headers:cors })
    }

    throw new Error('Geçersiz action: ' + action)
  } catch(e) {
    return Response.json({ ok:false, error:e.message }, { status:500, headers:cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'} })
}
