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

// Erişim: RSS_API_KEY (sunucu) veya geçerli cms_token (giriş yapmış kullanıcı)
async function yetkili(request, env, bodyKey) {
  const url = new URL(request.url)
  const key = url.searchParams.get("secret") || bodyKey || request.headers.get("x-api-key") || request.headers.get("x-token") || ""
  if (!key) return false
  if (env.RSS_API_KEY && key === env.RSS_API_KEY) return true
  try { return !!(await env.HABERLER.get("token:" + key, "json")) } catch (_) { return false }
}

export async function onRequestGet({ request, env }) {
  const cors   = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
  const url    = new URL(request.url)
  const action = url.searchParams.get("action") || "status"
  const TOKEN  = env.META_ADS_TOKEN || "EAAORauw5t7ABR43WgZBGmOmTzzjFNj4pS1IC0e03Mch8ZBsPpeuwDqBN4n510DVOTF4qW22VWLLwd2RNZBuiDN60GuwrWd09U0temzMekKYlrZAbsu7gQNT1VYDeSM5mVHKvrZCOdxf6L3cJllE3XcOVCM0BAQZCg2vZCv7grSKq4WhFUDzUw30WNWG10rLPzkhHwZDZD"

  try {
    if (!(await yetkili(request, env))) return Response.json({ ok: false, error: "Yetkisiz" }, { status: 401, headers: cors })
    // ── Tum kampanyalar + bugun harcamasi ──
    if (action === "status") {
      const fields = "id,name,status,daily_budget,lifetime_budget,effective_status,insights{spend,clicks,impressions,ctr,cpc,reach,frequency}"
      // Tum kampanyalari cek, JS tarafinda ARCHIVED/DELETED filtrele
      const data = await graph(
        ACT + "/campaigns?fields=" + fields + "&date_preset=today&limit=50",
        "GET", null, TOKEN
      )
      // ARCHIVED ve DELETED kampanyalari gizle
      const filtered = { ...data, data: (data.data || []).filter(c => c.status !== "ARCHIVED" && c.status !== "DELETED") }

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
        campaigns: filtered.data || [],
        campaign_keys: CAMPAIGNS,
      }, { headers: cors })
    }

    // ── TANI: neden yayına girmiyor? ad-seviyesi durum + red sebepleri ──
    if (action === "tani") {
      const camps = await graph(ACT + "/campaigns?fields=id,name,status,effective_status&limit=50", "GET", null, TOKEN)
      const adsets = await graph(ACT + "/adsets?fields=id,name,status,effective_status,campaign_id&limit=100", "GET", null, TOKEN)
      const ads = await graph(ACT + "/ads?fields=id,name,status,effective_status,adset_id,campaign_id,issues_info,ad_review_feedback&limit=100", "GET", null, TOKEN)
      const aktifCamps = (camps.data || []).filter(c => c.status !== "ARCHIVED" && c.status !== "DELETED")
      const rapor = aktifCamps.map(c => ({
        kampanya: c.name, id: c.id, status: c.status, eff: c.effective_status,
        adsetler: (adsets.data || []).filter(a => a.campaign_id === c.id).map(a => ({ ad: a.name, status: a.status, eff: a.effective_status })),
        reklamlar: (ads.data || []).filter(a => a.campaign_id === c.id).map(a => ({
          ad: a.name, status: a.status, eff: a.effective_status,
          sorunlar: (a.issues_info || []).map(i => i.error_summary || i.error_message || i.error_code),
          red: a.ad_review_feedback || null,
        })),
        reklam_yok: !(ads.data || []).some(a => a.campaign_id === c.id),
      }))
      return Response.json({ ok: true, rapor }, { headers: cors })
    }

    // ── TEST: oto-motorun creative+ad adımını birebir dene, ham Meta yanıtını dön ──
    if (action === "test_creative") {
      const PAGE = "139690272760213"
      const cr = await fetch(GRAPH + "/" + ACT + "/adcreatives?access_token=" + TOKEN, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "TANI Creative " + Date.now(), object_story_spec: { page_id: PAGE, link_data: { link: "https://www.kayserim.net", message: "Kayseri son dakika haberleri", name: "Kayseri - Son Dakika", call_to_action: { type: "LEARN_MORE", value: { link: "https://www.kayserim.net" } } } } })
      }).then(r => r.json())
      let temizlik = null
      if (cr.id) { try { await fetch(GRAPH + "/" + cr.id + "?access_token=" + TOKEN, { method: "DELETE" }); temizlik = "silindi" } catch (_) {} }
      return Response.json({ ok: !!cr.id, creative_id: cr.id || null, error: cr.error || null, temizlik }, { headers: cors })
    }

    // ── TEST: tam zincir (kampanya PAUSED) → ad adımının ham hatasını yakala, sonra sil ──
    if (action === "test_ad") {
      const PAGE = "139690272760213"
      const J = (o) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) })
      const adimlar = {}
      const camp = await fetch(GRAPH + "/" + ACT + "/campaigns?access_token=" + TOKEN, J({ name: "TANI " + Date.now(), objective: "OUTCOME_TRAFFIC", daily_budget: 10000, status: "PAUSED", special_ad_categories: [] })).then(r => r.json())
      adimlar.campaign = camp.id || camp.error
      if (camp.id) {
        const adset = await fetch(GRAPH + "/" + ACT + "/adsets?access_token=" + TOKEN, J({ name: "TANI AdSet", campaign_id: camp.id, billing_event: "IMPRESSIONS", optimization_goal: "LINK_CLICKS", destination_type: "WEBSITE", bid_amount: 200, promoted_object: { page_id: PAGE }, targeting: { geo_locations: { regions: [{ key: "3686" }], location_types: ["home", "recent"] }, age_min: 18, targeting_automation: { advantage_audience: 0 } }, dsa_beneficiary: "Kayserim.net", dsa_payor: "Mustafa Bayram", status: "PAUSED" })).then(r => r.json())
        adimlar.adset = adset.id || adset.error
        if (adset.id) {
          const cr = await fetch(GRAPH + "/" + ACT + "/adcreatives?access_token=" + TOKEN, J({ name: "TANI Creative", object_story_spec: { page_id: PAGE, link_data: { link: "https://www.kayserim.net", message: "Kayseri son dakika", name: "Kayseri - Son Dakika", call_to_action: { type: "LEARN_MORE", value: { link: "https://www.kayserim.net" } } } } })).then(r => r.json())
          adimlar.creative = cr.id || cr.error
          if (cr.id) {
            const ad = await fetch(GRAPH + "/" + ACT + "/ads?access_token=" + TOKEN, J({ name: "TANI Ad", adset_id: adset.id, creative: { creative_id: cr.id }, status: "PAUSED" })).then(r => r.json())
            adimlar.ad = ad.id || ad.error
            if (ad.id) {
              // Motorun yeni akışı: ad doğrulandı → AKTİF et (ad → adset → campaign)
              try {
                await graph(ad.id, "POST", { status: "ACTIVE" }, TOKEN)
                await graph(adset.id, "POST", { status: "ACTIVE" }, TOKEN)
                await graph(camp.id, "POST", { status: "ACTIVE" }, TOKEN)
                adimlar.aktiflestirme = "OK"
              } catch (e) { adimlar.aktiflestirme = "HATA: " + e.message }
              try {
                const dd = await graph(ad.id + "?fields=effective_status,issues_info", "GET", null, TOKEN)
                adimlar.ad_effective_status = dd.effective_status
                adimlar.ad_sorunlar = (dd.issues_info || []).map(i => i.error_summary || i.error_message)
              } catch (_) {}
            }
          }
        }
        try { await fetch(GRAPH + "/" + camp.id + "?access_token=" + TOKEN, { method: "DELETE" }); adimlar.temizlik = "kampanya silindi" } catch (_) {}
      }
      return Response.json({ ok: true, adimlar }, { headers: cors })
    }

    // ── TEMİZLİK: reklamı olmayan AKTİF kampanyaları PAUSED yap (silmez, geri alınabilir) ──
    if (action === "temizle_bos") {
      const ads = await graph(ACT + "/ads?fields=campaign_id&limit=200", "GET", null, TOKEN)
      const reklamli = new Set((ads.data || []).map(a => a.campaign_id))
      const camps = await graph(ACT + "/campaigns?fields=id,name,status&limit=50", "GET", null, TOKEN)
      const bos = (camps.data || []).filter(c => c.status === "ACTIVE" && !reklamli.has(c.id))
      const sonuc = []
      for (const c of bos) {
        try { await graph(c.id, "POST", { status: "PAUSED" }, TOKEN); sonuc.push({ kampanya: c.name, islem: "PAUSED (reklamsız)" }) }
        catch (e) { sonuc.push({ kampanya: c.name, hata: e.message }) }
      }
      return Response.json({ ok: true, duraklatilan_sayisi: sonuc.length, duraklatilanlar: sonuc }, { headers: cors })
    }

    // ── NEDEN teslimat yok? adset bid/optimizasyon ayarlarını karşılaştır ──
    if (action === "neden") {
      const camps = await graph(ACT + "/campaigns?fields=id,name,bid_strategy,status,daily_budget&limit=50", "GET", null, TOKEN)
      const adsets = await graph(ACT + "/adsets?fields=id,name,campaign_id,status,effective_status,bid_strategy,bid_amount,daily_budget,optimization_goal,billing_event,issues_info,start_time,end_time,targeting,promoted_object&limit=100", "GET", null, TOKEN)
      const rapor = (camps.data || []).filter(c => c.status !== "ARCHIVED" && c.status !== "DELETED").map(c => ({
        k: (c.name || "").replace("KayserimNet - ", ""), camp_bid: c.bid_strategy, camp_butce: c.daily_budget, status: c.status,
        adsetler: (adsets.data || []).filter(a => a.campaign_id === c.id).map(a => ({
          eff: a.effective_status, bid_amount: a.bid_amount, opt: a.optimization_goal, bill: a.billing_event,
          promoted: a.promoted_object || null,
          geo: a.targeting?.geo_locations || null,
          yas: (a.targeting?.age_min || "") + "-" + (a.targeting?.age_max || ""),
          adv: a.targeting?.targeting_automation || null,
          sorun: (a.issues_info || []).map(i => i.error_summary || i.error_message)
        }))
      }))
      return Response.json({ ok: true, rapor }, { headers: cors })
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
          bakiye_url:       "https://adsmanager.facebook.com/billing?act=708028213253830",
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
    if (!(await yetkili(request, env, body.secret))) return Response.json({ ok: false, error: "Yetkisiz" }, { status: 401, headers: cors })

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

    // ── Tam kampanya oluştur (PAUSED→ad doğrula→AKTİF) — düzeltilmiş akış ──
    if (action === "kampanya_ac") {
      const PAGE = "139690272760213"
      const ad    = body.ad || "KayserimNet - Manuel - " + Date.now()
      const link  = body.link || "https://www.kayserim.net"
      const mesaj = body.mesaj || "Kayseri son dakika haberleri kayserim.net'te"
      const baslik= body.baslik || "Kayseri - Son Dakika"
      const butce = body.butce || 10000
      const J = (o) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) })
      const camp = await fetch(GRAPH + "/" + ACT + "/campaigns?access_token=" + TOKEN, J({ name: ad, objective: "OUTCOME_TRAFFIC", daily_budget: butce, status: "PAUSED", special_ad_categories: [] })).then(r => r.json())
      if (!camp.id) return Response.json({ ok: false, adim: "campaign", error: camp.error }, { headers: cors })
      const adset = await fetch(GRAPH + "/" + ACT + "/adsets?access_token=" + TOKEN, J({ name: ad + " AdSet", campaign_id: camp.id, billing_event: "IMPRESSIONS", optimization_goal: "LINK_CLICKS", destination_type: "WEBSITE", bid_amount: 500, promoted_object: { page_id: PAGE }, targeting: { geo_locations: { regions: [{ key: "3686" }], location_types: ["home", "recent"] }, age_min: 18, targeting_automation: { advantage_audience: 0 } }, dsa_beneficiary: "Kayserim.net", dsa_payor: "Mustafa Bayram", status: "PAUSED" })).then(r => r.json())
      if (!adset.id) return Response.json({ ok: false, adim: "adset", error: adset.error }, { headers: cors })
      const cr = await fetch(GRAPH + "/" + ACT + "/adcreatives?access_token=" + TOKEN, J({ name: ad + " Creative", object_story_spec: { page_id: PAGE, link_data: { link, message: mesaj, name: baslik, call_to_action: { type: "LEARN_MORE", value: { link } } } } })).then(r => r.json())
      if (!cr.id) return Response.json({ ok: false, adim: "creative", error: cr.error }, { headers: cors })
      const adObj = await fetch(GRAPH + "/" + ACT + "/ads?access_token=" + TOKEN, J({ name: ad, adset_id: adset.id, creative: { creative_id: cr.id }, status: "PAUSED" })).then(r => r.json())
      if (!adObj.id) return Response.json({ ok: false, adim: "ad", error: adObj.error }, { headers: cors })
      try {
        await graph(adObj.id, "POST", { status: "ACTIVE" }, TOKEN)
        await graph(adset.id, "POST", { status: "ACTIVE" }, TOKEN)
        await graph(camp.id, "POST", { status: "ACTIVE" }, TOKEN)
      } catch (e) { return Response.json({ ok: false, adim: "aktif", error: e.message, camp_id: camp.id }, { headers: cors }) }
      let eff = null, sorunlar = []
      try { const dd = await graph(adObj.id + "?fields=effective_status,issues_info", "GET", null, TOKEN); eff = dd.effective_status; sorunlar = (dd.issues_info || []).map(i => i.error_summary || i.error_message) } catch (_) {}
      return Response.json({ ok: true, kampanya: ad, camp_id: camp.id, ad_id: adObj.id, effective_status: eff, sorunlar }, { headers: cors })
    }

    // ── Kampanyanın adset bid_amount'unu güncelle (teslimat için tavanı yükselt) ──
    if (action === "bid_guncelle") {
      const cid = body.campaign_id
      const yeniBid = body.bid_amount || 500
      if (!cid) throw new Error("campaign_id gerekli")
      const adsets = await graph(ACT + "/adsets?fields=id,campaign_id&limit=100", "GET", null, TOKEN)
      const hedef = (adsets.data || []).filter(a => a.campaign_id === cid)
      const sonuc = []
      for (const a of hedef) {
        try { await graph(a.id, "POST", { bid_amount: yeniBid }, TOKEN); sonuc.push({ adset: a.id, bid: yeniBid }) }
        catch (e) { sonuc.push({ adset: a.id, hata: e.message }) }
      }
      return Response.json({ ok: true, campaign_id: cid, guncellenen: sonuc }, { headers: cors })
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
