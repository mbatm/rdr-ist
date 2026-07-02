/**
 * Keşfet Radar — Google Discover Fırsat Motoru
 * ─────────────────────────────────────────────────────────────────────────
 * Rakip yerel haber sitelerinin feed/sitemap'lerini tarar, kendi RSS'imizle
 * karşılaştırır, her konuya bir "Discover potansiyel skoru" verir ve
 * yazılmayı bekleyen fırsatları sıralı listeler.
 *
 * İZOLE: Sadece KV'de 'kesfet:' önekli anahtarlara yazar. Haber listesine
 *        (key 'liste') VEYA başka mevcut anahtarlara ASLA dokunmaz.
 *
 * GET /api/kesfet-radar?action=scan&secret=XXX   → Tara + skorla + kaydet (cron)
 * GET /api/kesfet-radar?action=list&secret=TOKEN → Panel için fırsat listesi
 * GET /api/kesfet-radar?action=sources           → İzlenen kaynak listesi
 * POST action=mark    { id, alan }                → "yazıldı/gizle" işaretle
 * ─────────────────────────────────────────────────────────────────────────
 */

const KENDI_RSS = 'https://www.kayserim.net/rss'

// ── İzlenen rakip kaynaklar (Ahrefs organik rakip verisinden) ──────────────
// Yeni site eklemek için sadece bu diziye ekle. feed_urls sırayla denenir.
const KAYNAKLAR = [
  { domain: 'kayseriolay.com',            oncelik: 1, tip: 'yerel' },
  { domain: 'kayserianadoluhaber.com.tr', oncelik: 1, tip: 'yerel' },
  { domain: 'kayserihaber.com.tr',        oncelik: 1, tip: 'yerel' },
  { domain: 'denizpostasi.com',           oncelik: 1, tip: 'yerel' },
  { domain: 'gazetekayseri.com.tr',       oncelik: 2, tip: 'yerel' },
  { domain: 'kayserigazetesi.com',        oncelik: 2, tip: 'yerel' },
  { domain: 'kayserigundem.com.tr',       oncelik: 2, tip: 'yerel' },
  { domain: 'kayseriyerelhaber.com',      oncelik: 2, tip: 'yerel' },
]

// Her domain için sırayla denenecek olası feed yolları
function feedAdaylari(domain) {
  const bases = ['https://www.' + domain, 'https://' + domain]
  const paths = ['/rss/', '/rss', '/feed/', '/feed', '/rss.xml', '/feed.xml', '/?feed=rss2', '/export/rss', '/sitemap-news.xml']
  const list = []
  for (const b of bases) for (const p of paths) list.push(b + p)
  return list
}

// ── Discover "ısı" sözlüğü ─────────────────────────────────────────────────
// Şubat 2026 Discover update: yerel relevans + tazelik + olay haberleri öne çıkıyor.
const ISI = [
  { kw: ['deprem','sarsıntı','şiddetinde'],                       agirlik: 95, tur: 'olay' },
  { kw: ['kaza','trafik kazası','zincirleme','çarpışma','feci'],  agirlik: 88, tur: 'olay' },
  { kw: ['yangın','alev','itfaiye'],                              agirlik: 85, tur: 'olay' },
  { kw: ['cinayet','bıçaklama','silahlı','kavga','gözaltı','tutuklama','operasyon'], agirlik: 84, tur: 'olay' },
  { kw: ['sel','su baskını','dolu','fırtına','kar','tipi','hava durumu','meteoroloji'], agirlik: 80, tur: 'hava' },
  { kw: ['vefat','hayatını kaybetti','öldü','defnedildi','cenaze'], agirlik: 78, tur: 'vefat' },
  { kw: ['kayserispor','sarı kırmızı','maçı','transfer','teknik direktör'], agirlik: 82, tur: 'spor' },
  { kw: ['zam','indirim','fiyat','akaryakıt','benzin','motorin','elektrik','doğalgaz'], agirlik: 76, tur: 'ekonomi' },
  { kw: ['okul','tatil','sınav','yks','lgs','kpss','ösym','meb'],  agirlik: 74, tur: 'egitim' },
  { kw: ['belediye','başkan','büyükşehir','meclis','açıldı','açılış','yatırım'], agirlik: 62, tur: 'gundem' },
  { kw: ['kimdir','kaç yaşında','nereli','hayatı','biyografi'],    agirlik: 58, tur: 'kisi' },
]

