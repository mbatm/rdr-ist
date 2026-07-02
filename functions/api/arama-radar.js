/**
 * ARAMA RADAR — rdr.ist / kayserim.net
 * ----------------------------------------------------------------------------
 * Kayseri ile ilgili anahtar kelimelerde Google arama sonuçlarını (SERP) tarar:
 *   - kayserim.net kaçıncı sırada / hiç yok mu (fırsat sinyali)
 *   - üstte çıkan rakip domainler (rakip analizi)
 *   - "People Also Ask" soruları — kayserim.net'te henüz cevaplanmamışsa
 *     doğrudan içerik fırsatı (SEO odaklı haber/rehber konusu)
 *
 * Apify'ın apify/google-search-scraper actor'ü kullanılır (iki fazlı: tara→topla).
 *
 *   arama:kelimeler     → manuel yönetilen keyword listesi
 *   arama:sonuclar      → son SERP tarama sonuçları (keyword bazlı)
 *   arama:firsatlar     → PAA'dan üretilen içerik fırsatları
 *   arama:apify_run     → bekleyen Apify run kimliği
 *   arama:son_tarama    → son tarama log'u
 * ----------------------------------------------------------------------------
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SERP_ACTOR = 'apify~google-search-scraper'
const BIZIM_DOMAIN = 'kayserim.net'

const VARSAYILAN_KELIMELER = [
  { kw: 'kayseri haber', oncelik: 1, aktif: true },
  { kw: 'kayseri son dakika', oncelik: 1, aktif: true },
  { kw: 'kayseri hava durumu', oncelik: 2, aktif: true },
  { kw: 'kayseri etkinlik', oncelik: 2, aktif: true },
  { kw: 'kayseri trafik', oncelik: 3, aktif: true },
]

async function kelimeleriGetir(env) {
  const kv = await env.HABERLER.get('arama:kelimeler', 'json')
  if (Array.isArray(kv) && kv.length) return kv
  return VARSAYILAN_KELIMELER
}
async function kelimeleriKaydet(env, liste) {
  await env.HABERLER.put('arama:kelimeler', JSON.stringify(liste))
}
function ayniKelime(a, b) {
  return String(a.kw).toLowerCase().trim() === String(b.kw).toLowerCase().trim()
}
async function yetkili(secret, env, request) {
  const ref = (request && request.headers.get('referer')) || ''
  if (ref.includes('rdr.ist') || ref.includes('kayserim.net')) return true
  if (env.RSS_API_KEY && secret === env.RSS_API_KEY) return true
  if (env.SOSYAL_SECRET && secret === env.SOSYAL_SECRET) return true
  return false
}
function hashId(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return 'a' + (h >>> 0).toString(36)
}
function domainCikar(u) {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch (_) { return '' }
}

// ── FAZ 1: SERP taramasını başlat ─────────────────────────────────────────────
async function taramaBaslat(env) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN env tanımlı değil' }
  const kelimeler = await kelimeleriGetir(env)
  const aktifler = kelimeler.filter(k => k.aktif !== false)
  if (!aktifler.length) return { hata: 'Aktif keyword yok' }

  const input = {
    queries: aktifler.map(k => k.kw).join('\n'),
    resultsPerPage: 10,
    maxPagesPerQuery: 1,
    countryCode: 'tr',
    languageCode: 'tr',
  }
  const r = await fetch(`https://api.apify.com/v2/acts/${SERP_ACTOR}/runs?token=${env.APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const j = await r.json()
  if (!r.ok || !j.data) return { hata: 'Apify run başlatılamadı', detay: j }
  const run = { runId: j.data.id, datasetId: j.data.defaultDatasetId, baslangic: new Date().toISOString(), kelime_sayisi: aktifler.length }
  await env.HABERLER.put('arama:apify_run', JSON.stringify(run))
  return { ok: true, baslatildi: run }
}

// ── FAZ 2: Sonucu topla, kayserim.net pozisyonu + rakipler + PAA fırsatları ───
async function sonucToparla(env) {
  if (!env.APIFY_TOKEN) return { hata: 'APIFY_TOKEN yok' }
  const run = await env.HABERLER.get('arama:apify_run', 'json')
  if (!run || !run.runId) return { ok: true, mesaj: 'Bekleyen run yok' }

  const sr = await fetch(`https://api.apify.com/v2/actor-runs/${run.runId}?token=${env.APIFY_TOKEN}`)
  const sj = await sr.json()
  const durum = sj.data && sj.data.status
  if (durum === 'RUNNING' || durum === 'READY') return { ok: true, mesaj: 'Run henüz bitmedi', durum }
  if (durum !== 'SUCCEEDED') { await env.HABERLER.delete('arama:apify_run'); return { ok: false, mesaj: 'Run başarısız', durum } }

  const dr = await fetch(`https://api.apify.com/v2/datasets/${run.datasetId}/items?token=${env.APIFY_TOKEN}&clean=true&format=json`)
  const sayfalar = await dr.json()

  const sonuclar = []
  const yeniFirsatlar = []
  const gorulenPaa = new Set(await env.HABERLER.get('arama:gorulen_paa', 'json') || [])

  for (const sayfa of (Array.isArray(sayfalar) ? sayfalar : [])) {
    const keyword = sayfa.searchQuery && sayfa.searchQuery.term
    if (!keyword) continue
    const organik = sayfa.organicResults || []

    // kayserim.net kaçıncı sırada?
    let pozisyon = null
    for (let i = 0; i < organik.length; i++) {
      const d = domainCikar(organik[i].url)
      if (d.includes(BIZIM_DOMAIN)) { pozisyon = i + 1; break }
    }

    // Üstte çıkan (ilk 5) rakip domainler
    const rakipler = organik.slice(0, 5)
      .map(o => ({ pozisyon: organik.indexOf(o) + 1, domain: domainCikar(o.url), baslik: o.title }))
      .filter(r => r.domain && !r.domain.includes(BIZIM_DOMAIN))

    sonuclar.push({
      keyword, pozisyon, rakipler,
      tarandi: new Date().toISOString(),
    })

    // "People Also Ask" → kayserim.net'te muhtemelen cevaplanmamış sorular = içerik fırsatı
    const paa = sayfa.peopleAlsoAsk || sayfa.relatedQuestions || []
    for (const soru of paa) {
      const soruMetni = soru.question || soru.title || (typeof soru === 'string' ? soru : '')
      if (!soruMetni) continue
      const pid = hashId(keyword + '|' + soruMetni)
      if (gorulenPaa.has(pid)) continue
      // Pozisyon yoksa (kayserim.net o kelimede hiç yok) fırsat skoru daha yüksek
      const skor = pozisyon === null ? 90 : pozisyon > 10 ? 75 : pozisyon > 5 ? 55 : 35
      yeniFirsatlar.push({
        id: pid, kaynak_tip: 'paa', anahtar_kelime: keyword,
        baslik: soruMetni.slice(0, 200),
        tam_metin: `"${keyword}" aramasında çıkan soru. kayserim.net pozisyonu: ${pozisyon ?? 'yok'}.`,
        skor, durum: skor >= 75 ? 'acil' : skor >= 50 ? 'firsat' : 'izle',
        yazildi: false, gizli: false, bulundu: new Date().toISOString(),
      })
      gorulenPaa.add(pid)
    }
  }

  await env.HABERLER.put('arama:sonuclar', JSON.stringify(sonuclar))
  await env.HABERLER.put('arama:gorulen_paa', JSON.stringify([...gorulenPaa].slice(-800)))

  // Fırsatları birleştir (eski yazıldı/gizli korunur)
  const onceki = await env.HABERLER.get('arama:firsatlar', 'json') || []
  const map = new Map(onceki.map(o => [o.id, o]))
  for (const f of yeniFirsatlar) {
    const o = map.get(f.id)
    map.set(f.id, o ? { ...f, yazildi: o.yazildi, gizli: o.gizli, bulundu: o.bulundu } : f)
  }
  const birlesik = [...map.values()].sort((a, b) => b.skor - a.skor).slice(0, 200)
  await env.HABERLER.put('arama:firsatlar', JSON.stringify(birlesik))
  await env.HABERLER.delete('arama:apify_run')

  const log = {
    zaman: new Date().toISOString(), taranan_kelime: sonuclar.length,
    yeni_firsat: yeniFirsatlar.length,
    pozisyon_yok: sonuclar.filter(s => s.pozisyon === null).length,
  }
  await env.HABERLER.put('arama:son_tarama', JSON.stringify(log))
  return { ok: true, log }
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'kelimeler'
  try {
    if (action === 'kelimeler') {
      const liste = await kelimeleriGetir(env)
      return Response.json({ ok: true, toplam: liste.length, kelimeler: liste }, { headers: CORS })
    }
    if (action === 'sonuclar') {
      const sonuclar = await env.HABERLER.get('arama:sonuclar', 'json') || []
      const son = await env.HABERLER.get('arama:son_tarama', 'json') || null
      return Response.json({ ok: true, sonuclar, son_tarama: son }, { headers: CORS })
    }
    if (action === 'firsatlar') {
      const firsatlar = await env.HABERLER.get('arama:firsatlar', 'json') || []
      const son = await env.HABERLER.get('arama:son_tarama', 'json') || null
      return Response.json({ ok: true, firsatlar, son_tarama: son }, { headers: CORS })
    }
    if (action === 'tara') {
      const bekleyen = await env.HABERLER.get('arama:apify_run', 'json')
      let r
      if (bekleyen && bekleyen.runId) r = await sonucToparla(env)
      else r = await taramaBaslat(env)
      return Response.json(r, { status: r.ok !== false ? 200 : 500, headers: CORS })
    }
    if (action === 'topla') {
      const r = await sonucToparla(env)
      return Response.json(r, { status: r.ok ? 200 : 500, headers: CORS })
    }
    if (action === 'temizle') {
      await env.HABERLER.put('arama:firsatlar', JSON.stringify([]))
      await env.HABERLER.put('arama:gorulen_paa', JSON.stringify([]))
      return Response.json({ ok: true, mesaj: 'Fırsat cache temizlendi' }, { headers: CORS })
    }
    if (action === 'seo') {
      const seo = await env.HABERLER.get('arama:seo', 'json') || null
      return Response.json({ ok: true, seo }, { headers: CORS })
    }

    // Ahrefs API v3'ten doğrudan tazeleme — env.AHREFS_TOKEN gerekli.
    // Token yoksa veri Claude oturumundan seo-yukle ile beslenir (anlık görüntü).
    if (action === 'seo-guncelle') {
      if (!(await yetkili(secret, env, request))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      if (!env.AHREFS_TOKEN) {
        return Response.json({ hata: 'AHREFS_TOKEN tanımlı değil. Cloudflare Pages → Settings → Environment variables bölümüne Ahrefs API anahtarı eklenirse bu buton doğrudan Ahrefs\'ten canlı çeker. O zamana kadar veriler Claude oturumundan güncellenir.' }, { status: 400, headers: CORS })
      }
      // API birimi koruması: 20 saatten taze veri varsa yeniden çekme (force=1 hariç)
      const mevcutSeo = await env.HABERLER.get('arama:seo', 'json')
      const force = url.searchParams.get('force') === '1'
      if (!force && mevcutSeo && (Date.now() - Date.parse(mevcutSeo.guncelleme)) < 20 * 36e5) {
        return Response.json({ ok: true, atlandi: true, sebep: 'Veri 20 saatten taze — Ahrefs birimi harcanmadı (zorlamak için force=1)', seo: mevcutSeo }, { headers: CORS })
      }
      const tarih = new Date().toISOString().slice(0, 10)
      const H = { 'Authorization': 'Bearer ' + env.AHREFS_TOKEN, 'Accept': 'application/json' }
      const cek = async (yol, params) => {
        const u = new URL('https://api.ahrefs.com/v3/' + yol)
        for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
        const r = await fetch(u.toString(), { headers: H })
        if (!r.ok) throw new Error(yol + ' → HTTP ' + r.status + ': ' + (await r.text()).slice(0, 150))
        return r.json()
      }
      const ortak = { target: 'kayserim.net', mode: 'subdomains', country: 'tr', date: tarih }
      const [kw, tp, oc] = await Promise.all([
        cek('site-explorer/organic-keywords', { ...ortak, limit: '100', order_by: 'volume:desc', select: 'keyword,best_position,volume,sum_traffic,best_position_url' }),
        cek('site-explorer/top-pages', { ...ortak, limit: '20', order_by: 'sum_traffic:desc', select: 'url,sum_traffic,keywords,top_keyword,top_keyword_best_position,top_keyword_volume' }),
        cek('site-explorer/organic-competitors', { ...ortak, limit: '10', select: 'competitor_domain,keywords_common,share,traffic,domain_rating' }),
      ])
      const seo = {
        guncelleme: new Date().toISOString(), kaynak: 'ahrefs-api', tarih,
        kelimeler: kw.keywords || [], sayfalar: tp.pages || [], rakipler: oc.competitors || [],
      }
      await env.HABERLER.put('arama:seo', JSON.stringify(seo))
      return Response.json({ ok: true, adet: { kelime: seo.kelimeler.length, sayfa: seo.sayfalar.length, rakip: seo.rakipler.length } }, { headers: CORS })
    }

    return Response.json({ hata: 'Bilinmeyen action', mevcut: ['kelimeler', 'sonuclar', 'firsatlar', 'tara', 'topla', 'temizle', 'seo', 'seo-guncelle'] },
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

    // SEO verisi ingest — Claude/MCP oturumundan veya harici betikten anlık görüntü yükleme
    if (action === 'seo-yukle') {
      const { kelimeler, sayfalar, rakipler } = body
      if (!Array.isArray(kelimeler) || !kelimeler.length)
        return Response.json({ hata: 'kelimeler dizisi gerekli' }, { status: 400, headers: CORS })
      const seo = {
        guncelleme: new Date().toISOString(), kaynak: body.kaynak || 'claude-mcp',
        tarih: body.tarih || new Date().toISOString().slice(0, 10),
        kelimeler, sayfalar: sayfalar || [], rakipler: rakipler || [],
      }
      await env.HABERLER.put('arama:seo', JSON.stringify(seo))
      return Response.json({ ok: true, adet: { kelime: kelimeler.length, sayfa: (sayfalar || []).length, rakip: (rakipler || []).length } }, { headers: CORS })
    }

    if (action === 'kelime-ekle') {
      const kw = String(govde.kw || '').trim().toLowerCase()
      if (!kw) return Response.json({ hata: 'Geçersiz kelime' }, { status: 400, headers: CORS })
      const yeni = { kw, oncelik: Number(govde.oncelik) || 2, aktif: true, eklendi: new Date().toISOString() }
      const liste = await kelimeleriGetir(env)
      if (liste.some(k => ayniKelime(k, yeni))) return Response.json({ hata: 'Bu kelime zaten var' }, { status: 409, headers: CORS })
      liste.push(yeni)
      await kelimeleriKaydet(env, liste)
      return Response.json({ ok: true, eklendi: yeni, toplam: liste.length }, { headers: CORS })
    }
    if (action === 'kelime-topla-ekle') {
      const kelimeler = Array.isArray(govde.kelimeler) ? govde.kelimeler : []
      const liste = await kelimeleriGetir(env)
      const eklenenler = []
      for (const k of kelimeler) {
        const kw = String(k || '').trim().toLowerCase()
        if (!kw) continue
        const yeni = { kw, oncelik: 2, aktif: true, eklendi: new Date().toISOString() }
        if (!liste.some(x => ayniKelime(x, yeni))) { liste.push(yeni); eklenenler.push(yeni) }
      }
      await kelimeleriKaydet(env, liste)
      return Response.json({ ok: true, eklenen_sayisi: eklenenler.length, toplam: liste.length }, { headers: CORS })
    }
    if (action === 'kelime-sil') {
      const liste = await kelimeleriGetir(env)
      const kalan = liste.filter(k => !ayniKelime(k, { kw: govde.kw }))
      if (kalan.length === liste.length) return Response.json({ hata: 'Kelime bulunamadı' }, { status: 404, headers: CORS })
      await kelimeleriKaydet(env, kalan)
      return Response.json({ ok: true, toplam: kalan.length }, { headers: CORS })
    }
    if (action === 'kelime-guncelle') {
      const liste = await kelimeleriGetir(env)
      const k = liste.find(x => ayniKelime(x, govde))
      if (!k) return Response.json({ hata: 'Kelime bulunamadı' }, { status: 404, headers: CORS })
      if (typeof govde.aktif === 'boolean') k.aktif = govde.aktif
      if (govde.oncelik) k.oncelik = Number(govde.oncelik)
      await kelimeleriKaydet(env, liste)
      return Response.json({ ok: true, guncellendi: k }, { headers: CORS })
    }
    if (action === 'isaretle') {
      const { id, alan, deger } = govde
      if (!id || !['yazildi', 'gizli'].includes(alan)) return Response.json({ hata: 'Geçersiz' }, { status: 400, headers: CORS })
      const liste = await env.HABERLER.get('arama:firsatlar', 'json') || []
      const f = liste.find(x => x.id === id)
      if (!f) return Response.json({ hata: 'Bulunamadı' }, { status: 404, headers: CORS })
      f[alan] = !!deger
      await env.HABERLER.put('arama:firsatlar', JSON.stringify(liste))
      return Response.json({ ok: true }, { headers: CORS })
    }
    return Response.json({ hata: 'Bilinmeyen action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: String(e).slice(0, 200) }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }) }
