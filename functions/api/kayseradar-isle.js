// functions/api/kayseradar-isle.js
// Kayseradar veri girişi — metin + medya al, Claude ile düzelt, KV'ye kaydet

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })
  if (kullanici.modul_kayseradar === false)
    return Response.json({ hata: 'Kayseradar yetkisi yok' }, { status: 403 })

  try {
    const { sablon, baslik, metin, medyalar = [] } = await request.json()
    // medyalar: [{ url, tip: 'gorsel'|'video', adi }]

    if (!sablon) return Response.json({ hata: 'sablon zorunlu' }, { status: 400 })
    if (!baslik.trim() && !metin.trim()) return Response.json({ hata: 'metin veya baslik zorunlu' }, { status: 400 })

    // ── Claude ile dil/imla düzeltme ─────────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Sen Kayseradar haber ajansı için çalışan bir editörüsün. Türkçe dil ve imla kurallarına göre aşağıdaki metni düzelt. Anlam ve içeriği değiştirme.

ŞABLON: ${sablon}
BAŞLIK: ${baslik || ''}
METİN: ${metin || ''}

Sadece JSON döndür:
{
  "duzeltilmis_baslik": "düzeltilmiş başlık",
  "duzeltilmis_metin": "düzeltilmiş metin",
  "instagram_metni": "IG için kısa metin + hashtag (max 2200 karakter)",
  "twitter_metni": "280 karakter max",
  "facebook_metni": "FB için metin",
  "spot": "15 kelimelik kısa özet (video alt yazısı için)"
}`,
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const claudeText = claudeData.content?.[0]?.text || '{}'
    let duzeltilmis = {}
    try {
      duzeltilmis = JSON.parse(claudeText.replace(/```json|```/g, '').trim())
    } catch(e) {
      duzeltilmis = {
        duzeltilmis_baslik: baslik || '',
        duzeltilmis_metin:  metin  || '',
        instagram_metni:    metin  || '',
        twitter_metni:      (baslik || metin || '').slice(0, 280),
        facebook_metni:     metin  || '',
        spot:               baslik || '',
      }
    }

    // ── Medyaları ayır ───────────────────────────────────────────────────────
    const gorseller = medyalar.filter(m => m.tip === 'gorsel')
    const videolar  = medyalar.filter(m => m.tip === 'video')
    const ilkGorsel = gorseller[0]?.url || ''
    const ilkVideo  = videolar[0]?.url  || ''

    // ── Video varsa Creatomate'e gönder ──────────────────────────────────────
    let creatomateRenders = []
    if (ilkVideo && env.CREATOMATE_API_KEY) {
      const tarihStr = new Date().toLocaleDateString('tr-TR')
      const katStr   = sablon.toUpperCase()
      const modifications = {
        'video.source':        ilkVideo,
        'baslik.text':         duzeltilmis.duzeltilmis_baslik || baslik || '',
        'baslikss.text':       duzeltilmis.duzeltilmis_baslik || baslik || '',
        'spot-baslik.text':    duzeltilmis.spot || '',
        'spot-baslik-ss.text': duzeltilmis.spot || '',
        'kategori.text':       katStr,
        'tarih.text':          tarihStr,
      }
      const TEMPLATES = {
        dikey: 'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
        yatay: '438ee267-ad53-4627-8126-e50ffb30f395',
      }
      for (const fmt of ['dikey', 'yatay']) {
        try {
          const res = await fetch('https://api.creatomate.com/v2/renders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({ template_id: TEMPLATES[fmt], output_format: 'mp4', frame_rate: 30, modifications }),
          })
          const data = await res.json()
          if (res.ok) {
            const render = Array.isArray(data) ? data[0] : data
            creatomateRenders.push({ format: fmt, render_id: render.id, status: render.status })
          }
        } catch(e) { console.warn('Creatomate', fmt, e.message) }
      }
    }

    // ── KV'ye kaydet ─────────────────────────────────────────────────────────
    const id = `radar_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const kayit = {
      id,
      sablon,
      baslik:         duzeltilmis.duzeltilmis_baslik || baslik || '',
      metin:          duzeltilmis.duzeltilmis_metin  || metin  || '',
      ham_baslik:     baslik || '',
      ham_metin:      metin  || '',
      spot:           duzeltilmis.spot || '',
      ig_metni:       duzeltilmis.instagram_metni || '',
      tw_metni:       duzeltilmis.twitter_metni   || '',
      fb_metni:       duzeltilmis.facebook_metni  || '',
      gorsel_url:     ilkGorsel,
      video_url:      ilkVideo,
      gorseller,
      videolar,
      medyalar,
      creatomate:     creatomateRenders,
      video_dikey:    creatomateRenders.find(r=>r.format==='dikey') || null,
      video_yatay:    creatomateRenders.find(r=>r.format==='yatay') || null,
      durum:          'onay_bekliyor',
      kullanici:      kullanici.kullanici,
      kullanici_ad:   kullanici.ad || kullanici.kullanici,
      olusturuldu:    new Date().toISOString(),
      paylasimlar:    {},
    }

    await env.HABERLER.put(`radar:${id}`, JSON.stringify(kayit))

    // Liste güncelle
    const liste = await env.HABERLER.get('radar_liste', 'json') || []
    liste.unshift({ id, sablon, baslik: kayit.baslik, durum: 'onay_bekliyor', tarih: kayit.olusturuldu, medya_sayisi: medyalar.length })
    await env.HABERLER.put('radar_liste', JSON.stringify(liste.slice(0, 200)))

    return Response.json({ ok: true, id, kayit })
  } catch(e) {
    console.error('kayseradar-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

// GET — kayıtları listele veya tekil getir
export async function onRequestGet({ request, env }) {
  const url       = new URL(request.url)
  const token     = request.headers.get('X-Token') || url.searchParams.get('token')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })

  const id = url.searchParams.get('id')
  if (id) {
    const kayit = await env.HABERLER.get(`radar:${id}`, 'json')
    return kayit ? Response.json(kayit) : Response.json({ hata: 'Bulunamadı' }, { status: 404 })
  }
  const liste = await env.HABERLER.get('radar_liste', 'json') || []
  return Response.json(liste)
}
