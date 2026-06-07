/**
 * GET /api/radar-feed
 * Claude tarafından işlenmiş Radar Kayseri haberlerini RSS 2.0 olarak sunar
 * Kaynak: KV radar_liste (oto-isle tarafından yazılır)
 */
export async function onRequestGet({ env }) {
  const haberler = (await env.HABERLER.get('radar_liste', 'json')) || []

  const items = haberler.slice(0, 50).map(h => {
    const tarih   = new Date(h.tarih_iso || h.kaydedildi).toUTCString()
    const baslik  = (h.site_basligi || h.baslik || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const icerik  = (h.optimize_icerik || h.icerik || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const gorsel  = h.gorsel_url || h.gorsel || ''
    const link    = h.fb_link || h.source_url || h.kayserim_link || ''
    const slug    = h.url_slug || h.source_id || ''

    const gorselTag = gorsel ? `<enclosure url="${gorsel}" type="image/jpeg" length="0"/>` : ''

    return `    <item>
      <title><![CDATA[${h.site_basligi || h.baslik}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${h.source_id}</guid>
      <pubDate>${tarih}</pubDate>
      <description><![CDATA[${h.optimize_icerik || h.icerik || ''}]]></description>
      <category><![CDATA[${h.kategori || 'Kayseri'}]]></category>
      ${gorselTag}
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kayseradar Haber Akışı</title>
    <link>https://rdr.ist</link>
    <description>Kayseradar — Kayseri haber akışı, kayserim.net otomasyon sistemi</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://rdr.ist/api/radar-feed" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    }
  })
}
