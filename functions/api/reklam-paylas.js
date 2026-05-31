// functions/api/reklam-paylas.js
// Reklam gönderisini sosyal medyaya paylaşır, log tutar

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul || kul.modul_reklam === false) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    const { firma_id, kampanya_id, gonderi_id, platformlar=[], fb_page_ids=[], ig_ids=[] } = await request.json()
    if (!firma_id||!kampanya_id||!gonderi_id) return Response.json({ hata: 'firma_id, kampanya_id, gonderi_id zorunlu' }, { status: 400 })

    const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
    if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
    const kamp    = firma.kampanyalar?.find(k=>k.id===kampanya_id)
    const gonderi = kamp?.gonderiler?.find(g=>g.id===gonderi_id)
    if (!gonderi) return Response.json({ hata: 'Gönderi bulunamadı' }, { status: 404 })

    const API_KEY = env.RSS_API_KEY
    const sonuclar = {}
    const simdi = new Date().toISOString()

    // ── Son 24 saat kontrolü ────────────────────────────────────────────────
    const sonPaylasim = gonderi.son_paylasim
    if (sonPaylasim) {
      const fark = Date.now() - new Date(sonPaylasim).getTime()
      const saatFark = Math.floor(fark / (1000*60*60))
      if (fark < 24*60*60*1000) {
        return Response.json({
          uyari: true,
          mesaj: `Bu gönderi ${saatFark} saat önce paylaşıldı. Yine de paylaşmak istiyor musunuz?`,
          son_paylasim: sonPaylasim,
        })
      }
    }

    // ── Firma son 24 saat kontrolü ──────────────────────────────────────────
    const tumGonderiler = firma.kampanyalar?.flatMap(k=>k.gonderiler||[]) || []
    const firmaLast = tumGonderiler
      .filter(g=>g.son_paylasim)
      .sort((a,b)=>new Date(b.son_paylasim)-new Date(a.son_paylasim))[0]
    if (firmaLast && firmaLast.id !== gonderi_id && firmaLast.son_paylasim) {
      const fark = Date.now() - new Date(firmaLast.son_paylasim).getTime()
      if (fark < 24*60*60*1000) {
        const saatFark = Math.floor(fark/(1000*60*60))
        // uyari döndür, zorlama ile devam edilebilir
        return Response.json({
          firma_uyari: true,
          mesaj: `Bu firmanın başka bir gönderisi ${saatFark} saat önce paylaşıldı. Devam etmek istiyor musunuz?`,
          son_paylasim: firmaLast.son_paylasim,
        })
      }
    }

    // ── Meta paylaşım ──────────────────────────────────────────────────────
    if (platformlar.includes('facebook') || platformlar.includes('instagram')) {
      const fbIds = fb_page_ids.length ? fb_page_ids : gonderi.fb_page_ids
      const igIds = ig_ids.length      ? ig_ids      : gonderi.ig_ids
      const platform = platformlar.includes('facebook') && platformlar.includes('instagram')
        ? 'her_ikisi' : platformlar.includes('facebook') ? 'facebook' : 'instagram'

      const res  = await fetch('https://rdr.ist/api/meta-paylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          gorsel_url:  gonderi.medya_url,
          metin:       gonderi.alt_metin,
          platform,
          fb_page_ids: fbIds,
          ig_ids:      igIds,
          source_id:   gonderi_id,
          baslik:      kamp.ad,
        }),
      })
      try {
        const text = await res.text()
        sonuclar.meta = text ? JSON.parse(text) : { ok: true }
      } catch(e) { sonuclar.meta = { hata: 'Meta yanıt parse hatası' } }
    }

    // ── Twitter ────────────────────────────────────────────────────────────
    if (platformlar.includes('twitter')) {
      const res  = await fetch('https://rdr.ist/api/twitter-paylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ metin: gonderi.alt_metin, gorselUrl: gonderi.medya_url }),
      })
      try {
        const text = await res.text()
        sonuclar.twitter = text ? JSON.parse(text) : { ok: true }
      } catch(e) { sonuclar.twitter = { hata: 'Twitter yanıt parse hatası' } }
    }

    // ── Gönderi ve kampanya güncelle ───────────────────────────────────────
    const paylasimKaydi = { platformlar, tarih: simdi, kullanici: kul.kullanici, sonuclar }
    gonderi.paylasimlar = [...(gonderi.paylasimlar||[]), paylasimKaydi]
    gonderi.son_paylasim = simdi
    kamp.son_paylasim = simdi
    firma.son_paylasim = simdi

    await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))

    // ── Log ────────────────────────────────────────────────────────────────
    try {
      const logAll = await env.HABERLER.get('paylas_log', 'json') || []
      logAll.unshift({
        platform:  platformlar.join('+'),
        post_id:   gonderi_id,
        baslik:    `[REKLAM] ${firma.ad} — ${kamp.ad}`.slice(0,80),
        kullanici: kul.kullanici,
        tip:       'reklam',
        firma_id, kampanya_id,
        tarih:     simdi,
      })
      await env.HABERLER.put('paylas_log', JSON.stringify(logAll.slice(0,500)))
    } catch(e) { console.warn('log:', e.message) }

    return Response.json({ ok: true, sonuclar, son_paylasim: simdi })
  } catch(e) {
    console.error('reklam-paylas:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

// Zorla paylaş (24 saat uyarısını atla)
export async function onRequestPut({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul || kul.modul_reklam === false) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    const body = await request.json()
    const { firma_id, kampanya_id, gonderi_id, platformlar=[], fb_page_ids=[], ig_ids=[] } = body

    const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
    const kamp    = firma?.kampanyalar?.find(k=>k.id===kampanya_id)
    const gonderi = kamp?.gonderiler?.find(g=>g.id===gonderi_id)
    if (!gonderi) return Response.json({ hata: 'Gönderi bulunamadı' }, { status: 404 })

    const API_KEY = env.RSS_API_KEY
    const sonuclar = {}
    const simdi = new Date().toISOString()

    if (platformlar.includes('facebook') || platformlar.includes('instagram')) {
      const platform = platformlar.includes('facebook') && platformlar.includes('instagram') ? 'her_ikisi'
        : platformlar.includes('facebook') ? 'facebook' : 'instagram'
      const res = await fetch('https://rdr.ist/api/meta-paylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ gorsel_url: gonderi.medya_url, metin: gonderi.alt_metin, platform,
          fb_page_ids: fb_page_ids.length ? fb_page_ids : gonderi.fb_page_ids,
          ig_ids: ig_ids.length ? ig_ids : gonderi.ig_ids, source_id: gonderi_id }),
      })
      try { const t = await res.text(); sonuclar.meta = t ? JSON.parse(t) : { ok: true } } catch(e) { sonuclar.meta = { hata: 'parse' } }
    }
    if (platformlar.includes('twitter')) {
      const res = await fetch('https://rdr.ist/api/twitter-paylas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ metin: gonderi.alt_metin, gorselUrl: gonderi.medya_url }),
      })
      try { const t = await res.text(); sonuclar.twitter = t ? JSON.parse(t) : { ok: true } } catch(e) { sonuclar.twitter = { hata: 'parse' } }
    }

    gonderi.paylasimlar = [...(gonderi.paylasimlar||[]), { platformlar, tarih: simdi, kullanici: kul.kullanici }]
    gonderi.son_paylasim = kamp.son_paylasim = firma.son_paylasim = simdi
    await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))
    return Response.json({ ok: true, sonuclar })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
