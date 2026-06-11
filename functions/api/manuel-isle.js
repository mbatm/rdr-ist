// functions/api/manuel-isle.js
// Manuel haber girişi — oto-isle ile aynı Claude prompt formatı

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
    const isVideo   = !!ilkVideo

    // ── Ahrefs kelime stratejisi (KV'den — oto-isle ile aynı mantık) ─────────
    let katKw = 'kayseri haber, kayseri son dakika'
    try {
      const strateji = await env.HABERLER.get('ahrefs_strateji', 'json')
      if (strateji?.[kategori]) katKw = strateji[kategori]
    } catch(e) {}

    // ── Claude — oto-isle ile aynı prompt ────────────────────────────────────
    const metinKisa = (metin||'').slice(0, 1500)
    const metinUzunluk = (metin||'').trim().split(/\s+/).length
    const kisaMetin = metinUzunluk < 50

    const prompt = `Sen kayserim.net için çalışan kıdemli bir SEO editörüsün.

## KRİTİK KURALLAR
- Kaynak öneklerini (KAYSERİ(1HA)- gibi) kaldır
- VERİLEN METNİ ŞIŞIRME: Kısa metin geldiyse olduğu gibi kullan, uydurma ekleme yapma
- SADECE JSON döndür
${isVideo ? '- VİDEO HABER: Sosyal metinlere "izle" ekle' : ''}

## HABER
Başlık: ${baslik||'(yok)'}
İçerik (${metinUzunluk} kelime): ${metinKisa}
Kategori: ${kategori}
SEO kelimeleri: ${katKw}

## KURALLAR
- site_basligi: 55-65 karakter, Kayseri içermeli
- url_slug: kayseri- ile başlasın
- optimize_icerik: ${kisaMetin ? 'ORİJİNAL METNİ AYNEN KULLAN, hiç değiştirme' : '150-250 kelime haber ajansı dili'}
- Sosyal medya: Mevcut içerikten üret, uydurma

{
  "site_basligi": "55-65 karakter SEO başlık",
  "h1_basligi": "",
  "sosyal_baslik": "max 7 kelime",
  "meta_description": "max 155 karakter",
  "url_slug": "kayseri-ile-baslayan",
  "ozet": "1 cümle",
  "optimize_icerik": "",
  "instagram": "max 500 karakter + hashtag",
  "facebook": "max 200 karakter",
  "x_twitter": "max 230 karakter",
  "youtube_baslik": "",
  "youtube_aciklama": "",
  "hedef_kelimeler": [],
  "kategori": "${kategori}",
  "gorsel_prompt": "",
  "alternatif_basliklar": ["","",""],
  "optimize_icerik_kwh": ""
}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages:   [{ role:'user', content: prompt }],
      }),
    })
    const cd  = await claudeRes.json()
    const txt = (cd.content?.[0]?.text || '{}').replace(/```json|```/g,'').trim()

    let icerik = {}
    try {
      const s = txt.indexOf('{'), e = txt.lastIndexOf('}')
      if (s >= 0 && e > s) icerik = JSON.parse(txt.slice(s, e+1))
    } catch(err) { console.warn('JSON parse:', err.message, txt.slice(0,300)) }

    // ── Creatomate render — video veya görsel ────────────────────────────────
    let creatomateRenders = []
    if (env.CREATOMATE_API_KEY && (ilkVideo || ilkGorsel)) {
      const mediaUrl  = ilkVideo || ilkGorsel
      const isVideo   = !!ilkVideo
      const ilkMedya  = medyalar.find(m=>m.tip===(isVideo?'video':'gorsel'))
      const gw = ilkMedya?.genislik  || 1
      const gh = ilkMedya?.yukseklik || 1

      // Kadraj hesaplama
      const oran = gw / gh
      let wPct, hPct
      if (gh >= 1350) {
        hPct = `${((720/oran)/1280*100).toFixed(2)}%`; wPct = '100%'
      } else {
        wPct = `${((1350*oran)/720*100).toFixed(2)}%`; hPct = `${(1350/1280*100).toFixed(2)}%`
      }
      const kadraj = { 'video.width':wPct,'video.height':hPct,'video.x':'50%','video.y':'50%','video.x_anchor':'50%','video.y_anchor':'50%','video.fit':'fill' }

      const TEMPLATES = {
        dikey_video:  'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
        yatay_video:  '438ee267-ad53-4627-8126-e50ffb30f395',
        dikey_gorsel: 'd8655c6b-e08d-45e4-8277-64b074164ac6',
      }
      const baslikStr = (icerik.site_basligi||baslik||'').slice(0,120)
      const mods = {
        'video.source':        mediaUrl,
        'baslik.text':         baslikStr,
        'baslikss.text':       baslikStr,
        'spot-baslik.text':    (icerik.meta_description||'').slice(0,100),
        'spot-baslik-ss.text': (icerik.meta_description||'').slice(0,100),
        'kategori.text':       (kategori||'GÜNCEL').toUpperCase(),
        'tarih.text':          new Date().toLocaleDateString('tr-TR'),
        ...kadraj,
      }

      const formatlar = isVideo ? ['dikey','yatay'] : ['dikey']
      for (const fmt of formatlar) {
        const templateId = isVideo
          ? (fmt==='dikey' ? TEMPLATES.dikey_video : TEMPLATES.yatay_video)
          : TEMPLATES.dikey_gorsel
        try {
          const apiUrl = isVideo ? 'https://api.creatomate.com/v2/renders' : 'https://api.creatomate.com/v1/renders'
          const r = await fetch(apiUrl, {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${env.CREATOMATE_API_KEY}` },
            body: JSON.stringify({ template_id:templateId, output_format:isVideo?'mp4':'jpg', ...(isVideo?{frame_rate:30}:{}), modifications:mods }),
          })
          const d = await r.json()
          if (r.ok) {
            const rnd=Array.isArray(d)?d[0]:d
            creatomateRenders.push({ format:fmt, render_id:rnd.id, status:rnd.status||(rnd.url?'succeeded':'planned'), url:rnd.url||null, tip:isVideo?'video':'gorsel' })
          }
        } catch(e) { console.warn('Creatomate',fmt,e.message) }
      }
    }

    // ── KV kaydet ────────────────────────────────────────────────────────────
    const source_id = `manuel_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const kayit = {
      source_id,
      baslik:           baslik||icerik.site_basligi||'',
      icerik:           metin||'',
      kategori:         icerik.kategori||kategori,
      gorsel_url:       ilkGorsel,
      gorsel:           ilkGorsel,
      video:            ilkVideo,
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
      // Claude SEO çıktısı — oto-isle ile aynı alan adları
      site_basligi:     icerik.site_basligi      || baslik || '',
      alternatif_basliklar: icerik.alternatif_basliklar || [],
      optimize_icerik_kwh: icerik.optimize_icerik_kwh || icerik.optimize_icerik || '',
      h1_basligi:       icerik.h1_basligi         || baslik || '',
      sosyal_baslik:    icerik.sosyal_baslik      || '',
      meta_description: icerik.meta_description   || '',
      url_slug:         icerik.url_slug            || '',
      optimize_icerik:  icerik.optimize_icerik    || metin || '',
      ozet:             icerik.ozet                || '',
      instagram:        icerik.instagram           || '',
      facebook:         icerik.facebook            || '',
      x_twitter:        icerik.x_twitter           || '',
      youtube_baslik:   icerik.youtube_baslik      || '',
      youtube_aciklama: icerik.youtube_aciklama    || '',
      hedef_kelimeler:  icerik.hedef_kelimeler     || [],
      gorsel_prompt:    icerik.gorsel_prompt        || '',
    }

    await env.HABERLER.put(`haber:${source_id}`, JSON.stringify(kayit))

    const liste = await env.HABERLER.get('liste', 'json') || []
    liste.unshift(kayit)
    await env.HABERLER.put('liste', JSON.stringify(liste.slice(0,500)))

    return Response.json({ ok:true, source_id, kayit })
  } catch(e) {
    console.error('manuel-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