// Yerel relevans işaretçileri (Kayseri özgüllüğü → Şubat update bonusu)
const YEREL = ['kayseri','erciyes','melikgazi','kocasinan','talas','develi','yahyalı',
  'bünyan','incesu','hacılar','tomarza','pınarbaşı','sarız','akkışla','felahiye','özvatan','yeşilhisar']

// ── Yardımcılar ────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '')
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Basit içerik parmak izi (dedup + "bizde var mı" karşılaştırması için)
function fingerprint(title) {
  const stop = new Set(['ve','ile','bir','bu','da','de','için','olan','son','dakika','haber','haberi'])
  return normalize(title).split(' ')
    .filter(w => w.length > 2 && !stop.has(w))
    .slice(0, 8)
    .sort()
    .join(' ')
}

function tokenJaccard(a, b) {
  const sa = new Set(a.split(' ').filter(Boolean))
  const sb = new Set(b.split(' ').filter(Boolean))
  if (!sa.size || !sb.size) return 0
  let kesisim = 0
  for (const t of sa) if (sb.has(t)) kesisim++
  return kesisim / (sa.size + sb.size - kesisim)
}

// Tazelik skoru: 0-24s → 100, 48s → 60, >72s → düşük
function tazelikSkoru(pubDate) {
  const t = Date.parse(pubDate)
  if (!t || isNaN(t)) return 50 // tarih yoksa nötr
  const saat = (Date.now() - t) / 36e5
  if (saat < 0)  return 90
  if (saat <= 6) return 100
  if (saat <= 24) return 90
  if (saat <= 48) return 65
  if (saat <= 72) return 40
  return 15
}

function isiEslesmesi(title) {
  const t = normalize(title)
  let best = null
  for (const k of ISI) {
    if (k.kw.some(w => t.includes(normalize(w)))) {
      if (!best || k.agirlik > best.agirlik) best = k
    }
  }
  return best // {kw, agirlik, tur} | null
}

function yerelMi(title) {
  const t = normalize(title)
  return YEREL.some(y => t.includes(y))
}

/**
 * Discover potansiyel skoru (0-100)
 * - Tazelik %35  (Discover 24-48s içeriği kayırır)
 * - Isı     %30  (olay/spor/hava → yüksek tıklama)
 * - Yerel   %20  (Şubat 2026 update: yerel relevans güçlendi)
 * - Boşluk  %15  (rakipte var, bizde yok → acil fırsat)
 */
function discoverSkor({ pubDate, title, bizdeVar, kaynakSayisi }) {
  const taz  = tazelikSkoru(pubDate)
  const isi  = isiEslesmesi(title)
  const isiP = isi ? isi.agirlik : 35
  const yer  = yerelMi(title) ? 100 : 40
  const bos  = bizdeVar ? 20 : 100
  let skor = Math.round(taz * 0.35 + isiP * 0.30 + yer * 0.20 + bos * 0.15)
  // Birden fazla rakip aynı konuyu işliyorsa → trend sinyali, +bonus
  if (kaynakSayisi >= 2) skor = Math.min(100, skor + 8)
  return { skor, isi }
}

function durumBelirle(skor, bizdeVar) {
  if (!bizdeVar && skor >= 75) return 'acil'    // yaz, hemen
  if (skor >= 60)              return 'firsat'  // değerlendir
  return 'izle'                                  // arşiv/takip
}

