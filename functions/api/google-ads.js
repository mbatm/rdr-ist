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
      "login-customer-id": CID,
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

// ── Google Ads REST mutate yardımcısı ──
async function gadsPost(env, token, path, body) {
  const r = await fetch(API_BASE + path, {
    method: "POST",
    headers: {
      "Authorization":     "Bearer " + token,
      "developer-token":   env.GADS_DEV_TOKEN,
      "login-customer-id": CID,
      "Content-Type":      "application/json"
    },
    body: JSON.stringify(body)
  })
  const txt = await r.text()
  let d
  try { d = JSON.parse(txt) } catch { throw new Error("HTTP " + r.status + ": " + txt.slice(0, 300)) }
  if (d.error) {
    let det = ""
    try {
      const gaf = (d.error.details || []).find(x => x.errors) || (d.error.details || [])[0]
      const errs = gaf && gaf.errors ? gaf.errors : null
      if (errs) det = " :: " + errs.map(e => {
        const fp = e.location && e.location.fieldPathElements ? e.location.fieldPathElements.map(f => f.fieldName).join(".") : ""
        const code = e.errorCode ? Object.values(e.errorCode)[0] : ""
        return (fp ? fp + " → " : "") + code + (e.message ? " (" + e.message + ")" : "")
      }).join(" | ")
    } catch(_) {}
    if (!det) det = " :: " + JSON.stringify(d.error.details || d.error).slice(0, 600)
    throw new Error((d.error.message || "Google Ads API") + det)
  }
  return d
}

// Kayseri gibi bir konum adını Google geo target sabitine çevirir
async function resolveGeo(env, token, name) {
  try {
    const d = await gadsPost(env, token, "/geoTargetConstants:suggest", {
      locale: "tr", countryCode: "TR", locationNames: { names: [name] }
    })
    const sugg = d.geoTargetConstantSuggestions || []
    const pick = sugg.find(s => s.geoTargetConstant && new RegExp(name, "i").test(s.geoTargetConstant.name || "")) || sugg[0]
    return pick && pick.geoTargetConstant ? pick.geoTargetConstant.resourceName : null
  } catch { return null }
}

// Hazır kampanya şablonları
const PRESETLER = {
  altin: {
    ad:   "Search - Altın Fiyatları",
    link: "https://www.kayserim.net/haber/21594322/kayseri-altin-fiyatlari",
    kelimeler: ["kayseri altın fiyatları", "altın fiyatları kayseri", "kayseri gram altın", "kayseri çeyrek altın", "bugün altın fiyatları kayseri"],
    basliklar: ["Kayseri Altın Fiyatları", "Gram Altın Bugün", "Canlı Altın Fiyatları", "Çeyrek Altın Ne Kadar?", "Anlık Altın Kuru", "Kayseri'de Altın", "Güncel Gram Altın"],
    aciklamalar: [
      "Kayseri altın fiyatları anlık güncel. Gram, çeyrek, yarım altın kuru burada.",
      "Bugün altın ne kadar? Canlı altın fiyatlarını kayserim.net'ten takip edin.",
      "Gram, çeyrek, ata altın güncel fiyatları. Anlık takip kayserim.net'te."
    ]
  }
}

