/**
 * POST /api/meta-system-token
 * System User token'ını KV'ye kaydeder
 * Body: { token: "...", api_key: "..." }
 * 
 * Bu endpoint ile kişisel FB hesabına gerek kalmadan
 * System User token'ı direkt kaydedilir.
 */
export async function onRequestPost({ request, env }) {
  const { token } = await request.json()

  if (!token) return Response.json({ hata: 'token gerekli' }, { status: 400 })

  // Token ile sayfa listesini çek
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture&limit=100&access_token=${token}`
  )
  const pagesData = await pagesRes.json()

  if (pagesData.error) {
    return Response.json({ hata: pagesData.error.message }, { status: 400 })
  }

  const pages = pagesData.data || []
  if (!pages.length) return Response.json({ hata: 'Hiç sayfa bulunamadı' }, { status: 400 })

  // Her sayfa için token'ı direkt çek (System User token ile)
  const hesaplar = []
  for (const page of pages) {
    // Sayfa token'ını System User token ile yenile
    const ptRes  = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=access_token&access_token=${token}`
    )
    const ptData = await ptRes.json()
    const pageToken = ptData.access_token || token

    const igRes  = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${pageToken}`
    )
    const igData = await igRes.json()
    const ig     = igData.instagram_business_account || null

    hesaplar.push({
      page_id:     page.id,
      page_name:   page.name,
      page_token:  pageToken,
      picture:     page.picture?.data?.url || null,
      ig_id:       ig?.id || null,
      ig_username: ig?.username || null,
      ig_picture:  ig?.profile_picture_url || null,
      eklendi:     new Date().toISOString(),
    })
  }

  // KV'ye kaydet
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  meta.hesaplar   = hesaplar
  meta.system_token = token   // System User token (kişisel hesap token değil)
  meta.kaydedildi = new Date().toISOString()
  await env.HABERLER.put('meta_tokens', JSON.stringify(meta))

  const ozet = hesaplar.map(h => `${h.page_name}${h.ig_id ? ` + @${h.ig_username}` : ''}`).join(', ')

  return Response.json({
    ok: true,
    mesaj: `${hesaplar.length} hesap kaydedildi`,
    hesaplar: ozet
  })
}