// ── Feed çekme + parse (RSS item + news-sitemap url) ───────────────────────
async function feedCek(domain) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  const getir = async (url) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }, redirect: 'follow', cf: { cacheTtl: 300, cacheEverything: true } })
      if (!res.ok) return null
      return await res.text()
    } catch (_) { return null }
  }
  for (const url of feedAdaylari(domain)) {
    const xml = await getir(url)
    if (!xml) continue
    const items = parseItems(xml, domain)
    if (items.length) return { url, items }
  }
  for (const home of ['https://www.' + domain + '/', 'https://' + domain + '/']) {
    const html = await getir(home)
    if (!html) continue
    const mm = html.match(/<link[^>]+type=["']application[/](?:rss|atom)[+]xml["'][^>]*>/i)
    if (!mm) continue
    const hrefM = mm[0].match(/href=["']([^"']+)["']/i)
    if (!hrefM) continue
    let fu = hrefM[1]
    if (fu.indexOf('//') === 0) fu = 'https:' + fu
    else if (fu.charAt(0) === '/') fu = 'https://www.' + domain + fu
    const xml2 = await getir(fu)
    if (!xml2) continue
    const items = parseItems(xml2, domain)
    if (items.length) return { url: fu, items }
  }
  // 3) Cloudflare 'Just a moment' challenge fallback: Google News RSS (site:domain)
  try {
    const gn = 'https://news.google.com/rss/search?q=site:' + domain + '%20when:2d&hl=tr&gl=TR&ceid=TR:tr'
    const xmlG = await getir(gn)
    if (xmlG) {
      const itemsG = parseItems(xmlG, domain)
      if (itemsG.length) return { url: gn, items: itemsG }
    }
  } catch (_) {}
  return { url: null, items: [] }
}

function parseItems(xml, domain) {
  const out = []
  // 1) Standart RSS <item>
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const inner = m[1]
    const title = clean((inner.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1])
    const link  = clean((inner.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1])
    const pub   = clean((inner.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1])
    const img   = (inner.match(/(?:enclosure|media:content|media:thumbnail)[^>]+url=["']([^"']+)["']/) || [])[1] || ''
    if (title) out.push({ title, link, pubDate: pub, gorsel_url: img, domain })
  }
  if (out.length) return out.slice(0, 25)

  // 2) News sitemap <url> + <news:title>/<news:publication_date>
  const urlRe = /<url>([\s\S]*?)<\/url>/g
  while ((m = urlRe.exec(xml)) !== null) {
    const inner = m[1]
    const loc   = clean((inner.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1])
    const title = clean((inner.match(/<news:title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/news:title>/) || [])[1])
    const pub   = clean((inner.match(/<news:publication_date>([\s\S]*?)<\/news:publication_date>/) || [])[1])
      || clean((inner.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1])
    if (title || loc) out.push({ title: title || loc, link: loc, pubDate: pub, gorsel_url: '', domain })
  }
  return out.slice(0, 25)
}

