// ── OTOMATİK REKLAM MOTORU ─────────────────────────────────────────────────
// GET /api/auto-reklam?action=run  → motoru manuel tetikle
// GET /api/auto-reklam?action=log  → karar logunu gör
// Cloudflare Cron: wrangler.toml'da "0 */6 * * *" ile her 6 saatte otomatik

const ACT   = "act_708028213253830"
const PAGE  = "139690272760213"
const GRAPH = "https://graph.facebook.com/v21.0"

const KURAL = {
  durdur_ctr:     1.0,   // % altında + 2 gün dogruysa → PAUSED
  durdur_cpc:     1.50,  // TL ustunde → butce yariya indir
  artir_ctr:      8.0,   // % ustunde ve CPC de iyiyse → 2x but
  artir_cpc:      0.50,  // TL altinda (artirma kosulu)
  max_butce:      20000, // 200 TL - kampanya tavani
  min_butce:      5000,  // 50 TL - kampanya tabani
  toplam_max:     50000, // 500 TL - gunluk toplam tavan
  rss_skor_min:   70,    // Bu skoru gecerse yeni kampanya ac
  yeni_kamp_butce:10000, // 100 TL yeni oto kampanya butcesi
  min_gosterim:   200,   // Karar icin min gosterim
}

async function g(path, method, body, token) {
  const sep = path.includes("?") ? "&" : "?"
  const r = await fetch(GRAPH + "/" + path + sep + "access_token=" + token, {
    method: method || "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : null
  })
  const d = await r.json()
  if (d.error) throw new Error("Meta: " + d.error.message)
  return d
}

async function kv_log(env, karar) {
  try {
    if (!env.META_KV) { console.log("META_KV yok, log atlanıyor"); return }
    const mevcut = await env.META_KV.get("oto_log")
    let log = mevcut ? JSON.parse(mevcut) : []
    log.unshift({ t: new Date().toISOString(), ...karar })
    if (log.length > 100) log = log.slice(0, 100)
    await env.META_KV.put("oto_log", JSON.stringify(log))
  } catch(e) {}
}

async function performans_karar(env) {
  const TOKEN = env.META_ADS_TOKEN || 'EAAORauw5t7ABR43WgZBGmOmTzzjFNj4pS1IC0e03Mch8ZBsPpeuwDqBN4n510DVOTF4qW22VWLLwd2RNZBuiDN60GuwrWd09U0temzMekKYlrZAbsu7gQNT1VYDeSM5mVHKvrZCOdxf6L3cJllE3XcOVCM0BAQZCg2vZCv7grSKq4WhFUDzUw30WNWG10rLPzkhHwZDZD'
  const kararlar = []
  const alan = "campaign_name,campaign_id,spend,clicks,impressions,ctr,cpc"

  const [bugun, iki_gun, camp_list] = await Promise.all([
    g(ACT + "/insights?fields=" + alan + "&date_preset=today&level=campaign",   "GET", null, TOKEN),
    g(ACT + "/insights?fields=" + alan + "&date_preset=last_2d&level=campaign", "GET", null, TOKEN),
    g(ACT + "/campaigns?fields=id,name,status,daily_budget&limit=30",           "GET", null, TOKEN),
  ])

  const campMap = {}
  for (const c of (camp_list.data || [])) campMap[c.id] = c

  const iki_map = {}
  for (const i of (iki_gun.data || [])) iki_map[i.campaign_id] = i

  for (const ins of (bugun.data || [])) {
    const camp  = campMap[ins.campaign_id]
    if (!camp || camp.status === "ARCHIVED") continue
    const ctr   = parseFloat(ins.ctr || 0)
    const cpc   = parseFloat(ins.cpc || 0)
    const imp   = parseInt(ins.impressions || 0)
    const butce = parseInt(camp.daily_budget || 0)
    if (imp < KURAL.min_gosterim) continue

    if (ctr < KURAL.durdur_ctr && camp.status === "ACTIVE") {
      const iki_ctr = parseFloat((iki_map[ins.campaign_id] || {}).ctr || 0)
      if (iki_ctr < KURAL.durdur_ctr) {
        await g(camp.id, "POST", { status: "PAUSED" }, TOKEN)
        kararlar.push({ tip: "DURDURULDU", kampanya: camp.name, ctr: ctr.toFixed(2), cpc: cpc.toFixed(2) })
        continue
      }
    }

    if (cpc > KURAL.durdur_cpc && camp.status === "ACTIVE") {
      const yeni = Math.max(KURAL.min_butce, Math.round(butce * 0.5))
      await g(camp.id, "POST", { daily_budget: yeni }, TOKEN)
      kararlar.push({ tip: "BUTCE_50", kampanya: camp.name, cpc: cpc.toFixed(2), yeni: yeni / 100 + "TL" })
    }

    if (ctr >= KURAL.artir_ctr && cpc <= KURAL.artir_cpc && camp.status === "ACTIVE") {
      const yeni = Math.min(KURAL.max_butce, butce * 2)
      if (yeni > butce) {
        await g(camp.id, "POST", { daily_budget: yeni }, TOKEN)
        kararlar.push({ tip: "BUTCE_2X", kampanya: camp.name, ctr: ctr.toFixed(2), yeni: yeni / 100 + "TL" })
      }
    }
  }
  return kararlar
}

