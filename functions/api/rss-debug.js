export async function onRequestGet({ env }) {
  const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
    { headers: { 'User-Agent': 'rdr.ist/1.0' } })
  const xml = await rssRes.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  const sonUc = items.slice(-3).map(m => m[1]).join('\n\n---\n\n')
  return new Response(sonUc, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}