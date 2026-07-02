/**
 * GET /api/feed
 * Daktilo CMS formatında RSS çıktısı üretir.
 * kayserim.net bu URL'yi RSS kaynağı olarak ekler: https://rdr.ist/api/feed
 *
 * Daktilo özel alanları:
 * HaberKodu, UstKategori, Kategori, Sehir, SonDakika,
 * title, description, body, pubDate, images, videos
 */
// ── NABIZ: kayserim.net bu feed'i sürekli çektiği için burası sistemin kalp
// atışıdır. GitHub cron ~3 saate düşebildiğinden, zamanlanmış işler feed
// trafiğine bindirilerek garanti altına alınır. Yanıt bekletilmez (waitUntil).
async function nabiz(env) {
  try {
    const kilit = await env.HABERLER.get('nabiz:kilit')
    if (kilit) return
    await env.HABERLER.put('nabiz:kilit', String(Date.now()), { expirationTtl: 240 })
    const durum = await env.HABERLER.get('nabiz:durum', 'json') || {}
    const simdi = Date.now()
    const isler = []
    const S = encodeURIComponent(env.RSS_API_KEY || '')
    // 1ha haber işleme — hedef her 10 dk (cron sadece ~3 saatte bir yetişiyor)
    if (simdi - (durum.oto || 0) > 10 * 60e3) {
      durum.oto = simdi
      isler.push(fetch(`https://rdr.ist/api/oto-isle?adet=10&secret=${S}`).catch(() => {}))
    }
    // Sosyal Radar — saatte bir (tara kendi penceresini ve Apify fazını yönetir)
    if (simdi - (durum.sosyal || 0) > 60 * 60e3) {
      durum.sosyal = simdi
      isler.push(fetch(`https://rdr.ist/api/sosyal-radar?action=tara`).catch(() => {}))
    }
    // Etkinlik Radar — saatte bir
    if (simdi - (durum.etkinlik || 0) > 60 * 60e3) {
      durum.etkinlik = simdi
      isler.push(fetch(`https://rdr.ist/api/etkinlik-radar?action=tara`).catch(() => {}))
    }
    if (isler.length) {
      await env.HABERLER.put('nabiz:durum', JSON.stringify(durum))
      await Promise.allSettled(isler)
    }
  } catch (_) {}
}

export async function onRequestGet(context) {
  const { env } = context
  try {
    context.waitUntil(nabiz(env))
    const haberler      = (await env.HABERLER.get('liste', 'json'))       || []
    const radarHaberlerTum = (await env.HABERLER.get('radar_liste', 'json')) || []
    // kayserim.net kaynaklı haberleri çıkar — zaten 1ha feed'inde var
    const radarHaberler = radarHaberlerTum.filter(h => {
      const link = h.fb_link || h.source_url || h.link || ''
      return !link.includes('kayserim.net') && !link.includes('kayserimnet')
    })

    // Radar haberlerini Kayseradar kategorisiyle işaretle
    const radarIsaretli = radarHaberler.map(h => ({
      ...h,
      kategori:   'KAYSERADAR',
      _kayseradar: true,
    }))

    // Birleştir — dedup (source_id veya fb_id bazlı) + tarihe göre sırala
    const gorulmusIdler = new Set()
    const tumHaberler = [...haberler, ...radarIsaretli]
      .filter(h => {
        const id = h.source_id || h.fb_id || h.url_slug || h.id
        if (!id) return true  // ID yoksa dahil et
        if (gorulmusIdler.has(id)) return false
        gorulmusIdler.add(id)
        return true
      })
      .sort((a, b) => new Date(b.tarih_iso || b.kaydedildi) - new Date(a.tarih_iso || a.kaydedildi))

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

    const items = tumHaberler.slice(0, 150).map(h => {
      const haberKodu = esc(h.url_slug || h.source_id || h.fb_id || h.id || '')
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
    <UstKategori>${h._kayseradar ? 'KAYSERADAR' : esc(ustKat(h.kategori))}</UstKategori>
    <Kategori>${esc((h.kategori || 'GENEL').toUpperCase())}</Kategori>
    <Sehir>KAYSERİ</Sehir>
    ${h._kayseradar && h.fb_link ? `<link>${esc(h.fb_link)}</link>` : ''}
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
