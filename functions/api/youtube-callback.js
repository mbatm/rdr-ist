// functions/api/youtube-callback.js
// Google'dan dönen code'u token'a çevirir ve KV'ye kaydeder

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url)
  const code   = url.searchParams.get('code')
  const error  = url.searchParams.get('error')

  if (error) {
    return new Response(`<h2>Yetkilendirme reddedildi: ${error}</h2>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code) {
    return new Response('<h2>Code bulunamadı</h2>', {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Code → Token exchange
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      redirect_uri:  'https://rdr.ist/api/youtube-callback',
      grant_type:    'authorization_code',
    }).toString(),
  })

  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    return new Response(`<h2>Token hatası: ${tokenData.error_description}</h2>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Token'ları KV'ye kaydet
  await env.HABERLER.put('youtube_tokens', JSON.stringify({
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at:    Date.now() + (tokenData.expires_in * 1000),
  }))

  return new Response(`
    <html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
      <h2>✅ YouTube bağlantısı başarılı!</h2>
      <p>Kanal yetkilendirildi. Bu pencereyi kapatabilirsiniz.</p>
      <script>setTimeout(()=>window.close(),3000)</script>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } })
}
