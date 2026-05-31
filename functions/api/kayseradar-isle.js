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
          content: `Sadece yazım ve imla hatalarını düzelt. Kelime değiştirme, cümle yapısı değiştirme, anlam ekleme veya çıkarma YAPMA. Noktalama işaretlerini düzelt.

BAŞLIK: ${baslik || ''}
METİN: ${metin || ''}

Sadece JSON döndür, başka hiçbir şey yazma:
{
  "duzeltilmis_baslik": "sadece imla düzeltilmiş başlık — kelime ekleme veya çıkarma yok",
  "duzeltilmis_metin": "sadece imla düzeltilmiş metin — anlam değişikliği yok",
  "instagram_metni": "başlık + metin aynen + #kayseradar #kayseri hashtag",
  "twitter_metni": "başlık aynen, max 280 karakter",
  "facebook_metni": "başlık + metin aynen",
  "spot": "başlığın kendisi, max 15 kelime"
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
    const gorseller  = medyalar.filter(m => m.tip === 'gorsel')
    const videolar   = medyalar.filter(m => m.tip === 'video')
    const ilkGorsel  = gorseller[0]?.url || ''
    const ilkVideo   = videolar[0]?.url  || ''
    const ilkMedya   = videolar[0] || gorseller[0] || null
    const mediaDikey = ilkMedya?.dikey !== false // undefined da dikey sayılır

    // ── Creatomate render ─────────────────────────────────────────────────────
    // Şablon haritası — sablon adına göre template ID
    const RADAR_TEMPLATES = {
      // sablon_adi: { video: template_id, gorsel: template_id }
      'sikayet':      { video: '1153524a-8743-45d6-86e0-e0c20bde5d6a', gorsel: '65eba71b-0f0c-44d2-86e7-319e63c59373' },
      'kaza':         { video: '6b4b2793-2590-4180-abe8-adc9c10300f9', gorsel: '91e77d8b-614e-4803-a636-5264d3ea344c' },
      'kaza_ani':     { video: '6b4b2793-2590-4180-abe8-adc9c10300f9', gorsel: '91e77d8b-614e-4803-a636-5264d3ea344c' },
      'kayip':        { video: 'e6a3347a-73a8-45ab-b463-66920341c216', gorsel: 'ead3335d-8714-484a-b58e-a74babd4bc46' },
      'hirsiz':       { video: '25a6cbcc-f791-4876-a4aa-22ca70064aa8', gorsel: '097372b3-39c7-49bc-8821-2ce61d79e0d6' },
      'calinti':      { video: '3a0a838c-08dc-4964-a36f-a8dde48423b8', gorsel: '7c0a1ea7-0ede-4158-8677-6e8f103461d3' },
      'yangin':       { video: '288f5185-c014-42c6-917e-6594e350ba77', gorsel: '3c95c888-f76d-4024-9b87-4fa958b707aa' },
      'bulunmustur':  { video: '89588329-ccf5-4895-9d9f-6d1a79583a91', gorsel: '314aee42-4412-4f23-baf3-72be45d5fc63' },
      'trafik':       { video: '6b18e958-cea5-4c56-9863-83c93454fa9a', gorsel: '80f1d1b3-68dd-4e04-a6ee-3ad4e07944f8' },
      'son_dakika':   { video: '7fade5d6-ef75-4675-9d80-0bf640d141e5', gorsel: '7522777c-2aa1-476e-a5d8-eafc399440ca' },
      'acil':         { video: 'ff46854d-3059-4be5-bfab-d3026cd72aaa', gorsel: 'bfdd293b-4e99-435e-8cf4-ed7a7926698d' },
      'pati':         { video: '789cd38d-2cd1-4783-836d-0c22381a6d7b', gorsel: '49a6e9cb-a8a0-4db6-8500-0e2db1641f24' },
      'radar_yardim': { video: 'a63ab1d9-8417-4c69-87bf-42ed3eee7d53', gorsel: 'f39bcded-c7c0-4bf2-81d9-aa7331f5f925' },
      // Henüz özel şablonu olmayan — fallback
      'genel':        { video: '1153524a-8743-45d6-86e0-e0c20bde5d6a', gorsel: '7586e1f4-d6ab-409a-9995-c9a03d2647d1' },
      'kan':          { video: '1153524a-8743-45d6-86e0-e0c20bde5d6a', gorsel: '65eba71b-0f0c-44d2-86e7-319e63c59373' },
    }
    // Kayserim.net haber şablonları (fallback)
    const HABER_TEMPLATES = {
      dikey: 'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
      yatay: '438ee267-ad53-4627-8126-e50ffb30f395',
    }

    let creatomateRenders = []
    if (env.CREATOMATE_API_KEY && (ilkVideo || ilkGorsel)) {
      const tarihStr  = new Date().toLocaleDateString('tr-TR')
      const mediaUrl  = ilkVideo || ilkGorsel
      const isVideo   = !!ilkVideo

      // Şablonu belirle — görsel/video ayrı template
      const radarTpl   = RADAR_TEMPLATES[sablon]
      const templateId = isVideo
        ? (radarTpl?.video  || HABER_TEMPLATES.dikey)
        : (radarTpl?.gorsel || HABER_TEMPLATES.dikey)

      // Modifikasyonlar — radar şablonu için
      const baslikMetni = (duzeltilmis.duzeltilmis_baslik || baslik || '').slice(0, 120)
      const modifications = {
        'video.source':    mediaUrl,
        'baslik.text':     baslikMetni,
        'baslik-X6C.text': baslikMetni,
        'tarih.text':      tarihStr,
      }

      try {
        // Görsel → jpg snapshot (v1 API), Video → mp4 render (v2 API)
        let res, data
        if (!isVideo) {
          // Görsel için v1 snapshot — çok daha az kredi, anında JPG
          res = await fetch('https://api.creatomate.com/v1/renders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({
              template_id:   templateId,
              output_format: 'jpg',
              modifications,
            }),
          })
        } else {
          // Video için v2 render
          res = await fetch('https://api.creatomate.com/v2/renders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({
              template_id:   templateId,
              output_format: 'mp4',
              frame_rate:    30,
              modifications,
            }),
          })
        }

        data = await res.json()
        if (res.ok) {
          const render = Array.isArray(data) ? data[0] : data
          creatomateRenders.push({
            format:    'dikey',
            render_id: render.id,
            status:    render.status || (render.url ? 'succeeded' : 'planned'),
            url:       render.url || null, // jpg snapshot anında URL dönebilir
            tip:       isVideo ? 'video' : 'gorsel',
            sablon:    sablon,
          })
        } else {
          console.warn('Creatomate hata:', JSON.stringify(data))
        }
      } catch(e) { console.warn('Creatomate:', e.message) }

      // Video varsa kayserim şablonuyla yatay da üret
      if (isVideo) {
        try {
          const res = await fetch('https://api.creatomate.com/v2/renders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({
              template_id:  HABER_TEMPLATES.yatay,
              output_format: 'mp4',
              frame_rate:   30,
              modifications: {
                'video.source':        mediaUrl,
                'baslik.text':         (duzeltilmis.duzeltilmis_baslik || baslik || '').slice(0,120),
                'baslikss.text':       (duzeltilmis.duzeltilmis_baslik || baslik || '').slice(0,120),
                'spot-baslik.text':    duzeltilmis.spot || '',
                'spot-baslik-ss.text': duzeltilmis.spot || '',
                'kategori.text':       sablon.toUpperCase(),
                'tarih.text':          tarihStr,
              },
            }),
          })
          const data = await res.json()
          if (res.ok) {
            const render = Array.isArray(data) ? data[0] : data
            creatomateRenders.push({ format:'yatay', render_id:render.id, status:render.status, tip:'video' })
          }
        } catch(e) { console.warn('Creatomate yatay:', e.message) }
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
    // Render URL'yi bul (hazırsa)
    const ilkRender = kayit.creatomate?.[0]
    const renderUrl = ilkRender?.url || null

    liste.unshift({
      id,
      sablon,
      baslik:      kayit.baslik,
      durum:       'onay_bekliyor',
      tarih:       kayit.olusturuldu,
      medya_sayisi: medyalar.length,
      gorsel_url:  kayit.gorsel_url || '',
      render_url:  renderUrl,
      render_id:   ilkRender?.render_id || null,
    })
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
