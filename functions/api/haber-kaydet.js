/**
 * POST /api/haber-kaydet
 * İşlenen haberi Cloudflare KV'ye kaydeder (RSS feed için)
 * KV binding adı: HABERLER
 */
export async function onRequestPost({ request, env }) {
  try {
    const haber = await request.json()

    // Zorunlu alanlar
    if (!haber.url_slug || !haber.site_basligi) {
      return Response.json({ error: 'url_slug ve site_basligi zorunlu' }, { status: 400 })
    }

    // Mevcut listeyi al
    const existing = (await env.HABERLER.get('liste', 'json')) || []

    // Aynı slug varsa güncelle, yoksa başa ekle
    const filtered = existing.filter(h => h.url_slug !== haber.url_slug)
    const updated = [
      {
        ...haber,
        tarih_iso: haber.tarih_iso || new Date().toISOString(),
        kaydedildi: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 200) // max 200 haber

    await env.HABERLER.put('liste', JSON.stringify(updated))

    return Response.json({ success: true, toplam: updated.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
