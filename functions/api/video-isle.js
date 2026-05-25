/**
 * POST /api/video-isle
 * Creatomate ile video branding — kayserim şablonuna göre
 */
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

    const template = {
      output_format: 'mp4',
      width:  1080,
      height: 1920,
      frame_rate: 30,
      elements: [
        // ── Arka plan video ───────────────────────────────────────────────
        {
          id:     'video_bg',
          type:   'video',
          source: video_url,
          fit:    'cover',
          x: '50%', y: '50%',
          width: '100%', height: '100%',
          time: 0, duration: 'auto',
        },

        // ── Alt gradient overlay ──────────────────────────────────────────
        {
          type: 'shape', shape: 'rectangle',
          x: '50%', y: '100%', width: '100%', height: '75%',
          y_anchor: 'bottom',
          fill_color: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
          time: 0, duration: 'auto',
        },

        // ── Üst kırmızı bant ─────────────────────────────────────────────
        {
          type: 'shape', shape: 'rectangle',
          x: '50%', y: 0, width: '100%', height: 140,
          y_anchor: 'top',
          fill_color: 'linear-gradient(to right, #ED1C24 0%, #670000 100%)',
          time: 0, duration: 'auto',
        },

        // ── Logo: kayserim ────────────────────────────────────────────────
        {
          type: 'text', text: 'kayserim',
          x: '50%', y: 70,
          font_family: 'Poppins', font_weight: '700',
          font_size: 46, fill_color: '#ffffff',
          x_anchor: 'center', y_anchor: 'center',
          letter_spacing: 1,
          time: 0, duration: 'auto',
        },

        // ── Kategori badge (bandın hemen altında) ─────────────────────────
        {
          type: 'text', text: katStr,
          x: 54, y: 168,
          font_family: 'Poppins', font_weight: '700',
          font_size: 30, fill_color: '#ffffff',
          background_color: '#ED1C24',
          background_x_padding: '22%',
          background_y_padding: '18%',
          background_border_radius: 8,
          x_anchor: 'left', y_anchor: 'center',
          // Animasyon: soldan kayarak gelir
          animations: [{ time: 0.3, duration: 0.5, easing: 'ease-out', type: 'slide', direction: 'left', distance: '50%' }],
          time: 0, duration: 'auto',
        },

        // ── Tarih (sağda, badge ile aynı hizada) ─────────────────────────
        {
          type: 'text', text: tarihStr,
          x: 1026, y: 168,
          font_family: 'Open Sans', font_weight: '400',
          font_size: 28, fill_color: 'rgba(255,255,255,0.85)',
          x_anchor: 'right', y_anchor: 'center',
          // Animasyon: sağdan kayarak gelir
          animations: [{ time: 0.3, duration: 0.5, easing: 'ease-out', type: 'slide', direction: 'right', distance: '50%' }],
          time: 0, duration: 'auto',
        },

        // ── Sol kırmızı şerit ─────────────────────────────────────────────
        {
          type: 'shape', shape: 'rectangle',
          x: 46, y: 1540,
          width: 8, height: baslikStr.length > 40 ? 260 : 200,
          y_anchor: 'top',
          fill_color: '#ED1C24',
          // Animasyon: aşağıdan yukarı büyür
          animations: [{ time: 0.5, duration: 0.6, easing: 'ease-out', type: 'wipe', direction: 'top' }],
          time: 0, duration: 'auto',
        },

        // ── Başlık ────────────────────────────────────────────────────────
        {
          type: 'text', text: baslikStr,
          x: 70, y: 1560,
          width: 960, height: 320,
          font_family: 'Poppins', font_weight: '600',
          font_size: 58, fill_color: '#ffffff',
          x_anchor: 'left', y_anchor: 'top',
          text_wrap: true, line_height: 1.3,
          shadow_color: 'rgba(0,0,0,0.9)',
          shadow_blur: 12, shadow_offset: [0, 2],
          // Animasyon: alttan yukarı fade
          animations: [{ time: 0.6, duration: 0.7, easing: 'ease-out', type: 'text-slide', direction: 'up', scope: 'line', split: 'line' }],
          time: 0, duration: 'auto',
        },

        // ── Spot başlık (highlight efekti) ───────────────────────────────
        ...(spotStr ? [{
          type: 'text', text: spotStr,
          x: 70, y: 1820,
          width: 960, height: 160,
          font_family: 'Open Sans', font_weight: '400',
          font_size: 32, fill_color: 'rgba(255,255,255,0.92)',
          background_color: 'rgba(237,28,36,0.38)',
          background_x_padding: '8%',
          background_y_padding: '12%',
          background_border_radius: 4,
          x_anchor: 'left', y_anchor: 'top',
          text_wrap: true, line_height: 1.4,
          // Animasyon: fade in
          animations: [{ time: 0.9, duration: 0.6, easing: 'ease-out', type: 'fade' }],
          time: 0, duration: 'auto',
        }] : []),
      ],
    }

    const res = await fetch('https://api.creatomate.com/v1/renders', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ source: template }),
    })

    const data = await res.json()
    if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })

    const render = Array.isArray(data) ? data[0] : data
    return Response.json({ ok: true, render_id: render.id, status: render.status })

  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
