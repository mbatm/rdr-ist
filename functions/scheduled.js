/**
 * Cloudflare Pages Scheduled Worker
 * Cron 1: "*/5 * * * *"      — Her 5 dakika
 * Cron 2: "0 3 * * 1,3,5"   — Pzt/Çar/Cum 03:00 UTC
 * Cron 3: "0 0 * * *"        — Her gece 00:00 UTC
 */
export async function onScheduled({ env, scheduledTime }) {
  const gun   = new Date(scheduledTime).getUTCDay()    // 0=Pazar
  const saat  = new Date(scheduledTime).getUTCHours()
  const dakika = new Date(scheduledTime).getUTCMinutes()

  // Her 5 dakika — haber işleme + radar FB
  if (dakika % 5 === 0) {
    try {
      const res  = await fetch(`https://rdr.ist/api/oto-isle?adet=10&secret=${env.RSS_API_KEY}`)
      const data = await res.json()
      console.log('[oto-isle] islendi:', data.islendi, 'hatali:', data.hatali?.length)
    } catch(e) { console.error('[oto-isle] Hata:', e.message) }

    try {
      const res  = await fetch(`https://rdr.ist/api/radar-fb-sync?secret=${env.RSS_API_KEY}`)
      const data = await res.json()
      console.log('[radar-fb] eklendi:', data.eklendi)
    } catch(e) { console.error('[radar-fb] Hata:', e.message) }
  }

  // Pzt/Çar/Cum 03:00 UTC — Ahrefs sync
  if (saat === 3 && dakika === 0 && [1, 3, 5].includes(gun)) {
    try {
      const res  = await fetch(`https://rdr.ist/api/ahrefs-sync?secret=${env.RSS_API_KEY}`)
      const data = await res.json()
      console.log('[ahrefs-sync] cekilen:', data.cekilen)
    } catch(e) { console.error('[ahrefs-sync] Hata:', e.message) }
  }

  // Her gece 00:00 UTC — video düzelt + temizlik
  if (saat === 0 && dakika === 0) {
    try {
      await fetch(`https://rdr.ist/api/video-duzelt?secret=${env.RSS_API_KEY}`)
    } catch(e) { console.error('[video-duzelt] Hata:', e.message) }

    try {
      const res  = await fetch(`https://rdr.ist/api/temizle?secret=${env.RSS_API_KEY}&gun=10`)
      const data = await res.json()
      console.log('[temizle] silindi:', data.silindi)
    } catch(e) { console.error('[temizle] Hata:', e.message) }
  }
}
