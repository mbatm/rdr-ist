// functions/api/manuel-isle.js
// Manuel haber girişi — metin + medya al, Claude + Ahrefs ile işle

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul   = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul || kul.modul_manuel === false)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    const { baslik, metin, kategori='Güncel', gorsel_url='', video_url='', medyalar=[] } = await request.json()
    if (!metin?.trim() && !baslik?.trim())
      return Response.json({ hata: 'Metin veya başlık zorunlu' }, { status: 400 })

    const ilkGorsel = gorsel_url || medyalar.find(m=>m.tip==='gorsel')?.url || ''
    const ilkVideo  = video_url  || medyalar.find(m=>m.tip==='video')?.url  || ''

    // ── Ahrefs ───────────────────────────────────────────────────────────────
    let ahrefsVeri = ''
    try {
      const kelimeler = (baslik||metin||'').split(' ').slice(0,4).join(' ')
      const ahRes = await fetch('https://apiv3.ahrefs.com/v3/keywords-explorer/matching-terms', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${env.AHREFS_API_KEY||''}` },
        body: JSON.stringify({ country:'tr', keywords:kelimeler, limit:5, order_by:'volume:desc', select:'keyword,volume,difficulty' }),
      })
      if (ahRes.ok) {
        const d = await ahRes.json()
        ahrefsVeri = JSON.stringify(d?.terms?.slice(0,5)||[])
      }
    } catch(e) { console.warn('Ahrefs:', e.message) }

    // ── Claude — sadece kısa alanlar (JSON güvenli) ───────────────────────────
    const metinKisa = (metin||'').slice(0, 2000) // token limitini aşmamak için kırp

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Sen kayserim.net SEO editörüsün. Aşağıdaki haberi işle ve SADECE JSON döndür, başka hiçbir şey yazma.

BAŞLIK: ${baslik||''}
METİN: ${metinKisa}
KATEGORİ: ${kategori}
${ahrefsVeri?`AHREFS: ${ahrefsVeri}`:''}

JSON formatı (tüm değerler string, Türkçe):
{"site_basligi":"max 70 karakter SEO başlık","h1_basligi":"H1 başlık","meta_description":"max 155 karakter","url_slug":"kisa-slug-tr","sosyal_baslik":"merak uyandıran başlık","instagram_metni":"IG metni emoji hashtag ile","facebook_metni":"FB metni","x_twitter":"max 280 karakter tweet","whatsapp_basligi":"whatsapp başlık","hedef_kelimeler":["kelime1","kelime2","kelime3"]}`,
        }],
      }),
    })
    const cd  = await claudeRes.json()
    const txt = (cd.content?.[0]?.text || '{}').replace(/```json|```/g,'').trim()
    let icerik = {}
    try {
      // JSON başlangıcını bul
      const jsonStart = txt.indexOf('{')
      const jsonEnd   = txt.lastIndexOf('}')
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        icerik = JSON.parse(txt.slice(jsonStart, jsonEnd+1))
      }
    } catch(e) { console.warn('JSON parse:', e.message, txt.slice(0,200)) }

    // ── Claude — optimize içerik (ayrı çağrı) ───────────────────────────────
    let optimizeIcerik = metin || ''
    try {
      const icerikRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Aşağıdaki haber metnini kayserim.net için SEO uyumlu HTML'e dönüştür. H2 başlıklar kullan, "Kayseri" kelimesini doğal yerleştir. Sadece HTML içerik döndür, başka hiçbir şey yazma.

BAŞLIK: ${icerik.site_basligi||baslik||''}
METİN: ${metinKisa}`,
          }],
        }),
      })
      const id = await icerikRes.json()
      optimizeIcerik = id.content?.[0]?.text?.replace(/```html|```/g,'').trim() || metin || ''
    } catch(e) { console.warn('Optimize içerik:', e.message) }

    // ── Creatomate video ─────────────────────────────────────────────────────
    let creatomateRenders = []
    if (ilkVideo && env.CREATOMATE_API_KEY) {
      const TEMPLATES = { dikey:'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36', yatay:'438ee267-ad53-4627-8126-e50ffb30f395' }
      const mods = {
        'video.source':        ilkVideo,
        'baslik.text':         (icerik.site_basligi||baslik||'').slice(0,120),
        'baslikss.text':       (icerik.site_basligi||baslik||'').slice(0,120),
        'spot-baslik.text':    (icerik.meta_description||'').slice(0,100),
        'spot-baslik-ss.text': (icerik.meta_description||'').slice(0,100),
        'kategori.text':       (kategori||'GÜNCEL').toUpperCase(),
        'tarih.text':          new Date().toLocaleDateString('tr-TR'),
      }
      for (const fmt of ['dikey','yatay']) {
        try {
          const r = await fetch('https://api.creatomate.com/v2/renders', {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({ template_id:TEMPLATES[fmt], output_format:'mp4', frame_rate:30, modifications:mods }),
          })
          const d = await r.json()
          if (r.ok) { const rnd=Array.isArray(d)?d[0]:d; creatomateRenders.push({ format:fmt, render_id:rnd.id, status:rnd.status }) }
        } catch(e) { console.warn('Creatomate',fmt,e.message) }
      }
    }

    // ── KV kaydet ────────────────────────────────────────────────────────────
    const source_id = `manuel_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const kayit = {
      source_id,
      baslik:           baslik||icerik.site_basligi||'',
      icerik:           metin||'',
      kategori,
      gorsel_url:       ilkGorsel,
      gorsel:           ilkGorsel,
      video_url:        ilkVideo,
      medyalar,
      durum:            'islendi',
      kaynak:           'manuel',
      kullanici:        kul.kullanici,
      kullanici_ad:     kul.ad||kul.kullanici,
      tarih:            new Date().toLocaleDateString('tr-TR'),
      tarih_iso:        new Date().toISOString(),
      kaydedildi:       new Date().toISOString(),
      creatomate:       creatomateRenders,
      video_dikey:      creatomateRenders.find(r=>r.format==='dikey')||null,
      video_yatay:      creatomateRenders.find(r=>r.format==='yatay')||null,
      // Claude SEO çıktısı
      site_basligi:     icerik.site_basligi     || baslik || '',
      h1_basligi:       icerik.h1_basligi       || baslik || '',
      meta_description: icerik.meta_description || '',
      url_slug:         icerik.url_slug          || '',
      optimize_icerik:  optimizeIcerik,
      sosyal_baslik:    icerik.sosyal_baslik     || icerik.instagram_metni || '',
      instagram_metni:  icerik.instagram_metni   || '',
      facebook_metni:   icerik.facebook_metni    || '',
      x_twitter:        icerik.x_twitter         || '',
      whatsapp_basligi: icerik.whatsapp_basligi  || '',
      hedef_kelimeler:  icerik.hedef_kelimeler   || [],
    }

    await env.HABERLER.put(`haber:${source_id}`, JSON.stringify(kayit))

    // Ana listeye ekle
    const liste = await env.HABERLER.get('HABERLER', 'json') || []
    liste.unshift(kayit)
    await env.HABERLER.put('HABERLER', JSON.stringify(liste.slice(0,500)))

    return Response.json({ ok:true, source_id, kayit })
  } catch(e) {
    console.error('manuel-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
