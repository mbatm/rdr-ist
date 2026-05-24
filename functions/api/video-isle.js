/**
 * POST /api/video-isle
 * Body: { video_url, baslik, kategori, tarih, source_id }
 * Creatomate'e render gönderir, render_id döner
 */
export async function onRequestPost({ request, env }) {
  try {
    const { video_url, baslik, kategori, tarih, source_id } = await request.json()
    if (!video_url) return Response.json({ hata: 'video_url gerekli' }, { status: 400 })

    const apiKey = env.CREATOMATE_API_KEY
    if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

    const tarihStr = tarih || new Date().toLocaleDateString('tr-TR')
    const katStr   = (kategori || 'GÜNCEL').toUpperCase()

    // Video template — kayserim branding
    const template = {
      output_format: 'mp4',
      width:  1080,
      height: 1920,
      frame_rate: 30,
      elements: [
        // 1. Ham video — arka plan
        {
          id:     'video',
          type:   'video',
          source: video_url,
          fit:    'cover',
          x:      '50%',
          y:      '50%',
          width:  '100%',
          height: '100%',
        },
        // 2. Alt gradient overlay
        {
          type:         'shape',
          shape:        'rectangle',
          x:            '50%',
          y:            '100%',
          width:        '100%',
          height:       '60%',
          y_anchor:     'bottom',
          fill_color:   'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)',
        },
        // 3. Üst kırmızı bant
        {
          type:       'shape',
          shape:      'rectangle',
          x:          '50%',
          y:          '0%',
          width:      '100%',
          height:     130,
          y_anchor:   'top',
          fill_color: 'linear-gradient(to right, #ED1C24, #670000)',
        },
        // 4. Logo metni
        {
          type:            'text',
          text:            'kayserim',
          x:               '50%',
          y:               65,
          font_family:     'Poppins',
          font_weight:     '700',
          font_size:       42,
          fill_color:      '#ffffff',
          x_anchor:        'center',
          y_anchor:        'center',
          letter_spacing:  1,
        },
        // 5. Kategori badge
        {
          type:        'text',
          text:        katStr,
          x:           50,
          y:           1700,
          width:       250,
          height:      60,
          font_family: 'Poppins',
          font_weight: '700',
          font_size:   28,
          fill_color:  '#ffffff',
          background_color: '#ED1C24',
          background_x_padding: '20%',
          background_y_padding: '15%',
          background_border_radius: 8,
          x_anchor:    'left',
          y_anchor:    'center',
        },
        // 6. Tarih
        {
          type:        'text',
          text:        tarihStr,
          x:           1030,
          y:           1700,
          font_family: 'Open Sans',
          font_weight: '400',
          font_size:   28,
          fill_color:  'rgba(255,255,255,0.82)',
          x_anchor:    'right',
          y_anchor:    'center',
        },
        // 7. Sol kırmızı şerit
        {
          type:       'shape',
          shape:      'rectangle',
          x:          46,
          y:          1760,
          width:      6,
          height:     200,
          y_anchor:   'top',
          fill_color: '#ED1C24',
        },
        // 8. Başlık
        {
          type:          'text',
          text:          (baslik || '').slice(0, 120),
          x:             70,
          y:             1760,
          width:         960,
          height:        250,
          font_family:   'Poppins',
          font_weight:   '600',
          font_size:     52,
          fill_color:    '#ffffff',
          x_anchor:      'left',
          y_anchor:      'top',
          text_wrap:     true,
          line_height:   1.3,
          shadow_color:  'rgba(0,0,0,0.9)',
          shadow_blur:   10,
          shadow_offset: [0, 2],
        },
      ],
    }

    const res = await fetch('https://api.creatomate.com/v1/renders', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        source: JSON.stringify(template),
        metadata: source_id || '',
      }),
    })
    const data = await res.json()

    if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })

    const render = Array.isArray(data) ? data[0] : data
    return Response.json({
      ok:        true,
      render_id: render.id,
      status:    render.status,
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
