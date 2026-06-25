// Google Ads API - kayserimnet
const API_BASE = "https://googleads.googleapis.com/v23"
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
  if (!d.access_token) throw new Error("OAuth hata: " + JSON.stringify(d))
  return d.access_token
}

async function query(gaql, env) {
  const token = await getAccessToken(env)
  const r = await fetch(API_BASE + "/customers/" + CID + "/googleAds:search", {
    method: "POST",
    headers: {
      "Authorization":     "Bearer " + token,
      "developer-token":   env.GADS_DEV_TOKEN,
      "login-customer-id": env.GADS_MANAGER_ID || env.GADS_CUSTOMER_ID || CID,
      "Content-Type":      "application/json"
    },
    body: JSON.stringify({ query: gaql })
  })
  const txt = await r.text()
  if (!txt.startsWith("{") && !txt.startsWith("[")) {
    throw new Error("Google Ads HTTP " + r.status + ": " + txt.slice(0, 300))
  }
  const d = JSON.parse(txt)
  if (d.error) throw new Error("Google Ads API: " + (d.error.message || JSON.stringify(d.error).slice(0,200)))
  return d.results || []
}

export async function onRequestGet({ request, env }) {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  const url  = new URL(request.url)
  const act  = url.searchParams.get("action") || "status"

  const envDurum = {
    DEV_TOKEN:     !!env.GADS_DEV_TOKEN,
    CLIENT_ID:     !!env.GADS_CLIENT_ID,
    CLIENT_SECRET: !!env.GADS_CLIENT_SECRET,
    REFRESH_TOKEN: !!env.GADS_REFRESH_TOKEN,
    MANAGER_ID:    !!env.GADS_MANAGER_ID
  }

  if (!env.GADS_DEV_TOKEN) {
    return Response.json({ ok: false, setup: true, env_durum: envDurum, mesaj: "GADS_DEV_TOKEN eksik" }, { headers: cors })
  }

  try {
    if (act === "status") {
      // Önce accessible_customers test et
      const token = await getAccessToken(env)
      const accRes = await fetch(API_BASE + "/customers:listAccessibleCustomers", {
        method: "GET",
        headers: {
          "Authorization":     "Bearer " + token,
          "developer-token":   env.GADS_DEV_TOKEN,
          "login-customer-id": env.GADS_MANAGER_ID || CID
        }
      })
      const accTxt = await accRes.text()
      if (!accTxt.startsWith("{")) {
        return Response.json({ ok:false, error:"accessible_customers HTTP "+accRes.status, raw: accTxt.slice(0,300) }, { headers:cors })
      }
      const accData = JSON.parse(accTxt)
      if (accData.error) {
        return Response.json({ ok:false, error:"accessible_customers: "+accData.error.message, details: accData }, { headers:cors })
      }
      // Erişilebilir hesaplar bulunduysa kampanyaları çek
      const camps = await query(
        "SELECT campaign.id, campaign.name, campaign.status, " +
        "campaign_budget.amount_micros, metrics.clicks, metrics.impressions, " +
        "metrics.ctr, metrics.average_cpc, metrics.cost_micros " +
        "FROM campaign WHERE segments.date DURING LAST_7_DAYS ORDER BY metrics.clicks DESC",
        env
      )
      return Response.json({
        ok: true,
        accessible_customers: accData.resourceNames || [],
        campaigns: camps.map(function(r) {
          return {
            id:          r.campaign && r.campaign.id,
            name:        r.campaign && r.campaign.name,
            status:      r.campaign && r.campaign.status,
            butce_tl:    r.campaignBudget && r.campaignBudget.amountMicros ? (parseInt(r.campaignBudget.amountMicros)/1000000).toFixed(2) : null,
            clicks:      r.metrics && r.metrics.clicks || 0,
            impressions: r.metrics && r.metrics.impressions || 0,
            ctr:         r.metrics && r.metrics.ctr ? (parseFloat(r.metrics.ctr)*100).toFixed(2)+"%" : "-",
            cpc_tl:      r.metrics && r.metrics.averageCpc ? (parseInt(r.metrics.averageCpc)/1000000).toFixed(2) : "-",
            spend_tl:    r.metrics && r.metrics.costMicros ? (parseInt(r.metrics.costMicros)/1000000).toFixed(2) : "0"
          }
        })
      }, { headers: cors })
    }

    if (act === "keywords") {
      const kws = await query(
        "SELECT ad_group_criterion.keyword.text, metrics.clicks, metrics.ctr, " +
        "metrics.average_cpc, campaign.name " +
        "FROM keyword_view WHERE segments.date DURING LAST_30_DAYS " +
        "AND campaign.status = ENABLED ORDER BY metrics.clicks DESC LIMIT 20",
        env
      )
      return Response.json({
        ok: true,
        keywords: kws.map(function(r) {
          return {
            keyword: r.adGroupCriterion && r.adGroupCriterion.keyword && r.adGroupCriterion.keyword.text,
            campaign: r.campaign && r.campaign.name,
            clicks: r.metrics && r.metrics.clicks || 0,
            ctr:    r.metrics && r.metrics.ctr ? (parseFloat(r.metrics.ctr)*100).toFixed(2)+"%" : "-",
            cpc_tl: r.metrics && r.metrics.averageCpc ? (parseInt(r.metrics.averageCpc)/1000000).toFixed(2) : "-"
          }
        })
      }, { headers: cors })
    }

    return Response.json({ ok: false, error: "Gecersiz action: " + act }, { headers: cors })
  } catch(e) {
    return Response.json({ ok: false, error: e.message, env_durum: envDurum }, { status: 500, headers: cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  if (!env.GADS_DEV_TOKEN) return Response.json({ ok: false, error: "GADS_DEV_TOKEN eksik" }, { status: 500, headers: cors })
  try {
    const body  = await request.json()
    const token = await getAccessToken(env)
    const st    = body.action === "pause" ? "PAUSED" : "ENABLED"
    const r     = await fetch(API_BASE + "/customers/" + CID + "/campaigns:mutate", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "developer-token": env.GADS_DEV_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ operations: [{ update: { resourceName: "customers/" + CID + "/campaigns/" + body.campaign_id, status: st }, updateMask: "status" }] })
    }).then(function(r) { return r.json() })
    return Response.json({ ok: true, result: r }, { headers: cors })
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
}
