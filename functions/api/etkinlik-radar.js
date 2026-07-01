/**
 * ETKİNLİK RADAR — rdr.ist / kayserim.net
 * ----------------------------------------------------------------------------
 * Kayseri'deki etkinlikleri (konser, festival, fuar, tiyatro, sergi, spor vb.)
 * kurum siteleri + sosyal medya hesaplarından tarayıp etkinlik takvimi adayı üretir.
 * Sosyal Radar ile aynı mimari, izole çalışır — 'etkinlik:' önekli KV anahtarları.
 *
 *   etkinlik:kaynaklar   → manuel yönetilen hesap/site listesi
 *   etkinlik:firsatlar   → toplanan etkinlik adayları (cache)
 *   etkinlik:gorulen     → görülen kayıt ID'leri (dedup)
 *   etkinlik:son_tarama  → son tarama log'u
 *   etkinlik:apify_run   → bekleyen Apify run kimliği (iki fazlı tarama)
 * ----------------------------------------------------------------------------
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const APIFY_IG_ACTOR = 'apify~instagram-scraper'

const VARSAYILAN_KAYNAKLAR = [
  { platform: 'instagram', handle: 'kayseribsb',      etiket: 'Kayseri Büyükşehir',   oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'kayserisporfk',   etiket: 'Kayserispor',          oncelik: 1, aktif: true },
  { platform: 'instagram', handle: 'talasbelediyesi', etiket: 'Talas Belediyesi',     oncelik: 2, aktif: true },
]

const KAYSERI_TERIMLERI = [
  'kayseri', 'erciyes', 'melikgazi', 'kocasinan', 'talas', 'develi', 'hacılar', 'hacilar',
  'incesu', 'i̇ncesu', 'bünyan', 'bunyan', 'yahyalı', 'yahyali', 'pınarbaşı', 'pinarbasi',
  'tomarza', 'yeşilhisar', 'yesilhisar', 'sarıoğlan', 'sarioglan', 'sarız', 'sariz',
  'akkışla', 'akkisla', 'felahiye', 'özvatan', 'ozvatan', 'argıncık', 'argincik',
]

const KARA_LISTE = [
  'escort', 'eskort', 'masaj', 'masöz', 'masoz', 'vip bayan', 'gece arkadaş',
  'partner ', 'bahis', 'casino', 'kumar', 'iddaa', 'bonus', 'deneme bonusu',
  'sweet bonanza', 'slot', 'rulet', 'bet ', 'tahminci', 'kupon', 'porn',
  'ifşa', 'ifsa', 't.me/', 'telegram.me/',
]

// Etkinlik olduğunu gösteren anahtar kelimeler — bu geçmiyorsa aday olmaz
const ETKINLIK_TERIMLERI = [
  'konser', 'festival', 'fuar', 'tiyatro', 'sergi', 'konferans', 'panel', 'söyleşi', 'soylesi',
  'atölye', 'atolye', 'workshop', 'yarışma', 'yarisma', 'turnuva', 'şenlik', 'senlik',
  'açılış', 'acilis', 'kermes', 'gösteri', 'gosteri', 'resital', 'defile', 'imza günü',
  'imza gunu', 'söz konseri', 'etkinlik', 'davet', 'maç', 'mac', 'karşılaşma', 'karsilasma',
  'final', 'yarı final', 'yari final', 'derbi', 'bilet', 'ücretsiz giriş', 'ucretsiz giris',
]

function kaynagiCozumle(girdi) {
  if (!girdi) return null
  let s = String(girdi).trim()
  if (/\.xml(\?|$)/i.test(s) || /rss\.app/i.test(s)) return { platform: 'rss', handle: s, url: s }
  const url = s.match(/^https?:\/\/([^\/]+)\/([^\/?#]+)/i)
  if (url) {
    const host = url[1].toLowerCase()
    const seg = url[2].replace(/^@/, '')
    if (host.includes('instagram.com')) return { platform: 'instagram', handle: seg }
    if (host.includes('twitter.com') || host.includes('x.com')) return { platform: 'twitter', handle: seg }
    if (host.includes('facebook.com')) return { platform: 'facebook', handle: seg }
    return { platform: 'web', handle: s, url: s }
  }
  s = s.replace(/^@/, '')
  return { platform: 'instagram', handle: s }
}

async function kaynaklariGetir(env) {
  const kv = await env.HABERLER.get('etkinlik:kaynaklar', 'json')
  if (Array.isArray(kv) && kv.length) return kv
  return VARSAYILAN_KAYNAKLAR
}
async function kaynaklariKaydet(env, liste) {
  await env.HABERLER.put('etkinlik:kaynaklar', JSON.stringify(liste))
}
function ayniKaynak(a, b) {
  return a.platform === b.platform && String(a.handle).toLowerCase() === String(b.handle).toLowerCase()
}
async function yetkili(secret, env, request) {
  const ref = (request && request.headers.get('referer')) || ''
  if (ref.includes('rdr.ist') || ref.includes('kayserim.net')) return true
  if (env.RSS_API_KEY && secret === env.RSS_API_KEY) return true
  if (env.SOSYAL_SECRET && secret === env.SOSYAL_SECRET) return true
  return false
}

function taramaPenceresinde() {
  const trSaat = Number(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }))
  return trSaat >= 8 && trSaat <= 23
}
function kayseriIlgili(metin) {
  const m = (metin || '').toLowerCase()
  return KAYSERI_TERIMLERI.some(t => m.includes(t))
}
function etkinlikMi(metin) {
  const m = (metin || '').toLowerCase()
  return ETKINLIK_TERIMLERI.some(t => m.includes(t))
}
function karaListede(metin) {
  const m = (metin || '').toLowerCase()
  return KARA_LISTE.some(t => m.includes(t))
}
function tazelik(ts) {
  if (!ts) return 40
  const fark = (Date.now() - Date.parse(ts)) / 36e5
  if (fark < 3) return 100
  if (fark < 12) return 85
  if (fark < 24) return 65
  return 35
}
function etkinlikSkor({ ts, oncelik }) {
  const taz = tazelik(ts)
  const onc = oncelik === 1 ? 100 : oncelik === 2 ? 70 : 45
  return Math.round(taz * 0.5 + onc * 0.5)
}
function etkinlikDurum(skor) {
  if (skor >= 80) return 'acil'
  if (skor >= 55) return 'firsat'
  return 'izle'
}
function hashId(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return 'e' + (h >>> 0).toString(36)
}

function rssAyristir(xml) {
  if (!xml || typeof xml !== 'string') return []
  const items = []
  const bloklar = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  for (const blok of bloklar) {
    const al = (etiket) => {
      const m = blok.match(new RegExp(`<${etiket}[^>]*>([\\s\\S]*?)<\\/${etiket}>`, 'i'))
      if (!m) return ''
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x?\d+;/g, ' ')
        .replace(/\s+/g, ' ').trim()
    }
    const linkM = blok.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    items.push({
      title: al('title'), link: linkM ? linkM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '',
      pubDate: al('pubDate') || al('dc:date') || al('published'), description: al('description') || al('content:encoded'),
    })
  }
  return items
}

async function firsatlariBirlestir(env, yeniFirsatlar) {
  const onceki = await env.HABERLER.get('etkinlik:firsatlar', 'json') || []
  const map = new Map(onceki.map(o => [o.id, o]))
  for (const f of yeniFirsatlar) {
    const o = map.get(f.id)
    map.set(f.id, o ? { ...f, yazildi: o.yazildi, gizli: o.gizli, bulundu: o.bulundu } : f)
  }
  const birlesik = [...map.values()].sort((a, b) => b.skor - a.skor).slice(0, 200)
  await env.HABERLER.put('etkinlik:firsatlar', JSON.stringify(birlesik))
  return birlesik
}

// ── RSS/web kaynak taraması ───────────────────────────────────────────────────
async function webRssTara(env) {
  const kaynaklar = await kaynaklariGetir(env)
  const hedefler = kaynaklar.filter(k => (k.platform === 'rss' || k.platform === 'web') && k.aktif !== false)
  if (!hedefler.length) return { ok: true, mesaj: 'Web/RSS kaynağı yok', yeni: 0 }

  const gorulen = new Set(await env.HABERLER.get('etkinlik:gorulen', 'json') || [])
  const yeniFirsatlar = []

  for (const kaynak of hedefler) {
    try {
      const hedefUrl = kaynak.url || kaynak.handle
      const res = await fetch(hedefUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rdr-ist/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        cf: { cacheTtl: 0, cacheEverything: false },
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = rssAyristir(xml)

      for (const it of items) {
        const metin = (it.title || '') + ' ' + (it.description || '')
        if (karaListede(metin)) continue
        if (!kayseriIlgili(metin)) continue
        if (!etkinlikMi(metin)) continue
        const pid = hashId(it.link || it.title)
        if (gorulen.has(pid)) continue
        const yas = it.pubDate ? (Date.now() - Date.parse(it.pubDate)) / 36e5 : 0
        if (yas > 48) { gorulen.add(pid); continue }  // duyurunun kendisi 48s'ten eski olmasın
        const ts = it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString()
        const skor = etkinlikSkor({ ts, oncelik: kaynak.oncelik || 2 })

        yeniFirsatlar.push({
          id: pid, kaynak_tip: kaynak.platform, hesap: kaynak.etiket || hedefUrl, etiket: kaynak.etiket || 'Web/RSS',
          baslik: (it.title || it.description || '').slice(0, 200),
          tam_metin: (it.description || it.title || '').slice(0, 1000),
          link: it.link, gorsel_url: null, tip: 'etkinlik-duyuru', begeni: 0,
          pubDate: ts, oncelik: kaynak.oncelik || 2, skor, durum: etkinlikDurum(skor),
          yazildi: false, gizli: false, bulundu: new Date().toISOString(),
        })
        gorulen.add(pid)
      }
    } catch (_) {}
  }
  await firsatlariBirlestir(env, yeniFirsatlar)
  await env.HABERLER.put('etkinlik:gorulen', JSON.stringify([...gorulen].slice(-1500)))
  return { ok: true, yeni: yeniFirsatlar.length }
}

// ── Instagram taraması (Apify, iki fazlı — Sosyal Radar ile aynı desen) ──────
async function instagramTaramaBaslat(env) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN env tanımlı değil' }
  const kaynaklar = await kaynaklariGetir(env)
  const igHesaplar = kaynaklar.filter(k => k.platform === 'instagram' && k.aktif !== false)
  if (!igHesaplar.length) return { hata: 'Aktif Instagram hesabı yok' }

  const input = {
    directUrls: igHesaplar.map(k => `https://www.instagram.com/${k.handle}/`),
    resultsType: 'posts', resultsLimit: 4, addParentData: false,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  }
  const r = await fetch(`https://api.apify.com/v2/acts/${APIFY_IG_ACTOR}/runs?token=${env.APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const j = await r.json()
  if (!r.ok || !j.data) return { hata: 'Apify run başlatılamadı', detay: j }
  const run = { runId: j.data.id, datasetId: j.data.defaultDatasetId, baslangic: new Date().toISOString(), hesap_sayisi: igHesaplar.length }
  await env.HABERLER.put('etkinlik:apify_run', JSON.stringify(run))
  return { ok: true, baslatildi: run }
}

async function instagramSonucToparla(env, maxYasSaat = 48) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN yok' }
  const run = await env.HABERLER.get('etkinlik:apify_run', 'json')
  if (!run || !run.runId) return { ok: true, mesaj: 'Bekleyen run yok' }

  const sr = await fetch(`https://api.apify.com/v2/actor-runs/${run.runId}?token=${env.APIFY_TOKEN}`)
  const sj = await sr.json()
  const durum = sj.data && sj.data.status
  if (durum === 'RUNNING' || durum === 'READY') return { ok: true, mesaj: 'Run henüz bitmedi', durum }
  if (durum !== 'SUCCEEDED') { await env.HABERLER.delete('etkinlik:apify_run'); return { ok: false, mesaj: 'Run başarısız', durum } }

  const dr = await fetch(`https://api.apify.com/v2/datasets/${run.datasetId}/items?token=${env.APIFY_TOKEN}&clean=true&format=json`)
  const postlar = await dr.json()

  const kaynaklar = await kaynaklariGetir(env)
  const handleEtiket = new Map(kaynaklar.map(k => [String(k.handle).toLowerCase(), k]))
  const gorulen = new Set(await env.HABERLER.get('etkinlik:gorulen', 'json') || [])

  const yeniFirsatlar = []
  for (const p of (Array.isArray(postlar) ? postlar : [])) {
    const pid = p.id || p.shortCode || p.url
    if (!pid || gorulen.has(pid)) continue
    if (p.error) continue
    if (p.isPinned) { gorulen.add(pid); continue }
    const caption = p.caption || ''
    if (karaListede(caption)) continue
    if (!etkinlikMi(caption)) continue   // etkinlik anahtar kelimesi yoksa aday olmaz

    const postYas = p.timestamp ? (Date.now() - Date.parse(p.timestamp)) / 36e5 : 9999
    if (postYas > maxYasSaat) { gorulen.add(pid); continue }

    const kaynak = handleEtiket.get(String(p.ownerUsername || '').toLowerCase())
    const oncelik = kaynak ? (kaynak.oncelik || 2) : 2
    const etiket = kaynak ? kaynak.etiket : (p.ownerUsername || 'instagram')
    const ts = p.timestamp || null
    const skor = etkinlikSkor({ ts, oncelik })

    yeniFirsatlar.push({
      id: pid, kaynak_tip: 'instagram', hesap: p.ownerUsername, etiket,
      baslik: caption.slice(0, 200) || '(görsel/video — açıklama yok)',
      tam_metin: caption.slice(0, 1000), link: p.url, gorsel_url: p.displayUrl || (p.images && p.images[0]) || null,
      tip: p.type, begeni: p.likesCount || 0, pubDate: ts, oncelik, skor, durum: etkinlikDurum(skor),
      yazildi: false, gizli: false, bulundu: new Date().toISOString(),
    })
    gorulen.add(pid)
  }

  await firsatlariBirlestir(env, yeniFirsatlar)
  await env.HABERLER.put('etkinlik:gorulen', JSON.stringify([...gorulen].slice(-1500)))
  await env.HABERLER.delete('etkinlik:apify_run')

  const log = {
    zaman: new Date().toISOString(), cekilen_post: Array.isArray(postlar) ? postlar.length : 0,
    yeni_firsat: yeniFirsatlar.length,
    acil: yeniFirsatlar.filter(f => f.durum === 'acil').length,
    firsat: yeniFirsatlar.filter(f => f.durum === 'firsat').length,
  }
  await env.HABERLER.put('etkinlik:son_tarama', JSON.stringify(log))
  return { ok: true, log }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'kaynaklar'
  try {
    if (action === 'kaynaklar') {
      const liste = await kaynaklariGetir(env)
      const ozet = { toplam: liste.length, aktif: liste.filter(k => k.aktif !== false).length,
        platform_dagilim: liste.reduce((a, k) => { a[k.platform] = (a[k.platform] || 0) + 1; return a }, {}) }
      return Response.json({ ok: true, ozet, kaynaklar: liste }, { headers: CORS })
    }
    if (action === 'firsatlar') {
      const firsatlar = await env.HABERLER.get('etkinlik:firsatlar', 'json') || []
      const son = await env.HABERLER.get('etkinlik:son_tarama', 'json') || null
      return Response.json({ ok: true, firsatlar, son_tarama: son }, { headers: CORS })
    }
    if (action === 'tara') {
      const zorla = url.searchParams.get('force') === '1'
      const gun = Number(url.searchParams.get('gun')) || 2
      if (!taramaPenceresinde() && !zorla) {
        return Response.json({ ok: true, atlandi: 'Tarama penceresi dışında (08:00–00:00 TR)' }, { headers: CORS })
      }
      const web = await webRssTara(env).catch(e => ({ ok: false, mesaj: String(e).slice(0, 80) }))
      let ig
      const bekleyen = await env.HABERLER.get('etkinlik:apify_run', 'json')
      if (bekleyen && bekleyen.runId) ig = await instagramSonucToparla(env, gun * 24)
      else ig = await instagramTaramaBaslat(env)
      return Response.json({ ok: true, web, instagram: ig }, { headers: CORS })
    }
    if (action === 'topla') {
      const gun = Number(url.searchParams.get('gun')) || 2
      const r = await instagramSonucToparla(env, gun * 24)
      return Response.json(r, { status: r.ok ? 200 : 500, headers: CORS })
    }
    if (action === 'temizle') {
      await env.HABERLER.put('etkinlik:firsatlar', JSON.stringify([]))
      await env.HABERLER.put('etkinlik:gorulen', JSON.stringify([]))
      return Response.json({ ok: true, mesaj: 'Fırsat cache temizlendi' }, { headers: CORS })
    }
    return Response.json({ hata: 'Bilinmeyen action', mevcut: ['kaynaklar', 'firsatlar', 'tara', 'topla', 'temizle'] },
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
    if (!(await yetkili(secret, env, request))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
    let govde = {}
    try { govde = await request.json() } catch (_) {}

    if (action === 'kaynak-ekle') {
      const cozum = kaynagiCozumle(govde.girdi || govde.handle || govde.url)
      if (!cozum || !cozum.handle) return Response.json({ hata: 'Geçersiz girdi' }, { status: 400, headers: CORS })
      const yeni = { platform: cozum.platform, handle: cozum.handle, url: cozum.url || undefined,
        etiket: (govde.etiket || cozum.handle).slice(0, 80), oncelik: Number(govde.oncelik) || 2,
        aktif: govde.aktif !== false, eklendi: new Date().toISOString() }
      const liste = await kaynaklariGetir(env)
      if (liste.some(k => ayniKaynak(k, yeni))) return Response.json({ hata: 'Bu kaynak zaten var', kaynak: yeni }, { status: 409, headers: CORS })
      liste.push(yeni)
      await kaynaklariKaydet(env, liste)
      return Response.json({ ok: true, eklendi: yeni, toplam: liste.length }, { headers: CORS })
    }
    if (action === 'kaynak-sil') {
      const hedef = { platform: govde.platform, handle: govde.handle }
      const liste = await kaynaklariGetir(env)
      const kalan = liste.filter(k => !ayniKaynak(k, hedef))
      if (kalan.length === liste.length) return Response.json({ hata: 'Kaynak bulunamadı' }, { status: 404, headers: CORS })
      await kaynaklariKaydet(env, kalan)
      return Response.json({ ok: true, silindi: hedef, toplam: kalan.length }, { headers: CORS })
    }
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
    if (action === 'kaynak-topla-ekle') {
      const girdiler = Array.isArray(govde.girdiler) ? govde.girdiler : []
      const liste = await kaynaklariGetir(env)
      const eklenenler = []
      for (const g of girdiler) {
        const c = kaynagiCozumle(g)
        if (!c || !c.handle) continue
        const yeni = { platform: c.platform, handle: c.handle, url: c.url || undefined,
          etiket: c.handle, oncelik: 2, aktif: true, eklendi: new Date().toISOString() }
        if (!liste.some(k => ayniKaynak(k, yeni))) { liste.push(yeni); eklenenler.push(yeni) }
      }
      await kaynaklariKaydet(env, liste)
      return Response.json({ ok: true, eklenen_sayisi: eklenenler.length, toplam: liste.length, eklenenler }, { headers: CORS })
    }
    if (action === 'isaretle') {
      const { id, alan, deger } = govde
      if (!id || !['yazildi', 'gizli'].includes(alan)) return Response.json({ hata: 'Geçersiz' }, { status: 400, headers: CORS })
      const liste = await env.HABERLER.get('etkinlik:firsatlar', 'json') || []
      const f = liste.find(x => x.id === id)
      if (!f) return Response.json({ hata: 'Bulunamadı' }, { status: 404, headers: CORS })
      f[alan] = !!deger
      await env.HABERLER.put('etkinlik:firsatlar', JSON.stringify(liste))
      return Response.json({ ok: true, guncellendi: { id, alan, deger: f[alan] } }, { headers: CORS })
    }
    return Response.json({ hata: 'Bilinmeyen action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: String(e).slice(0, 200) }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }) }
