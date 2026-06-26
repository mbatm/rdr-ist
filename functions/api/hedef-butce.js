// Hedef Trafik & Minimum Bütçe Motoru — GA4 tabanı + Meta/Google ZBM'den geriye hesap
async function jget(url, opts) {
  try { const r = await fetch(url, opts); return await r.json() } catch(e) { return { ok:false, error:e.message } }
}

export async function onRequestGet({ request, env }) {
  const cors = { "Access-Control-Allow-Origin":"*", "Content-Type":"application/json" }
  const url = new URL(request.url)
  const origin = url.origin
  const hedef  = parseInt(url.searchParams.get("hedef") || "20000")
  const tc     = parseFloat(url.searchParams.get("tc") || "0.85")
  const zarfAy = url.searchParams.get("zarf") ? parseFloat(url.searchParams.get("zarf")) : null
  const sec    = env.RSS_API_KEY || ""

  // 1) GA4 — mevcut taban
  const ga = await jget(origin + "/api/ga4")
  const s  = (ga && ga.summary) || {}
  const gunlukMevcut = Math.round(s.dailyAvgUsers || 0)
  let dun = ga && ga.yesterday ? ga.yesterday : null
  if (typeof dun === "string") { try { dun = JSON.parse(dun) } catch(_) { dun = null } }
  const dunUsers = dun ? (dun.activeUsers || 0) : 0
  const kanallar = ((ga && ga.channels) || []).slice(0, 6).map(c => ({ kanal: c.sessionDefaultChannelGrouping, kullanici: c.activeUsers }))

  // 2) ZBM — Meta insights (harcama/tıklama)
  let zbm = 0.20, zbmKaynak = "varsayılan"
  const mi = await jget(origin + "/api/meta-ads?action=insights&date=last_7d&secret=" + encodeURIComponent(sec))
  if (mi && mi.ok && Array.isArray(mi.insights) && mi.insights.length) {
    let sp = 0, ck = 0
    for (const i of mi.insights) { sp += parseFloat(i.spend || 0); ck += parseInt(i.clicks || 0) }
    if (ck > 0) { zbm = sp / ck; zbmKaynak = "meta-7g" }
  }

  // 3) Hesap
  const acik        = Math.max(0, hedef - gunlukMevcut)
  const minButceGun = Math.round(acik / tc * zbm)

  const sonuc = {
    ok: true,
    tarih: new Date().toISOString().slice(0, 10),
    hedef,
    mevcut_gunluk: gunlukMevcut,
    dun: dunUsers,
    acik,
    zbm: +zbm.toFixed(3),
    zbm_kaynak: zbmKaynak,
    tiklama_tekil: tc,
    min_butce_gun_saf_paid: minButceGun,
    min_butce_ay_saf_paid: minButceGun * 30,
    kanallar
  }

  // 4) Zarf verildiyse: bu bütçe ne kadar ziyaretçi getirir, hedefe ne kadar yaklaşır
  if (zarfAy) {
    const gunlukZarf = zarfAy / 30
    const eklenen = Math.round(gunlukZarf * tc / zbm)
    const projeksiyon = gunlukMevcut + eklenen
    sonuc.zarf_ay = zarfAy
    sonuc.zarf_gun = Math.round(gunlukZarf)
    sonuc.eklenen_ziyaretci_gun = eklenen
    sonuc.projeksiyon_gun = projeksiyon
    sonuc.kalan_acik = Math.max(0, hedef - projeksiyon)
    sonuc.hedefe_ulasir = projeksiyon >= hedef
  }

  return Response.json(sonuc, { headers: cors })
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET,OPTIONS", "Access-Control-Allow-Headers":"Content-Type" } })
}
