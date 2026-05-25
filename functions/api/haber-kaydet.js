/**
 * POST /api/haber-kaydet
 * İşlenen haberi Cloudflare KV'ye kaydeder (RSS feed için)
 * KV binding adı: HABERLER
 */
export async function onRequestPost({ request, env }) {
  try {
    const haber = await request.json()

    // En az source_id veya url_slug olmalı
    if (!haber.url_slug && !haber.source_id) {
      return Response.json({ error: 'url_slug veya source_id zorunlu' }, { status: 400 })
    }

    // Mevcut listeyi al
    const existing = (await env.HABERLER.get('liste', 'json')) || []

    // Aynı slug VEYA source_id varsa güncelle, yoksa başa ekle
    const filtered = existing.filter(h =>
      h.url_slug !== haber.url_slug &&
      h.source_id !== haber.source_id
    )
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
