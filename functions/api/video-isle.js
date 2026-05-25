export async function onRequestPost({ request, env }) {
  try {
    const { video_url, baslik, spot, kategori, tarih } = await request.json()
    if (!video_url) return Response.json({ hata: 'video_url gerekli' }, { status: 400 })

    const apiKey = env.CREATOMATE_API_KEY
    if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

    const tarihStr  = tarih    || new Date().toLocaleDateString('tr-TR')
    const katStr    = (kategori || 'GÜNCEL').toUpperCase()
    const baslikStr = (baslik   || '').slice(0, 100)
    const spotStr   = (spot     || '').slice(0, 120)

    const source = {
      output_format: 'mp4',
      width:  1080,
      height: 1920,
      elements: [
        // 1. Arka plan video
        {
          type: 'video',
          source: video_url,
          fit: 'cover',
          x: 540, y: 960,
          width: 1080, height: 1920,
          x_anchor: 'center', y_anchor: 'center',
        },
        // 2. Alt koyu overlay (solid)
        {
          type: 'shape', shape: 'rectangle',
          x: 0, y: 960, width: 1080, height: 960,
          x_anchor: 'left', y_anchor: 'top',
          fill_color: 'rgba(0,0,0,0.75)',
          opacity: 0.8,
        },
        // 3. Üst kırmızı bant
        {
          type: 'shape', shape: 'rectangle',
          x: 0, y: 0, width: 1080, height: 130,
          x_anchor: 'left', y_anchor: 'top',
          fill_color: '#ED1C24',
        },
        // 4. Logo
        {
          type: 'text', text: 'kayserim',
          x: 540, y: 65,
          font_family: 'Montserrat', font_weight: '700',
          font_size: 44, fill_color: '#ffffff',
          x_anchor: 'center', y_anchor: 'center',
        },
        // 5. Kategori badge (sağda, logo altında)
        {
          type: 'text', text: katStr,
          x: 1032, y: 155,
          font_family: 'Montserrat', font_weight: '700',
          font_size: 26, fill_color: '#ffffff',
          background_color: '#ED1C24',
          x_anchor: 'right', y_anchor: 'center',
        },
        // 6. Tarih (kategori altında, sağda)
        {
          type: 'text', text: tarihStr,
          x: 1032, y: 200,
          font_family: 'Open Sans', font_size: 22,
          fill_color: 'rgba(255,255,255,0.85)',
          x_anchor: 'right', y_anchor: 'center',
        },
        // 7. Sol şerit
        {
          type: 'shape', shape: 'rectangle',
          x: 0, y: 1400, width: 8, height: 300,
          x_anchor: 'left', y_anchor: 'top',
          fill_color: '#ED1C24',
        },
        // 8. Başlık
        {
          type: 'text', text: baslikStr,
          x: 24, y: 1410, width: 1032,
          font_family: 'Montserrat', font_weight: '700',
          font_size: 54, fill_color: '#ffffff',
          x_anchor: 'left', y_anchor: 'top',
          text_wrap: true, line_height: 1.3,
        },
        // 9. Spot (varsa)
        ...(spotStr ? [{
          type: 'text', text: spotStr,
          x: 24, y: 1710, width: 1032,
          font_family: 'Open Sans', font_size: 30,
          fill_color: 'rgba(255,255,255,0.92)',
          background_color: 'rgba(237,28,36,0.4)',
          x_anchor: 'left', y_anchor: 'top',
          text_wrap: true, line_height: 1.4,
        }] : []),
      ],
    }

    const res = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ source }),
    })

    const data = await res.json()
    if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })

    const render = Array.isArray(data) ? data[0] : data
    return Response.json({ ok: true, render_id: render.id, status: render.status })

  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
