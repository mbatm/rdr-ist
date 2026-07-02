// GET /api/youtube-durum
// YouTube OAuth token durumu — sır döndürmez, sadece sağlık raporu.
export async function onRequestGet({ request, env }) {
  const ref = request.headers.get('referer') || ''
  const key = new URL(request.url).searchParams.get('secret') || ''
  if (key !== env.RSS_API_KEY && !ref.includes('rdr.ist'))
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const t = await env.HABERLER.get('youtube_tokens', 'json')
  if (!t) {
    return Response.json({
      ok: false, token_var: false,
      mesaj: 'YouTube token yok. Yetkilendirme için: https://rdr.ist/api/youtube-auth',
      client_id_var: !!env.YOUTUBE_CLIENT_ID,
      client_secret_var: !!env.YOUTUBE_CLIENT_SECRET,
    })
  }
  return Response.json({
    ok: true, token_var: true,
    refresh_token_var: !!t.refresh_token,
    access_token_var: !!t.access_token,
    kayit_zamani: t.kayit || t.zaman || null,
    client_id_var: !!env.YOUTUBE_CLIENT_ID,
    client_secret_var: !!env.YOUTUBE_CLIENT_SECRET,
  })
}
