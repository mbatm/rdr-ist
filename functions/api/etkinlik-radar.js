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

// Geçmişte olmuş/bitmiş etkinlik anlatan (recap) postlar — ileriye dönük duyuru değil
const GECMIS_ETKINLIK_TERIMLERI = [
  'gerçekleşti', 'gerceklesti', 'tamamlandı', 'tamamlandi', 'sona erdi',
  'başarıyla tamamlandı', 'basariyla tamamlandi', 'ile devam etti',
  'katılım sağladı', 'katilim sagladi', 'düzenlendi', 'duzenlendi',
  'coşkuyla kutlandı', 'coskuyla kutlandi', 'ile sonlandı', 'ile sonlandi',
  'geride bıraktık', 'geride biraktik', 'ağırladık', 'agirladik',
  'teşekkür ederiz', 'tesekkur ederiz', 'yoğun katılımla', 'yogun katilimla',
]
function gecmisEtkinlikMi(metin) {
  const m = (metin || '').toLowerCase()
  return GECMIS_ETKINLIK_TERIMLERI.some(t => m.includes(t))
}

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

  // http(s):// ile başlıyorsa native URL parser kullan — regex'in aksine path olmayan
  // ("https://site.com/" veya "https://site.com/?q=1") adresleri de doğru ayrıştırır.
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      const host = u.hostname.toLowerCase()
      const ilkSegment = u.pathname.split('/').filter(Boolean)[0] || ''
      const seg = ilkSegment.replace(/^@/, '')
      // Tam hostname eşleşmesi (substring DEĞİL) — yoksa "biletix.com" içindeki
      // "x.com" parçası Twitter sanılıyor, benzer adresler de yanıltabilir.
      const hostEsit = (h, alan) => h === alan || h.endsWith('.' + alan)
      if (hostEsit(host, 'instagram.com') && seg) return { platform: 'instagram', handle: seg }
      if ((hostEsit(host, 'twitter.com') || hostEsit(host, 'x.com')) && seg) return { platform: 'twitter', handle: seg }
      if (hostEsit(host, 'facebook.com') && seg) return { platform: 'facebook', handle: seg }
      // Sosyal medya değilse (ya da path yoksa) → web kaynağı, tam URL saklanır
      return { platform: 'web', handle: s, url: s }
    } catch (_) {
      return { platform: 'web', handle: s, url: s }
    }
  }

  // http ile başlamıyorsa düz @handle/kullanıcı adı — Instagram varsay
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

