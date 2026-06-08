// functions/api/kayseradar-sil.js
// Kayseradar kaydını ve sosyal medya paylaşımlarını siler

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })

  // Admin veya kaydı oluşturan silebilir
  const { id, sosyal_medyadan_da_sil = false } = await request.json()
  if (!id) return Response.json({ hata: 'id zorunlu' }, { status: 400 })

  const kayit = await env.HABERLER.get(`radar:${id}`, 'json')
  if (!kayit) return Response.json({ hata: 'Bulunamadı' }, { status: 404 })

  if (kullanici.rol !== 'admin' && kayit.kullanici !== kullanici.kullanici)
    return Response.json({ hata: 'Bu kaydı silme yetkiniz yok' }, { status: 403 })

  const silSonuclari = {}

  // Sosyal medyadan sil
  if (sosyal_medyadan_da_sil && kayit.paylasimlar) {
    const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    const API_KEY  = env.RSS_API_KEY

    // Facebook paylaşımlarını sil
    if (kayit.paylasimlar.facebook) {
      const fbSonuclar = kayit.paylasimlar.facebook?.sonuc || {}
      for (const [pid, sonuc] of Object.entries(fbSonuclar)) {
        if (sonuc?.post_id) {
          const sayfa = hesaplar.find(h => h.page_id === pid)
          if (sayfa?.page_token) {
            try {
              const res = await fetch(`https://graph.facebook.com/v19.0/${sonuc.post_id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: sayfa.page_token }),
              })
              silSonuclari[`fb_${pid}`] = (await res.json()).success ? 'silindi' : 'hata'
            } catch(e) { silSonuclari[`fb_${pid}`] = 'hata' }
          }
        }
      }
    }

    // Twitter tweet'i sil
    if (kayit.paylasimlar.twitter?.tweet_url) {
      const tweetId = kayit.paylasimlar.twitter.tweet_url.split('/').pop()
      if (tweetId) {
        try {
          const res = await fetch(`https://rdr.ist/api/paylas-sil`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            body: JSON.stringify({ platform: 'twitter', post_id: tweetId }),
          })
          silSonuclari.twitter = (await res.json()).ok ? 'silindi' : 'hata'
        } catch(e) { silSonuclari.twitter = 'hata' }
      }
    }
  }

  // KV'den sil
  await env.HABERLER.delete(`radar:${id}`)

  // Listeden kaldır
  const liste = await env.HABERLER.get('radar_panel_liste', 'json') || []
  await env.HABERLER.put('radar_panel_liste', JSON.stringify(liste.filter(l => l.id !== id)))

  // Log
  try {
    const logAll = await env.HABERLER.get('paylas_log', 'json') || []
    logAll.unshift({
      platform:  'sistem',
      post_id:   id,
      baslik:    `SİLİNDİ: ${kayit.baslik?.slice(0, 60)}`,
      kullanici: kullanici.kullanici,
      tip:       'radar_sil',
      tarih:     new Date().toISOString(),
    })
    await env.HABERLER.put('paylas_log', JSON.stringify(logAll.slice(0, 500)))
  } catch(e) {}

  return Response.json({ ok: true, silSonuclari })
}
