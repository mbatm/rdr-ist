/**
 * GET  /api/kullanicilar         → kullanıcı listesi (admin)
 * POST /api/kullanicilar         → { islem:'ekle'|'sil'|'guncelle', kullanici, sifre, rol, ad }
 */
const USERS_KEY = 'cms_users'

async function adminKontrol(request, env) {
  const token = request.headers.get('X-Token') || new URL(request.url).searchParams.get('token')
  if (!token) return false
  const data = await env.HABERLER.get(`token:${token}`, 'json')
  return data?.rol === 'admin'
}

export async function onRequestGet({ request, env }) {
  if (!await adminKontrol(request, env))
    return Response.json({ hata: 'Yetkisiz erişim' }, { status: 403 })

  const users = await env.HABERLER.get(USERS_KEY, 'json') || {}
  const liste = Object.entries(users).map(([k,v]) => ({
    kullanici: k, rol: v.rol, ad: v.ad
  }))
  return Response.json(liste)
}

export async function onRequestPost({ request, env }) {
  if (!await adminKontrol(request, env))
    return Response.json({ hata: 'Yetkisiz erişim' }, { status: 403 })

  try {
    const { islem, kullanici, sifre, rol, ad } = await request.json()
    const users = await env.HABERLER.get(USERS_KEY, 'json') || {}

    if (islem === 'ekle' || islem === 'guncelle') {
      if (!kullanici || !sifre) return Response.json({ hata: 'kullanici ve sifre zorunlu' }, { status: 400 })
      users[kullanici] = { sifre, rol: rol||'editor', ad: ad||kullanici }
    } else if (islem === 'sil') {
      if (kullanici === 'admin') return Response.json({ hata: 'Admin silinemez' }, { status: 400 })
      delete users[kullanici]
    } else {
      return Response.json({ hata: 'Geçersiz işlem' }, { status: 400 })
    }

    await env.HABERLER.put(USERS_KEY, JSON.stringify(users))
    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