// ── Metin içinden etkinlik tarihi çıkarımı ────────────────────────────────────
const AY_ISIMLERI = {
  'ocak':1,'şubat':2,'subat':2,'mart':3,'nisan':4,'mayıs':5,'mayis':5,'haziran':6,
  'temmuz':7,'ağustos':8,'agustos':8,'eylül':9,'eylul':9,'ekim':10,'kasım':11,'kasim':11,'aralık':12,'aralik':12,
}
// "5 Temmuz", "12 Ağustos Cumartesi", "18.07.2026", "18/07" gibi kalıpları yakalar.
// Bulamazsa null döner — post tarihi (paylaşım anı) fallback olarak kullanılır.
// Dönüş: { tarih: ISOString|null, kesinGecmis: boolean }
// kesinGecmis=true → metinde net (yıl belirtilmiş) bir GEÇMİŞ tarih bulundu, bu kesin bir recap/bitmiş etkinlik demektir.
function etkinlikTarihiCikar(metin, referansTs) {
  if (!metin) return { tarih: null, kesinGecmis: false }
  const postZamani = referansTs ? new Date(referansTs) : new Date()
  const gercekSimdi = new Date()
  const yil = postZamani.getUTCFullYear()

  // 1) "18.07.2026" / "18/07/2026" / "18-07-2026" — yıl belirtilmiş, kaydırma yapılmaz.
  let m = metin.match(/\b(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})\b/)
  if (m) {
    const [, g, a, y] = m
    const d = new Date(Date.UTC(+y, +a - 1, +g))
    if (!isNaN(d)) {
      if (d < gercekSimdi) return { tarih: null, kesinGecmis: true }
      return { tarih: d.toISOString(), kesinGecmis: false }
    }
  }
  // 2) "18.07" / "18/07" (yıl yok, referans yılı kullan — geçmişse gelecek yıla al)
  m = metin.match(/\b(\d{1,2})[.\/](\d{1,2})\b/)
  if (m) {
    const [, g, a] = m
    if (+a >= 1 && +a <= 12 && +g >= 1 && +g <= 31) {
      let d = new Date(Date.UTC(yil, +a - 1, +g))
      if (d < gercekSimdi) d = new Date(Date.UTC(yil + 1, +a - 1, +g))
      if (!isNaN(d)) return { tarih: d.toISOString(), kesinGecmis: false }
    }
  }
  // 3) "5 Temmuz", "12 Ağustos Cumartesi" (ay ismi Türkçe)
  const ayRegex = new RegExp('\\b(\\d{1,2})\\s+(' + Object.keys(AY_ISIMLERI).join('|') + ')\\b', 'i')
  m = metin.toLowerCase().match(ayRegex)
  if (m) {
    const gun = +m[1]
    const ay = AY_ISIMLERI[m[2]]
    if (gun >= 1 && gun <= 31) {
      let d = new Date(Date.UTC(yil, ay - 1, gun))
      if (d < gercekSimdi) d = new Date(Date.UTC(yil + 1, ay - 1, gun))
      if (!isNaN(d)) return { tarih: d.toISOString(), kesinGecmis: false }
    }
  }
  return { tarih: null, kesinGecmis: false }
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
  const birlesik = [...map.values()].sort((a, b) => Date.parse(b.pubDate || 0) - Date.parse(a.pubDate || 0)).slice(0, 200)
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
        if (gecmisEtkinlikMi(metin)) continue   // "gerçekleşti/tamamlandı" → recap, at
        const pid = hashId(it.link || it.title)
        if (gorulen.has(pid)) continue
        const yas = it.pubDate ? (Date.now() - Date.parse(it.pubDate)) / 36e5 : 0
        if (yas > 48) { gorulen.add(pid); continue }  // duyurunun kendisi 48s'ten eski olmasın
        const ts = it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString()
        const skor = etkinlikSkor({ ts, oncelik: kaynak.oncelik || 2 })
        const tarihSonuc = etkinlikTarihiCikar(metin, ts)
        if (tarihSonuc.kesinGecmis) { gorulen.add(pid); continue }   // net geçmiş tarih → bitmiş, at

        yeniFirsatlar.push({
          id: pid, kaynak_tip: kaynak.platform, hesap: kaynak.etiket || hedefUrl, etiket: kaynak.etiket || 'Web/RSS',
          baslik: (it.title || it.description || '').slice(0, 200),
          tam_metin: (it.description || it.title || '').slice(0, 1000),
          link: it.link, gorsel_url: null, tip: 'etkinlik-duyuru', begeni: 0,
          pubDate: ts, etkinlik_tarihi: tarihSonuc.tarih, oncelik: kaynak.oncelik || 2, skor, durum: etkinlikDurum(skor),
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
  const HANDLE_REGEX = /^[A-Za-z0-9._-]+$/
  const igHesaplarTumu = kaynaklar.filter(k => k.platform === 'instagram' && k.aktif !== false)
  // Geçersiz handle'ları (Türkçe karakter, URL kalıntısı vb.) ayıkla — tek bozuk kayıt
  // Apify'ın tüm run'ı reddetmesine sebep oluyordu, artık sessizce atlanıyor.
  const igHesaplar = igHesaplarTumu.filter(k => HANDLE_REGEX.test(k.handle))
  const gecersizler = igHesaplarTumu.filter(k => !HANDLE_REGEX.test(k.handle))
  if (!igHesaplar.length) return { hata: 'Aktif Instagram hesabı yok', gecersiz_atlanan: gecersizler.map(k => k.handle) }

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
  return { ok: true, baslatildi: run, gecersiz_atlanan: gecersizler.length ? gecersizler.map(k => k.handle) : undefined }
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

    const kaynak = handleEtiket.get(String(p.ownerUsername || '').toLowerCase())
    const etiket = kaynak ? kaynak.etiket : (p.ownerUsername || 'instagram')
    if (!kayseriIlgili(caption) && !kayseriIlgili(etiket)) continue   // Kayseri/ilçe ile ilgisiz → at
    if (gecmisEtkinlikMi(caption)) { gorulen.add(pid); continue }     // "gerçekleşti/tamamlandı" → recap, at

    const postYas = p.timestamp ? (Date.now() - Date.parse(p.timestamp)) / 36e5 : 9999
    if (postYas > maxYasSaat) { gorulen.add(pid); continue }

    const oncelik = kaynak ? (kaynak.oncelik || 2) : 2
    const ts = p.timestamp || null
    const skor = etkinlikSkor({ ts, oncelik })
    const tarihSonuc = etkinlikTarihiCikar(caption, ts)
    if (tarihSonuc.kesinGecmis) { gorulen.add(pid); continue }        // net geçmiş tarih → bitmiş etkinlik, at

    yeniFirsatlar.push({
      id: pid, kaynak_tip: 'instagram', hesap: p.ownerUsername, etiket,
      baslik: caption.slice(0, 200) || '(görsel/video — açıklama yok)',
      tam_metin: caption.slice(0, 1000), link: p.url, gorsel_url: p.displayUrl || (p.images && p.images[0]) || null, video_url: p.videoUrl || null,
      tip: p.type, begeni: p.likesCount || 0, pubDate: ts, etkinlik_tarihi: tarihSonuc.tarih, oncelik, skor, durum: etkinlikDurum(skor),
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
// ── Canlı etkinlik için AI destekli alternatif başlık üretimi ────────────────
// Post'un GERÇEK içeriğinden ayrılmadan, sadece farklı vurgu/açı sunar — uydurma yok.
async function canliAlternatifUret(env, firsatId) {
  if (!env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY tanımlı değil' }
  const liste = await env.HABERLER.get('etkinlik:firsatlar', 'json') || []
  const f = liste.find(x => x.id === firsatId)
  if (!f) return { ok: false, error: 'Fırsat bulunamadı' }

  // Daha önce üretilmişse tekrar üretme (maliyet tasarrufu)
  if (f._alternatifler) return { ok: true, alternatifler: f._alternatifler, onbellek: true }

  const tarihMetin = f.etkinlik_tarihi
    ? new Date(f.etkinlik_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    : 'belirtilmemiş'

  const sistem = `Sen kayserim.net'in yerel haber editörüsün. Verilen sosyal medya paylaşımının GERÇEK içeriğine sadık kalarak farklı haber açıları önerirsin. METİNDE OLMAYAN HİÇBİR BİLGİ EKLEME — sayı, isim, detay uydurma. Sadece verilen bilgiyi farklı vurgu/başlıklarla sun. Sadece JSON döndür.`
  const kullanici = `KAYNAK: ${f.etiket || f.hesap}
PAYLAŞIM: ${f.tam_metin || f.baslik}
ETKİNLİK TARİHİ: ${tarihMetin}

Bu paylaşımdan yola çıkarak editörün seçebileceği 2-3 farklı haber başlığı öner. Her biri AYNI gerçek bilgiye dayanmalı, sadece farklı okuyucu ilgisine/açıya hitap etmeli (örn: pratik bilgi odaklı, etkinlik önemi odaklı, katılım çağrısı odaklı). Her biri için 1 cümlelik brief ver.
Sadece JSON döndür: {"alternatifler":[{"baslik":"...","aci":"..."}]}`

  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 30000)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, system: sistem, messages: [{ role: 'user', content: kullanici }] }),
      signal: ctrl.signal,
    })
    clearTimeout(to)
    const data = await r.json()
    if (data.error) return { ok: false, error: data.error?.message || 'Anthropic hatası' }
    const raw = data.content?.[0]?.text || ''
    const jm = raw.match(/\{[\s\S]*\}/)
    if (!jm) return { ok: false, error: 'JSON parse hatası' }
    const parsed = JSON.parse(jm[0])
    const alternatifler = parsed.alternatifler || []

    // Cache'le — fırsat listesine yaz
    f._alternatifler = alternatifler
    await env.HABERLER.put('etkinlik:firsatlar', JSON.stringify(liste))
    return { ok: true, alternatifler }
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Zaman aşımı' : e.message }
  }
}

