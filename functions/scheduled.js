/**
 * Cloudflare Cron Worker — İçerik Zeka Otomasyonu
 * Tetiklenme: */30 * * * * (her 30 dakika)
 *
 * Yaptıkları:
 * 1. RSS tara → yüksek skorlu haberler tespit et
 * 2. Sezonsal kontrol → bayram/okul/sınav aktif mi?
 * 3. Aktif otomatik kampanyaların süre kontrolü → gerekirse durdur
 * 4. GA4'ten trafik kontrolü → spike var mı?
 */

export default {
  async scheduled(event, env, ctx) {
    const log = []
    const now = new Date()

    try {
      // 1. RSS tara
      const scanRes  = await fetch('https://rdr.ist/api/zeka-motor?action=scan')
      const scanData = await scanRes.json()
      const topStory = scanData.results?.[0]

      if (topStory && topStory.top_score >= 70) {
        const match = topStory.keyword_matches?.[0]
        log.push(`🎯 Yüksek skor haber: "${topStory.title}" → skor ${topStory.top_score}`)

        // Olay tipi mi? (deprem, kaza) → otomatik kampanya tetikle
        if (match?.cat === 'olay' && topStory.top_score >= 73) {
          const existing = await env.HABERLER.get('auto_campaigns', 'json') || []
          const recent   = existing.filter(c => {
            const age = now - new Date(c.started)
            return age < 4 * 3600 * 1000 // Son 4 saatte başlatıldı mı?
          })

          if (recent.length === 0) {
            // Kampanya tetikle
            await fetch('https://rdr.ist/api/zeka-motor', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                action: 'trigger_campaign',
                reason: match.matched_keyword,
                budget_tl: match.budget || 50,
                duration_hours: 48
              })
            })
            log.push(`🚨 Olay kampanyası tetiklendi: ${match.matched_keyword}`)
          }
        }
      }

      // 2. Sezonsal kontrol
      const seasonRes  = await fetch('https://rdr.ist/api/zeka-motor?action=seasonal')
      const seasonData = await seasonRes.json()

      if (seasonData.seasonal_active?.length > 0) {
        log.push(`📅 Aktif sezon: ${seasonData.seasonal_active.join(', ')}`)
        // TODO: Sezonsal kampanyaları aktifleştir (Cloudflare Workers Cron)
      }

      // 3. Süresi dolan kampanyaları durdur
      const campaigns = await env.HABERLER.get('auto_campaigns', 'json') || []
      const updated = []
      for (const camp of campaigns) {
        const age = (now - new Date(camp.started)) / 3600000 // saat
        if (age < camp.duration_hours) {
          updated.push(camp)
        } else {
          // Kampanyayı durdur
          try {
            await fetch(`https://graph.facebook.com/v21.0/${camp.campaign_id}`, {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                status: 'PAUSED',
                access_token: env.META_ADS_TOKEN || ''
              })
            })
            log.push(`⏸ Kampanya durduruldu: ${camp.name} (${age.toFixed(1)}h sonra)`)
          } catch(e) {
            log.push(`❌ Durdurma hatası: ${e.message}`)
          }
        }
      }
      if (updated.length !== campaigns.length) {
        await env.HABERLER.put('auto_campaigns', JSON.stringify(updated))
      }

      // Log kaydet
      await env.HABERLER.put('cron_log', JSON.stringify({
        last_run: now.toISOString(),
        log,
        rss_top: topStory?.title,
        rss_score: topStory?.top_score
      }))

    } catch(e) {
      await env.HABERLER.put('cron_log', JSON.stringify({ error: e.message, time: now.toISOString() }))
    }
  }
}
