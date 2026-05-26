/**
 * GET  /api/kullanicilar         → kullanıcı listesi (admin)
 * POST /api/kullanicilar         → { islem:'ekle'|'sil'|'guncelle', kullanici, sifre, rol, ad }
 */
const USERS_KEY = 'cms_users'

export async function onRequestGet({ request, env }) {
  const users = await env.HABERLER.get(USERS_KEY, 'json') || {}
  // Şifreleri gizle
  const liste = Object.entries(users).map(([k,v]) => ({
    kullanici: k, rol: v.rol, ad: v.ad
  }))
  return Response.json(liste)
}

export async function onRequestPost({ request, env }) {
  try {
    const { islem, kullanici, sifre, rol, ad } = await request.json()
    const users = await env.HABERLER.get(USERS_KEY, 'json') || {}

    if (islem === 'ekle' || islem === 'guncelle') {
      users[kullanici] = { sifre, rol: rol||'editor', ad: ad||kullanici }
    } else if (islem === 'sil') {
      delete users[kullanici]
    }

    await env.HABERLER.put(USERS_KEY, JSON.stringify(users))
    return Response.json({ ok: true })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
