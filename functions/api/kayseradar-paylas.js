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
    const { id, platformlar = [], fb_page_ids = [], ig_ids = [], tw = false } = await request.json()
    if (!id) return Response.json({ hata: 'id zorunlu' }, { status: 400 })

    const kayit = await env.HABERLER.get(`radar:${id}`, 'json')
    if (!kayit) return Response.json({ hata: 'Kayıt bulunamadı' }, { status: 404 })

    const sonuclar = {}
    const API_KEY  = env.RSS_API_KEY

    // Render URL — önce KV'deki URL'ye bak, yoksa Creatomate'den direkt çek
    let renderKayit = kayit.creatomate?.find(r => r.url && r.url.length > 10)

    // KV'de URL yoksa render_id ile Creatomate'den çek
    if (!renderKayit) {
      const bekleyen = kayit.creatomate?.find(r => r.render_id && !r.url)
      if (bekleyen) {
        try {
          const crRes  = await fetch(`https://api.creatomate.com/v2/renders/${bekleyen.render_id}`, {
            headers: { 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` }
          })
          if (crRes.ok) {
            const crData = await crRes.json()
            const render = Array.isArray(crData) ? crData[0] : crData
            if (render.status === 'succeeded' && render.url) {
              renderKayit = { ...bekleyen, url: render.url, status: 'succeeded' }
              // KV'yi de güncelle
              const guncellenmis = {
                ...kayit,
                creatomate: kayit.creatomate.map(r =>
                  r.render_id === bekleyen.render_id ? { ...r, url: render.url, status: 'succeeded' } : r
                )
              }
              await env.HABERLER.put(`radar:${id}`, JSON.stringify(guncellenmis))
              // Liste kaydını da güncelle
              const liste = await env.HABERLER.get('radar_liste', 'json') || []
              const yeniListe = liste.map(li =>
                li.id === id ? { ...li, render_url: render.url } : li
              )
              await env.HABERLER.put('radar_liste', JSON.stringify(yeniListe))
            }
          }
        } catch(e) { console.warn('Render durum çekme hatası:', e.message) }
      }
    }

    const medyaUrl = renderKayit?.url || kayit.gorsel_url || ''
    const isVideo  = medyaUrl.includes('.mp4')

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
      const metaPayload = {
        gorsel_url:  medyaUrl,
        video_url:   isVideo ? medyaUrl : undefined,
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
    const liste = await env.HABERLER.get('radar_liste', 'json') || []
    const idx   = liste.findIndex(l => l.id === id)
    if (idx >= 0) liste[idx].durum = 'yayinda'
    await env.HABERLER.put('radar_liste', JSON.stringify(liste))

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
