/**
 * GET /api/meta-callback?code=...
 * Facebook OAuth callback — hesapları KV'ye kaydeder (mevcut hesaplarla birleştirir)
 */
export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return new Response(`Meta yetkilendirme hatası: ${error || 'code yok'}`, { status: 400 })
  }

  const appId     = env.META_APP_ID
  const appSecret = env.META_APP_SECRET

  // 1. Kısa ömürlü token
  const tokenRes  = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({
    client_id: appId, client_secret: appSecret,
    redirect_uri: 'https://rdr.ist/api/meta-callback', code,
  }))
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return new Response(`Token hatası: ${JSON.stringify(tokenData)}`, { status: 500 })

  // 2. Uzun ömürlü token (60 gün)
  const longRes  = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({
    grant_type: 'fb_exchange_token', client_id: appId,
    client_secret: appSecret, fb_exchange_token: tokenData.access_token,
  }))
  const longData  = await longRes.json()
  const longToken = longData.access_token || tokenData.access_token

  // 3. Sayfa listesi
  const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture&access_token=${longToken}`)
  const pagesData = await pagesRes.json()
  const pages     = pagesData.data || []

  // 4. Her sayfa için IG hesabı + username çek
  const yeniHesaplar = []
  for (const page of pages) {
    const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${page.access_token}`)
    const igData = await igRes.json()
    const ig     = igData.instagram_business_account || null

    yeniHesaplar.push({
      page_id:    page.id,
      page_name:  page.name,
      page_token: page.access_token,
      picture:    page.picture?.data?.url || null,
      ig_id:      ig?.id || null,
      ig_username: ig?.username || null,
      ig_picture: ig?.profile_picture_url || null,
      eklendi:    new Date().toISOString(),
    })
  }

  // 5. Mevcut hesaplarla birleştir (page_id'ye göre güncelle/ekle)
  const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
  const eskiHesaplar = meta.hesaplar || []
  const guncellenmis = [...eskiHesaplar]
  for (const yeni of yeniHesaplar) {
    const idx = guncellenmis.findIndex(h => h.page_id === yeni.page_id)
    if (idx >= 0) guncellenmis[idx] = yeni
    else guncellenmis.push(yeni)
  }

  meta.hesaplar  = guncellenmis
  meta.longToken = longToken
  meta.kaydedildi = new Date().toISOString()
  await env.HABERLER.put('meta_tokens', JSON.stringify(meta))

  const sayfalar = yeniHesaplar.map(h => `${h.page_name}${h.ig_id ? ` + @${h.ig_username||'IG'}` : ''}`).join(', ')

  return new Response(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0d1117;color:#fff">
      <h2 style="color:#00D4AA">✓ Hesaplar bağlandı!</h2>
      <p>${sayfalar}</p>
      <p style="color:#aaa;font-size:13px">Token 60 gün geçerli.</p>
      <a href="https://rdr.ist" style="color:#ff7b7b">Panele dön →</a>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}
