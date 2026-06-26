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
  },
  namaz: {
    ad:   "Search - Namaz Vakitleri",
    link: "https://www.kayserim.net/kayseri-namaz-vakitleri",
    kelimeler: ["kayseri namaz vakitleri", "kayseri namaz vakti", "namaz vakti kayseri", "kayseri ezan saati", "kayseri imsak vakti"],
    basliklar: ["Kayseri Namaz Vakitleri", "Bugün Ezan Saatleri", "Kayseri İmsak Vakti", "Namaz Saatleri Kayseri", "Güncel Ezan Vakti", "Kayseri'de Namaz Saati", "Öğle İkindi Akşam"],
    aciklamalar: [
      "Kayseri namaz vakitleri: imsak, öğle, ikindi, akşam, yatsı saatleri güncel.",
      "Bugün Kayseri'de ezan saat kaçta? Tüm namaz vakitleri kayserim.net'te.",
      "Kayseri için güncel namaz ve imsak vakitlerini anlık takip edin."
    ]
  },
  eczane: {
    ad:   "Search - Nöbetçi Eczane",
    link: "https://www.kayserim.net/kayseri-nobetci-eczaneler",
    kelimeler: ["kayseri nöbetçi eczane", "nöbetçi eczane kayseri", "kayseri nöbetçi eczaneler", "develi nöbetçi eczane", "bugün nöbetçi eczane kayseri"],
    basliklar: ["Kayseri Nöbetçi Eczane", "Bugün Nöbetçi Eczaneler", "En Yakın Nöbetçi Eczane", "Kayseri Eczane Nöbeti", "Açık Eczaneler Kayseri", "Nöbetçi Eczane Listesi", "Kayseri'de Açık Eczane"],
    aciklamalar: [
      "Kayseri nöbetçi eczaneler: bugün açık olan en yakın eczaneleri bul.",
      "Kayseri ve ilçelerinde nöbetçi eczane listesi, adres ve telefon.",
      "Gece açık eczane mi arıyorsun? Güncel nöbetçi eczane listesi burada."
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
    if (act === "tani") {
      const rowsOf = (res) => Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : (res && res.results ? res.results : []));
      const sonuc = { ok: true };
      try {
        const b = rowsOf(await query("SELECT billing_setup.id, billing_setup.status, billing_setup.payments_account_info.payments_account_name FROM billing_setup", env));
        sonuc.billing = b.map(r => ({ status: r.billingSetup && r.billingSetup.status, hesap: r.billingSetup && r.billingSetup.paymentsAccountInfo && r.billingSetup.paymentsAccountInfo.paymentsAccountName || null }));
        sonuc.billing_var = sonuc.billing.some(x => x.status === "APPROVED");
        sonuc.billing_ham = b[0] || null;
      } catch (e) { sonuc.billing_hata = String(e).slice(0, 200); }
      try {
        const cu = rowsOf(await query("SELECT customer.id, customer.status, customer.test_account FROM customer", env));
        sonuc.hesap = cu.map(r => ({ id: r.customer && r.customer.id, durum: r.customer && r.customer.status, test: r.customer && r.customer.testAccount }));
      } catch (e) { sonuc.hesap_hata = String(e).slice(0, 200); }
      try {
        const ads = rowsOf(await query("SELECT campaign.name, ad_group.status, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.policy_summary.review_status FROM ad_group_ad WHERE campaign.status = 'ENABLED'", env));
        sonuc.reklamlar = ads.map(r => ({ kampanya: r.campaign && r.campaign.name, adgroup: r.adGroup && r.adGroup.status, reklam: r.adGroupAd && r.adGroupAd.status, onay: r.adGroupAd && r.adGroupAd.policySummary && r.adGroupAd.policySummary.approvalStatus, inceleme: r.adGroupAd && r.adGroupAd.policySummary && r.adGroupAd.policySummary.reviewStatus }));
        sonuc.reklam_sayisi = sonuc.reklamlar.length;
        sonuc.onayli_reklam = sonuc.reklamlar.filter(x => x.onay === "APPROVED").length;
        sonuc.reklam_ham = ads[0] || null;
      } catch (e) { sonuc.reklam_hata = String(e).slice(0, 200); }
      try {
        const cp = rowsOf(await query("SELECT campaign.name, campaign.primary_status, campaign.primary_status_reasons, campaign.bidding_strategy_type, campaign.start_date, campaign.end_date FROM campaign WHERE campaign.status = 'ENABLED'", env));
        sonuc.kampanya_durum = cp.map(r => ({ ad: r.campaign && r.campaign.name, primary: r.campaign && r.campaign.primaryStatus, nedenler: r.campaign && r.campaign.primaryStatusReasons, teklif_strateji: r.campaign && r.campaign.biddingStrategyType, baslangic: r.campaign && r.campaign.startDate, bitis: r.campaign && r.campaign.endDate }));
      } catch (e) { sonuc.kampanya_durum_hata = String(e).slice(0, 200); }
      try {
        const ag = rowsOf(await query("SELECT ad_group.name, ad_group.cpc_bid_micros, ad_group.primary_status, ad_group.primary_status_reasons FROM ad_group WHERE campaign.status = 'ENABLED'", env));
        sonuc.adgroup_durum = ag.map(r => ({ ad: r.adGroup && r.adGroup.name, cpc_tl: r.adGroup && r.adGroup.cpcBidMicros ? (Number(r.adGroup.cpcBidMicros)/1e6) : null, primary: r.adGroup && r.adGroup.primaryStatus, nedenler: r.adGroup && r.adGroup.primaryStatusReasons }));
      } catch (e) { sonuc.adgroup_durum_hata = String(e).slice(0, 200); }
      try {
        const kw = rowsOf(await query("SELECT ad_group_criterion.keyword.text, ad_group_criterion.status, ad_group_criterion.effective_cpc_bid_micros, ad_group_criterion.primary_status, ad_group_criterion.primary_status_reasons FROM ad_group_criterion WHERE campaign.status = 'ENABLED' AND ad_group_criterion.type = 'KEYWORD'", env));
        sonuc.keyword_durum = kw.slice(0,15).map(r => ({ kw: r.adGroupCriterion && r.adGroupCriterion.keyword && r.adGroupCriterion.keyword.text, durum: r.adGroupCriterion && r.adGroupCriterion.status, eff_cpc_tl: r.adGroupCriterion && r.adGroupCriterion.effectiveCpcBidMicros ? (Number(r.adGroupCriterion.effectiveCpcBidMicros)/1e6) : null, primary: r.adGroupCriterion && r.adGroupCriterion.primaryStatus, nedenler: r.adGroupCriterion && r.adGroupCriterion.primaryStatusReasons }));
        sonuc.keyword_sayisi = kw.length;
      } catch (e) { sonuc.keyword_durum_hata = String(e).slice(0, 200); }
      sonuc.teshis =
        sonuc.billing_var === false ? "FATURALANDIRMA_YOK: Google Ads hesabinda onayli odeme yontemi yok; kampanyalar ENABLED olsa da yayinlanmaz." :
        (sonuc.reklam_sayisi === 0 ? "REKLAM_YOK: ENABLED kampanyalarda servis edilebilir reklam yok (eksik reklam/ad group)." :
        (sonuc.onayli_reklam === 0 ? "REKLAM_ONAYSIZ: Reklamlar onaylanmamis/incelemede." :
        "Yapisal sorun gorunmuyor; bid/keyword/hedefleme kontrol edilmeli."));
      return Response.json(sonuc, { headers: cors });
    }

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

    if (act === "reklam_durum") {
      const rows = await query(
        "SELECT campaign.id, campaign.name, campaign.status, " +
        "ad_group.name, ad_group.status, " +
        "ad_group_ad.ad.id, ad_group_ad.status, " +
        "ad_group_ad.policy_summary.approval_status, " +
        "ad_group_ad.policy_summary.review_status, " +
        "ad_group_ad.policy_summary.policy_topic_entries " +
        "FROM ad_group_ad " +
        "WHERE campaign.status != 'REMOVED' AND ad_group_ad.status != 'REMOVED'",
        env
      )
      const onayTR = { APPROVED:"Onaylandı", APPROVED_LIMITED:"Sınırlı onay", DISAPPROVED:"REDDEDİLDİ", AREA_OF_INTEREST_ONLY:"Kısıtlı", UNKNOWN:"Bilinmiyor" }
      const incTR  = { REVIEWED:"İncelendi", REVIEW_IN_PROGRESS:"İnceleniyor", UNDER_APPEAL:"İtirazda", ELIGIBLE_MAY_SERVE:"Yayına uygun" }
      return Response.json({
        ok: true,
        reklamlar: rows.map(function(r) {
          const ps = (r.adGroupAd && r.adGroupAd.policySummary) || {}
          const topics = (ps.policyTopicEntries || []).map(function(t) { return (t.topic || "") + (t.type ? " [" + t.type + "]" : "") })
          return {
            kampanya:       r.campaign && r.campaign.name,
            kampanya_durum: r.campaign && r.campaign.status,
            grup_durum:     r.adGroup && r.adGroup.status,
            reklam_durum:   r.adGroupAd && r.adGroupAd.status,
            onay:           onayTR[ps.approvalStatus] || ps.approvalStatus || "-",
            inceleme:       incTR[ps.reviewStatus] || ps.reviewStatus || "-",
            sorunlar:       topics
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
  if (!(await yetkili(request, env, body))) return Response.json({ ok: false, error: "yetkisiz" }, { status: 401, headers: cors })
  try {
    if (body.action === "kampanya_ac") {
      return Response.json(await kampanyaAc(env, body), { headers: cors })
    }

    const token = await getAccessToken(env)
    const base  = "/customers/" + CID

    // Bütçe güncelle: kampanyanın bütçe kaynağını bul, miktarı değiştir
    if (body.action === "set_budget") {
      const q = await query("SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = " + body.campaign_id, env)
      const budgetRN = q[0] && q[0].campaign && q[0].campaign.campaignBudget
      if (!budgetRN) throw new Error("Bütçe kaynağı bulunamadı")
      await gadsPost(env, token, base + "/campaignBudgets:mutate", {
        operations: [{ update: { resourceName: budgetRN, amountMicros: String(Math.round(parseFloat(body.budget_tl) * 1e6)) }, updateMask: "amount_micros" }]
      })
      return Response.json({ ok: true, durum: "butce", butce_tl: parseFloat(body.budget_tl) }, { headers: cors })
    }

    // Boş (kampanyaya bağsız) bütçeleri temizle
    if (body.action === "bos_butce_temizle") {
      const bq = await query("SELECT campaign_budget.resource_name, campaign_budget.name, campaign_budget.reference_count FROM campaign_budget WHERE campaign_budget.reference_count = 0", env)
      const ops = bq.map(function(r) { return { remove: r.campaignBudget.resourceName } })
      let silinen = 0
      if (ops.length) {
        const res = await gadsPost(env, token, base + "/campaignBudgets:mutate", { operations: ops, partialFailure: true })
        silinen = (res.results || []).filter(Boolean).length
      }
      return Response.json({ ok: true, bulunan: bq.length, silinen }, { headers: cors })
    }

    // Otomatik bütçe formülü (varsayılan: öneri/kuru çalışma; asla durdurmaz)
    if (body.action === "oto_formul") {
      const tavan  = parseFloat(body.tavan || 500)
      const uygula = body.uygula === true || body.uygula === "true"
      const rows = await query(
        "SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, " +
        "metrics.clicks, metrics.impressions, metrics.ctr, metrics.average_cpc " +
        "FROM campaign WHERE campaign.status = 'ENABLED' AND segments.date DURING LAST_7_DAYS", env)
      const plan = []
      let toplam = 0
      for (const r of rows) {
        const m = r.metrics || {}, b = r.campaignBudget || {}
        const butce = b.amountMicros ? parseInt(b.amountMicros) / 1e6 : 0
        const imp = parseInt(m.impressions || 0)
        const ctr = parseFloat(m.ctr || 0) * 100
        const cpc = m.averageCpc ? parseInt(m.averageCpc) / 1e6 : 0
        let yeni = butce, neden = "yeterli veri yok → sabit"
        if (imp >= 200) {
          if (ctr >= 6 && cpc > 0 && cpc <= 1.5) { yeni = Math.round(butce * 1.2); neden = "yüksek performans → +%20" }
          else if (ctr < 2 || cpc > 3)            { yeni = Math.max(20, Math.round(butce * 0.8)); neden = "düşük performans → -%20" }
          else                                     { neden = "dengeli → sabit" }
        }
        toplam += yeni
        plan.push({ id: r.campaign.id, ad: r.campaign.name, eski_butce: butce, yeni_butce: yeni, neden, ctr: ctr.toFixed(1) + "%", cpc: cpc.toFixed(2), imp })
      }
      let uyari = null
      if (toplam > tavan) uyari = "Planlanan toplam " + toplam + "TL > tavan " + tavan + "TL. Uygulamadan once gozden gecir."
      if (uygula && !uyari) {
        for (const p of plan) {
          if (p.yeni_butce !== p.eski_butce) {
            const cq = await query("SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = " + p.id, env)
            const budgetRN = cq[0] && cq[0].campaign && cq[0].campaign.campaignBudget
            if (budgetRN) await gadsPost(env, token, base + "/campaignBudgets:mutate", { operations: [{ update: { resourceName: budgetRN, amountMicros: String(Math.round(p.yeni_butce * 1e6)) }, updateMask: "amount_micros" }] })
          }
        }
      }
      return Response.json({ ok: true, uygulandi: uygula && !uyari, tavan, toplam_plan: toplam, uyari, plan }, { headers: cors })
    }

    // kaldır (kalıcı) — Google'da remove operasyonu kullanılır, status=REMOVED kabul edilmez
    if (body.action === "remove") {
      await gadsPost(env, token, base + "/campaigns:mutate", {
        operations: [{ remove: base + "/campaigns/" + body.campaign_id }]
      })
      return Response.json({ ok: true, durum: "REMOVED" }, { headers: cors })
    }
    // duraklat / yayına al
    const st = body.action === "pause" ? "PAUSED" : "ENABLED"
    await gadsPost(env, token, base + "/campaigns:mutate", {
      operations: [{ update: { resourceName: base + "/campaigns/" + body.campaign_id, status: st }, updateMask: "status" }]
    })
    return Response.json({ ok: true, durum: st }, { headers: cors })
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
}
