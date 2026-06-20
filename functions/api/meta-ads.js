// Meta Ads API - kayserimnet kampanya yonetimi
// GET  ?action=status    kampanya durumlari + bugun harcamasi
// GET  ?action=insights  haftalik/aylik performans
// GET  ?action=account   hesap bakiyesi ve toplam bütçe
// POST action=pause      kampanyayi durdur
// POST action=resume     kampanyayi baslat
// POST action=set_budget kampanya butcesini guncelle
// POST action=create_adset  yeni ad set olustur

const GRAPH = "https://graph.facebook.com/v21.0"
const ACT   = "act_708028213253830"

const CAMPAIGNS = {
  haber:     "120245120742230539",
  altin:     "120245120758240539",
  marka:     "120245120758210539",
  retarget:  "120245120758360539",
}

async function graph(path, method, body, token) {
  if (method === undefined) method = "GET"
  const sep = path.includes("?") ? "&" : "?"
  const r = await fetch(GRAPH + "/" + path + sep + "access_token=" + token, {
    method,
    headers: body ? {"Content-Type": "application/json"} : {},
    body: body ? JSON.stringify(body) : null,
  })
  const d = await r.json()
  if (d.error) throw new Error("Meta: " + d.error.message)
  return d
}

export async function onRequestGet({ request, env }) {
  const cors   = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
  const url    = new URL(request.url)
  const action = url.searchParams.get("action") || "status"
  const TOKEN  = env.META_ADS_TOKEN || "EAAORauw5t7ABR43WgZBGmOmTzzjFNj4pS1IC0e03Mch8ZBsPpeuwDqBN4n510DVOTF4qW22VWLLwd2RNZBuiDN60GuwrWd09U0temzMekKYlrZAbsu7gQNT1VYDeSM5mVHKvrZCOdxf6L3cJllE3XcOVCM0BAQZCg2vZCv7grSKq4WhFUDzUw30WNWG10rLPzkhHwZDZD"

  try {
    // ── Tum kampanyalar + bugun harcamasi ──
    if (action === "status") {
      const fields = "id,name,status,daily_budget,lifetime_budget,effective_status,insights{spend,clicks,impressions,ctr,cpc,reach,frequency}"
      // ARCHIVED + silinen eski kampanyalari gizle, sadece KayserimNet kampanyalari
      const data   = await graph(
        ACT + "/campaigns?fields=" + fields + "&date_preset=today&limit=50" +
        "&filtering=[{\"field\":\"status\",\"operator\":\"NOT_IN\",\"value\":[\"ARCHIVED\",\"DELETED\"]}]",
        "GET", null, TOKEN
      )

      const account = await graph(
        ACT + "?fields=balance,currency,amount_spent,spend_cap,account_status,disable_reason,funding_source_details,min_daily_budget",
        "GET", null, TOKEN
      )
      const statusMap = { 1:"Aktif", 2:"Devre disi", 3:"Onaysiz", 7:"Incelemede", 9:"Odeme sorunu" }

      return Response.json({
        ok: true,
        account: {
          balance:      parseFloat(account.balance || 0) / 100,
          currency:     account.currency || "TRY",
          amount_spent: parseFloat(account.amount_spent || 0) / 100,
          spend_cap:    account.spend_cap ? parseFloat(account.spend_cap) / 100 : null,
          status:       account.account_status,
          status_label: statusMap[account.account_status] || "Aktif",
          disable_reason: account.disable_reason || 0,
          kart:         account.funding_source_details?.display_string || null,
          bakiye_url:   "https://adsmanager.facebook.com/billing?act=708028213253830",
          odeme_url:    "https://adsmanager.facebook.com/billing/payment_methods?act=708028213253830",
          limit_url:    "https://adsmanager.facebook.com/billing/account_spending_limit?act=708028213253830",
          min_daily_tl: account.min_daily_budget ? parseFloat(account.min_daily_budget)/100 : 100,
        },
        campaigns: data.data || [],
        campaign_keys: CAMPAIGNS,
      }, { headers: cors })
    }

    // ── Performans gecmisi ──
    if (action === "insights") {
      const date  = url.searchParams.get("date") || "last_7d"
      const level = url.searchParams.get("level") || "campaign"
      const data  = await graph(
        ACT + "/insights?fields=campaign_name,campaign_id,adset_name,spend,clicks,impressions,ctr,cpc,reach,frequency,actions&date_preset=" + date + "&level=" + level,
        "GET", null, TOKEN
      )
      return Response.json({ ok: true, insights: data.data || [] }, { headers: cors })
    }

    // ── Hesap ozeti + odeme/limit bilgisi ──
    if (action === "account") {
      const account = await graph(
        ACT + "?fields=id,name,balance,currency,amount_spent,spend_cap,daily_spend_limit," +
        "account_status,disable_reason,funding_source_details,business_city,next_bill_date," +
        "min_campaign_group_spend_cap,min_daily_budget",
        "GET", null, TOKEN
      )
      const adsets = await graph(ACT + "/adsets?fields=id,name,status,daily_budget,campaign_id&limit=50", "GET", null, TOKEN)
      // Hesap durumu aciklamasi
      const statusMap = { 1:"Aktif", 2:"Devre disi", 3:"Onaysiz", 7:"Incelemede", 8:"Kapali", 9:"Odeme onaylanmadi" }
      const disableMap = { 0:"Sorun yok", 1:"AUP ihlali", 2:"Policy ihlali", 3:"Odeme sorunu", 4:"Kapatildi", 5:"Facebook kararli" }
      return Response.json({
        ok: true,
        account: {
          ...account,
          balance_tl:       parseFloat(account.balance || 0) / 100,
          amount_spent_tl:  parseFloat(account.amount_spent || 0) / 100,
          spend_cap_tl:     account.spend_cap ? parseFloat(account.spend_cap) / 100 : null,
          status_label:     statusMap[account.account_status] || "Bilinmiyor",
          disable_label:    disableMap[account.disable_reason] || "Bilinmiyor",
          kart:             account.funding_source_details?.display_string || null,
          kart_tip:         account.funding_source_details?.type === 1 ? "Kredi/Banka Karti" : "Diger",
          odeme_url:        "https://business.facebook.com/billing/payment_methods/?act=" + ACT.replace("act_",""),
          bakiye_url:       "https://business.facebook.com/billing/add_funds/?act=" + ACT.replace("act_",""),
          sinir_url:        "https://business.facebook.com/ads/manage/billing/?act=" + ACT.replace("act_",""),
          min_daily_tl:     account.min_daily_budget ? parseFloat(account.min_daily_budget) / 100 : 100,
        },
        adsets: adsets.data || []
      }, { headers: cors })
    }

    throw new Error("Gecersiz action: " + action)

  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestPost({ request, env }) {
  const cors  = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
  const TOKEN = env.META_ADS_TOKEN || "EAAORauw5t7ABR43WgZBGmOmTzzjFNj4pS1IC0e03Mch8ZBsPpeuwDqBN4n510DVOTF4qW22VWLLwd2RNZBuiDN60GuwrWd09U0temzMekKYlrZAbsu7gQNT1VYDeSM5mVHKvrZCOdxf6L3cJllE3XcOVCM0BAQZCg2vZCv7grSKq4WhFUDzUw30WNWG10rLPzkhHwZDZD"

  try {
    const body   = await request.json()
    const action = body.action

    // ── Kampanyayi durdur / baslat ──
    if (action === "pause" || action === "resume") {
      const cid    = typeof body.campaign_id === "string" ? body.campaign_id : CAMPAIGNS[body.campaign_key]
      if (!cid) throw new Error("Gecersiz kampanya")
      const status = action === "pause" ? "PAUSED" : "ACTIVE"
      await graph(cid, "POST", { status }, TOKEN)
      return Response.json({ ok: true, campaign_id: cid, status }, { headers: cors })
    }

    // ── Butce guncelle ──
    if (action === "set_budget") {
      const cid    = typeof body.campaign_id === "string" ? body.campaign_id : CAMPAIGNS[body.campaign_key]
      if (!cid) throw new Error("Gecersiz kampanya")
      const tl     = parseFloat(body.budget_tl)
      if (isNaN(tl) || tl < 5) throw new Error("Butce en az 5 TL olmali")
      await graph(cid, "POST", { daily_budget: Math.round(tl * 100) }, TOKEN)
      return Response.json({ ok: true, campaign_id: cid, daily_budget_tl: tl }, { headers: cors })
    }

    // ── Tum aktif kampanyalari durdur ──
    if (action === "pause_all") {
      const results = {}
      for (const [key, cid] of Object.entries(CAMPAIGNS)) {
        try {
          await graph(cid, "POST", { status: "PAUSED" }, TOKEN)
          results[key] = "PAUSED"
        } catch(e) {
          results[key] = "HATA: " + e.message
        }
      }
      return Response.json({ ok: true, results }, { headers: cors })
    }

    // ── Ad set olustur ──
    if (action === "create_adset") {
      const cid = CAMPAIGNS[body.campaign_key]
      if (!cid) throw new Error("Gecersiz campaign_key")
      const adset = await graph(ACT + "/adsets", "POST", {
        name:              body.name || (body.campaign_key + " AdSet"),
        campaign_id:       cid,
        destination_type:  "WEBSITE",
        billing_event:     "IMPRESSIONS",
        optimization_goal: body.optimization_goal || "LINK_CLICKS",
        bid_amount:        (body.bid_tl || 2) * 100,
        promoted_object:   { page_id: body.page_id || "506931626168922" },
        targeting:         body.targeting || {
          geo_locations: { cities: [{ key: "789723", name: "Kayseri", country: "TR" }] },
          age_min: 18, age_max: 65
        },
        dsa_beneficiary:   "Kayserim.net",
        dsa_payor:         "Mustafa Bayram",
        status:            "ACTIVE",
      }, TOKEN)
      return Response.json({ ok: true, adset_id: adset.id }, { headers: cors })
    }

    throw new Error("Gecersiz action: " + action)

  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
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
