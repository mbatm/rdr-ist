// functions/api/rss-ekle.js
// Manuel haberi feed.js'in okuduğu 'liste' KV key'ine ekler

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul   = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    const { source_id } = await request.json()
    if (!source_id) return Response.json({ hata: 'source_id zorunlu' }, { status: 400 })

    // Haberi KV'den al
    const kayit = await env.HABERLER.get(`haber:${source_id}`, 'json')
    if (!kayit) return Response.json({ hata: 'Haber bulunamadı' }, { status: 404 })

    // feed.js'in beklediği formata dönüştür
    const rssKayit = {
      ...kayit,
      id:         source_id,
      url_slug:   kayit.url_slug || source_id,
      tarih_iso:  kayit.tarih_iso || new Date().toISOString(),
      kaydedildi: new Date().toISOString(),
      rss_eklendi: new Date().toISOString(),
      rss_ekleyen: kul.kullanici,
    }

    // 'liste' key'ine ekle — feed.js bunu okuyor
    const liste = await env.HABERLER.get('liste', 'json') || []

    // Zaten varsa güncelle
    const mevcutIdx = liste.findIndex(h => h.id === source_id || h.source_id === source_id)
    if (mevcutIdx >= 0) {
      liste[mevcutIdx] = rssKayit
    } else {
      liste.unshift(rssKayit)
    }

    await env.HABERLER.put('liste', JSON.stringify(liste.slice(0, 200)))

    // Kayıt güncelle — rss_eklendi flagini işaretle
    await env.HABERLER.put(`haber:${source_id}`, JSON.stringify({ ...kayit, rss_eklendi: new Date().toISOString() }))

    return Response.json({ ok: true, rss_url: 'https://rdr.ist/api/feed' })
  } catch(e) {
    console.error('rss-ekle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
