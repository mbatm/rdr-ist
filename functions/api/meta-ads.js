/**
 * /api/meta-ads — Meta Marketing API entegrasyonu
 *
 * GET  ?action=accounts          → Ad hesaplarını listele
 * GET  ?action=campaigns         → Kampanyaları listele
 * GET  ?action=insights          → Performans verisi
 * POST action=create_campaign    → Kampanya oluştur
 * POST action=create_adset       → Ad seti oluştur
 * POST action=pause|resume       → Kampanya durdur/başlat
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

// KV'den user token'ı al (meta-callback ads modunda kaydetmiş olmalı)
async function getUserToken(env) {
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  const tok  = meta.ads_user_token || meta.user_token
  if (!tok) throw new Error('Meta Ads token yok — önce /api/meta-auth?mode=ads ile yetkilendir')
  return tok
}

async function graph(path, token, method = 'GET', body = null) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : null,
  })
  const data = await res.json()
  if (data.error) throw new Error(`Graph API: ${data.error.message}`)
  return data
}

export async function onRequestGet({ request, env }) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  const url    = new URL(request.url)
  const action = url.searchParams.get('action') || 'accounts'

  try {
    const token = await getUserToken(env)

    // Ad hesaplarını listele
    if (action === 'accounts') {
      const data = await graph('me/adaccounts?fields=id,name,account_status,currency,amount_spent,balance', token)
      return Response.json({ ok: true, accounts: data.data }, { headers: cors })
    }

    // Kampanyaları listele
    if (action === 'campaigns') {
      const actId = url.searchParams.get('account_id')
      if (!actId) throw new Error('account_id gerekli')
      const data = await graph(`act_${actId}/campaigns?fields=id,name,status,daily_budget,objective,insights{spend,clicks,impressions,ctr}`, token)
      return Response.json({ ok: true, campaigns: data.data }, { headers: cors })
    }

    // Performans verisi
    if (action === 'insights') {
      const actId     = url.searchParams.get('account_id')
      const dateRange = url.searchParams.get('date_range') || 'last_7d'
      if (!actId) throw new Error('account_id gerekli')
      const data = await graph(
        `act_${actId}/insights?fields=campaign_name,spend,clicks,impressions,ctr,cpc,reach&date_preset=${dateRange}&level=campaign`,
        token
      )
      return Response.json({ ok: true, insights: data.data }, { headers: cors })
    }

    throw new Error(`Bilinmeyen action: ${action}`)

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const token = await getUserToken(env)
    const body  = await request.json()
    const { action, account_id } = body
    if (!account_id) throw new Error('account_id zorunlu')
    const actId = `act_${account_id.replace('act_', '')}`

    // Kampanya oluştur
    if (action === 'create_campaign') {
      const { name, objective, daily_budget_tl, status = 'PAUSED' } = body
      const data = await graph(`${actId}/campaigns`, token, 'POST', {
        name,
        objective:    objective || 'LINK_CLICKS',
        daily_budget: Math.round(daily_budget_tl * 100), // TL → kuruş
        status,
        special_ad_categories: [],
      })
      return Response.json({ ok: true, campaign_id: data.id }, { headers: cors })
    }

    // Ad seti oluştur
    if (action === 'create_adset') {
      const {
        name, campaign_id, daily_budget_tl,
        targeting, bid_amount_tl,
        optimization_goal = 'LINK_CLICKS',
        billing_event = 'IMPRESSIONS',
        status = 'PAUSED'
      } = body

      const data = await graph(`${actId}/adsets`, token, 'POST', {
        name,
        campaign_id,
        daily_budget:      Math.round(daily_budget_tl * 100),
        bid_amount:        bid_amount_tl ? Math.round(bid_amount_tl * 100) : undefined,
        billing_event,
        optimization_goal,
        targeting: targeting || {
          geo_locations: { countries: ['TR'], cities: [{ key: '789723', name: 'Kayseri', region: 'Kayseri', country: 'TR' }] },
          age_min: 18, age_max: 65,
        },
        status,
      })
      return Response.json({ ok: true, adset_id: data.id }, { headers: cors })
    }

    // Kampanya durdur / başlat
    if (action === 'pause' || action === 'resume') {
      const { campaign_id } = body
      const st   = action === 'pause' ? 'PAUSED' : 'ACTIVE'
      const data = await graph(campaign_id, token, 'POST', { status: st })
      return Response.json({ ok: true, result: data }, { headers: cors })
    }

    // Otomatik kural: performansa göre bütçe ayarla
    if (action === 'auto_optimize') {
      const { campaign_id, target_cpc_tl, budget_change_pct = 15 } = body
      // Bugünkü insight
      const ins = await graph(`${campaign_id}/insights?fields=cpc,spend,clicks&date_preset=today`, token)
      const row  = ins.data?.[0]
      if (!row) return Response.json({ ok: true, action_taken: 'no_data' }, { headers: cors })

      const cpc = parseFloat(row.cpc || 0)
      const ratio = cpc / target_cpc_tl

      let new_status = null
      if (ratio > 1.5) new_status = 'PAUSED'      // CPC çok yüksek → durdur
      if (ratio < 0.7) {                            // CPC düşük → bütçe artır
        // get current budget
        const camp = await graph(`${campaign_id}?fields=daily_budget`, token)
        const cur  = parseInt(camp.daily_budget || 0)
        const inc  = Math.round(cur * (1 + budget_change_pct / 100))
        await graph(campaign_id, token, 'POST', { daily_budget: inc })
        return Response.json({ ok: true, action_taken: 'budget_increased', old: cur, new: inc }, { headers: cors })
      }
      if (new_status) {
        await graph(campaign_id, token, 'POST', { status: new_status })
        return Response.json({ ok: true, action_taken: new_status, cpc, target: target_cpc_tl }, { headers: cors })
      }
      return Response.json({ ok: true, action_taken: 'no_change', cpc, target: target_cpc_tl }, { headers: cors })
    }

    throw new Error(`Bilinmeyen action: ${action}`)

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
  })
}