async function rss_kesif(env) {
  const TOKEN = env.META_ADS_TOKEN || 'EAAORauw5t7ABR43WgZBGmOmTzzjFNj4pS1IC0e03Mch8ZBsPpeuwDqBN4n510DVOTF4qW22VWLLwd2RNZBuiDN60GuwrWd09U0temzMekKYlrZAbsu7gQNT1VYDeSM5mVHKvrZCOdxf6L3cJllE3XcOVCM0BAQZCg2vZCv7grSKq4WhFUDzUw30WNWG10rLPzkhHwZDZD'
  const kararlar = []

  const camp_list = await g(ACT + "/campaigns?fields=id,name,status,daily_budget&limit=30", "GET", null, TOKEN)
  const aktifler  = (camp_list.data || []).filter(c => c.status === "ACTIVE")
  const toplam    = aktifler.reduce((s, c) => s + parseInt(c.daily_budget || 0), 0)

  if (toplam >= KURAL.toplam_max) {
    return [{ tip: "TAVAN", sebep: (toplam/100) + "TL >= " + (KURAL.toplam_max/100) + "TL tavan" }]
  }

  const aktif_isimler = aktifler.map(c => c.name)

  const zeka = await fetch("https://rdr.ist/api/zeka-motor?action=scan").then(r => r.json()).catch(() => ({}))
  const firsatlar = (zeka.firsatlar || []).filter(f => f.score >= KURAL.rss_skor_min).slice(0, 2)

  for (const f of firsatlar) {
    const kw = f.matched_keyword || ""
    if (aktif_isimler.some(n => n.includes(kw))) continue

    const adi  = "KayserimNet - Oto - " + kw + " - " + new Date().toISOString().slice(0, 10)
    const camp = await fetch(GRAPH + "/" + ACT + "/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: adi, objective: "OUTCOME_TRAFFIC", daily_budget: KURAL.yeni_kamp_butce, status: "ACTIVE", special_ad_categories: [], access_token: TOKEN })
    }).then(r => r.json())

    if (!camp.id) { kararlar.push({ tip: "HATA", adi, sebep: camp.error?.message }); continue }

    const adset = await fetch(GRAPH + "/" + ACT + "/adsets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: adi + " AdSet", campaign_id: camp.id, billing_event: "IMPRESSIONS", optimization_goal: "LINK_CLICKS", destination_type: "WEBSITE", bid_amount: 200, promoted_object: { page_id: PAGE }, targeting: { geo_locations: { regions: [{ key: "3686" }], location_types: ["home", "recent"] }, age_min: 18, targeting_automation: { advantage_audience: 0 } }, dsa_beneficiary: "Kayserim.net", dsa_payor: "Mustafa Bayram", status: "ACTIVE", access_token: TOKEN })
    }).then(r => r.json())

    if (!adset.id) { kararlar.push({ tip: "ADSET_HATA", adi, sebep: adset.error?.message }); continue }

    const mesaj = f.title ? "Kayseri " + kw + " haberleri! " + f.title.slice(0, 80) : "Kayseri " + kw + " - Anlık haberler kayserim.net'te"
    const cr = await fetch(GRAPH + "/" + ACT + "/adcreatives", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: adi + " Creative", object_story_spec: { page_id: PAGE, link_data: { link: f.link || "https://www.kayserim.net", message: mesaj, name: "Kayseri " + kw + " - Son Dakika", call_to_action: { type: "LEARN_MORE", value: { link: f.link || "https://www.kayserim.net" } } } }, access_token: TOKEN })
    }).then(r => r.json())

    if (!cr.id) { kararlar.push({ tip: "CREATIVE_HATA", adi, sebep: cr.error?.message }); continue }

    const ad = await fetch(GRAPH + "/" + ACT + "/ads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: adi, adset_id: adset.id, creative: { creative_id: cr.id }, status: "ACTIVE", access_token: TOKEN })
    }).then(r => r.json())

    if (!ad.id) { kararlar.push({ tip: "AD_HATA", adi, sebep: ad.error?.message }); continue }

    // Reklamın gerçek teslimat durumunu doğrula (neden yayına girmediğini logla)
    let ad_durum = null, sorunlar = []
    try {
      const dd = await g(ad.id + "?fields=effective_status,issues_info", "GET", null, TOKEN)
      ad_durum = dd.effective_status
      sorunlar = (dd.issues_info || []).map(i => i.error_summary || i.error_message || i.error_code)
    } catch (_) {}

    kararlar.push({ tip: "YENI_KAMPANYA", adi, keyword: kw, skor: f.score, ad_id: ad.id, camp_id: camp.id, ad_durum, sorunlar })
  }

  return kararlar
}

async function calistir(env) {
  const perf = await performans_karar(env)
  const rss  = await rss_kesif(env)
  const hepsi = [...perf, ...rss]
  await kv_log(env, { karar_sayisi: hepsi.length, kararlar: hepsi })
  return hepsi
}

export async function onScheduled(event, env, ctx) {
  ctx.waitUntil(calistir(env))
}

export async function onRequestGet({ request, env }) {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
  const act  = new URL(request.url).searchParams.get("action") || "run"
  try {
    if (act === "log") {
      const log = env.META_KV ? await env.META_KV.get("oto_log") : null
      return Response.json({ ok: true, log: log ? JSON.parse(log) : [] }, { headers: cors })
    }
    const kararlar = await calistir(env)
    return Response.json({ ok: true, kararlar }, { headers: cors })
  } catch(e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
}
