// Hedef Trafik & Minimum Bütçe Motoru — GA4 tabanı + GERÇEK ziyaretçi başına maliyet
async function jget(url, opts) {
  try { const r = await fetch(url, opts); return await r.json() } catch(e) { return { ok:false, error:e.message } }
}

export async function onRequestGet({ request, env }) {
  const cors = { "Access-Control-Allow-Origin":"*", "Content-Type":"application/json" }
  const url = new URL(request.url)
  const origin = url.origin
  const hedef  = parseInt(url.searchParams.get("hedef") || "20000")

    // ── Hedef Motoru: gün-içi pace ayarı (agresif kapatma + imkânsız freni) ──
    if (url.searchParams.get('action') === 'durum') {
      let durum = null, uyari = null;
      try { durum = JSON.parse((await env.HABERLER.get('hedef:durum')) || 'null'); } catch (e) {}
      try { uyari = JSON.parse((await env.HABERLER.get('hedef:uyari')) || 'null'); } catch (e) {}
      return new Response(JSON.stringify({ ok: true, durum, uyari }), { headers: cors });
    }
    if (url.searchParams.get('action') === 'pace_ayar') {
      const uygula = url.searchParams.get('uygula') === '1';
      const keyOk = !!url.searchParams.get('key') && url.searchParams.get('key') === env.RSS_API_KEY;
      let ayar = {};
      try { ayar = JSON.parse((await env.HABERLER.get('hedef:ayar')) || '{}'); } catch (e) {}
      const normalGunluk = +ayar.normal_gunluk || 3000;
      const anomaliKat = +ayar.anomali_kat || 4;
      const bg = await jget(origin + '/api/ga4?action=bugun');
      const gercek = +(bg && bg.bugun_su_ana_kadar || 0);
      const pay = +(bg && bg.beklenen_pay || 0);
      const saat = +(bg && bg.saat || 0);
      const kanal = (bg && bg.bugun_kanal) || {};
      const paidKeys = ['Paid Social', 'Paid Search', 'Paid Other', 'Display', 'Cross-network', 'Paid Shopping', 'Paid Video'];
      let paidSoFar = 0, nonPaidSoFar = 0;
      for (const k in kanal) { if (paidKeys.includes(k)) paidSoFar += kanal[k]; else nonPaidSoFar += kanal[k]; }
      let zbm = 0.35;
      try { const eng = await jget(origin + '/api/hedef-butce?hedef=' + hedef); if (eng && +eng.zbm_ziyaretci > 0) zbm = +eng.zbm_ziyaretci; } catch (e) {}
      const beklenen = Math.round(hedef * pay);
      const paceAcik = beklenen - gercek;
      const projOrganikEOD = pay > 0 ? Math.round(nonPaidSoFar / pay) : nonPaidSoFar;
      const paidIhtiyacEOD = Math.max(0, hedef - projOrganikEOD);
      const gerekenPaidButce = Math.round(paidIhtiyacEOD * zbm);
      const sonZbm = +(ayar.son_zbm || zbm);
      const zbmSicrama = zbm > sonZbm * 2;
      const butcAnomali = gerekenPaidButce > normalGunluk * anomaliKat;
      const imkansiz = zbmSicrama || butcAnomali;
      const dagilim = imkansiz ? [] : [
        { plat: 'meta', campaign_id: '120245120758240539', ad: 'Meta Altın', oran: 0.35 },
        { plat: 'meta', campaign_id: '120245120742230539', ad: 'Meta Haber Trafik', oran: 0.35 },
        { plat: 'google', campaign_id: '23971158633', ad: 'Google Altın', oran: 0.30 }
      ].map(x => ({ plat: x.plat, campaign_id: x.campaign_id, ad: x.ad, butce_tl: Math.max(50, Math.round(gerekenPaidButce * x.oran)) }));
      let uygulama = { yapildi: false, sebep: '' };
      if (imkansiz) { uygulama.sebep = 'imkansiz_fren'; }
      else if (!uygula) { uygulama.sebep = 'dry_run'; }
      else if (!keyOk) { uygulama.sebep = 'yetki_yok'; }
      else {
        uygulama.yapildi = true; uygulama.sonuc = [];
        for (const d of dagilim) {
          try {
            const ep = d.plat === 'google' ? '/api/google-ads' : '/api/meta-ads';
            const rp = await fetch(origin + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_budget', campaign_id: d.campaign_id, budget_tl: d.butce_tl, secret: env.RSS_API_KEY, key: env.RSS_API_KEY }) });
            let rj = null; try { rj = await rp.json(); } catch (e) {}
            uygulama.sonuc.push({ ad: d.ad, butce: d.butce_tl, ok: rp.ok && !(rj && rj.error) });
          } catch (e) { uygulama.sonuc.push({ ad: d.ad, butce: d.butce_tl, ok: false, err: String(e).slice(0, 80) }); }
        }
      }
      const snap = {
        tarih: bg && bg.tarih, saat, hedef,
        bugun_su_ana_kadar: gercek, beklenen, pace_acik: paceAcik,
        pace_durum: paceAcik > 0 ? 'geride' : 'onde',
        organik_so_far: nonPaidSoFar, paid_so_far: paidSoFar,
        proj_organik_eod: projOrganikEOD, paid_ihtiyac_eod: paidIhtiyacEOD,
        zbm_ziyaretci: zbm, gereken_paid_gunluk_butce: gerekenPaidButce,
        dagilim, imkansiz, imkansiz_sebep: imkansiz ? (zbmSicrama ? 'zbm_sicramasi' : 'butce_anomali') : null,
        uygulama, guncelleme: new Date().toISOString()
      };
      try {
        await env.HABERLER.put('hedef:durum', JSON.stringify(snap));
        if (imkansiz) await env.HABERLER.put('hedef:uyari', JSON.stringify({ tarih: snap.tarih, saat, zbm, gereken_paid_gunluk_butce: gerekenPaidButce, sebep: snap.imkansiz_sebep, mesaj: 'Bugunku hedef mevcut ZBM ile imkansiz gorunuyor — karariniz bekleniyor.', guncelleme: snap.guncelleme }));
        ayar.son_zbm = zbm; await env.HABERLER.put('hedef:ayar', JSON.stringify(ayar));
      } catch (e) {}
      return new Response(JSON.stringify(snap), { headers: cors });
    }
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
