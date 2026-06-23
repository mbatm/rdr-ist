/**
 * Keşfet Oto — Yarı/Tam Otomatik İçerik Motoru
 * ─────────────────────────────────────────────────────────────────────────
 * Ayar eşiğine uyan Keşfet fırsatlarını alır, ÖZGÜN taslak (Claude) üretir,
 * inceleme kuyruğuna 60 dk'lık pencere ile koyar.
 *   - mod 'yari' : kuyrukta bekler, sen "Yayınla" deyince yayınlanır
 *   - mod 'oto'  : pencere dolunca (ve [DOĞRULA] yoksa) otomatik yayınlanır
 *
 * Mevcut uçları HTTP ile çağırır (yeni yayın/görsel kodu YOK):
 *   /api/claude (taslak) · /api/gorsel-uret (Creatomate) · /api/gorsel (AI) · /api/haber-kaydet
 *
 * İZOLE: Sadece 'kesfet:ayarlar' ve 'kesfet:kuyruk' anahtarlarına yazar.
 *        Yayın anında (mevcut akışla aynı) 'liste'ye ekler — bu normal yayındır.
 * ─────────────────────────────────────────────────────────────────────────
 */

const VARSAYILAN_AYAR = {
  aktif: false,        // varsayılan PASİF — sen "Uygula" diyene kadar çalışmaz
  mod: 'yari',         // 'yari' | 'oto'
  min_skor: 80,
  durumlar: ['yaz'],   // sadece "sende+1ha'da yok" olanlar (en güvenlisi)
  inceleme_dk: 60,
  max_yeni: 1,         // bir cron turunda en fazla kaç yeni taslak
  max_yayin: 1,        // bir turda en fazla kaç oto-yayın
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const TUR_ET = { olay:'Olay', hava:'Hava', vefat:'Vefat', spor:'Spor', ekonomi:'Ekonomi', egitim:'Eğitim', gundem:'Gündem', kisi:'Kişi', diger:'Diğer' }

async function yetkili(secret, env) {
  if (!secret) return false
  if (env.RSS_API_KEY && secret === env.RSS_API_KEY) return true
  const t = await env.HABERLER.get(`token:${secret}`, 'json')
  return !!t
}

function slugify(s) {
  const tr = { ç:'c', ğ:'g', ı:'i', İ:'i', ö:'o', ş:'s', ü:'u' }
  return (s || '').toLocaleLowerCase('tr')
    .replace(/[çğıİöşü]/g, c => tr[c] || c)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
}

async function getAyar(env) {
  const a = await env.HABERLER.get('kesfet:ayarlar', 'json')
  return { ...VARSAYILAN_AYAR, ...(a || {}) }
}

// ── Claude ile ÖZGÜN + Discover taslağı üret ──────────────────────────────
async function uretDraft(origin, firsat) {
  const sistem = `Sen kayserim.net için çalışan kıdemli bir yerel haber editörüsün. Bir KONU sinyalinden Google Discover'a düşecek ÖZGÜN bir haber taslağı yazarsın.

KURALLAR (Şubat 2026 Discover update sonrası):
- Verilen rakip başlığı SADECE konu sinyalidir. ASLA kopyalama; konuyu kendi orijinal kelimelerinle, sıfırdan, daha derin ve Kayseri-yerel açıdan ele al.
- og_baslik: merak uyandıran ama temel bilgiyi saklamayan dürüst başlık. Tıklama tuzağı yok. Somut sayı/yer/yerellik içersin.
- site_baslik: SEO uyumlu, max 70 karakter, "Kayseri" doğal geçsin.
- meta_description: max 155 karakter, bilgi dolu.
- metin: en az 350 kelime, H2 (##) alt başlıklarıyla, ilk paragrafta ana bilgi, "ne oldu" + "Kayseri için ne anlama geliyor".
- Bilgi UYDURMA. Emin olmadığın her somut iddiayı [DOĞRULA: ...] olarak işaretle. Doğrulanmamış haberi otomatik yayınlamayacağız.
- Sadece JSON döndür, başka hiçbir şey yazma.`

  const kullanici = `KONU SİNYALİ (rakip başlığı, sadece referans): "${firsat.baslik}"
Kaynak: ${(firsat.kaynaklar || []).join(', ')}
Tür: ${TUR_ET[firsat.tur] || firsat.tur} · Yerel: ${firsat.yerel ? 'evet' : 'belirsiz'}

JSON üret:
{ "og_baslik":"...", "site_baslik":"...", "meta_description":"...", "kategori":"Güncel|Asayiş|Spor|Ekonomi|Eğitim|Yaşam", "metin":"## ...\\n\\n..." }`

  const r = await fetch(`${origin}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      system: sistem, messages: [{ role: 'user', content: kullanici }],
    }),
  })
  const d = await r.json()
  if (!d.content) throw new Error(d.error?.message || d.detail || ('API bos: ' + JSON.stringify(d).slice(0, 200)))
  const text = d.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
  const mm = text.match(/\{[\s\S]*\}/)
  if (!mm) throw new Error('JSON yok: ' + text.slice(0, 150))
  const j = JSON.parse(mm[0])
  return {
    site_baslik: j.site_baslik || firsat.baslik,
    og_baslik: j.og_baslik || j.site_baslik || firsat.baslik,
    meta_description: j.meta_description || '',
    kategori: j.kategori || 'Güncel',
    metin: j.metin || '',
    url_slug: slugify(j.site_baslik || firsat.baslik) + '-' + Date.now().toString(36).slice(-4),
  }
}

// ── Görsel: kaynak varsa Creatomate ile brand'le; yoksa AI; olmazsa kaynak ─
async function uretGorsel(origin, kuyrukItem) {
  // 1) Kaynak görsel varsa → Creatomate ile kayserim.net görseli
  if (kuyrukItem.kaynak_gorsel) {
    try {
      const r = await fetch(`${origin}/api/gorsel-uret`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gorsel_url: kuyrukItem.kaynak_gorsel, baslik: kuyrukItem.site_baslik,
          spot: kuyrukItem.meta_description || '', kategori: kuyrukItem.kategori, format: 'yatay',
        }),
      })
      const d = await r.json()
      const u = d.url || d.yatay || d.gorsel_url || d.dikey
      if (u) return u
    } catch (_) {}
    return kuyrukItem.kaynak_gorsel // brand'lenemezse ham kaynağı kullan
  }
  // 2) Sıfırdan → AI (Replicate FLUX). POST id döner, GET ile sonucu bekle.
  try {
    const prompt = `Photojournalistic local news cover image about: ${kuyrukItem.site_baslik}. Realistic, Turkey, Kayseri context, no text.`
    const pr = await fetch(`${origin}/api/gorsel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const pd = await pr.json()
    if (pd.url) return pd.url
    if (pd.id) {
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 2500))
        const gr = await fetch(`${origin}/api/gorsel?id=${pd.id}`)
        const gd = await gr.json()
        if (gd.url) return gd.url
        if (gd.status === 'failed') break
      }
    }
  } catch (_) {}
  return '' // görsel yok — yayında "görsel bekliyor" olarak işaretlenir
}

