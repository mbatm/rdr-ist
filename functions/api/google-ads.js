// Google Ads API - Supermetrics proxy
// GET  ?action=campaigns   kampanya listesi
// GET  ?action=insights    performans verisi
// POST action=set_budget   butce guncelle
// POST action=toggle       durdur / baslat

const SUPERMETRICS_URL = "https://gcp1-api.supermetrics.com/enterprise/v2/query/data/json"
const CUSTOMER_ID = "7731778727" // 773-177-8727 tire olmadan

async function smQuery(query, env) {
  const key = env.SUPERMETRICS_KEY || ""
  if (!key) throw new Error("SUPERMETRICS_KEY env variable eksik")

  const r = await fetch(SUPERMETRICS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify(query)
  })
  const d = await r.json()
  if (d.meta?.errors?.length) throw new Error(d.meta.errors[0].message || "Supermetrics hatasi")
  return d
}

export async function onRequestGet({ request, env }) {
  const cors   = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  const url    = new URL(request.url)
  const action = url.searchParams.get("action") || "campaigns"
  const date   = url.searchParams.get("date") || "last_7d"

  try {
    if (action === "campaigns") {
      const data = await smQuery({
        ds_id: "AW",
        ds_accounts: [CUSTOMER_ID],
        date_range_type: date,
        fields: ["campaign", "campaign_status", "campaign_id", "impressions", "clicks", "cost", "ctr", "average_cpc", "campaign_budget_amount"],
        max_rows: 50
      }, env)

      return Response.json({
        ok: true,
        campaigns: data.data || [],
        headers: data.meta?.fields || []
      }, { headers: cors })
    }

    if (action === "insights") {
      const data = await smQuery({
        ds_id: "AW",
        ds_accounts: [CUSTOMER_ID],
        date_range_type: date,
        fields: ["date", "impressions", "clicks", "cost", "ctr", "average_cpc", "conversions"],
        max_rows: 30
      }, env)

      return Response.json({ ok: true, rows: data.data || [] }, { headers: cors })
    }

    throw new Error("Gecersiz action: " + action)

  } catch(e) {
    const isAuth = e.message.includes("No accounts") || e.message.includes("eksik") || e.message.includes("login")
    return Response.json({
      ok: false,
      error: e.message,
      needs_auth: isAuth,
      auth_url: "https://gcp1-api-default.supermetrics.com/v2/datasource/login/renew/NI1qFPopDC8M01QRBHMLmBrwYSN5h3s5f9m5lbBAUadGlmb_d7"
    }, { status: isAuth ? 401 : 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  })
}
