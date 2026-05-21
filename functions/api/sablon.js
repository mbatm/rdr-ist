/**
 * GET  /api/sablon?id=instagram  → template JSON döner
 * POST /api/sablon               → template JSON kaydeder
 */
const VARSAYILAN = {
  version: '2.0',
  guncellendi: null,
  overlay: { renk: 'rgba(0,0,0,0)', aktif: true },
  gradient: { aktif: true, yon: 'bottom', baslangic: 'rgba(0,0,0,0)', bitis: 'rgba(0,0,0,0.88)' },
  elementler: [
    { id:'ustBant',    tip:'rect',  etiket:'Üst bant',     x:0,     y:0,     w:1,     h:0.065, renk:'#D63031', opaklık:1,   kilitli:false },
    { id:'altBant',    tip:'rect',  etiket:'Alt bant',     x:0,     y:0.935, w:1,     h:0.065, renk:'#D63031', opaklık:1,   kilitli:false },
    { id:'solSerit',   tip:'rect',  etiket:'Sol şerit',    x:0.038, y:0.62,  w:0.005, h:0.22,  renk:'#D63031', opaklık:1,   kilitli:false },
    { id:'mSimge',     tip:'logo',  etiket:'M simgesi',    x:0.035, y:0.008, w:0.05,  h:0.05,  src:'icon',     kilitli:false },
    { id:'kayserimLogo',tip:'logo', etiket:'kayserim logo',x:0.82,  y:0.01,  w:0.15,  h:0.045, src:'beyaz',    kilitli:false },
    { id:'anaBaslik',  tip:'metin', etiket:'Ana başlık',   x:0.055, y:0.63,  w:0.91,  alan:'sosyal_baslik', boyut:0.046, agirlik:'700', renk:'#ffffff', golge:true, satirSayisi:3 },
    { id:'spotBaslik', tip:'metin', etiket:'Spot başlık',  x:0.055, y:0.80,  w:0.91,  alan:'ozet',          boyut:0.026, agirlik:'400', renk:'rgba(255,255,255,0.85)', golge:true, satirSayisi:2 },
    { id:'kategori',   tip:'badge', etiket:'Kategori',     x:0.038, y:0.945, bgRenk:'#D63031', metinRenk:'#fff', boyut:0.018, alan:'kategori' },
    { id:'tarih',      tip:'tarih', etiket:'Tarih',        x:0.962, y:0.948, renk:'rgba(255,255,255,0.82)', boyut:0.018, hizalama:'sag' },
  ]
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const id = url.searchParams.get('id') || 'varsayilan'
    const raw = await env.HABERLER.get(`sablon_${id}`, 'json')
    return Response.json(raw || VARSAYILAN, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (request.method === 'POST') {
    const data = await request.json()
    const id   = data.id || 'varsayilan'
    data.guncellendi = new Date().toISOString()
    await env.HABERLER.put(`sablon_${id}`, JSON.stringify(data))
    return Response.json({ ok: true, id })
  }

  return new Response('Method not allowed', { status: 405 })
}
