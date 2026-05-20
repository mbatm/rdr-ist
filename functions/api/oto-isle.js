/**
 * GET /api/oto-isle
 * 1ha RSS → Claude (Ahrefs keyword stratejisi ile) → KV → rdr.ist/api/feed
 * Hedef: kayserim.net günlük 60.000 ziyaretçi
 */

// ── AHREFS VERİSİNDEN ÇIKARILAN KEYWORD STRATEJİSİ ─────────────────────
// Güncelleme: /api/ahrefs-sync ile KV'den okunur, yoksa bu fallback kullanılır
const STRATEJI_FALLBACK = {
  global: {
    yuksek: ['kayseri son dakika','kayseri haber','kayseri altın fiyatları','kayseri radar'],
    firsat: ['kayseri son dakika haberleri','kayseri olay haber','kayseri trafik kazası son dakika'],
    slug_prefix: 'kayseri-',
  },
  kategori: {
    'Asayiş':  ['kayseri trafik kazası son dakika','kayseri asayiş','kayseri polis haberleri'],
    'Ekonomi': ['kayseri altın fiyatları','kayseri ekonomi','istikbal kayseri'],
    'Güncel':  ['kayseri son dakika','kayseri haber bugün','kayseri gündem'],
    'Kayseri': ['kayseri son dakika','kayseri haber','kayseri radar haber'],
    'Spor':    ['kayserispor son dakika','kayseri spor haberleri'],
    'Siyaset': ['kayseri siyaset','kayseri büyükşehir belediyesi'],
    'default': ['kayseri son dakika','kayseri haber','kayseri güncel'],
  }
}

function buildPrompt(haber, strateji) {
  const kat = haber.kategori || 'Güncel'
  const katKw = (strateji.kategori[kat] || strateji.kategori['default']).join(', ')
  const globalKw = strateji.global.yuksek.join(', ')

  return `Sen kayserim.net için kıdemli SEO editörüsün. Hedef: günlük 60.000 ziyaretçi.

HABER:
Başlık: ${haber.baslik.slice(0,200)}
Özet: ${haber.icerik.slice(0,300)}
Kategori: ${kat}

AHREFS VERİSİ (bu haberle ilgili):
Genel yüksek değer: ${globalKw}
Bu kategori hedefi: ${katKw}
Rakip: kayseriolay.com (DR:31), kayserianadoluhaber.com.tr (DR:35)

BAŞLIK KURALLARI:
- "Kayseri" mutlaka ilk 3 kelimede geçsin
- 55-65 karakter (SERP truncation önleme)
- Varsa rakam kullan ("35 araç", "86 şahıs" gibi)
- "Son dakika" veya "bugün" CTR'ı %40 artırır — ekle

SLUG KURALI: daima "kayseri-" ile başla, hedef keyword ilk 3 kelimede

SOSYAL BAŞLIK: max 7 kelime, duygusal, rakam içersin, Kayseri ile başlasın
(Bu başlık Instagram/Twitter görselinde kullanılacak)

SADECE şu JSON formatını döndür:
{
  "site_basligi": "55-65 kar SEO başlık",
  "h1_basligi": "H1 başlık",
  "sosyal_baslik": "max 7 kelime sosyal medya başlığı",
  "meta_description": "max 155 kar — ${katKw.split(',')[0]} içersin",
  "url_slug": "kayseri-ile-baslayan-slug",
  "optimize_icerik": "min 150 kelime, doğal Kayseri geçişleriyle",
  "ozet": "1 güçlü cümle",
  "instagram": "emoji+hashtag 150 kar — #kayseri #kayserihaber",
  "facebook": "100 kar metin",
  "x_twitter": "max 230 kar — #KayseriSonDakika",
  "youtube_baslik": "max 80 kar",
  "youtube_aciklama": "250 kar — kayserim.net linkini belirt",
  "hedef_kelimeler": ["${katKw.split(',')[0].trim()}","kayseri son dakika","kayseri haber"],
  "kategori": "${kat}",
  "oncelik": "orta",
  "gorsel_prompt": "realistic Turkish news photo, Kayseri Turkey, max 12 words"
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
    const encM = node.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="([^"]*)"/)
    let gorsel = '', video = ''
    if (encM) { if (encM[2].startsWith('video/')) video = encM[1]; else gorsel = encM[1] }
    if (!gorsel) gorsel = node.match(/<img[^>]*src="([^"]*)"/)?.[ 1] || ''
    if (bas.length > 5) items.push({ source_id:id, source_url:link, baslik:bas, icerik, gorsel, video, kategori:kat, tarih_iso: new Date(dt||Date.now()).toISOString() })
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
      max_tokens: 2000,
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
    const url   = new URL(request.url)
    const adet  = Math.min(parseInt(url.searchParams.get('adet')||'3'), 5)

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
          gorsel:haber.gorsel, gorsel_url:haber.gorsel, video:haber.video||'',
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
