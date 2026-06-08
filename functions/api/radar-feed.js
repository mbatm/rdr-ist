/**
 * GET /api/radar-feed
 * Claude tarafından işlenmiş Radar Kayseri haberlerini RSS 2.0 olarak sunar
 * Her item: başlık + görsel/video + facebook linki
 */
export async function onRequestGet({ env }) {
  const haberler = (await env.HABERLER.get('radar_liste', 'json')) || []

  const items = haberler.slice(0, 50).map(h => {
    const tarih  = new Date(h.tarih_iso || h.kaydedildi).toUTCString()
    const baslik = h.site_basligi || h.baslik || ''
    const gorsel = h.gorsel_url || h.gorsel || ''
    const link   = h.fb_link || h.source_url || ''
    const icerik = h.optimize_icerik || h.icerik || ''

    // Görsel enclosure — RSS okuyucuların görseli göstermesi için
    // Video: önce post'un video alanı, yoksa görsel mp4 kontrolü
    const videoSrc = h.video || ''
    const isVideo  = !!videoSrc || gorsel.includes('.mp4')
    const mediaSrc = videoSrc || gorsel
    const gorselTag = mediaSrc
      ? `<enclosure url="${mediaSrc}" type="${isVideo ? 'video/mp4' : 'image/jpeg'}" length="0"/>`
      : ''

    const mediaTag = mediaSrc
      ? `<media:content url="${mediaSrc}" medium="${isVideo ? 'video' : 'image'}"/>`
      : ''

    return `    <item>
      <title><![CDATA[${baslik}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${h.source_id}</guid>
      <pubDate>${tarih}</pubDate>
      <description><![CDATA[${icerik}

🔗 Facebook: ${link}]]></description>
      <category><![CDATA[${h.kategori || 'Kayseri'}]]></category>
      ${gorselTag}
      ${mediaTag}
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Kayseradar Haber Akışı</title>
    <link>https://www.facebook.com/radarkayseri</link>
    <description>Radar Kayseri — Facebook haberleri, SEO optimize, kayserim.net otomasyon sistemi</description>
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
