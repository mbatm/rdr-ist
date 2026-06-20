// Cloudflare Cron Worker - Icerik Zeka Otomasyonu
// Tetiklenme: Her 30 dakikada bir
// Yaptiklari:
// 1. RSS tara, yuksek skorlu haberleri tespit et
// 2. Sezonsal kontrol: bayram/okul/sinav aktif mi?
// 3. Suresi dolan kampanyalari durdur

export default {
  async scheduled(event, env, ctx) {
    const log = []
    const now  = new Date()

    try {
      // 1. RSS tara
      const scanRes  = await fetch('https://rdr.ist/api/zeka-motor?action=scan')
      const scanData = await scanRes.json()
      const topStory = scanData.results?.[0]

      if (topStory && topStory.top_score >= 70) {
        const match = topStory.keyword_matches?.[0]
        log.push('Yuksek skor haber: ' + topStory.title + ' -> skor ' + topStory.top_score)

        // Olay tipi (deprem, kaza) -> otomatik kampanya tetikle
        if (match?.cat === 'olay' && topStory.top_score >= 73) {
          const existing = await env.HABERLER.get('auto_campaigns', 'json') || []
          const recent   = existing.filter(c => {
            const age = now - new Date(c.started)
            return age < 4 * 3600 * 1000
          })

          if (recent.length === 0) {
            await fetch('https://rdr.ist/api/zeka-motor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action:         'trigger_campaign',
                reason:         match.matched_keyword,
                budget_tl:      match.budget || 50,
                duration_hours: 48
              })
            })
            log.push('Olay kampanyasi tetiklendi: ' + match.matched_keyword)
          }
        }
      }

      // 2. Sezonsal kontrol
      const seasonRes  = await fetch('https://rdr.ist/api/zeka-motor?action=seasonal')
      const seasonData = await seasonRes.json()
      if (seasonData.seasonal_active?.length > 0) {
        log.push('Aktif sezon: ' + seasonData.seasonal_active.join(', '))
      }

      // 3. Suresi dolan kampanyalari durdur
      const campaigns = await env.HABERLER.get('auto_campaigns', 'json') || []
      const updated   = []
      const META_TOK  = 'EAAORauw5t7ABRxGn0VWifCDlUlSJVje9z7eKH9ZCy5X913eKXHfRLwOEdfM70cd64eIlXAJmSvldiLwLy93x23UJtHatnVZBZAtTwIcVNVaykf2YUZCakJf6X2wKHhcuVN8Ogv8jH9UorD0HaCjZAZBLdYBjyOIE841VvjQNX6TT8W20GG67EDUDefZANune5JGz4XGajGHZBu36TsllewlgU8BarzV71dc1D2ttwWnjZANQjA65QdmZBoIF8V74DSZCEIx6mUA4LW0Pb71RL6ZB2JqDkWknpAZDZD'

      for (const camp of campaigns) {
        const age = (now - new Date(camp.started)) / 3600000
        if (age < camp.duration_hours) {
          updated.push(camp)
        } else {
          try {
            await fetch('https://graph.facebook.com/v21.0/' + camp.campaign_id, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PAUSED', access_token: META_TOK })
            })
            log.push('Kampanya durduruldu: ' + camp.name)
          } catch (e) {
            log.push('Durdurma hatasi: ' + e.message)
          }
        }
      }

      if (updated.length !== campaigns.length) {
        await env.HABERLER.put('auto_campaigns', JSON.stringify(updated))
      }

      // Log kaydet
      await env.HABERLER.put('cron_log', JSON.stringify({
        last_run:  now.toISOString(),
        log,
        rss_top:   topStory?.title,
        rss_score: topStory?.top_score
      }))

    } catch (e) {
      await env.HABERLER.put('cron_log', JSON.stringify({ error: e.message, time: now.toISOString() }))
    }
  }
}
