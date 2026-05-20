/**
 * GET /api/rss
 * Cloudflare Pages Function — 1ha RSS proxy
 * RSS_API_KEY environment variable olarak Cloudflare dashboard'dan eklenir
 */
export async function onRequestGet({ env }) {
  try {
    const rssKey = env.RSS_API_KEY || 'cmp6vldho000210g6tt26pvc5'
    const response = await fetch(`https://1ha.com.tr/api/rss/${rssKey}`, {
      headers: { 'User-Agent': 'rdr.ist/1.0' },
    })

    if (!response.ok) {
      return new Response(`RSS fetch hatası: HTTP ${response.status}`, { status: 502 })
    }

    const xml = await response.text()

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=120', // 2 dakika cache
      },
    })
  } catch (err) {
    return new Response(`RSS hatası: ${err.message}`, { status: 500 })
  }
}
