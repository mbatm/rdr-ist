/**
 * Cloudflare Pages Scheduled Worker
 * Cron: "0 3 * * *" = Her gün saat 03:00 UTC (06:00 Türkiye)
 * 
 * Ahrefs keyword verilerini otomatik günceller
 */
export async function onScheduled({ env, scheduledTime }) {
  const saat = new Date(scheduledTime).getUTCHours()

  // 03:00 UTC — Ahrefs keyword güncellemesi (Pzt, Çar, Cum)
  const gun = new Date(scheduledTime).getUTCDay() // 0=Pazar, 1=Pzt...
  if ([1, 3, 5].includes(gun)) {
    try {
      const res  = await fetch(`https://rdr.ist/api/ahrefs-sync?secret=${env.RSS_API_KEY}`)
      const data = await res.json()
      console.log('[ahrefs-sync] Güncellendi:', data.cekilen, 'keyword')
    } catch(e) { console.error('[ahrefs-sync] Hata:', e.message) }
  }

  // Her gece — Radar Facebook gönderilerini çek
  try {
    const res  = await fetch(`https://rdr.ist/api/radar-fb-sync?secret=${env.RSS_API_KEY}`)
    const data = await res.json()
    console.log('[radar-fb] Çekildi:', data.cekildi, 'gönderi, eklendi:', data.eklendi)
  } catch(e) { console.error('[radar-fb] Hata:', e.message) }

  // Her gece — 10 günden eski Creatomate render'larını temizle
  try {
    const res  = await fetch(`https://rdr.ist/api/temizle?secret=${env.RSS_API_KEY}&gun=10`)
    const data = await res.json()
    console.log('[temizle] Creatomate:', data.silindi, 'render silindi /', data.toplam, 'toplam')
  } catch(e) { console.error('[temizle] Hata:', e.message) }
}
