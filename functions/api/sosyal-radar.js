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

    return Response.json({ hata: 'Bilinmeyen action', mevcut: ['kaynaklar', 'durum', 'firsatlar'] },
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
