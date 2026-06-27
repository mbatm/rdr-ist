/**
 * POST /api/auth   → { kullanici, sifre } → token döner
 * GET  /api/auth   → token kontrol
 */
const USERS_KEY = 'cms_users'

export async function onRequestPost({ request, env }) {
  try {
    const { kullanici, sifre } = await request.json()
    const users = await env.HABERLER.get(USERS_KEY, 'json') || {}

    // İlk kurulum: admin yoksa oluştur
    if (Object.keys(users).length === 0) {
      users['admin'] = { sifre: 'radar2024', rol: 'admin', ad: 'Admin' }
      await env.HABERLER.put(USERS_KEY, JSON.stringify(users))
    }

    const user = users[kullanici]
    if (!user || user.sifre !== sifre) {
      return Response.json({ hata: 'Kullanıcı adı veya şifre yanlış' }, { status: 401 })
    }

    // Token verisi — modül yetkileri dahil
    const tokenData = {
      kullanici,
      rol:              user.rol,
      ad:               user.ad,
      sayfalar:         user.sayfalar || null,
      modul_kayserim:   user.modul_kayserim  !== false,
      modul_kayseradar: user.modul_kayseradar !== false,
      modul_reklam:     user.modul_reklam    !== false,
      modul_manuel:     user.modul_manuel    !== false,
      modul_galeri:     user.modul_galeri    !== false,
      modul_zeka:       user.modul_zeka      !== false,
      modul_kesfet:     user.modul_kesfet    !== false,
      modul_yonetim:    user.modul_yonetim   !== false,
    }

    const token = btoa(`${kullanici}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
    await env.HABERLER.put(`token:${token}`, JSON.stringify(tokenData), { expirationTtl: 86400 })

    return Response.json({ ok: true, token, ...tokenData })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return Response.json({ gecerli: false })
  const data = await env.HABERLER.get(`token:${token}`, 'json')
  return Response.json(data ? { gecerli: true, ...data } : { gecerli: false })
}
