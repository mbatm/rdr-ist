// Hedef Trafik & Minimum Bütçe Motoru — GA4 tabanı + GERÇEK ziyaretçi başına maliyet
async function jget(url, opts) {
  try { const r = await fetch(url, opts); return await r.json() } catch(e) { return { ok:false, error:e.message } }
}

export async function onRequestGet({ request, env }) {
  const cors = { "Access-Control-Allow-Origin":"*", "Content-Type":"application/json" }
  const url = new URL(request.url)
  const origin = url.origin
  const hedef  = parseInt(url.searchParams.get("hedef") || "20000")
  const zarfAy = url.searchParams.get("zarf") ? parseFloat(url.searchParams.get("zarf")) : null
  const sec    = env.RSS_API_KEY || ""

  // 1) GA4 — mevcut taban + kanallar
  const ga = await jget(origin + "/api/ga4")
  const s  = (ga && ga.summary) || {}
  const gunlukMevcut = Math.round(s.dailyAvgUsers || 0)
  let dun = ga && ga.yesterday ? ga.yesterday : null
  if (typeof dun === "string") { try { dun = JSON.parse(dun) } catch(_) { dun = null } }
  const dunUsers = dun ? (dun.activeUsers || 0) : 0
  const chans = (ga && ga.channels) || []
  const kanallar = chans.slice(0, 6).map(c => ({ kanal: c.sessionDefaultChannelGrouping, kullanici: c.activeUsers }))

  // 2) ZBM — GERÇEK ziyaretçi başına maliyet: 30g paid harcama / 30g GA4 paid kullanıcı
  const paidUsers = chans.filter(c => /paid/i.test(c.sessionDefaultChannelGrouping || "")).reduce((a,c)=>a+(c.activeUsers||0),0)
  let paidSpend30 = 0, tiklama30 = 0
  const mi = await jget(origin + "/api/meta-ads?action=insights&date=last_30d&secret=" + encodeURIComponent(sec))
  if (mi && mi.ok && Array.isArray(mi.insights)) for (const i of mi.insights) { paidSpend30 += parseFloat(i.spend || 0); tiklama30 += parseInt(i.clicks || 0) }
  let zbm, zbmKaynak
  if (paidUsers > 0 && paidSpend30 > 0) { zbm = paidSpend30 / paidUsers; zbmKaynak = "ga4-paid-30g" }
  else { zbm = 1.4; zbmKaynak = "tahmini" }
  const tiklamaBasi = tiklama30 > 0 ? +(paidSpend30 / tiklama30).toFixed(3) : null

  // 3) Hesap — gerçek ziyaretçi maliyetiyle
  const acik = Math.max(0, hedef - gunlukMevcut)
  const minButceGun = Math.round(acik * zbm)

  const sonuc = {
    ok: true,
    tarih: new Date().toISOString().slice(0, 10),
    hedef,
    mevcut_gunluk: gunlukMevcut,
    dun: dunUsers,
    acik,
    zbm_ziyaretci: +zbm.toFixed(3),
    zbm_kaynak: zbmKaynak,
    tiklama_basi_maliyet: tiklamaBasi,
    paid_ziyaretci_30g: paidUsers,
    paid_harcama_30g: Math.round(paidSpend30),
    min_butce_gun_saf_paid: minButceGun,
    min_butce_ay_saf_paid: minButceGun * 30,
    kanallar
  }

  if (zarfAy) {
    const gunlukZarf = zarfAy / 30
    const eklenen = Math.round(gunlukZarf / zbm)
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