// Seçilen alternatif açıdan tam haber metni üretir — kaynak içeriğe sadık, ekleme yok.
async function canliTaslakUret(env, firsatId, altId) {
  if (!env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY tanımlı değil' }
  const liste = await env.HABERLER.get('etkinlik:firsatlar', 'json') || []
  const f = liste.find(x => x.id === firsatId)
  if (!f) return { ok: false, error: 'Fırsat bulunamadı' }
  const alt = (f._alternatifler || [])[altId]
  if (!alt) return { ok: false, error: 'Alternatif bulunamadı' }

  const tarihMetin = f.etkinlik_tarihi
    ? new Date(f.etkinlik_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : ''

  const sistem = `Sen kayserim.net'in yerel haber editörüsün. Kayseri merkezli, SEO uyumlu haber yazarsın. SADECE verilen kaynak paylaşımdaki bilgileri kullan — yeni bilgi, sayı, isim, detay UYDURMA/EKLEME. Sadece JSON döndür.`
  const kullanici = `KAYNAK PAYLAŞIM (${f.etiket || f.hesap}): ${f.tam_metin || f.baslik}
ETKİNLİK TARİHİ: ${tarihMetin || 'belirtilmemiş'}
SEÇİLEN HABER AÇISI: ${alt.baslik}
BRIEF: ${alt.aci}

KURALLAR:
- Başlık seçilen açıya uygun olsun
- 200-350 kelime, SADECE kaynak paylaşımdaki bilgileri kullan
- Kesinleşmemiş detay yoksa (saat/yer net değilse) uydurma, "etkinlik detayları" gibi genel ifade kullan
- Sadece JSON döndür: {"baslik":"...","metin":"...","kategori":"Güncel"}`

  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 30000)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: sistem, messages: [{ role: 'user', content: kullanici }] }),
      signal: ctrl.signal,
    })
    clearTimeout(to)
    const data = await r.json()
    if (data.error) return { ok: false, error: data.error?.message || 'Anthropic hatası' }
    const raw = data.content?.[0]?.text || ''
    const jm = raw.match(/\{[\s\S]*\}/)
    if (!jm) return { ok: false, error: 'JSON parse hatası' }
    const parsed = JSON.parse(jm[0])
    return { ok: true, baslik: parsed.baslik || alt.baslik, metin: parsed.metin || '', kategori: parsed.kategori || 'Güncel' }
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Zaman aşımı' : e.message }
  }
}

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
    // GEÇİCİ TEŞHİS: Biletix API endpoint keşfi — adaylar Worker içinde sabit
    if (action === 'biletix-teshis') {
      const ADAYLAR = {
        '1': 'https://www.biletix.com/solr/tr/select/?q=*:*&fq=city:Kayseri&wt=json&rows=3',
        '2': 'https://www.biletix.com/solr/en/select/?q=*:*&fq=city:"Kayseri"&wt=json&rows=3',
        '3': 'https://www.biletix.com/sitemap.xml',
        '4': 'https://www.biletix.com/solr/tr/select/?q=*:*&rows=3&wt=json',
      }
      const hedef = ADAYLAR[url.searchParams.get('aday') || '1']
      if (!hedef) return Response.json({ hata: 'aday 1-4' }, { headers: CORS })
      const res = await fetch(hedef, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://www.biletix.com/' },
        cf: { cacheTtl: 0, cacheEverything: false },
      })
      const govde = await res.text()
      return Response.json({ status: res.status, tip: res.headers.get('content-type'), ilk800: govde.slice(0, 800) }, { headers: CORS })
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

    // GEÇİCİ TEŞHİS (POST): Biletix API keşfi — URL body'de gelir, sadece biletix.com
    if (action === 'biletix-teshis-post') {
      const hedef = String(govde.u || '')
      let h
      try { h = new URL(hedef).hostname } catch (_) { return Response.json({ hata: 'geçersiz url' }, { headers: CORS }) }
      if (!(h === 'biletix.com' || h.endsWith('.biletix.com'))) {
        return Response.json({ hata: 'sadece biletix.com' }, { status: 400, headers: CORS })
      }
      const res = await fetch(hedef, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://www.biletix.com/' },
        cf: { cacheTtl: 0, cacheEverything: false },
      })
      const govdeMetin = await res.text()
      return Response.json({ status: res.status, tip: res.headers.get('content-type'), ilk800: govdeMetin.slice(0, 800) }, { headers: CORS })
    }
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
    if (action === 'alternatif-uret') {
      const r = await canliAlternatifUret(env, govde.id)
      return Response.json(r, { status: r.ok ? 200 : 500, headers: CORS })
    }
    if (action === 'canli-taslak-uret') {
      const r = await canliTaslakUret(env, govde.id, govde.alt_id ?? 0)
      return Response.json(r, { status: r.ok ? 200 : 500, headers: CORS })
    }
    return Response.json({ hata: 'Bilinmeyen action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: String(e).slice(0, 200) }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }) }
