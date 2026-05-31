// functions/api/manuel-isle.js
// Manuel haber girişi — metin + medya al, Claude + Ahrefs ile işle, KV'ye kaydet

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

    // ── Ahrefs anahtar kelime araştırması ────────────────────────────────────
    let ahrefsVeri = ''
    if (env.AHREFS_API_KEY || env.RSS_API_KEY) {
      try {
        const ilkKelimeler = (baslik||metin||'').split(' ').slice(0,4).join(' ')
        const ahRes = await fetch('https://apiv3.ahrefs.com/v3/keywords-explorer/matching-terms', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${env.AHREFS_API_KEY||''}` },
          body: JSON.stringify({ country:'tr', keywords: ilkKelimeler, limit:5, order_by:'volume:desc', select:'keyword,volume,difficulty' }),
        })
        if (ahRes.ok) {
          const d = await ahRes.json()
          ahrefsVeri = JSON.stringify(d?.terms?.slice(0,5) || [])
        }
      } catch(e) { console.warn('Ahrefs:', e.message) }
    }

    // ── Claude SEO paketi ────────────────────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Sen kayserim.net için çalışan kıdemli bir SEO editörüsün.
Site hakkında: Kayseri odaklı yerel haber sitesi, hedef kitle 25-55 yaş arası Kayseri'de yaşayan okuyucular.
Başlık: max 70 karakter, anahtar kelime içermeli.
Meta: max 155 karakter.
Slug: kısa, tire ile ayrılmış.
İçerik: H2 başlıklı, SEO uyumlu, "Kayseri" kelimesi doğal yerleştirilmiş.
Çıktı: Sadece JSON, başka hiçbir şey yok.`,
        messages: [{
          role: 'user',
          content: `HAM HABER:
Başlık: ${baslik||''}
İçerik: ${metin||''}
Kategori: ${kategori}
${ahrefsVeri ? `\nAHREFS VERİLERİ: ${ahrefsVeri}` : ''}

JSON üret:
{
  "site_basligi": "max 70 karakter SEO başlık",
  "h1_basligi": "H1 başlık",
  "meta_description": "max 155 karakter",
  "url_slug": "kisa-slug",
  "optimize_icerik": "H2 başlıklı tam haber HTML",
  "instagram_metni": "emoji + hashtag ile IG metni",
  "facebook_metni": "FB için metin",
  "x_twitter": "max 280 karakter",
  "whatsapp_basligi": "merak açığı başlık",
  "kategori": "${kategori}",
  "hedef_kelimeler": ["kelime1","kelime2","kelime3"]
}`,
        }],
      }),
    })
    const cd  = await claudeRes.json()
    const txt = cd.content?.[0]?.text || '{}'
    let icerik = {}
    try { icerik = JSON.parse(txt.replace(/```json|```/g,'').trim()) } catch(e) {}

    // ── Creatomate video — video varsa ───────────────────────────────────────
    let creatomateRenders = []
    if (ilkVideo && env.CREATOMATE_API_KEY) {
      const TEMPLATES = {
        dikey: 'e9cf7ffa-84f2-41ba-8d79-8d89be0eaa36',
        yatay: '438ee267-ad53-4627-8126-e50ffb30f395',
      }
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
            body: JSON.stringify({ template_id: TEMPLATES[fmt], output_format:'mp4', frame_rate:30, modifications:mods }),
          })
          const d = await r.json()
          if (r.ok) { const rnd = Array.isArray(d)?d[0]:d; creatomateRenders.push({ format:fmt, render_id:rnd.id, status:rnd.status }) }
        } catch(e) { console.warn('Creatomate',fmt,e.message) }
      }
    }

    // ── KV'ye kaydet ─────────────────────────────────────────────────────────
    const source_id = `manuel_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const kayit = {
      source_id,
      baslik:      baslik||'',
      icerik:      metin||'',
      kategori,
      gorsel_url:  ilkGorsel,
      gorsel:      ilkGorsel,
      video_url:   ilkVideo,
      medyalar,
      durum:       'islendi',
      kaynak:      'manuel',
      kullanici:   kul.kullanici,
      kullanici_ad:kul.ad||kul.kullanici,
      tarih:       new Date().toLocaleDateString('tr-TR'),
      tarih_iso:   new Date().toISOString(),
      kaydedildi:  new Date().toISOString(),
      creatomate:  creatomateRenders,
      video_dikey: creatomateRenders.find(r=>r.format==='dikey')||null,
      video_yatay: creatomateRenders.find(r=>r.format==='yatay')||null,
      // Claude çıktısı
      site_basligi:     icerik.site_basligi||baslik||'',
      h1_basligi:       icerik.h1_basligi||baslik||'',
      meta_description: icerik.meta_description||'',
      url_slug:         icerik.url_slug||'',
      optimize_icerik:  icerik.optimize_icerik||metin||'',
      instagram_metni:  icerik.instagram_metni||'',
      facebook_metni:   icerik.facebook_metni||'',
      x_twitter:        icerik.x_twitter||'',
      whatsapp_basligi: icerik.whatsapp_basligi||'',
      sosyal_baslik:    icerik.instagram_metni||'',
      hedef_kelimeler:  icerik.hedef_kelimeler||[],
    }

    await env.HABERLER.put(`haber:${source_id}`, JSON.stringify(kayit))

    // Ana haber listesine ekle
    const liste = await env.HABERLER.get('HABERLER', 'json') || []
    liste.unshift(kayit)
    await env.HABERLER.put('HABERLER', JSON.stringify(liste.slice(0,500)))

    return Response.json({ ok:true, source_id, kayit })
  } catch(e) {
    console.error('manuel-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
