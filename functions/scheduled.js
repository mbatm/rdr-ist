/**
 * Cloudflare Pages Scheduled Worker
 * Cron: "0 3 * * *" = Her gün saat 03:00 UTC (06:00 Türkiye)
 * 
 * Ahrefs keyword verilerini otomatik günceller
 */
export async function onScheduled({ env }) {
  try {
    const res = await fetch(
      `https://rdr.ist/api/ahrefs-sync?secret=${env.RSS_API_KEY}`
    )
    const data = await res.json()
    console.log('[ahrefs-sync] Otomatik güncelleme:', JSON.stringify({
      cekilen: data.cekilen,
      top3: data.top10_firsat?.slice(0,3).map(k => k.keyword),
      guncellendi: new Date().toISOString()
    }))
  } catch(e) {
    console.error('[ahrefs-sync] Hata:', e.message)
  }
}
