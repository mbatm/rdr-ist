// Google Ads API - kayserimnet kampanya yonetimi
// Gerekli env variables (Cloudflare Dashboard):
//   GADS_DEV_TOKEN     = Developer Token (MCC -> Araclar -> API Merkezi)
//   GADS_CLIENT_ID     = OAuth2 Client ID (Google Cloud Console)
//   GADS_CLIENT_SECRET = OAuth2 Client Secret
//   GADS_REFRESH_TOKEN = Refresh Token (oauth akisi ile uretilir)
//   GADS_CUSTOMER_ID   = 7731778727

const API_BASE = "https://googleads.googleapis.com/v18"
const CID      = "7731778727"

async function getAccessToken(env) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GADS_CLIENT_ID,
      client_secret: env.GADS_CLIENT_SECRET,
      refresh_token: env.GADS_REFRESH_TOKEN,
      grant_type:    "refresh_token"
    })
  })
  const d = await r.json()
  if (!d.access_token) throw new Error("Google OAuth hatasi: " + JSON.stringify(d))
  return d.access_token
}

async function gads(path, method, body, env) {
  if (!method) method = "POST"
  const token = await getAccessToken(env)
  const r = await fetch(API_BASE + path, {
    method,
    headers: {
      "Authorization":         "Bearer " + token,
      "developer-token":       env.GADS_DEV_TOKEN,
      "login-customer-id":     env.GADS_MANAGER_ID || CID,
      "Content-Type":          "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const d = await r.json()
  if (d.error) throw new Error("Google Ads: " + (d.error.message || JSON.stringify(d.error)))
  return d
}

async function query(gaql, env) {
  const token = await getAccessToken(env)
  const r = await fetch(API_BASE + "/customers/" + CID + "/googleAds:search", {
    method: "POST",
    headers: {
      "Authorization":     "Bearer " + token,
      "developer-token":   env.GADS_DEV_TOKEN,
      "login-customer-id": env.GADS_MANAGER_ID || CID,
      "Content-Type":      "application/json"
    },
    body: JSON.stringify({ query: gaql })
  })
  const d = await r.json()
  if (d.error) throw new Error("Google Ads Query: " + d.error.message)
  return d.results || []
}

export async function onRequestGet({ request, env }) {
  const cors   = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  const url    = new URL(request.url)
  const action = url.searchParams.get("action") || "status"

  // Env eksikse kurulum yonlendirmesi don
  // Debug: env var varlık kontrolü
  const envDurum = {
    DEV_TOKEN:     !!env.GADS_DEV_TOKEN,
    CLIENT_ID:     !!env.GADS_CLIENT_ID,
    CLIENT_SECRET: !!env.GADS_CLIENT_SECRET,
    REFRESH_TOKEN: !!env.GADS_REFRESH_TOKEN,
    MANAGER_ID:    !!env.GADS_MANAGER_ID,
  }
  if (!env.GADS_DEV_TOKEN) {
    return Response.json({ ok:false, setup:true, eksik:"GADS_DEV_TOKEN", env_durum: envDurum, mesaj:"Developer Token eksik" }, { headers: cors })
  }

  try {
    if (action === "status") {
      const camps = await query(
        "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, " +
        "campaign_budget.amount_micros, metrics.clicks, metrics.impressions, metrics.ctr, " +
        "metrics.average_cpc, metrics.cost_micros " +
        "FROM campaign WHERE segments.date DURING LAST_7_DAYS " +
        "ORDER BY metrics.clicks DESC",
        env
      )
      return Response.json({
        ok: true,
        campaigns: camps.map(r => ({
          id:         r.campaign?.id,
          name:       r.campaign?.name,
          status:     r.campaign?.status,
          type:       r.campaign?.advertisingChannelType,
          butce_tl:   r.campaignBudget?.amountMicros ? (parseInt(r.campaignBudget.amountMicros)/1000000).toFixed(2) : null,
          clicks:     r.metrics?.clicks || 0,
          impressions:r.metrics?.impressions || 0,
          ctr:        r.metrics?.ctr ? (parseFloat(r.metrics.ctr)*100).toFixed(2) + "%" : "-",
          cpc_tl:     r.metrics?.averageCpc ? (parseInt(r.metrics.averageCpc)/1000000).toFixed(2) : "-",
          spend_tl:   r.metrics?.costMicros ? (parseInt(r.metrics.costMicros)/1000000).toFixed(2) : "0",
        }))
      }, { headers: cors })
    }

    if (action === "keywords") {
      const kws = await query(
        "SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, " +
        "metrics.clicks, metrics.impressions, metrics.ctr, metrics.average_cpc, " +
        "metrics.average_position, campaign.name, ad_group.name " +
        "FROM keyword_view WHERE segments.date DURING LAST_30_DAYS " +
        "AND campaign.status = ENABLED " +
        "ORDER BY metrics.clicks DESC LIMIT 30",
        env
      )
      return Response.json({
        ok: true,
        keywords: kws.map(r => ({
          keyword:    r.adGroupCriterion?.keyword?.text,
          match:      r.adGroupCriterion?.keyword?.matchType,
          campaign:   r.campaign?.name,
          clicks:     r.metrics?.clicks || 0,
          ctr:        r.metrics?.ctr ? (parseFloat(r.metrics.ctr)*100).toFixed(2) + "%" : "-",
          cpc_tl:     r.metrics?.averageCpc ? (parseInt(r.metrics.averageCpc)/1000000).toFixed(2) : "-",
        }))
      }, { headers: cors })
    }

    if (action === "account") {
      const acc = await query(
        "SELECT customer.id, customer.descriptive_name, customer.currency_code, " +
        "metrics.cost_micros, metrics.clicks, metrics.impressions " +
        "FROM customer WHERE segments.date DURING LAST_7_DAYS",
        env
      )
      return Response.json({ ok: true, account: acc[0] || {} }, { headers: cors })
    }

    throw new Error("Gecersiz action: " + action)

  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  if (!env.GADS_DEV_TOKEN) return Response.json({ ok:false, error:"GADS_DEV_TOKEN eksik" }, { status:500, headers:cors })

  try {
    const body   = await request.json()
    const action = body.action

    if (action === "pause" || action === "enable") {
      const status = action === "pause" ? "PAUSED" : "ENABLED"
      const r = await gads("/customers/" + CID + "/campaigns:mutate", "POST", {
        operations: [{
          update: { resourceName: "customers/" + CID + "/campaigns/" + body.campaign_id, status },
          updateMask: "status"
        }]
      }, env)
      return Response.json({ ok: true, result: r }, { headers: cors })
    }

    if (action === "set_budget") {
      const micros = Math.round(parseFloat(body.budget_tl) * 1000000)
      const r = await gads("/customers/" + CID + "/campaignBudgets:mutate", "POST", {
        operations: [{
          update: { resourceName: body.budget_resource_name, amountMicros: micros },
          updateMask: "amountMicros"
        }]
      }, env)
      return Response.json({ ok: true, result: r }, { headers: cors })
    }

    throw new Error("Gecersiz action")
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }})
}
