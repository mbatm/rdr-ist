/**
 * GET /api/feed
 * Daktilo CMS formatında RSS çıktısı üretir.
 * kayserim.net bu URL'yi RSS kaynağı olarak ekler: https://rdr.ist/api/feed
 *
 * Daktilo özel alanları:
 * HaberKodu, UstKategori, Kategori, Sehir, SonDakika,
 * title, description, body, pubDate, images, videos
 */
export async function onRequestGet({ env }) {
  try {
    const haberler = (await env.HABERLER.get('liste', 'json')) || []

    const esc = s => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const formatDate = iso => {
      try {
        const d = new Date(iso)
        const p = n => String(n).padStart(2, '0')
        return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
      } catch { return '-' }
    }

    const ustKat = kat => {
      const siyasi  = ['Siyaset','Belediye Haberleri','Güncel']
      const spor    = ['Spor']
      const ekonomi = ['Ekonomi','Turizm']
      if (siyasi.includes(kat))  return 'YEREL HABER'
      if (spor.includes(kat))    return 'SPOR'
      if (ekonomi.includes(kat)) return 'EKONOMİ'
      return 'YEREL HABER'
    }

    const items = haberler.slice(0, 100).map(h => {
      const haberKodu = esc(h.url_slug || h.id || '')
      const gorselUrl = h.gorsel_url || h.gorsel || ''
      const gorselKodu = haberKodu + '-1'
      const pubDate   = formatDate(h.tarih_iso || h.kaydedildi || new Date().toISOString())
      const guncDate  = formatDate(h.kaydedildi || h.tarih_iso || new Date().toISOString())
      const sonDakika = h.oncelik === 'yuksek' ? 'Evet' : 'Hayır'

      const videoBlock = h.video
        ? `<videos>\n        <video>\n          <path_video VideoKodu="${esc(haberKodu)}-v1" HaberKodu="${esc(haberKodu)}" filesize="0" duration="0">${esc(h.video)}</path_video>\n        </video>\n      </videos>`
        : `<videos/>`

      const imageBlock = gorselUrl
        ? `<images>\n        <image ResimKodu="${esc(gorselKodu)}" HaberKodu="${esc(haberKodu)}" filesize="0">${esc(gorselUrl)}</image>\n      </images>`
        : `<images/>`

      return `
  <item>
    <HaberKodu>${esc(haberKodu)}</HaberKodu>
    <UstKategori>${esc(ustKat(h.kategori))}</UstKategori>
    <Kategori>${esc((h.kategori || 'GENEL').toUpperCase())}</Kategori>
    <Sehir>KAYSERİ</Sehir>
    <SonDakika>${sonDakika}</SonDakika>
    <title>${esc(h.site_basligi || h.baslik || '')}</title>
    <description><![CDATA[ ${h.meta_description || h.ozet || ''} ]]></description>
    <body><![CDATA[ ${h.optimize_icerik || h.icerik || ''} ]]></body>
    <pubDate>${pubDate}</pubDate>
    <SonHaberGuncellenmeTarihi>${guncDate}</SonHaberGuncellenmeTarihi>
    <SonFotografEklenmeTarihi>${gorselUrl ? guncDate : '-'}</SonFotografEklenmeTarihi>
    ${imageBlock}
    ${videoBlock}
  </item>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>kayserim.net</title>
    <description>Kayseri'nin Haber Merkezi — SEO optimize haberler</description>
    <language>tr-TR</language>
    <link>https://kayserim.net</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(`RSS hatası: ${err.message}`, { status: 500 })
  }
}
