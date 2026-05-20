export async function onRequestGet({ env }) {
  try {
    // 1. RSS çek
    const rssRes = await fetch(
      `https://1ha.com.tr/api/rss/${env.RSS_API_KEY}`,
      { headers: { 'User-Agent': 'rdr.ist/1.0' } }
    )
    if (!rssRes.ok) return Response.json({ adim: '1-rss', hata: `HTTP ${rssRes.status}` })
    
    const xml = await rssRes.text()
    
    // 2. İlk item başlığını al
    const m = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)
    const ilkBaslik = m ? (m[1] || m[2] || '').trim() : 'bulunamadı'
    
    // 3. KV mevcut liste
    const mevcut = (await env.HABERLER.get('liste', 'json')) || []
    
    return Response.json({
      adim: '2-rss-ok',
      xml_uzunluk: xml.length,
      ilk_baslik: ilkBaslik,
      kv_kayit_sayisi: mevcut.length
    })
  } catch (e) {
    return Response.json({ hata: e.message, stack: e.stack?.slice(0, 300) }, { status: 500 })
  }
}