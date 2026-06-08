/**
 * /api/kayserim-api?endpoint=<path>
 * kayserim.net Daktilo API proxy — GET ve POST destekli
 * 
 * Özel endpoint: ?endpoint=link-bul&slug=<url_slug>
 * → sitede yayınlanan haberin URL'sini döndürür
 */

const DAKTILO_KEY = '5925200cf4f21521b33d5b3b213c651f'
const DAKTILO_BASE = 'https://www.kayserim.net/api/v1'

async function daktilo(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${DAKTILO_KEY}`,
      'Content-Type': 'application/json',
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${DAKTILO_BASE}/${path}`, opts)
  return res.json()
}

export async function onRequestGet({ request }) {
  const url      = new URL(request.url)
  const endpoint = url.searchParams.get('endpoint') || 'info'
  const slug     = url.searchParams.get('slug') || ''

  // Özel: slug ile link bul
  if (endpoint === 'link-bul' && slug) {
    try {
      // Arama ile dene
      const aramaData = await daktilo('search', 'POST', { query: slug })
      const haberler  = aramaData?.data?.entries || aramaData?.data || []

      // Slug veya URL içinde eşleşen ilk haberi bul
      const bulunan = haberler.find(h =>
        h.url?.includes(slug) ||
        h.slug === slug ||
        h.title?.toLowerCase().includes(slug.replace(/-/g,' ').substring(0, 20))
      )

      if (bulunan?.url) {
        return Response.json({ ok: true, url: bulunan.url, baslik: bulunan.title })
      }

      // Bulunamadı — son haberlerde ara
      const posts = await daktilo('posts?take=50&page=1')
      const entries = posts?.data?.entries || []
      const eslesen = entries.find(h => h.url?.includes(slug) || h.slug === slug)

      if (eslesen?.url) {
        return Response.json({ ok: true, url: eslesen.url, baslik: eslesen.title })
      }

      return Response.json({ ok: false, mesaj: 'Haber bulunamadı', slug })
    } catch(e) {
      return Response.json({ ok: false, hata: e.message })
    }
  }

  // Normal endpoint proxy
  try {
    const data = await daktilo(endpoint)
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch(e) {
    return Response.json({ error: true, message: e.message }, { status: 500 })
  }
}

export async function onRequestPost({ request }) {
  const url      = new URL(request.url)
  const endpoint = url.searchParams.get('endpoint') || 'search'
  const body     = await request.json().catch(() => ({}))

  try {
    const data = await daktilo(endpoint, 'POST', body)
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch(e) {
    return Response.json({ error: true, message: e.message }, { status: 500 })
  }
}