function clean(s) {
  return (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').trim()
}

// Kendi RSS'imizden son başlıkların parmak izleri
async function kendiFingerprintleri() {
  try {
    const res = await fetch(KENDI_RSS, { headers: { 'User-Agent': 'KesfetRadar/1.0' } })
    const xml = await res.text()
    const fps = []
    const re = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g
    let m
    while ((m = re.exec(xml)) !== null) {
      const t = clean(m[1])
      if (t && !/kayserim\.net|son dakika kayseri haberleri/i.test(t)) fps.push(fingerprint(t))
    }
    return fps
  } catch (_) { return [] }
}

// ── Auth ───────────────────────────────────────────────────────────────────
async function yetkili(secret, env) {
  if (!secret) return false
  if (env.RSS_API_KEY && secret === env.RSS_API_KEY) return true
  // Panel token'ı (auth.js ile aynı şema)
  const t = await env.HABERLER.get(`token:${secret}`, 'json')
  return !!t
}

// ── SCAN ─────────────────────────────────────────────────────────────────
async function tara(env) {
  const kendi = await kendiFingerprintleri()
  const eslesir = (fp) => kendi.some(k => tokenJaccard(fp, k) >= 0.5)

  // Tüm kaynakları paralel çek
  const sonuc = await Promise.all(KAYNAKLAR.map(async k => {
    const f = await feedCek(k.domain)
    return { ...k, feed_url: f.url, items: f.items, ok: f.items.length > 0 }
  }))

  // ── ALTERNATİF KAYNAK: feed'i bulunamayan siteler için Apify GNews yedeği ──
  // news.google.com/rss Worker IP'lerini engelliyor (kalıcı 'unusual traffic');
  // Sosyal Radar'da kanıtlanmış Apify actor'ü ile site bazlı GNews araması yapılır.
  const feedsizler = sonuc.filter(s => !s.ok)
  if (feedsizler.length && env.APIFY_TOKEN) {
    try {
      const r = await fetch(
        `https://api.apify.com/v2/acts/automation-lab~google-news-scraper/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: feedsizler.map(s => 'site:' + s.domain),
            language: 'tr', country: 'TR', maxArticles: 15,
          }),
        }
      )
      if (r.ok) {
        const arr = await r.json()
        const norm = (x) => String(x || '').toLowerCase().replace(/[\s.\-]/g, '')
        if (Array.isArray(arr)) {
          for (const it of arr) {
            const title = it.title || it.headline || ''
            const link  = it.link || it.url || ''
            if (!title || !link) continue
            const kaynakAdi = it.source || it.publisher || ''
            const sahip = feedsizler.find(s => {
              const kok = norm(s.domain.replace(/\.(com|net|org|gen)(\.tr)?$/, ''))
              return norm(link).includes(norm(s.domain)) || (kok && norm(kaynakAdi).includes(kok)) || (kok && norm(title).includes(kok))
            })
            if (!sahip) continue
            sahip.items.push({
              title, link,
              pubDate: it.date || it.pubDate || it.publishedAt || new Date().toISOString(),
              gorsel_url: it.image || it.thumbnail || '', domain: sahip.domain,
            })
          }
          for (const s of feedsizler) {
            if (s.items.length) { s.ok = true; s.feed_url = 'apify-gnews (alternatif)' }
          }
        }
      }
    } catch (_) {}
  }

  // Konu bazında grupla (parmak izi)
  const konular = new Map()
  for (const src of sonuc) {
    for (const it of src.items) {
      const fp = fingerprint(it.title)
      if (!fp) continue
      if (!konular.has(fp)) {
        konular.set(fp, {
          fp, title: it.title, link: it.link, pubDate: it.pubDate,
          gorsel_url: it.gorsel_url, kaynaklar: [], en_yeni: it.pubDate,
        })
      }
      const g = konular.get(fp)
      g.kaynaklar.push(src.domain)
      if (it.gorsel_url && !g.gorsel_url) g.gorsel_url = it.gorsel_url
      if (Date.parse(it.pubDate) > Date.parse(g.en_yeni || 0)) {
        g.en_yeni = it.pubDate; g.link = it.link; g.title = it.title
      }
    }
  }

  // Skorla
  const firsatlar = []
  for (const g of konular.values()) {
    const bizdeVar = eslesir(g.fp)
    const kaynakSayisi = new Set(g.kaynaklar).size
    const { skor, isi } = discoverSkor({
      pubDate: g.en_yeni, title: g.title, bizdeVar, kaynakSayisi,
    })
    firsatlar.push({
      id: g.fp,
      baslik: g.title,
      link: g.link,
      pubDate: g.en_yeni,
      gorsel_url: g.gorsel_url,
      kaynaklar: [...new Set(g.kaynaklar)],
      kaynak_sayisi: kaynakSayisi,
      bizde_var: bizdeVar,
      tur: isi ? isi.tur : 'diger',
      yerel: yerelMi(g.title),
      skor,
      durum: durumBelirle(skor, bizdeVar),
      yazildi: false,
      gizli: false,
      bulundu: new Date().toISOString(),
    })
  }
  firsatlar.sort((a, b) => b.skor - a.skor)

  // Önceki kayıtla birleştir — yazıldı/gizli işaretlerini koru, dedup
  const onceki = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
  const oncekiMap = new Map(onceki.map(o => [o.id, o]))
  const birlesik = firsatlar.map(f => {
    const o = oncekiMap.get(f.id)
    return o ? { ...f, yazildi: o.yazildi, gizli: o.gizli, bulundu: o.bulundu, ustlenen: o.ustlenen || null, ustlenme: o.ustlenme || null } : f
  })
  // Yeni taramada görünmeyen ama yazılmış/gizlenmiş/üstlenilmiş eskileri 48s tut
  for (const o of onceki) {
    if (!birlesik.find(b => b.id === o.id) && (o.yazildi || o.gizli || o.ustlenen)) {
      if (Date.now() - Date.parse(o.bulundu) < 48 * 36e5) birlesik.push(o)
    }
  }
  const kayit = birlesik.slice(0, 120)
  await env.HABERLER.put('kesfet:firsatlar', JSON.stringify(kayit))

  const log = {
    zaman: new Date().toISOString(),
    kaynak_durum: sonuc.map(s => ({ domain: s.domain, ok: s.ok, adet: s.items.length, feed: s.feed_url })),
    toplam_konu: konular.size,
    acil: kayit.filter(f => f.durum === 'acil' && !f.yazildi && !f.gizli).length,
    firsat: kayit.filter(f => f.durum === 'firsat' && !f.yazildi && !f.gizli).length,
  }
  await env.HABERLER.put('kesfet:son_tarama', JSON.stringify(log))
  return log
}

// ── TEYİT: bu konu kayserim.net'te ve/veya 1ha'da var mı? ──────────────────
async function teyit(env, baslik) {
  const fp = fingerprint(baslik)

  // 1) kayserim.net yayınlanmış liste (KV)
  let kayserim = null
  try {
    const liste = await env.HABERLER.get('liste', 'json') || []
    let best = null, bestSkor = 0
    for (const h of liste) {
      const s = Math.max(
        tokenJaccard(fp, fingerprint(h.site_basligi || '')),
        tokenJaccard(fp, fingerprint(h.baslik || ''))
      )
      if (s > bestSkor) { bestSkor = s; best = h }
    }
    if (best && bestSkor >= 0.45) {
      kayserim = {
        baslik: best.site_basligi || best.baslik,
        link: best.kayserim_link || '',
        source_id: best.source_id || '',
        durum: best.durum || '',
        benzerlik: Math.round(bestSkor * 100),
      }
    }
  } catch (_) {}

  // 2) 1ha kaynak feed
  let ha1 = null
  try {
    const tok = env.OHA_RSS_TOKEN || env.RSS_API_KEY
    if (tok) {
      const res = await fetch(`https://1ha.com.tr/api/rss/${tok}`, { headers: { 'User-Agent': 'KesfetRadar/1.0' } })
      if (res.ok) {
        const items = parseItems(await res.text(), '1ha')
        let best = null, bestSkor = 0
        for (const it of items) {
          const s = tokenJaccard(fp, fingerprint(it.title))
          if (s > bestSkor) { bestSkor = s; best = it }
        }
        if (best && bestSkor >= 0.45) {
          ha1 = { baslik: best.title, link: best.link, benzerlik: Math.round(bestSkor * 100) }
        }
      }
    }
  } catch (_) {}

  // 3) Tavsiye / yönlendirme
  let durum_kodu, tavsiye
  if (kayserim) {
    durum_kodu = 'guncelle'
    tavsiye = `Bu haber kayserim.net'te zaten var (%${kayserim.benzerlik} eşleşme). Yenisini yazma — mevcudu GÜNCELLE: başlığa "bugün" + tarih ekle, Discover için og:title optimize et, ilk paragrafa güncel gelişmeyi koy ve yeniden yayın zamanını tazele.`
  } else if (ha1) {
    durum_kodu = 'isle'
    tavsiye = `1ha kaynağında var (%${ha1.benzerlik} eşleşme) ama sen henüz yayınlamamışsın. 1ha haberini işleyip özgün+derin haline getirerek hızlıca yayınla — Discover için tazelik avantajın burada.`
  } else {
    durum_kodu = 'yaz'
    tavsiye = `Ne kayserim.net'te ne 1ha'da var. Rakipte olup sende olmayan özgün bir fırsat — sıfırdan özgün, yerel açılı haber yaz ve hızlı yayınla.`
  }

  return { var_kayserim: !!kayserim, kayserim, var_1ha: !!ha1, ha1, durum_kodu, tavsiye }
}

// ── Handlers ────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'list'
  const secret = url.searchParams.get('secret') || ''

  try {
    if (action === 'sources') {
      return Response.json({ ok: true, kaynaklar: KAYNAKLAR }, { headers: CORS })
    }

    if (action === 'scan') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      const _ref = request.headers.get('referer') || ''
      const _force = url.searchParams.get('force') === '1' || _ref.includes('rdr.ist')
      if (!_force) {
        const stRaw = await env.HABERLER.get('kesfet:son_tarama')
        if (stRaw) {
          try {
            const stObj = JSON.parse(stRaw)
            const lastT = Date.parse(stObj.zaman || stObj)
            if (lastT && (Date.now() - lastT) < 3600000) {
              const frRaw = await env.HABERLER.get('kesfet:firsatlar')
              return Response.json({ ok: true, atlandi: true, sebep: 'saatlik_gate', son_tarama: stObj, firsatlar: frRaw ? JSON.parse(frRaw) : [] }, { headers: CORS })
            }
          } catch (_) {}
        }
      }
      const log = await tara(env)
      // Tarama sonrası oto motoru tetikle (pasifse anında döner)
      let oto = null
      try {
        const r = await fetch(`${url.origin}/api/kesfet-oto?action=process&secret=${encodeURIComponent(secret)}`)
        oto = await r.json()
      } catch (_) {}
      return Response.json({ ok: true, ...log, oto }, { headers: CORS })
    }

    if (action === 'list') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      const firsatlar = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
      const son       = await env.HABERLER.get('kesfet:son_tarama', 'json') || null

      // SAATLİK OTOMATİK TAZELEME (lazy cron): son tarama 60+ dk eskiyse
      // yanıtı bekletmeden arka planda yeni tarama başlat. Kilit ile çift
      // tarama önlenir — panel açık olduğu sürece veri kendini saatte bir yeniler.
      let arkaPlanTarama = false
      try {
        const yas = son && son.zaman ? Date.now() - Date.parse(son.zaman) : Infinity
        if (yas > 3600000) {
          const kilit = await env.HABERLER.get('kesfet:tarama_kilit')
          if (!kilit) {
            await env.HABERLER.put('kesfet:tarama_kilit', String(Date.now()), { expirationTtl: 300 })
            context.waitUntil(tara(env).catch(() => {}))
            arkaPlanTarama = true
          }
        }
      } catch (_) {}

      return Response.json({ ok: true, firsatlar, son_tarama: son, arka_plan_tarama: arkaPlanTarama }, { headers: CORS })
    }

    if (action === 'verify') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      let baslik = url.searchParams.get('baslik') || ''
      const id = url.searchParams.get('id') || ''
      if (!baslik && id) {
        const list = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
        baslik = (list.find(f => f.id === id) || {}).baslik || ''
      }
      if (!baslik) return Response.json({ hata: 'baslik veya id gerekli' }, { status: 400, headers: CORS })
      const sonuc = await teyit(env, baslik)
      return Response.json({ ok: true, ...sonuc }, { headers: CORS })
    }

    return Response.json({ hata: 'Geçersiz action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const action = url.searchParams.get('action') || body.action
    const secret = url.searchParams.get('secret') || body.secret || ''
    if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })

    if (action === 'mark') {
      const { id, alan } = body // alan: 'yazildi' | 'gizli'
      if (!id || !['yazildi', 'gizli'].includes(alan))
        return Response.json({ hata: 'id ve geçerli alan gerekli' }, { status: 400, headers: CORS })
      const list = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
      const f = list.find(x => x.id === id)
      if (f) { f[alan] = true; await env.HABERLER.put('kesfet:firsatlar', JSON.stringify(list)) }
      return Response.json({ ok: true }, { headers: CORS })
    }

    // ÜSTLENME: bir haberi kim yazıyor, herkes görsün — mükerrer çalışma önlenir
    if (action === 'ustlen') {
      const { id, kullanici } = body
      if (!id || !kullanici) return Response.json({ hata: 'id ve kullanici gerekli' }, { status: 400, headers: CORS })
      const list = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
      const f = list.find(x => x.id === id)
      if (!f) return Response.json({ hata: 'Fırsat bulunamadı' }, { status: 404, headers: CORS })
      if (f.ustlenen && f.ustlenen !== kullanici) {
        return Response.json({ ok: false, dolu: true, ustlenen: f.ustlenen, ustlenme: f.ustlenme }, { headers: CORS })
      }
      f.ustlenen = kullanici
      f.ustlenme = new Date().toISOString()
      await env.HABERLER.put('kesfet:firsatlar', JSON.stringify(list))
      return Response.json({ ok: true, ustlenen: kullanici }, { headers: CORS })
    }

    if (action === 'birak') {
      const { id, kullanici } = body
      const list = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
      const f = list.find(x => x.id === id)
      if (!f) return Response.json({ hata: 'Fırsat bulunamadı' }, { status: 404, headers: CORS })
      // Sadece üstlenen kişi (veya admin) bırakabilir
      if (f.ustlenen && f.ustlenen !== kullanici && kullanici !== 'admin') {
        return Response.json({ ok: false, hata: `Bu haberi ${f.ustlenen} üstlenmiş, sadece o bırakabilir` }, { status: 403, headers: CORS })
      }
      f.ustlenen = null
      f.ustlenme = null
      await env.HABERLER.put('kesfet:firsatlar', JSON.stringify(list))
      return Response.json({ ok: true }, { headers: CORS })
    }

    return Response.json({ hata: 'Geçersiz action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}
