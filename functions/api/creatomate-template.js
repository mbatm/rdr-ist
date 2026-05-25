/**
 * GET /api/creatomate-template
 * Creatomate'te kayserim video template'ini oluşturur/günceller
 * Bir kez çalıştırın, template_id'yi video-isle.js'e yazın
 */
export async function onRequestGet({ env }) {
  const apiKey = env.CREATOMATE_API_KEY
  if (!apiKey) return Response.json({ hata: 'CREATOMATE_API_KEY eksik' }, { status: 500 })

  const source = {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    frame_rate: 30,
    elements: [
      // 1. Arka plan video
      {
        name: 'Video-BG',
        type: 'video',
        track: 1,
        source: 'https://cdn.1ha.com.tr/haberler/tmp-1779096804719/1779096810886-0518.mp4',
        fit: 'cover',
        width: '100%',
        height: '100%',
        x: '50%',
        y: '50%',
        x_anchor: '50%',
        y_anchor: '50%',
      },
      // 2. Alt siyah overlay
      {
        name: 'Overlay',
        type: 'shape',
        track: 2,
        shape: 'rectangle',
        width: '100%',
        height: '55%',
        x: '0%',
        y: '100%',
        x_anchor: '0%',
        y_anchor: '100%',
        fill_color: 'rgba(0,0,0,0.82)',
      },
      // 3. Üst kırmızı bant
      {
        name: 'Top-Band',
        type: 'shape',
        track: 3,
        shape: 'rectangle',
        width: '100%',
        height: '130px',
        x: '0%',
        y: '0%',
        x_anchor: '0%',
        y_anchor: '0%',
        fill_color: '#ED1C24',
      },
      // 4. Logo
      {
        name: 'Logo',
        type: 'text',
        track: 4,
        text: 'kayserim',
        width: '100%',
        height: '130px',
        x: '0%',
        y: '0%',
        x_anchor: '0%',
        y_anchor: '0%',
        x_alignment: '50%',
        y_alignment: '50%',
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: '44px',
        fill_color: '#FFFFFF',
      },
      // 5. Kategori badge (sağ, logo altında)
      {
        name: 'Kategori',
        type: 'text',
        track: 5,
        text: 'GÜNCEL',
        width: 'auto',
        height: 'auto',
        x: '94%',
        y: '8%',
        x_anchor: '100%',
        y_anchor: '50%',
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: '26px',
        fill_color: '#FFFFFF',
        background_color: '#ED1C24',
        background_border_radius: '6px',
        x_padding: '16px',
        y_padding: '8px',
      },
      // 6. Tarih (kategori altında, sağda)
      {
        name: 'Tarih',
        type: 'text',
        track: 6,
        text: '25.05.2026',
        width: 'auto',
        height: 'auto',
        x: '94%',
        y: '11%',
        x_anchor: '100%',
        y_anchor: '50%',
        font_family: 'Open Sans',
        font_weight: '400',
        font_size: '22px',
        fill_color: 'rgba(255,255,255,0.85)',
      },
      // 7. Sol kırmızı şerit
      {
        name: 'Sol-Serit',
        type: 'shape',
        track: 7,
        shape: 'rectangle',
        width: '8px',
        height: '320px',
        x: '0px',
        y: '74%',
        x_anchor: '0%',
        y_anchor: '0%',
        fill_color: '#ED1C24',
      },
      // 8. Başlık
      {
        name: 'Baslik',
        type: 'text',
        track: 8,
        text: 'Haber başlığı bu alana gelecek',
        width: '960px',
        height: 'auto',
        x: '24px',
        y: '75%',
        x_anchor: '0%',
        y_anchor: '0%',
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: '54px',
        fill_color: '#FFFFFF',
        line_height: '130%',
      },
      // 9. Spot başlık
      {
        name: 'Spot',
        type: 'text',
        track: 9,
        text: 'Spot başlık metni bu alana gelecek',
        width: '960px',
        height: 'auto',
        x: '24px',
        y: '88%',
        x_anchor: '0%',
        y_anchor: '0%',
        font_family: 'Open Sans',
        font_weight: '400',
        font_size: '30px',
        fill_color: 'rgba(255,255,255,0.92)',
        background_color: 'rgba(237,28,36,0.40)',
        background_border_radius: '4px',
        x_padding: '10px',
        y_padding: '6px',
        line_height: '140%',
      },
    ],
  }

  // Yeni template oluştur
  const res = await fetch('https://api.creatomate.com/v1/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: 'kayserim-video',
      source: JSON.stringify(source),
    }),
  })

  const data = await res.json()
  if (!res.ok) return Response.json({ hata: JSON.stringify(data) }, { status: 500 })

  return Response.json({
    tamam: true,
    template_id: data.id,
    mesaj: `Template oluşturuldu! video-isle.js'de template_id'yi "${data.id}" ile değiştirin.`,
  })
}
