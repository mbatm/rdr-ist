export async function onRequestGet({ env }) {
  const rssRes = await fetch(`https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
    { headers: { 'User-Agent': 'rdr.ist/1.0' } })
  const xml = await rssRes.text()

  // İlk item'ın ham içeriğini döndür
  const m = xml.match(/<item>([\s\S]*?)<\/item>/)
  const ilkItem = m ? m[1] : 'item bulunamadi'

  return new Response(ilkItem, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}