export async function onRequestPost({ request, env }) {
  try {
    const { video_url, baslik, spot, kategori, tarih, source_id } = await request.json()
    if (!video_url) return Response.json({ hata: 'video_url gerekli' }, { status: 400 })

    const apiKey = env.CREATOMATE_API_KEY
    if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

    const tarihStr  = tarih    || new Date().toLocaleDateString('tr-TR')
    const katStr    = (kategori || 'GÜNCEL').toUpperCase()
    const baslikStr = (baslik   || '').slice(0, 120)
    const spotStr   = (spot     || '').slice(0, 120)

    const source = {
      output_format: 'mp4',
      width:  1080,
      height: 1920,
      elements: [
        // Arka plan video
        {
          type: 'video',
          source: video_url,
          fit: 'cover',
        },
        // Alt koyu overlay
        {
          type: 'shape',
          shape: 'rectangle',
          x: '0%', y: '55%',
          width: '100%', height: '45%',
          fill_color: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 100%)',
        },
        // Üst kırmızı bant
        {
          type: 'shape',
          shape: 'rectangle',
          x: '0%', y: '0%',
          width: '100%', height: 130,
          fill_color: '#ED1C24',
        },
        // Logo
        {
          type: 'text',
          text: 'kayserim',
          x: '50%', y: 65,
          font_family: 'Montserrat',
          font_weight: '700',
          font_size: 44,
          fill_color: '#ffffff',
          x_anchor: 'center',
          y_anchor: 'center',
        },
        // Kategori (sağ üst)
        {
          type: 'text',
          text: katStr,
          x: '95%', y: 160,
          font_family: 'Montserrat',
          font_weight: '700',
          font_size: 28,
          fill_color: '#ffffff',
          background_color: '#ED1C24',
          background_x_padding: '20%',
          background_y_padding: '15%',
          background_border_radius: 6,
          x_anchor: 'right',
          y_anchor: 'center',
        },
        // Tarih (sağ üst, kategori altında)
        {
          type: 'text',
          text: tarihStr,
          x: '95%', y: 210,
          font_family: 'Open Sans',
          font_size: 24,
          fill_color: 'rgba(255,255,255,0.85)',
          x_anchor: 'right',
          y_anchor: 'center',
        },
        // Sol şerit
        {
          type: 'shape',
          shape: 'rectangle',
          x: 0, y: 1480,
          width: 8, height: 260,
          fill_color: '#ED1C24',
        },
        // Başlık
        {
          type: 'text',
          text: baslikStr,
          x: 24, y: 1490,
          width: 1032,
          font_family: 'Montserrat',
          font_weight: '700',
          font_size: 56,
          fill_color: '#ffffff',
          x_anchor: 'left',
          y_anchor: 'top',
          text_wrap: true,
          line_height: 1.3,
        },
        // Spot
        ...(spotStr ? [{
          type: 'text',
          text: spotStr,
          x: 24, y: 1760,
          width: 1032,
          font_family: 'Open Sans',
          font_size: 32,
          fill_color: 'rgba(255,255,255,0.9)',
          background_color: 'rgba(237,28,36,0.38)',
          background_x_padding: '6%',
          background_y_padding: '10%',
          x_anchor: 'left',
          y_anchor: 'top',
          text_wrap: true,
          line_height: 1.4,
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