// ── Yayınla: mevcut haber-kaydet ucuna gönder (normal yayın akışı) ─────────
async function yayinla(origin, kuyrukItem) {
  const gorsel = kuyrukItem.gorsel_url || await uretGorsel(origin, kuyrukItem)
  const haber = {
    source_id: 'kesfet-' + kuyrukItem.id,
    url_slug: kuyrukItem.url_slug,
    baslik: kuyrukItem.site_baslik,
    site_basligi: kuyrukItem.site_baslik,
    h1_basligi: kuyrukItem.site_baslik,
    og_baslik: kuyrukItem.og_baslik,
    meta_description: kuyrukItem.meta_description,
    icerik: kuyrukItem.metin,
    optimize_icerik: kuyrukItem.metin,
    kategori: kuyrukItem.kategori,
    gorsel, images: gorsel ? [gorsel] : [],
    durum: 'yayinda',
    kaynak: 'Keşfet Radar',
    tarih_iso: new Date().toISOString(),
  }
  const r = await fetch(`${origin}/api/haber-kaydet`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(haber),
  })
  const d = await r.json()
  return { ok: !!d.success, gorsel, resp: d }
}

// ── Motor (cron + manuel "Uygula çalıştır") ───────────────────────────────
async function isle(origin, env, secret) {
  const ayar = await getAyar(env)
  if (!ayar.aktif) return { skip: 'pasif', ayar }

  const firsatlar = await env.HABERLER.get('kesfet:firsatlar', 'json') || []
  let kuyruk = await env.HABERLER.get('kesfet:kuyruk', 'json') || []
  const queued = new Set(kuyruk.map(k => k.firsat_id))

  const adaylar = firsatlar
    .filter(f => !f.gizli && !f.yazildi && f.skor >= ayar.min_skor && !queued.has(f.id))
    .sort((a, b) => b.skor - a.skor)

  const yeni = []
  let denenen = 0, teyitSay = { yaz: 0, isle: 0, guncelle: 0 }
  for (const f of adaylar) {
    if (yeni.length >= ayar.max_yeni || denenen >= 5) break
    denenen++

    // 1) TEYİT — 1ha + kayserim.net (RSS/liste)
    let t = { durum_kodu: 'yaz' }
    try {
      const vr = await fetch(`${origin}/api/kesfet-radar?action=verify&id=${encodeURIComponent(f.id)}&secret=${encodeURIComponent(secret)}`)
      const vd = await vr.json()
      if (vd && vd.durum_kodu) t = vd
    } catch (_) {}
    const kod = t.durum_kodu
    teyitSay[kod] = (teyitSay[kod] || 0) + 1
    if (!ayar.durumlar.includes(kod)) continue   // bu durum ayarda kapalı

    const ortak = {
      id: Math.random().toString(36).slice(2, 10),
      firsat_id: f.id, tip: kod, skor: f.skor, tur: f.tur,
      kaynak_gorsel: f.gorsel_url || '', gorsel_url: '',
      olusturuldu: new Date().toISOString(),
    }

    try {
      if (kod === 'guncelle') {
        // Mevcut haberi liste'den (RSS kaynağı) bul → DÜZENLEMEYE hazırla, üretme
        const liste = await env.HABERLER.get('liste', 'json') || []
        const mev = liste.find(h =>
          (t.kayserim?.link && h.kayserim_link === t.kayserim.link) ||
          (t.kayserim?.source_id && h.source_id === t.kayserim.source_id)
        ) || {}
        kuyruk.unshift({
          ...ortak,
          durum: 'duzenle_bekliyor',
          site_baslik: t.kayserim?.baslik || mev.site_basligi || mev.baslik || f.baslik,
          og_baslik: '', meta_description: mev.meta_description || '',
          kategori: mev.kategori || 'Güncel',
          metin: mev.icerik || mev.optimize_icerik || '',
          url_slug: mev.url_slug || '',
          mevcut_link: t.kayserim?.link || mev.kayserim_link || '',
          kaynak_link: f.link || '', dogrula: false,
        })
      } else {
        // yaz / isle → ÖZGÜN taslak üret
        const draft = await uretDraft(origin, f)
        kuyruk.unshift({
          ...ortak, ...draft,
          durum: 'inceleme',
          kaynak_link: kod === 'isle' ? (t.ha1?.link || f.link || '') : (f.link || ''),
          dogrula: /\[DOĞRULA/i.test(draft.metin),
          yayin_zamani: new Date(Date.now() + ayar.inceleme_dk * 60000).toISOString(),
        })
      }
      yeni.push(ortak.id)
      const ff = firsatlar.find(x => x.id === f.id); if (ff) ff.yazildi = true
    } catch (e) { /* sıradakine geç */ }
  }

  // OTO mod: süresi dolan yaz/isle taslaklarını yayınla (guncelle ve [DOĞRULA] hariç)
  const yayinlananlar = []
  if (ayar.mod === 'oto') {
    const due = kuyruk.filter(k => k.durum === 'inceleme' && k.tip !== 'guncelle' && !k.dogrula && Date.now() >= Date.parse(k.yayin_zamani)).slice(0, ayar.max_yayin)
    for (const k of due) {
      try {
        const res = await yayinla(origin, k)
        if (res.ok) { k.durum = 'yayinlandi'; k.gorsel_url = res.gorsel; k.yayinlandi_zaman = new Date().toISOString(); yayinlananlar.push(k.id) }
        else { k.durum = 'hata'; k.hata = JSON.stringify(res.resp).slice(0, 200) }
      } catch (e) { k.durum = 'hata'; k.hata = e.message }
    }
  }

  kuyruk = kuyruk.slice(0, 60)
  await env.HABERLER.put('kesfet:kuyruk', JSON.stringify(kuyruk))
  await env.HABERLER.put('kesfet:firsatlar', JSON.stringify(firsatlar))

  return { ok: true, mod: ayar.mod, denenen, teyit: teyitSay, yeni_taslak: yeni.length, oto_yayin: yayinlananlar.length, kuyruk_boyu: kuyruk.length }
}

// ── Handlers ───────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'kuyruk'
  const secret = url.searchParams.get('secret') || ''
  try {
    if (action === 'ayarlar') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      return Response.json({ ok: true, ayar: await getAyar(env) }, { headers: CORS })
    }
    if (action === 'kuyruk') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      const kuyruk = await env.HABERLER.get('kesfet:kuyruk', 'json') || []
      return Response.json({ ok: true, kuyruk, ayar: await getAyar(env) }, { headers: CORS })
    }
    if (action === 'process') {
      if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })
      const r = await isle(url.origin, env, secret)
      return Response.json(r, { headers: CORS })
    }
    return Response.json({ hata: 'Geçersiz action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500, headers: CORS })
  }
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url)
  try {
    const body = await request.json().catch(() => ({}))
    const action = url.searchParams.get('action') || body.action
    const secret = url.searchParams.get('secret') || body.secret || ''
    if (!(await yetkili(secret, env))) return Response.json({ hata: 'Yetkisiz' }, { status: 401, headers: CORS })

    if (action === 'ayarlar') {
      const mevcut = await getAyar(env)
      const yeni = { ...mevcut, ...(body.ayar || {}) }
      await env.HABERLER.put('kesfet:ayarlar', JSON.stringify(yeni))
      return Response.json({ ok: true, ayar: yeni }, { headers: CORS })
    }

    if (action === 'onayla') { // manuel yayınla (yarı mod)
      const kuyruk = await env.HABERLER.get('kesfet:kuyruk', 'json') || []
      const k = kuyruk.find(x => x.id === body.id)
      if (!k) return Response.json({ hata: 'Bulunamadı' }, { status: 404, headers: CORS })
      const res = await yayinla(url.origin, k)
      if (res.ok) { k.durum = 'yayinlandi'; k.gorsel_url = res.gorsel; k.yayinlandi_zaman = new Date().toISOString() }
      else { k.durum = 'hata'; k.hata = JSON.stringify(res.resp).slice(0, 200) }
      await env.HABERLER.put('kesfet:kuyruk', JSON.stringify(kuyruk))
      return Response.json({ ok: res.ok, durum: k.durum, hata: k.hata }, { headers: CORS })
    }

    if (action === 'reddet') {
      const kuyruk = await env.HABERLER.get('kesfet:kuyruk', 'json') || []
      const k = kuyruk.find(x => x.id === body.id)
      if (k) { k.durum = 'reddedildi'; await env.HABERLER.put('kesfet:kuyruk', JSON.stringify(kuyruk)) }
      return Response.json({ ok: true }, { headers: CORS })
    }

    return Response.json({ hata: 'Geçersiz action' }, { status: 400, headers: CORS })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }) }
