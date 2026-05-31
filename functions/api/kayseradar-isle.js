// functions/api/kayseradar-isle.js
// Kayseradar veri girişi — metin al, Claude ile düzelt, KV'ye kaydet

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })
  if (kullanici.modul_kayseradar === false)
    return Response.json({ hata: 'Kayseradar yetkisi yok' }, { status: 403 })

  try {
    const { sablon, baslik, metin, gorsel_url } = await request.json()

    if (!sablon) return Response.json({ hata: 'sablon zorunlu' }, { status: 400 })
    if (!metin && !baslik) return Response.json({ hata: 'metin veya baslik zorunlu' }, { status: 400 })

    // Claude ile dil/imla düzeltme
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Sen Kayseradar haber ajansı için çalışan bir editörüsün. Türkçe dil ve imla kurallarına göre aşağıdaki metni düzelt. Anlam ve içeriği değiştirme, sadece yazım hatalarını düzelt, noktalama işaretlerini ekle.

ŞABLON: ${sablon}
BAŞLIK: ${baslik || ''}
METİN: ${metin || ''}

Sadece JSON döndür:
{
  "duzeltilmis_baslik": "düzeltilmiş başlık",
  "duzeltilmis_metin": "düzeltilmiş metin",
  "instagram_metni": "IG için kısa metin + hashtag",
  "twitter_metni": "280 karakter max",
  "facebook_metni": "FB için metin"
}`,
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const claudeText = claudeData.content?.[0]?.text || '{}'
    let duzeltilmis = {}
    try {
      const clean = claudeText.replace(/```json|```/g, '').trim()
      duzeltilmis = JSON.parse(clean)
    } catch(e) {
      duzeltilmis = {
        duzeltilmis_baslik: baslik || '',
        duzeltilmis_metin:  metin  || '',
        instagram_metni:    metin  || '',
        twitter_metni:      (baslik || metin || '').slice(0, 280),
        facebook_metni:     metin  || '',
      }
    }

    // KV'ye kaydet — onay bekliyor durumunda
    const id = `radar_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const kayit = {
      id,
      sablon,
      baslik:       duzeltilmis.duzeltilmis_baslik || baslik || '',
      metin:        duzeltilmis.duzeltilmis_metin  || metin  || '',
      ham_baslik:   baslik || '',
      ham_metin:    metin  || '',
      gorsel_url:   gorsel_url || '',
      ig_metni:     duzeltilmis.instagram_metni    || '',
      tw_metni:     duzeltilmis.twitter_metni      || '',
      fb_metni:     duzeltilmis.facebook_metni     || '',
      durum:        'onay_bekliyor',
      kullanici:    kullanici.kullanici,
      kullanici_ad: kullanici.ad || kullanici.kullanici,
      olusturuldu:  new Date().toISOString(),
      paylasimlар:  {},
    }

    await env.HABERLER.put(`radar:${id}`, JSON.stringify(kayit))

    // Liste güncelle
    const liste = await env.HABERLER.get('radar_liste', 'json') || []
    liste.unshift({ id, sablon, baslik: kayit.baslik, durum: 'onay_bekliyor', tarih: kayit.olusturuldu })
    await env.HABERLER.put('radar_liste', JSON.stringify(liste.slice(0, 200)))

    return Response.json({ ok: true, id, kayit })
  } catch(e) {
    console.error('kayseradar-isle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

// GET — kayıtları listele
export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url)
  const token = request.headers.get('X-Token') || url.searchParams.get('token')
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
