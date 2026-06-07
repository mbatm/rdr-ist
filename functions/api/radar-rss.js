/**
 * GET /api/radar-rss
 * KV'deki Facebook gönderilerini RSS 2.0 olarak sunar
 * kayserim.net oto-isle bu RSS'i okuyacak
 */
export async function onRequestGet({ env }) {
  const haberler = await env.HABERLER.get('radar_fb_posts', 'json') || []

  const items = haberler.slice(0, 50).map(h => {
    const tarih = new Date(h.tarih_iso).toUTCString()
    const gorselTag = h.gorsel
      ? `<enclosure url="${h.gorsel}" type="image/jpeg" length="0"/>`
      : ''
    const baslik = h.baslik.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const icerik = (h.icerik || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

    return `    <item>
      <title><![CDATA[${h.baslik}]]></title>
      <link>${h.fb_link || h.source_url}</link>
      <guid isPermaLink="false">${h.source_id}</guid>
      <pubDate>${tarih}</pubDate>
      <description><![CDATA[${h.icerik || ''}]]></description>
      <category><![CDATA[Kayseri]]></category>
      ${gorselTag}
      <source url="https://www.facebook.com/${h.page_id || 'radarkayseri'}">Radar Kayseri</source>
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kayseradar — Facebook</title>
    <link>https://www.facebook.com/radarkayseri</link>
    <description>Radar Kayseri Facebook gönderileri — rdr.ist otomasyonu</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://rdr.ist/api/radar-rss" rel="self" type="application/rss+xml"/>
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
