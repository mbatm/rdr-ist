/**
 * POST /api/galeri-olustur
 * Galeri kapak + diğer görselleri render eder
 * Body: {
 *   kaynak: 'kayserim' | 'radar',
 *   medya_tipi: 'video' | 'foto',
 *   kapak: { url, tip: 'video'|'gorsel' },
 *   diger: [{ url, tip }],
 *   baslik: string,
 *   spot_baslik: string,  // kayserim için
 *   kategori: string,     // kayserim için
 *   tarih: string,
 *   source_id: string,
 * }
 */

const KAPAK_SABLON = {
  kayserim: {
    video: '83f5dad5-6c5b-4365-8e99-3a1b0e09c1ba',
    foto:  'a5c30525-fd42-4a19-9fe5-2703e9f98753',
  },
  radar: {
    video: '6d6855af-c990-4976-80c2-5e858bc3b0ff',
    foto:  '7edeb24b-3ecc-47b7-9d1d-0ad32ea553af',
  },
}

const GALERI_SABLON = {
  kayserim: {
    foto:  'c6851b61-3d03-4959-a3ea-892d851d1b25',
    video: '7edeb24b-3ecc-47b7-9d1d-0ad32ea553af',
  },
  radar: {
    foto:  'fbded9e2-2538-4045-80d6-6df2c8c60a94',
    video: '4554643a-6222-4e00-9387-6264c33a3eee',
  },
}

const tarihStr = () => {
  const now = new Date()
  return `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`
}

const bekle = async (renderId, apiKey, max=20) => {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const res  = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    const data = await res.json()
    const r    = Array.isArray(data) ? data[0] : data
    if (r.status === 'succeeded') return r.url
    if (r.status === 'failed')    return null
  }
  return null
}

const renderBaslat = async (templateId, modifications, apiKey, fmt='png') => {
  const res = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ template_id: templateId, output_format: fmt, modifications }),
  })
  const data = await res.json()
  const r    = Array.isArray(data) ? data[0] : data
  if (!r.id) return null
  return bekle(r.id, apiKey)
}

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token') || request.headers.get('X-API-Key')
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })

  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici && token !== env.RSS_API_KEY)
    return Response.json({ hata: 'Geçersiz token' }, { status: 401 })

  if (!env.CREATOMATE_API_KEY)
    return Response.json({ hata: 'Creatomate API key yok' }, { status: 500 })

  try {
    const {
      kaynak = 'kayserim',
      medya_tipi = 'foto',
      kapak,
      diger = [],
      baslik = '',
      spot_baslik = '',
      kategori = 'GÜNCEL',
      tarih,
      source_id,
    } = await request.json()

    if (!kapak?.url) return Response.json({ hata: 'kapak.url gerekli' }, { status: 400 })

    const apiKey     = env.CREATOMATE_API_KEY
    const tarihYazi  = tarih || tarihStr()
    const kapakTpl   = KAPAK_SABLON[kaynak]?.[medya_tipi] || KAPAK_SABLON[kaynak]?.foto
    const kapakFmt   = medya_tipi === 'video' ? 'mp4' : 'png'

    // ── 1. Kapak render ────────────────────────────────────────────
    const kapakMods = kaynak === 'kayserim'
      ? {
          'video.source':       kapak.url,
          'baslik.text':        baslik,
          'baslikss.text':      baslik,
          'spot-baslik.text':   spot_baslik,
          'spot-baslik-ss.text': spot_baslik,
          'kategori.text':      kategori,
          'tarih.text':         tarihYazi,
        }
      : {
          'video.source':   kapak.url,
          'baslik.text':    baslik,
          'baslik-X6C.text': baslik,
          'tarih.text':     tarihYazi,
        }

    // ── 2. Diğer görseller (paralel) ───────────────────────────────
    const [kapakUrl, ...digerleri] = await Promise.all([
      renderBaslat(kapakTpl, kapakMods, apiKey, kapakFmt),
      ...diger.map(g => {
        const gTpl = GALERI_SABLON[kaynak]?.[g.tip === 'video' ? 'video' : 'foto']
        const gFmt = g.tip === 'video' ? 'mp4' : 'png'
        return renderBaslat(gTpl, {
          '16dbfe06-e201-4aa4-887b-f166f95832af': g.url,
        }, apiKey, gFmt)
      }),
    ])

    const sonuc = {
      kapak: { kaynak_url: kapak.url, render_url: kapakUrl, tip: medya_tipi },
      diger: diger.map((g, i) => ({ kaynak_url: g.url, render_url: digerleri[i] })),
    }

    // KV'ye kaydet
    if (source_id && env.HABERLER) {
      try {
        await env.HABERLER.put(
          `galeri_olustur:${source_id}`,
          JSON.stringify(sonuc),
          { expirationTtl: 60 * 60 * 24 * 30 }
        )
      } catch(e) {}
    }

    return Response.json({ ok: true, sonuc })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
