/**
 * GET /api/radar-fb-sync
 * radarkayseri Facebook sayfasının gönderilerini çeker
 * → Reklam/işbirliği içerikleri filtreler
 * → KV'ye radar_fb_posts olarak kaydeder
 * → /api/radar-rss ile RSS olarak sunulur
 */

// Reklam/işbirliği tespit — bu pattern'leri içeren gönderiler atlanır
const REKLAM_PATTERNS = [
  '#reklam', '#sponsor', '#işbirliği', '#isbirligi', '#tanıtım', '#tanitim',
  '#ilan', '#ilandır', '#paid', '#ad', '#advertisement',
  'reklam içeriklidir', 'sponsorlu', 'işbirliği ile', 'tanıtım içerikli',
  'reklam', // tek başına geçiyorsa dikkatli ol — context'e bak
]

// Reklam tespiti — hashtag + bağlam kontrolü
function isReklam(mesaj) {
  if (!mesaj) return false
  const lower = mesaj.toLowerCase()

  // Güçlü sinyaller — kesin reklam
  const kesinReklam = [
    '#reklam', '#sponsor', '#işbirliği', '#isbirligi',
    '#tanıtım', '#tanitim', 'reklam içeriklidir',
    'sponsorlu içerik', 'işbirliği ile hazırlanmıştır',
    'tanıtım amaçlıdır', '#paid partnership',
  ]
  if (kesinReklam.some(p => lower.includes(p))) return true

  // Zayıf sinyal — bağlama bak
  if (lower.includes('reklam') && (
    lower.includes('için') || lower.includes('hizmeti') ||
    lower.includes('fırsatı') || lower.includes('kampanya')
  )) return true

  return false
}

// Facebook post'u habere dönüştür
function postToHaber(post, sayfaAdi) {
  const mesaj   = post.message || post.story || ''
  const gorsel  = post.full_picture || post.picture || ''
  const fbLink  = `https://www.facebook.com/${post.id.replace('_', '/posts/')}`
  const tarih   = post.created_time || new Date().toISOString()

  // Başlık: mesajın ilk satırı veya ilk 100 karakter
  const satirlar = mesaj.split('\n').filter(s => s.trim())
  const baslik   = (satirlar[0] || mesaj).slice(0, 100).trim()

  // İçerik: mesajın tamamı
  const icerik = mesaj.slice(0, 1000)

  return {
    source_id:   `fb_${post.id}`,
    source_url:  fbLink,
    baslik,
    icerik,
    gorsel,
    gorsel_url:  gorsel,
    fb_link:     fbLink,
    fb_post_id:  post.id,
    kategori:    'Kayseri',
    tarih_iso:   tarih,
    kaynak:      sayfaAdi,
    tip:         'facebook',
  }
}

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url)
  const secret = url.searchParams.get('secret')
  if (secret !== env.RSS_API_KEY)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  // meta_tokens'tan sayfa token'ını al
  const meta = await env.HABERLER.get('meta_tokens', 'json')
  if (!meta?.hesaplar) return Response.json({ hata: 'Meta token bulunamadı' }, { status: 500 })

  // radarkayseri sayfasını bul
  const sayfa = meta.hesaplar.find(h =>
    h.page_name?.toLowerCase().includes('radar kayseri') ||
    h.page_name?.toLowerCase().includes('radarkayseri') ||
    h.ig_username?.toLowerCase().includes('radarkayseri')
  )

  if (!sayfa) {
    // Tüm sayfaları listele — hangisi olduğunu göster
    return Response.json({
      hata: 'radarkayseri sayfası bulunamadı',
      mevcut_sayfalar: meta.hesaplar.map(h => ({ id: h.page_id, ad: h.page_name, ig: h.ig_username }))
    }, { status: 404 })
  }

  const pageToken = sayfa.page_token || meta.system_token
  const pageId    = sayfa.page_id
  const sayfaAdi  = sayfa.page_name

  // Son 50 gönderiyi çek
  const fields = 'id,message,story,created_time,full_picture,picture,permalink_url,attachments'
  const fbRes  = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/posts?fields=${fields}&limit=50&access_token=${pageToken}`,
    { headers: { 'Accept-Charset': 'utf-8' } }
  )
  if (!fbRes.ok) {
    const err = await fbRes.text()
    return Response.json({ hata: `FB API hatası: ${fbRes.status} — ${err.slice(0,200)}` }, { status: 500 })
  }

  // UTF-8 encoding garantisi
  const fbText = await fbRes.text()
  const fbData = JSON.parse(fbText)
  const posts  = fbData.data || []

  // Filtrele ve dönüştür
  const haberler  = []
  const atlananlar = []

  for (const post of posts) {
    const mesaj = post.message || post.story || ''
    if (!mesaj || mesaj.length < 20) continue  // çok kısa — atla

    if (isReklam(mesaj)) {
      atlananlar.push({ id: post.id, sebep: 'reklam', onizleme: mesaj.slice(0,60) })
      continue
    }

    haberler.push(postToHaber(post, sayfaAdi))
  }

  // KV'ye kaydet (10 gün)
  const mevcut = await env.HABERLER.get('radar_fb_posts', 'json') || []
  const mevcutIds = new Set(mevcut.map(h => h.source_id))

  // Yeni olanları ekle, toplam 200 ile sınırla
  const yeniHaberler = haberler.filter(h => !mevcutIds.has(h.source_id))
  const guncellenmis = [...yeniHaberler, ...mevcut].slice(0, 200)

  await env.HABERLER.put('radar_fb_posts', JSON.stringify(guncellenmis), {
    expirationTtl: 60 * 60 * 24 * 10
  })

  return Response.json({
    ok: true,
    sayfa:      sayfaAdi,
    cekildi:    posts.length,
    eklendi:    yeniHaberler.length,
    toplam:     guncellenmis.length,
    filtrelendi: atlananlar.length,
    atlananlar: atlananlar.slice(0, 5),
  })
}
