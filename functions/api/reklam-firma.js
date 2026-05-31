// functions/api/reklam-firma.js
// Firma CRUD + kampanya yönetimi

async function authKontrol(request, env, adminGerek=false) {
  const token = request.headers.get('X-Token')
  if (!token) return null
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return null
  if (adminGerek && kullanici.rol !== 'admin') return null
  if (!adminGerek && kullanici.modul_reklam === false) return null
  return kullanici
}

// GET — firma listesi veya tekil firma
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const token = request.headers.get('X-Token') || url.searchParams.get('token')
  const kul = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const id = url.searchParams.get('id')
  if (id) {
    const firma = await env.HABERLER.get(`firma:${id}`, 'json')
    return firma ? Response.json(firma) : Response.json({ hata: 'Bulunamadı' }, { status: 404 })
  }
  const liste = await env.HABERLER.get('firma_liste', 'json') || []
  return Response.json(liste)
}

// POST — firma ekle/güncelle, kampanya ekle/güncelle, görsel ekle/sil
export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul || kul.modul_reklam === false) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    const body = await request.json()
    const { islem } = body

    // ── Firma ekle ──────────────────────────────────────────────────────────
    if (islem === 'firma_ekle') {
      const { ad, sektor, notlar } = body
      if (!ad) return Response.json({ hata: 'Firma adı zorunlu' }, { status: 400 })
      const id    = `firma_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
      const firma = {
        id, ad, sektor: sektor||'', notlar: notlar||'',
        olusturuldu: new Date().toISOString(),
        olusturan:   kul.kullanici,
        kampanyalar: [],
        toplam_gun:  0,
      }
      await env.HABERLER.put(`firma:${id}`, JSON.stringify(firma))
      const liste = await env.HABERLER.get('firma_liste', 'json') || []
      liste.unshift({ id, ad, sektor: sektor||'', aktif_kampanya: 0, olusturuldu: firma.olusturuldu })
      await env.HABERLER.put('firma_liste', JSON.stringify(liste))
      return Response.json({ ok: true, id, firma })
    }

    // ── Firma güncelle ──────────────────────────────────────────────────────
    if (islem === 'firma_guncelle') {
      const { id, ad, sektor, notlar } = body
      const firma = await env.HABERLER.get(`firma:${id}`, 'json')
      if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
      const guncellendi = { ...firma, ad: ad||firma.ad, sektor: sektor||firma.sektor, notlar: notlar||firma.notlar, guncellendi: new Date().toISOString() }
      await env.HABERLER.put(`firma:${id}`, JSON.stringify(guncellendi))
      const liste = await env.HABERLER.get('firma_liste', 'json') || []
      const idx = liste.findIndex(f=>f.id===id)
      if (idx>=0) { liste[idx].ad = ad||firma.ad; liste[idx].sektor = sektor||firma.sektor }
      await env.HABERLER.put('firma_liste', JSON.stringify(liste))
      return Response.json({ ok: true })
    }

    // ── Kampanya ekle ───────────────────────────────────────────────────────
    if (islem === 'kampanya_ekle') {
      const { firma_id, ad, baslangic, bitis, notlar } = body
      if (!firma_id||!ad) return Response.json({ hata: 'firma_id ve ad zorunlu' }, { status: 400 })
      const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
      if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
      const kid = `kamp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
      const kampanya = {
        id: kid, ad, baslangic: baslangic||'', bitis: bitis||'',
        notlar: notlar||'', olusturuldu: new Date().toISOString(),
        olusturan: kul.kullanici, gonderiler: [],
        son_paylasim: null,
      }
      firma.kampanyalar = [...(firma.kampanyalar||[]), kampanya]
      // Toplam gün hesapla
      if (baslangic) {
        const bas = new Date(baslangic)
        const bit = bitis ? new Date(bitis) : new Date()
        const gun = Math.max(0, Math.ceil((bit-bas)/(1000*60*60*24)))
        firma.toplam_gun = (firma.toplam_gun||0) + gun
      }
      await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))
      // Liste güncelle
      const liste = await env.HABERLER.get('firma_liste', 'json') || []
      const idx = liste.findIndex(f=>f.id===firma_id)
      if (idx>=0) liste[idx].aktif_kampanya = firma.kampanyalar.filter(k=>!k.bitis||new Date(k.bitis)>=new Date()).length
      await env.HABERLER.put('firma_liste', JSON.stringify(liste))
      return Response.json({ ok: true, kampanya_id: kid, kampanya })
    }

    // ── Gonderi ekle (görsel/video + meta bilgisi) ──────────────────────────
    if (islem === 'gonderi_ekle') {
      const { firma_id, kampanya_id, medya_url, medya_tip, alt_metin, etiketler, fb_page_ids, ig_ids } = body
      if (!firma_id||!kampanya_id||!medya_url) return Response.json({ hata: 'firma_id, kampanya_id, medya_url zorunlu' }, { status: 400 })
      const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
      if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
      const kamp = firma.kampanyalar?.find(k=>k.id===kampanya_id)
      if (!kamp) return Response.json({ hata: 'Kampanya bulunamadı' }, { status: 404 })
      const gid = `gon_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
      const gonderi = {
        id: gid, medya_url, medya_tip: medya_tip||'gorsel',
        alt_metin: alt_metin||'', etiketler: etiketler||[],
        fb_page_ids: fb_page_ids||[], ig_ids: ig_ids||[],
        olusturuldu: new Date().toISOString(), olusturan: kul.kullanici,
        paylasimlar: [], son_paylasim: null,
      }
      kamp.gonderiler = [...(kamp.gonderiler||[]), gonderi]
      await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))
      return Response.json({ ok: true, gonderi_id: gid, gonderi })
    }

    // ── Gonderi sil ─────────────────────────────────────────────────────────
    if (islem === 'gonderi_sil') {
      const { firma_id, kampanya_id, gonderi_id } = body
      const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
      if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
      const kamp = firma.kampanyalar?.find(k=>k.id===kampanya_id)
      if (!kamp) return Response.json({ hata: 'Kampanya bulunamadı' }, { status: 404 })
      // Kaydı sil, paylasim logunu koru
      kamp.gonderiler = (kamp.gonderiler||[]).filter(g=>g.id!==gonderi_id)
      await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))
      return Response.json({ ok: true })
    }

    // ── Kampanya sil ─────────────────────────────────────────────────────────
    if (islem === 'kampanya_sil') {
      if (kul.rol !== 'admin') return Response.json({ hata: 'Admin yetkisi gerekli' }, { status: 403 })
      const { firma_id, kampanya_id } = body
      const firma = await env.HABERLER.get(`firma:${firma_id}`, 'json')
      if (!firma) return Response.json({ hata: 'Firma bulunamadı' }, { status: 404 })
      firma.kampanyalar = (firma.kampanyalar||[]).filter(k=>k.id!==kampanya_id)
      await env.HABERLER.put(`firma:${firma_id}`, JSON.stringify(firma))
      return Response.json({ ok: true })
    }

    return Response.json({ hata: 'Geçersiz islem' }, { status: 400 })
  } catch(e) {
    console.error('reklam-firma:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