// Search kampanyası oluşturur: budget → campaign(PAUSED) → geo/dil → adgroup → keyword → RSA
async function kampanyaAc(env, opts) {
  const token  = await getAccessToken(env)
  const preset = PRESETLER[opts.preset || "altin"] || PRESETLER.altin
  const ad     = opts.ad   || preset.ad
  const link   = opts.link || preset.link
  const butceTl   = parseFloat(opts.butce || 50)
  const cpcTl     = parseFloat(opts.max_cpc || 3)
  const kelimeler   = opts.kelimeler   || preset.kelimeler
  const basliklar   = opts.basliklar   || preset.basliklar
  const aciklamalar = opts.aciklamalar || preset.aciklamalar
  const stamp = Date.now().toString().slice(-6)
  const base  = "/customers/" + CID

  // 1) Bütçe
  const budgetRes = await gadsPost(env, token, base + "/campaignBudgets:mutate", {
    operations: [{ create: { name: ad + " Bütçe " + stamp, amountMicros: String(Math.round(butceTl * 1e6)), deliveryMethod: "STANDARD", explicitlyShared: false } }]
  })
  const budgetRN = budgetRes.results[0].resourceName

  // 2) Kampanya (PAUSED, Manuel TBM)
  const bugun = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const campRes = await gadsPost(env, token, base + "/campaigns:mutate", {
    operations: [{ create: {
      name: ad + " " + stamp,
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      manualCpc: {},
      campaignBudget: budgetRN,
      networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false, targetPartnerSearchNetwork: false }
    } }]
  })
  const campRN = campRes.results[0].resourceName
  const campId = campRN.split("/").pop()

  // 3) Coğrafi (Kayseri) + dil (Türkçe) hedefleme
  const geoRN = await resolveGeo(env, token, "Kayseri")
  const critOps = []
  if (geoRN) critOps.push({ create: { campaign: campRN, location: { geoTargetConstant: geoRN } } })
  critOps.push({ create: { campaign: campRN, language: { languageConstant: "languageConstants/1037" } } })
  await gadsPost(env, token, base + "/campaignCriteria:mutate", { operations: critOps })

  // 4) Reklam grubu
  const agRes = await gadsPost(env, token, base + "/adGroups:mutate", {
    operations: [{ create: { name: ad + " Grup " + stamp, campaign: campRN, status: "ENABLED", type: "SEARCH_STANDARD", cpcBidMicros: String(Math.round(cpcTl * 1e6)) } }]
  })
  const agRN = agRes.results[0].resourceName

  // 5) Anahtar kelimeler (sıralı eşleme)
  await gadsPost(env, token, base + "/adGroupCriteria:mutate", {
    operations: kelimeler.map(k => ({ create: { adGroup: agRN, status: "ENABLED", keyword: { text: k, matchType: "PHRASE" } } }))
  })

  // 6) Responsive Search Ad
  const adRes = await gadsPost(env, token, base + "/adGroupAds:mutate", {
    operations: [{ create: {
      adGroup: agRN, status: "ENABLED",
      ad: { finalUrls: [link], responsiveSearchAd: {
        headlines:    basliklar.slice(0, 15).map(t => ({ text: t })),
        descriptions: aciklamalar.slice(0, 4).map(t => ({ text: t }))
      } }
    } }]
  })
  const adRN = adRes.results[0].resourceName

  // 7) ad.id doğrulandı → istenirse kampanyayı yayına al
  let durum = "PAUSED"
  if ((opts.aktif === true || opts.aktif === "true") && adRN) {
    await gadsPost(env, token, base + "/campaigns:mutate", {
      operations: [{ update: { resourceName: campRN, status: "ENABLED" }, updateMask: "status" }]
    })
    durum = "ENABLED"
  }

  return { ok: true, kampanya_id: campId, kampanya: ad + " " + stamp, reklam: adRN, geo: geoRN, durum, butce_tl: butceTl, max_cpc_tl: cpcTl, link, kelime_sayisi: kelimeler.length }
}

// Para harcayan işlemler için yetki kontrolü (RSS_API_KEY ya da geçerli cms_token)
async function yetkili(request, env, body) {
  const url = new URL(request.url)
  const sec = url.searchParams.get("secret") || request.headers.get("x-api-key") || (body && body.secret) || ""
  if (!sec) return false
  if (env.RSS_API_KEY && sec === env.RSS_API_KEY) return true
  try { if (await env.HABERLER.get("token:" + sec)) return true } catch {}
  return false
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
      const token = await getAccessToken(env)
      const accRes = await fetch(API_BASE + "/customers:listAccessibleCustomers", {
        method: "GET",
        headers: {
          "Authorization":     "Bearer " + token,
          "developer-token":   env.GADS_DEV_TOKEN,
          "login-customer-id": CID
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
  let body = {}
  try { body = await request.json() } catch {}
  try {
    if (body.action === "kampanya_ac") {
      if (!(await yetkili(request, env, body))) return Response.json({ ok: false, error: "yetkisiz" }, { status: 401, headers: cors })
      return Response.json(await kampanyaAc(env, body), { headers: cors })
    }
    // duraklat / yayına al
    const token = await getAccessToken(env)
    const st    = body.action === "pause" ? "PAUSED" : "ENABLED"
    const r     = await gadsPost(env, token, "/customers/" + CID + "/campaigns:mutate", {
      operations: [{ update: { resourceName: "customers/" + CID + "/campaigns/" + body.campaign_id, status: st }, updateMask: "status" }]
    })
    return Response.json({ ok: true, result: r }, { headers: cors })
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
}
