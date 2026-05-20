/**
 * GET /api/gorsel-proxy?url=https://service.1ha.com.tr/...
 * 1ha ve diğer haber görsellerini CORS engeli olmadan Canvas'a yükler
 */
export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response('url parametresi gerekli', { status: 400 })
  }

  // Güvenlik: sadece bilinen kaynaklara izin ver
  const allowed = [
    'service.1ha.com.tr',
    '1ha.com.tr',
  ]
  const hostname = new URL(imageUrl).hostname
  if (!allowed.some(h => hostname === h || hostname.endsWith('.' + h))) {
    return new Response('Kaynak izin verilmiyor', { status: 403 })
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'rdr.ist/1.0' },
    })

    if (!response.ok) {
      return new Response(`Görsel alınamadı: HTTP ${response.status}`, { status: 502 })
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(`Hata: ${err.message}`, { status: 500 })
  }
}
