/**
 * /api/meta-ads — Meta Marketing API
 * Ad Account: act_708028213253830 (Kayseri Radar)
 *
 * GET  ?action=status      → kampanya durumları + harcama
 * POST action=create_adset → ad seti oluştur
 * POST action=pause        → kampanyayı durdur
 * POST action=resume       → kampanyayı başlat
 * POST action=auto_optimize → performansa göre bütçe ayarla
 */

const GRAPH   = 'https://graph.facebook.com/v21.0'
const ACT     = 'act_708028213253830'
// TOKEN = env.META_ADS_TOKEN (Cloudflare Pages env variable olarak saklanır)

// Kampanya ID'leri
const CAMPAIGNS = {
  haber_trafik:    '120245120742230539',
  altin_fiyatlari: '120245120758240539',
  marka:           '120245120758210539',
  retargeting:     '120245120758360539',
}

async function graph(path, method='GET', body=null, token='') {
  const sep = path.includes('?') ? '&' : '?'
  const r = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, {
    method,
    headers: body ? {'Content-Type':'application/json'} : {},
    body: body ? JSON.stringify(body) : null,
  })
  const d = await r.json()
  if (d.error) throw new Error(`Meta: ${d.error.message}`)
  return d
}

export async function onRequestGet({ request, env }) {
  const cors  = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}
  const url   = new URL(request.url)
  const action = url.searchParams.get('action') || 'status'
  const TOKEN = env.META_ADS_TOKEN || ''

  if (!TOKEN) return Response.json({ ok:false, error:'META_ADS_TOKEN env variable eksik — Cloudflare dashboard'dan ekle' }, { status:500, headers:cors })

  try {
    if (action === 'status') {
      const fields = 'id,name,status,daily_budget,insights{spend,clicks,impressions,ctr,cpc}'
      const data = await graph(`${ACT}/campaigns?fields=${fields}&date_preset=today`, 'GET', null, TOKEN)

      // Kanal bazlı GA4 özeti de ekle (insights)
      return Response.json({
        ok: true,
        account: ACT,
        campaigns: data.data,
        campaign_ids: CAMPAIGNS,
      }, { headers: cors })
    }

    if (action === 'insights') {
      const date = url.searchParams.get('date') || 'last_7d'
      const data = await graph(`${ACT}/insights?fields=campaign_name,spend,clicks,impressions,ctr,cpc,reach&date_preset=${date}&level=campaign`, 'GET', null, TOKEN)
      return Response.json({ ok:true, insights: data.data }, { headers: cors })
    }

    throw new Error(`Bilinmeyen action: ${action}`)
  } catch(e) {
    return Response.json({ ok:false, error: e.message }, { status:500, headers:cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors  = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}
  const TOKEN = env.META_ADS_TOKEN || ''
  if (!TOKEN) return Response.json({ ok:false, error:'META_ADS_TOKEN eksik' }, { status:500, headers:cors })

  try {
    const body   = await request.json()
    const { action } = body

    // Ad seti oluştur
    if (action === 'create_adset') {
      const {
        campaign_key,  // 'haber_trafik' | 'altin_fiyatlari' | 'marka' | 'retargeting'
        name,
        daily_budget_tl = 50,
        optimization_goal = 'LINK_CLICKS',
        billing_event = 'IMPRESSIONS',
        targeting,
      } = body

      const cid = CAMPAIGNS[campaign_key]
      if (!cid) throw new Error(`Geçersiz campaign_key: ${campaign_key}`)

      const defaultTargeting = {
        geo_locations: {
          cities: [
            { key:'789723', name:'Kayseri', country:'TR' },
          ]
        },
        age_min: 18,
        age_max: 65,
        locales: [24] // Türkçe
      }

      const adset = await graph(`${ACT}/adsets`, 'POST', {
        name,
        campaign_id:       cid,
        daily_budget:      daily_budget_tl * 100,
        billing_event,
        optimization_goal,
        targeting:         targeting || defaultTargeting,
        status:            'PAUSED',
      }, TOKEN)
      return Response.json({ ok:true, adset_id: adset.id }, { headers:cors })
    }

    // Kampanya durdur / başlat
    if (action === 'pause' || action === 'resume') {
      const { campaign_key } = body
      const cid = CAMPAIGNS[campaign_key]
      if (!cid) throw new Error('Geçersiz campaign_key')
      const st = action === 'pause' ? 'PAUSED' : 'ACTIVE'
      await graph(cid, 'POST', { status: st }, TOKEN)
      return Response.json({ ok:true, campaign: campaign_key, status: st }, { headers:cors })
    }

    // Otomatik optimizasyon: CPC'ye göre bütçe ayarla
    if (action === 'auto_optimize') {
      const { campaign_key, target_cpc_tl, budget_change_pct = 15 } = body
      const cid = CAMPAIGNS[campaign_key]
      if (!cid) throw new Error('Geçersiz campaign_key')

      const ins = await graph(`${cid}/insights?fields=cpc,spend,clicks&date_preset=today`, 'GET', null, TOKEN)
      const row = ins.data?.[0]
      if (!row || !row.cpc) return Response.json({ ok:true, action_taken:'no_data' }, { headers:cors })

      const cpc   = parseFloat(row.cpc)
      const ratio = cpc / target_cpc_tl

      if (ratio > 1.5) {
        await graph(cid, 'POST', { status:'PAUSED' }, TOKEN)
        return Response.json({ ok:true, action_taken:'PAUSED', cpc, target:target_cpc_tl }, { headers:cors })
      }

      if (ratio < 0.7) {
        const camp = await graph(`${cid}?fields=daily_budget`, 'GET', null, TOKEN)
        const cur  = parseInt(camp.daily_budget)
        const inc  = Math.round(cur * (1 + budget_change_pct / 100))
        await graph(cid, 'POST', { daily_budget: inc }, TOKEN)
        return Response.json({ ok:true, action_taken:'budget_up', old_tl: cur/100, new_tl: inc/100, cpc }, { headers:cors })
      }

      return Response.json({ ok:true, action_taken:'no_change', cpc, target:target_cpc_tl }, { headers:cors })
    }

    throw new Error(`Bilinmeyen action: ${action}`)
  } catch(e) {
    return Response.json({ ok:false, error:e.message }, { status:500, headers:cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}
  })
}
