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
    const metinKisa = (metin||'').slice(0, 3000)
    const prompt = `Sen kayserim.net için çalışan kıdemli bir SEO editörüsün.

## KRİTİK KURAL — GERÇEK HABER DİLİ
Optimize içeriği gerçek haber ajansı dilinde yaz. KAYSERİ(1HA)- gibi kaynak önekleri kaldır.

## HABER BİLGİSİ
Başlık: ${baslik||''}
İçerik: ${metinKisa}
Kategori: ${kategori}
${isVideo ? 'İçerik Tipi: VİDEO HABER — sosyal medya metinlerine "izle", "videolu haber" ekle' : ''}

## SEO STRATEJİSİ
Hedef kelimeler: ${katKw}
- "Kayseri" ilk 3 kelimede geçmeli
- Başlık 55-65 karakter
- URL slug "kayseri-" ile başlamalı

SADECE şu JSON formatını döndür:
{
  "site_basligi": "55-65 karakter, Kayseri içeren SEO başlık",
  "h1_basligi": "H1 başlık",
  "sosyal_baslik": "max 7 kelime, Kayseri ile başlayan sosyal medya başlığı",
  "meta_description": "max 155 karakter",
  "url_slug": "kayseri-ile-baslayan-slug",
  "optimize_icerik": "250-400 kelime, Türk haber ajansı dilinde, H2 başlıklı HTML",
  "ozet": "1 cümle, haberin özü",
  "instagram": "Haberi Instagram için yeniden yaz. 1) Kaynak öneklerini kaldır 2) Doğal akıcı dil 3) Konuya uygun emoji 4) 1200-2000 karakter 5) Sondan önce 'Haber detayları kayserim.net\\'te 🔗' 6) Son satırda 6-10 hashtag (#kayseri #kayserihaber ve konuya özel) 7) URL ekleme",
  "facebook": "Haber başlığı + özet + 1-2 cümle. Konuya uygun emoji. Max 300 karakter. Sonuna #kayseri #kayserihaber",
  "x_twitter": "Başlık + kısa spot. Max 230 karakter. 1-2 emoji. #KayseriSonDakika #Kayseri ve 1-2 hashtag",
  "youtube_baslik": "max 80 karakter, arama odaklı",
  "youtube_aciklama": "250-300 karakter özet. Sonuna 'Detaylar için: [LINK]'",
  "hedef_kelimeler": ["kelime1","kelime2","kelime3"],
  "kategori": "${kategori}",
  "gorsel_prompt": "realistic Turkish news photo, Kayseri Turkey, max 12 words"
}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 3000,
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

    const liste = await env.HABERLER.get('HABERLER', 'json') || []
    liste.unshift(kayit)
    await env.HABERLER.put('HABERLER', JSON.stringify(liste.slice(0,500)))

    return Response.json({ ok:true, source_id, kayit })
  } catch(e) {
    console.error('manuel-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
