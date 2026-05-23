/**
 * GET /api/meta-callback?code=...
 * Facebook OAuth callback — uzun ömürlü token alır, KV'ye kaydeder
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

  // 1. Kısa ömürlü token al
  const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({
    client_id:     appId,
    client_secret: appSecret,
    redirect_uri:  'https://rdr.ist/api/meta-callback',
    code,
  }))
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return new Response(`Token hatası: ${JSON.stringify(tokenData)}`, { status: 500 })
  }

  // 2. Uzun ömürlü token al (60 gün)
  const longRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         appId,
    client_secret:     appSecret,
    fb_exchange_token: tokenData.access_token,
  }))
  const longData = await longRes.json()
  const longToken = longData.access_token || tokenData.access_token

  // 3. Page listesini al
  const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`)
  const pagesData = await pagesRes.json()
  const pages     = pagesData.data || []

  // 4. Her page için uzun ömürlü page token + Instagram ID
  const hesaplar = []
  for (const page of pages) {
    const pageToken = page.access_token

    // Instagram Business Account ID
    const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`)
    const igData = await igRes.json()
    const igId   = igData.instagram_business_account?.id || null

    hesaplar.push({
      page_id:    page.id,
      page_name:  page.name,
      page_token: pageToken,
      ig_id:      igId,
    })
  }

  // 5. KV'ye kaydet
  const meta = { longToken, hesaplar, kaydedildi: new Date().toISOString() }
  await env.HABERLER.put('meta_tokens', JSON.stringify(meta))

  const sayfalar = hesaplar.map(h => `${h.page_name} ${h.ig_id ? '+ Instagram' : ''}`).join(', ')

  return new Response(`
    <html><body style="font-family:sans-serif;padding:2rem;background:#0d1117;color:#fff">
      <h2 style="color:#00D4AA">✓ Meta bağlantısı kuruldu!</h2>
      <p>Sayfalar: <strong>${sayfalar}</strong></p>
      <p style="color:#aaa;font-size:14px">Token 60 gün geçerli. Süresi dolunca <a href="/api/meta-auth" style="color:#4dabf7">/api/meta-auth</a> ile yenileyin.</p>
      <a href="https://rdr.ist" style="color:#ff7b7b">Panele dön →</a>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}
