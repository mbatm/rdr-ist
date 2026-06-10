// functions/api/kayseradar-paylas.js
// Kayseradar kaydını sosyal medyaya paylaşır

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })
  if (kullanici.modul_kayseradar === false)
    return Response.json({ hata: 'Kayseradar yetkisi yok' }, { status: 403 })

  try {
    const { id, platformlar = [], fb_page_ids = [], ig_ids = [], tw = false, galeri_urls = [], ig_kolabor = [] } = await request.json()
    if (!id) return Response.json({ hata: 'id zorunlu' }, { status: 400 })

    const kayit = await env.HABERLER.get(`radar:${id}`, 'json')
    if (!kayit) return Response.json({ hata: 'Kayıt bulunamadı' }, { status: 404 })

    const sonuclar = {}
    const API_KEY  = env.RSS_API_KEY

    // Render URL — KV'den al (polling tarafından yazılmış olmalı)
    // Video render varsa onu al — görsel render değil
    const videoRender  = kayit.creatomate?.find(r => r.url && r.tip === 'video')
    const gorselRender = kayit.creatomate?.find(r => r.url && r.url.length > 10)
    const renderKayit  = videoRender || gorselRender
    const medyaUrl     = renderKayit?.url || kayit.gorsel_url || ''
    const isVideo      = renderKayit?.tip === 'video' || medyaUrl.includes('.mp4')

    console.log('Paylaşım medyaUrl:', medyaUrl, 'isVideo:', isVideo)
    if (!medyaUrl) {
      return Response.json({ hata: 'Render henüz hazır değil. Lütfen render tamamlanınca tekrar dene.' }, { status: 400 })
    }

    // Hesapları al — UI'dan geldiyse kullan, yoksa tüm hesapları kullan
    let fbIds = fb_page_ids
    let igIds = ig_ids
    if (!fbIds.length || !igIds.length) {
      const hesaplar = await env.HABERLER.get('meta_hesaplar', 'json') || {}
      if (!fbIds.length) fbIds = (hesaplar.facebook || []).map(h => h.page_id)
      if (!igIds.length) igIds = (hesaplar.instagram || []).map(h => h.ig_id)
    }

    // ── FACEBOOK / INSTAGRAM ──────────────────────────────────────────────────
    if (platformlar.includes('facebook') || platformlar.includes('instagram')) {
      // Galeri görselleri — kayit.medyalar'dan kapak dışındakileri al
      // Galeri görselleri — kapak olarak kullanılan görseli çıkar
      // medyaUrl render edilmiş URL, orijinal görsel kayit.gorsel_url'de — ikisini de çıkar
      const kapakUrls = new Set([medyaUrl, kayit.gorsel_url].filter(Boolean))
      const galeriUrls = galeri_urls.length > 0
        ? galeri_urls
        : (kayit.medyalar || []).filter(m => m.tip === 'gorsel' && !kapakUrls.has(m.url)).map(m => m.url)
      const isCarousel = !isVideo && platformlar.includes('instagram') && galeriUrls.length > 0

      const metaPayload = {
        gorsel_url:   isVideo ? undefined : medyaUrl,
        video_url:    isVideo ? medyaUrl  : undefined,
        is_video:     isVideo,
        is_carousel:  isCarousel,
        galeri_urls:  isCarousel ? [medyaUrl, ...galeriUrls] : undefined,
        ig_kolabor:   ig_kolabor.length ? ig_kolabor : undefined,
        metin:       platformlar.includes('instagram') ? kayit.ig_metni : kayit.fb_metni,
        baslik:      kayit.baslik,
        platform:    platformlar.includes('facebook') && platformlar.includes('instagram')
                       ? 'her_ikisi'
                       : platformlar.includes('facebook') ? 'facebook' : 'instagram',
        fb_page_ids: fbIds.length ? fbIds : undefined,
        ig_ids:      igIds.length ? igIds : undefined,
        source_id:   id,
      }

      if (medyaUrl) {
        const metaRes  = await fetch('https://rdr.ist/api/meta-paylas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
          body: JSON.stringify(metaPayload),
        })
        try { const t = await metaRes.text(); sonuclar.meta = t ? JSON.parse(t) : { ok: true } }
        catch(e) { sonuclar.meta = { hata: 'Meta parse hatası' } }
      } else {
        sonuclar.meta = { hata: 'Görsel URL gerekli' }
      }
    }

    // ── TWITTER ───────────────────────────────────────────────────────────────
    if (tw || platformlar.includes('twitter')) {
      const twRes  = await fetch('https://rdr.ist/api/twitter-paylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          metin:     kayit.tw_metni || kayit.baslik,
          gorselUrl: isVideo ? undefined : medyaUrl,
          videoUrl:  isVideo ? medyaUrl  : undefined,
        }),
      })
      try { const t = await twRes.text(); sonuclar.twitter = t ? JSON.parse(t) : { ok: true } }
      catch(e) { sonuclar.twitter = { hata: 'Twitter parse hatası' } }
    }

    // ── Durumu güncelle ───────────────────────────────────────────────────────
    const paylasimlar = kayit.paylasimlar || {}
    if (sonuclar.meta?.facebook)  paylasimlar.facebook  = { tarih: new Date().toISOString(), sonuc: sonuclar.meta.facebook }
    if (sonuclar.meta?.instagram) paylasimlar.instagram = { tarih: new Date().toISOString(), sonuc: sonuclar.meta.instagram }
    if (sonuclar.twitter?.basarili) paylasimlar.twitter = { tarih: new Date().toISOString(), tweet_url: sonuclar.twitter.tweet_url }

    const guncellendi = {
      ...kayit,
      durum:     'yayinda',
      paylasimlar,
      yayinlayan: kullanici.kullanici,
      yayinlayan_ad: kullanici.ad || kullanici.kullanici,
      yayinlandi: new Date().toISOString(),
    }
    await env.HABERLER.put(`radar:${id}`, JSON.stringify(guncellendi))

    // Liste güncelle
    const liste = await env.HABERLER.get('radar_panel_liste', 'json') || []
    const idx   = liste.findIndex(l => l.id === id)
    if (idx >= 0) liste[idx].durum = 'yayinda'
    await env.HABERLER.put('radar_panel_liste', JSON.stringify(liste))

    // Log
    try {
      const logAll = await env.HABERLER.get('paylas_log', 'json') || []
      logAll.unshift({
        platform:  platformlar.join('+'),
        post_id:   id,
        baslik:    kayit.baslik.slice(0, 80),
        kullanici: kullanici.kullanici,
        tip:       'radar',
        sablon:    kayit.sablon,
        tarih:     new Date().toISOString(),
      })
      await env.HABERLER.put('paylas_log', JSON.stringify(logAll.slice(0, 500)))
    } catch(e) { console.warn('log:', e.message) }

    return Response.json({ ok: true, sonuclar })
  } catch(e) {
    console.error('kayseradar-paylas:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
