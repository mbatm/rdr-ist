export async function onRequestGet({ env }) {
  try {
    const rssRes = await fetch(
      `https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } }
    )
    const xml = await rssRes.text()

    // Item'ları say
    const itemler = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    const mevcut  = (await env.HABERLER.get('liste', 'json')) || []
    const mevcutIds = new Set(mevcut.map(h => h.source_id))

    // İlk 5 item başlığı + source_id
    const ornekler = itemler.slice(0, 5).map(m => {
      const node = m[1]
      const link = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
      const id   = link.split('/').pop() || link
      const bas  = node.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || ''
      return { id, baslik: bas.slice(0, 60), zaten_var: mevcutIds.has(id) }
    })

    return Response.json({
      toplam_item: itemler.length,
      kv_kayit: mevcut.length,
      ornekler
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}