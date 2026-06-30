/**
 * SOSYAL RADAR — rdr.ist / kayserim.net
 * ----------------------------------------------------------------------------
 * Kurum / siyasi / spor sosyal medya hesaplarını ve Kayseri etiketli içerikleri
 * tarayıp haber adayı üretir. Keşfet Radar'a paralel, izole çalışır.
 *
 * İZOLE: Sadece KV'de 'sosyal:' önekli anahtarlara yazar.
 *   sosyal:kaynaklar    → manuel yönetilen hesap/feed listesi
 *   sosyal:firsatlar    → toplanan haber adayları (cache)
 *   sosyal:gorulen      → görülen post ID'leri (dedup)
 *   sosyal:son_tarama   → son tarama log'u
 *   sosyal:apify_run    → bekleyen Apify run kimliği (iki fazlı tarama)
 *
 * BU DOSYA — 1. PARÇA: Kaynak yönetimi (ekle/sil/listele) + iskelet.
 *   Tarama (Apify/RSS/GNews/YouTube) sonraki parçalarda eklenecek.
 * ----------------------------------------------------------------------------
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Panelden hiç kaynak eklenmemişse başlangıç listesi (seed).
// Kullanıcı panelden ekledikçe KV'deki liste bunun yerine geçer.
const VARSAYILAN_KAYNAKLAR = [
  { platform: 'instagram', handle: 'kayseribsb',           etiket: 'Kayseri Büyükşehir',     oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'baskanmemduhbyk',      etiket: 'Memduh Büyükkılıç',      oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'melikgazibel',         etiket: 'Melikgazi Belediyesi',   oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'kocasinanbelediyesi',  etiket: 'Kocasinan Belediyesi',   oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'talasbelediyesi',      etiket: 'Talas Belediyesi',       oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'develibld',            etiket: 'Develi Belediyesi',      oncelik: 2, aktif: true },
  { platform: 'instagram', handle: 'hacilar_belediyesi',   etiket: 'Hacılar Belediyesi',     oncelik: 2, aktif: true },
  { platform: 'instagram', handle: 'kayserisporfk',        etiket: 'Kayserispor',            oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'beyazmasakys',         etiket: 'Beyaz Masa Kayseri',     oncelik: 2, aktif: true },
]

// ── Kayseri filtresi: il + ilçe adları ──────────────────────────────────────
const KAYSERI_TERIMLERI = [
  'kayseri', 'erciyes', 'melikgazi', 'kocasinan', 'talas', 'develi', 'hacılar', 'hacilar',
  'incesu', 'i̇ncesu', 'bünyan', 'bunyan', 'yahyalı', 'yahyali', 'pınarbaşı', 'pinarbasi',
  'tomarza', 'yeşilhisar', 'yesilhisar', 'sarıoğlan', 'sarioglan', 'sarız', 'sariz',
  'akkışla', 'akkisla', 'felahiye', 'özvatan', 'ozvatan', 'argıncık', 'argincik',
]

// ── Kara liste: reklam / yetişkin içerik — taramaya HİÇ alınmaz ──────────────
const KARA_LISTE = [
  'escort', 'eskort', 'masaj', 'masöz', 'masoz', 'vip bayan', 'gece arkadaş',
  'partner ', 'bahis', 'casino', 'kumar', 'iddaa', 'bonus', 'deneme bonusu',
  'sweet bonanza', 'slot', 'rulet', 'bet ', 'tahminci', 'kupon', 'porn',
  'ifşa', 'ifsa', 't.me/', 'telegram.me/',
]

// ── Yardımcılar ──────────────────────────────────────────────────────────────

// Kullanıcı URL, @handle veya düz handle girebilir — normalize et.
function kaynagiCozumle(girdi) {
  if (!girdi) return null
  let s = String(girdi).trim()

  // RSS/XML feed (rss.app, news.google vb.) → olduğu gibi sakla
  if (/\.xml(\?|$)/i.test(s) || /rss\.app/i.test(s)) {
    return { platform: 'rss', handle: s, url: s }
  }

  // Tam URL ise platform + handle ayıkla
  const url = s.match(/^https?:\/\/([^\/]+)\/([^\/?#]+)/i)
  if (url) {
    const host = url[1].toLowerCase()
    const seg = url[2].replace(/^@/, '')
    if (host.includes('instagram.com')) return { platform: 'instagram', handle: seg }
    if (host.includes('twitter.com') || host.includes('x.com')) return { platform: 'twitter', handle: seg }
    if (host.includes('facebook.com'))  return { platform: 'facebook', handle: seg }
    if (host.includes('youtube.com')) {
      // /channel/UC..., /@handle, /c/isim
      const ch = s.match(/youtube\.com\/(channel\/[\w-]+|@[\w.-]+|c\/[\w.-]+|user\/[\w.-]+)/i)
      return { platform: 'youtube', handle: ch ? ch[1] : seg }
    }
    return { platform: 'web', handle: s, url: s }
  }

  // Düz @handle veya handle → platform belirsiz, instagram varsay (en sık)
  s = s.replace(/^@/, '')
  return { platform: 'instagram', handle: s }
}

async function kaynaklariGetir(env) {
  const kv = await env.HABERLER.get('sosyal:kaynaklar', 'json')
  if (Array.isArray(kv) && kv.length) return kv
  return VARSAYILAN_KAYNAKLAR
}

async function kaynaklariKaydet(env, liste) {
  await env.HABERLER.put('sosyal:kaynaklar', JSON.stringify(liste))
}

// İki kaynak aynı mı? (platform + handle, büyük/küçük harf duyarsız)
function ayniKaynak(a, b) {
  return a.platform === b.platform &&
    String(a.handle).toLowerCase() === String(b.handle).toLowerCase()
}

async function yetkili(secret, env, request) {
  // Manuel panel çağrısı (rdr.ist'ten) veya doğru secret yeterli
  const ref = (request && request.headers.get('referer')) || ''
  if (ref.includes('rdr.ist') || ref.includes('kayserim.net')) return true
  if (env.RSS_API_KEY && secret === env.RSS_API_KEY) return true
  if (env.SOSYAL_SECRET && secret === env.SOSYAL_SECRET) return true
  return false
}

// ── Tarama yardımcıları ──────────────────────────────────────────────────────

const APIFY_IG_ACTOR = 'apify~instagram-scraper'

// TR saatiyle tarama penceresi: 08:00–00:00 (gece yarısına kadar)
function taramaPenceresinde() {
  const trSaat = Number(new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false,
  }))
  return trSaat >= 8 && trSaat <= 23
}

function kayseriIlgili(metin) {
  const m = (metin || '').toLowerCase()
  return KAYSERI_TERIMLERI.some(t => m.includes(t))
}

function karaListede(metin) {
  const m = (metin || '').toLowerCase()
  return KARA_LISTE.some(t => m.includes(t))
}

// Sosyal post tazeliği: 0–100 (saat bazlı, 12 saatten yeni = yüksek)
function tazelik(ts) {
  if (!ts) return 40
  const fark = (Date.now() - Date.parse(ts)) / 36e5  // saat
  if (fark < 1) return 100
  if (fark < 3) return 90
  if (fark < 6) return 78
  if (fark < 12) return 64
  if (fark < 24) return 48
  return 30
}

function sosyalSkor({ ts, oncelik, kayseri }) {
  const taz = tazelik(ts)
  const onc = oncelik === 1 ? 100 : oncelik === 2 ? 70 : 45
  const kay = kayseri ? 100 : 50
  return Math.round(taz * 0.45 + onc * 0.25 + kay * 0.30)
}

function sosyalDurum(skor, ts) {
  const fark = ts ? (Date.now() - Date.parse(ts)) / 36e5 : 99
  if (skor >= 75 && fark < 6) return 'acil'
  if (skor >= 55) return 'firsat'
  return 'izle'
}

// ── FAZ 1: Apify Instagram run başlat ────────────────────────────────────────
async function instagramTaramaBaslat(env) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN env tanımlı değil' }

  const kaynaklar = await kaynaklariGetir(env)
  const igHesaplar = kaynaklar.filter(k => k.platform === 'instagram' && k.aktif !== false)
  if (!igHesaplar.length) return { hata: 'Aktif Instagram hesabı yok' }

  // Son taramadan beri yeni postları iste — çoğu turda 0 döner (ucuz)
  const input = {
    directUrls: igHesaplar.map(k => `https://www.instagram.com/${k.handle}/`),
    resultsType: 'posts',
    resultsLimit: 2,                 // hesap başına en yeni 1–2 post yeter
    onlyPostsNewerThan: '90 minutes',
    addParentData: false,
  }

  const r = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_IG_ACTOR}/runs?token=${env.APIFY_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  )
  const j = await r.json()
  if (!r.ok || !j.data) return { hata: 'Apify run başlatılamadı', detay: j }

  const run = {
    runId: j.data.id,
    datasetId: j.data.defaultDatasetId,
    baslangic: new Date().toISOString(),
    hesap_sayisi: igHesaplar.length,
  }
  await env.HABERLER.put('sosyal:apify_run', JSON.stringify(run))
  return { ok: true, baslatildi: run }
}

// ── FAZ 2: Biten run'ı topla, filtrele, fırsat üret ──────────────────────────
async function instagramSonucToparla(env, maxYasSaat = 24) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN yok' }
  const run = await env.HABERLER.get('sosyal:apify_run', 'json')
  if (!run || !run.runId) return { ok: true, mesaj: 'Bekleyen run yok' }

  // Run durumu
  const sr = await fetch(`https://api.apify.com/v2/actor-runs/${run.runId}?token=${env.APIFY_TOKEN}`)
  const sj = await sr.json()
  const durum = sj.data && sj.data.status
  if (durum === 'RUNNING' || durum === 'READY') {
    return { ok: true, mesaj: 'Run henüz bitmedi', durum }
  }
  if (durum !== 'SUCCEEDED') {
    await env.HABERLER.delete('sosyal:apify_run')
    return { ok: false, mesaj: 'Run başarısız', durum }
  }

  // Dataset'i çek
  const dr = await fetch(`https://api.apify.com/v2/datasets/${run.datasetId}/items?token=${env.APIFY_TOKEN}&clean=true&format=json`)
  const postlar = await dr.json()

  const kaynaklar = await kaynaklariGetir(env)
  const handleEtiket = new Map(kaynaklar.map(k => [String(k.handle).toLowerCase(), k]))
  const gorulen = new Set(await env.HABERLER.get('sosyal:gorulen', 'json') || [])

  const yeniFirsatlar = []
  for (const p of (Array.isArray(postlar) ? postlar : [])) {
    const pid = p.id || p.shortCode || p.url
    if (!pid || gorulen.has(pid)) continue
    const caption = p.caption || ''
    if (karaListede(caption)) continue            // reklam/yetişkin → at

    // Yaş filtresi: Apify bazen son postu döndürür (yeni yoksa) — eskileri ele.
    // Sadece son 24 saatteki paylaşımlar haber adayı olur.
    const postYas = p.timestamp ? (Date.now() - Date.parse(p.timestamp)) / 36e5 : 9999
    if (postYas > maxYasSaat) { gorulen.add(p.id || p.shortCode || p.url); continue }

    const kaynak = handleEtiket.get(String(p.ownerUsername || '').toLowerCase())
    const oncelik = kaynak ? (kaynak.oncelik || 2) : 2
    const etiket = kaynak ? kaynak.etiket : (p.ownerUsername || 'instagram')
    const ts = p.timestamp || null
    const kayseri = kayseriIlgili(caption) || kayseriIlgili(etiket)
    const skor = sosyalSkor({ ts, oncelik, kayseri })

    yeniFirsatlar.push({
      id: pid,
      kaynak_tip: 'instagram',
      hesap: p.ownerUsername,
      etiket,
      baslik: caption.slice(0, 200) || '(görsel/video — açıklama yok)',
      tam_metin: caption.slice(0, 1000),
      link: p.url,
      gorsel_url: p.displayUrl || (p.images && p.images[0]) || null,
      tip: p.type,
      begeni: p.likesCount || 0,
      pubDate: ts,
      kayseri,
      oncelik,
      skor,
      durum: sosyalDurum(skor, ts),
      yazildi: false,
      gizli: false,
      bulundu: new Date().toISOString(),
    })
    gorulen.add(pid)
  }

  // Fırsatları birleştir (ortak helper — IG/RSS/GNews aynı yere yazar)
  const birlesik = await firsatlariBirlestir(env, yeniFirsatlar)

  // Görülen ID'leri sınırlı tut
  await env.HABERLER.put('sosyal:gorulen', JSON.stringify([...gorulen].slice(-1500)))
  await env.HABERLER.delete('sosyal:apify_run')

  const log = {
    zaman: new Date().toISOString(),
    cekilen_post: Array.isArray(postlar) ? postlar.length : 0,
    yeni_firsat: yeniFirsatlar.length,
    acil: birlesik.filter(f => f.durum === 'acil' && !f.yazildi && !f.gizli).length,
    firsat: birlesik.filter(f => f.durum === 'firsat' && !f.yazildi && !f.gizli).length,
  }
  await env.HABERLER.put('sosyal:son_tarama', JSON.stringify(log))
  return { ok: true, log }
}

// ── Genel RSS/XML ayrıştırıcı (Worker'da DOMParser yok → regex) ───────────────
function rssAyristir(xml) {
  if (!xml || typeof xml !== 'string') return []
  const items = []
  const bloklar = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  for (const blok of bloklar) {
    const al = (etiket) => {
      const m = blok.match(new RegExp(`<${etiket}[^>]*>([\\s\\S]*?)<\\/${etiket}>`, 'i'))
      if (!m) return ''
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x?\d+;/g, ' ')
        .replace(/\s+/g, ' ').trim()
    }
    const linkM = blok.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    items.push({
      title: al('title'),
      link: linkM ? linkM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '',
      pubDate: al('pubDate') || al('dc:date') || al('published'),
      description: al('description') || al('content:encoded'),
    })
  }
  return items
}

// ── Ortak fırsat birleştirme (IG + RSS + GNews + YouTube hepsi bunu kullanır) ──
async function firsatlariBirlestir(env, yeniFirsatlar) {
  const onceki = await env.HABERLER.get('sosyal:firsatlar', 'json') || []
  const map = new Map(onceki.map(o => [o.id, o]))
  for (const f of yeniFirsatlar) {
    const o = map.get(f.id)
    map.set(f.id, o ? { ...f, yazildi: o.yazildi, gizli: o.gizli, bulundu: o.bulundu } : f)
  }
  const birlesik = [...map.values()].sort((a, b) => b.skor - a.skor).slice(0, 200)
  await env.HABERLER.put('sosyal:firsatlar', JSON.stringify(birlesik))
  return birlesik
}

// Basit hash → dedup ID (link bazlı)
function hashId(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return 'h' + (h >>> 0).toString(36)
}

// ── Twitter/X RSS taraması (rss.app feed'i) ──────────────────────────────────
async function twitterRssTara(env) {
  const kaynaklar = await kaynaklariGetir(env)
  const rssKaynaklar = kaynaklar.filter(k => k.platform === 'rss' && k.aktif !== false)
  if (!rssKaynaklar.length) return { ok: true, mesaj: 'RSS kaynağı yok', yeni: 0 }

  const gorulen = new Set(await env.HABERLER.get('sosyal:gorulen', 'json') || [])
  const yeniFirsatlar = []

  for (const kaynak of rssKaynaklar) {
    try {
      const res = await fetch(kaynak.handle, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rdr-ist/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        cf: { cacheTtl: 0, cacheEverything: false },
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = rssAyristir(xml)

      for (const it of items) {
        const metin = (it.title || '') + ' ' + (it.description || '')
        if (karaListede(metin)) continue              // reklam/eskort → at
        if (!kayseriIlgili(metin)) continue           // Kayseri dışı → at
        const pid = hashId(it.link || it.title)
        if (gorulen.has(pid)) continue

        const yas = it.pubDate ? (Date.now() - Date.parse(it.pubDate)) / 36e5 : 0
        if (yas > 24) { gorulen.add(pid); continue }   // 24s'ten eski → at
        const ts = it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString()
        const skor = sosyalSkor({ ts, oncelik: kaynak.oncelik || 2, kayseri: true })

        yeniFirsatlar.push({
          id: pid, kaynak_tip: 'twitter', hesap: 'X/hashtag', etiket: kaynak.etiket || 'Twitter Kayseri',
          baslik: (it.title || it.description || '').slice(0, 200),
          tam_metin: (it.description || it.title || '').slice(0, 1000),
          link: it.link, gorsel_url: null, tip: 'tweet', begeni: 0,
          pubDate: ts, kayseri: true, oncelik: kaynak.oncelik || 2,
          skor, durum: sosyalDurum(skor, ts),
          yazildi: false, gizli: false, bulundu: new Date().toISOString(),
        })
        gorulen.add(pid)
      }
    } catch (_) {}
  }

  await firsatlariBirlestir(env, yeniFirsatlar)
  await env.HABERLER.put('sosyal:gorulen', JSON.stringify([...gorulen].slice(-1500)))
  return { ok: true, yeni: yeniFirsatlar.length }
}

// ── Google News RSS taraması (Kayseri, son 24 saat — Apify gerekmez) ──────────
async function googleNewsTara(env) {
  const gorulen = new Set(await env.HABERLER.get('sosyal:gorulen', 'json') || [])
  const yeniFirsatlar = []
  try {
    const gn = 'https://news.google.com/rss/search?q=Kayseri%20when:1d&hl=tr&gl=TR&ceid=TR:tr'
    const res = await fetch(gn, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept': 'application/rss+xml, application/xml, text/xml, */*', 'Accept-Language': 'tr-TR,tr;q=0.9' },
      redirect: 'follow', cf: { cacheTtl: 0, cacheEverything: false },
    })
    if (!res.ok) return { ok: false, mesaj: 'GNews ' + res.status }
    const items = rssAyristir(await res.text()).slice(0, 40)  // en yeni 40 ile sınırla

    for (const it of items) {
      if (karaListede(it.title)) continue
      // Başlıkta gerçekten Kayseri/ilçe geçmeli — snippet eşleşmesi yetmez
      if (!kayseriIlgili(it.title)) continue
      const pid = hashId(it.link || it.title)
      if (gorulen.has(pid)) continue
      const yas = it.pubDate ? (Date.now() - Date.parse(it.pubDate)) / 36e5 : 0
      if (yas > 24) { gorulen.add(pid); continue }
      const ts = it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString()
      // GNews başlığı "Başlık - Kaynak" formatında — kaynağı etikete al
      const parca = (it.title || '').split(' - ')
      const kaynakAdi = parca.length > 1 ? parca.pop().trim() : 'Google News'
      // GNews ikincil sinyal (Keşfet Radar'da zaten var) → skoru düşür
      const skor = Math.max(0, sosyalSkor({ ts, oncelik: 3, kayseri: true }) - 20)

      yeniFirsatlar.push({
        id: pid, kaynak_tip: 'gnews', hesap: kaynakAdi, etiket: 'Google News · ' + kaynakAdi,
        baslik: parca.join(' - ').slice(0, 200) || it.title.slice(0, 200),
        tam_metin: (it.description || it.title).slice(0, 600),
        link: it.link, gorsel_url: null, tip: 'haber', begeni: 0,
        pubDate: ts, kayseri: true, oncelik: 3,
        skor, durum: sosyalDurum(skor, ts),
        yazildi: false, gizli: false, bulundu: new Date().toISOString(),
      })
      gorulen.add(pid)
    }
  } catch (e) { return { ok: false, mesaj: String(e).slice(0, 120) } }

  await firsatlariBirlestir(env, yeniFirsatlar)
  await env.HABERLER.put('sosyal:gorulen', JSON.stringify([...gorulen].slice(-1500)))
  return { ok: true, yeni: yeniFirsatlar.length }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'kaynaklar'

  try {
    // Kaynak listesini döndür
    if (action === 'kaynaklar') {
      const liste = await kaynaklariGetir(env)
      const ozet = {
        toplam: liste.length,
        aktif: liste.filter(k => k.aktif !== false).length,
        platform_dagilim: liste.reduce((a, k) => {
          a[k.platform] = (a[k.platform] || 0) + 1; return a
        }, {}),
      }
      return Response.json({ ok: true, ozet, kaynaklar: liste }, { headers: CORS })
    }

    // Son tarama durumu + toplanan fırsat özeti (tarama parçası gelince dolacak)
    if (action === 'durum') {
      const son = await env.HABERLER.get('sosyal:son_tarama', 'json') || null
      const firsatlar = await env.HABERLER.get('sosyal:firsatlar', 'json') || []
      return Response.json({ ok: true, son_tarama: son, firsat_sayisi: firsatlar.length }, { headers: CORS })
    }

    // Toplanan haber adaylarını listele
    if (action === 'firsatlar') {
      const firsatlar = await env.HABERLER.get('sosyal:firsatlar', 'json') || []
      const son = await env.HABERLER.get('sosyal:son_tarama', 'json') || null
      return Response.json({ ok: true, firsatlar, son_tarama: son }, { headers: CORS })
    }

    // FAZ 1: Instagram tarama başlat (Apify run) + senkron RSS/GNews
    if (action === 'tara') {
      const zorla = url.searchParams.get('force') === '1'
      const gun = Number(url.searchParams.get('gun')) || 1   // varsayılan 1 gün (24s)
      const maxYas = gun * 24
      if (!taramaPenceresinde() && !zorla) {
        return Response.json({ ok: true, atlandi: 'Tarama penceresi dışında (08:00–00:00 TR)' }, { headers: CORS })
      }

      // Senkron kaynaklar (hızlı, Apify gerektirmez): Twitter RSS + Google News
      const [tw, gn] = await Promise.all([
        twitterRssTara(env).catch(e => ({ ok: false, mesaj: String(e).slice(0, 80) })),
        googleNewsTara(env).catch(e => ({ ok: false, mesaj: String(e).slice(0, 80) })),
      ])

      // Instagram (asenkron Apify): bekleyen run varsa topla, yoksa başlat
      let ig
      const bekleyen = await env.HABERLER.get('sosyal:apify_run', 'json')
      if (bekleyen && bekleyen.runId) {
        ig = await instagramSonucToparla(env, maxYas)
      } else {
        ig = await instagramTaramaBaslat(env)
      }

      return Response.json({ ok: true, gun, twitter: tw, gnews: gn, instagram: ig }, { headers: CORS })
    }

    // FAZ 2: Bekleyen run'ı topla
    if (action === 'topla') {
      const gun = Number(url.searchParams.get('gun')) || 1
      const r = await instagramSonucToparla(env, gun * 24)
      return Response.json(r, { status: r.ok ? 200 : 500, headers: CORS })
    }

    // Fırsat cache'ini temizle (eski/test verisi sıfırlama)
    if (action === 'temizle') {
      await env.HABERLER.put('sosyal:firsatlar', JSON.stringify([]))
      await env.HABERLER.put('sosyal:gorulen', JSON.stringify([]))
      return Response.json({ ok: true, mesaj: 'Fırsat cache temizlendi' }, { headers: CORS })
    }

    return Response.json({ hata: 'Bilinmeyen action', mevcut: ['kaynaklar', 'durum', 'firsatlar', 'tara', 'topla'] },
      { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: String(e).slice(0, 200) }, { status: 500, headers: CORS })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || ''
  const secret = url.searchParams.get('secret') || ''

  try {
    if (!(await yetkili(secret, env, request))) {
      return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
    }

    let govde = {}
    try { govde = await request.json() } catch (_) {}

    // Yeni kaynak ekle — { girdi, etiket?, oncelik? }
    if (action === 'kaynak-ekle') {
      const cozum = kaynagiCozumle(govde.girdi || govde.handle || govde.url)
      if (!cozum || !cozum.handle) {
        return Response.json({ hata: 'Geçersiz girdi' }, { status: 400, headers: CORS })
      }
      const yeni = {
        platform: cozum.platform,
        handle: cozum.handle,
        url: cozum.url || undefined,
        etiket: (govde.etiket || cozum.handle).slice(0, 80),
        oncelik: Number(govde.oncelik) || 2,
        aktif: govde.aktif !== false,
        eklendi: new Date().toISOString(),
      }
      const liste = await kaynaklariGetir(env)
      if (liste.some(k => ayniKaynak(k, yeni))) {
        return Response.json({ hata: 'Bu kaynak zaten var', kaynak: yeni }, { status: 409, headers: CORS })
      }
      liste.push(yeni)
      await kaynaklariKaydet(env, liste)
      return Response.json({ ok: true, eklendi: yeni, toplam: liste.length }, { headers: CORS })
    }

    // Kaynak sil — { platform, handle }
    if (action === 'kaynak-sil') {
      const hedef = { platform: govde.platform, handle: govde.handle }
      const liste = await kaynaklariGetir(env)
      const kalan = liste.filter(k => !ayniKaynak(k, hedef))
      if (kalan.length === liste.length) {
        return Response.json({ hata: 'Kaynak bulunamadı', hedef }, { status: 404, headers: CORS })
      }
      await kaynaklariKaydet(env, kalan)
      return Response.json({ ok: true, silindi: hedef, toplam: kalan.length }, { headers: CORS })
    }

    // Kaynağı aç/kapat — { platform, handle, aktif }
    if (action === 'kaynak-guncelle') {
      const liste = await kaynaklariGetir(env)
      const k = liste.find(x => ayniKaynak(x, govde))
      if (!k) return Response.json({ hata: 'Kaynak bulunamadı' }, { status: 404, headers: CORS })
      if (typeof govde.aktif === 'boolean') k.aktif = govde.aktif
      if (govde.etiket) k.etiket = String(govde.etiket).slice(0, 80)
      if (govde.oncelik) k.oncelik = Number(govde.oncelik)
      await kaynaklariKaydet(env, liste)
      return Response.json({ ok: true, guncellendi: k }, { headers: CORS })
    }

    // Fırsatı işaretle — { id, alan: 'yazildi'|'gizli', deger: bool }
    if (action === 'isaretle') {
      const { id, alan, deger } = govde
      if (!id || !['yazildi', 'gizli'].includes(alan)) {
        return Response.json({ hata: 'Geçersiz' }, { status: 400, headers: CORS })
      }
      const liste = await env.HABERLER.get('sosyal:firsatlar', 'json') || []
      const f = liste.find(x => x.id === id)
      if (!f) return Response.json({ hata: 'Fırsat bulunamadı' }, { status: 404, headers: CORS })
      f[alan] = !!deger
      await env.HABERLER.put('sosyal:firsatlar', JSON.stringify(liste))
      return Response.json({ ok: true, guncellendi: { id, alan, deger: f[alan] } }, { headers: CORS })
    }

    // Toplu içe aktar — { girdiler: ["url1", "url2", ...] }
    if (action === 'kaynak-topla-ekle') {
      const girdiler = Array.isArray(govde.girdiler) ? govde.girdiler : []
      const liste = await kaynaklariGetir(env)
      const eklenenler = []
      for (const g of girdiler) {
        const c = kaynagiCozumle(g)
        if (!c || !c.handle) continue
        const yeni = {
          platform: c.platform, handle: c.handle, url: c.url || undefined,
          etiket: c.handle, oncelik: 2, aktif: true, eklendi: new Date().toISOString(),
        }
        if (!liste.some(k => ayniKaynak(k, yeni))) { liste.push(yeni); eklenenler.push(yeni) }
      }
      await kaynaklariKaydet(env, liste)
      return Response.json({ ok: true, eklenen_sayisi: eklenenler.length, toplam: liste.length, eklenenler },
        { headers: CORS })
    }

    return Response.json({ hata: 'Bilinmeyen action',
      mevcut: ['kaynak-ekle', 'kaynak-sil', 'kaynak-guncelle', 'kaynak-topla-ekle'] },
      { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: String(e).slice(0, 200) }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS })
}
