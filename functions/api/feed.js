/**
 * GET /api/feed
 * KV'deki haberleri RSS 2.0 formatında döndürür
 * kayserim.net bu adresi RSS kaynağı olarak ekler: https://rdr.ist/api/feed
 */
export async function onRequestGet({ env }) {
  try {
    const haberler = (await env.HABERLER.get('liste', 'json')) || []

    const items = haberler
      .slice(0, 50)
      .map(h => {
        const link = h.kayserim_link || `https://kayserim.net/haber/${h.url_slug}`
        const tarih = h.tarih_iso ? new Date(h.tarih_iso).toUTCString() : new Date().toUTCString()
        const gorsel = h.gorsel_url || h.gorsel || ''

        return `
    <item>
      <title><![CDATA[${h.site_basligi || h.baslik || ''}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${h.meta_description || h.ozet || ''}]]></description>
      <content:encoded><![CDATA[${h.optimize_icerik || h.icerik || ''}]]></content:encoded>
      <pubDate>${tarih}</pubDate>
      <category><![CDATA[${h.kategori || 'Genel'}]]></category>
      ${gorsel ? `<enclosure url="${gorsel}" type="image/jpeg" length="0"/>` : ''}
      ${gorsel ? `<media:content url="${gorsel}" medium="image"/>` : ''}
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>kayserim.net — Kayseri Haberleri</title>
    <link>https://kayserim.net</link>
    <atom:link href="https://rdr.ist/api/feed" rel="self" type="application/rss+xml"/>
    <description>Kayseri'nin haber merkezi — SEO optimize haberler</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>10</ttl>
${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(`RSS hatası: ${err.message}`, { status: 500 })
  }
}
