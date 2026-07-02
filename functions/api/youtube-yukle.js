// functions/api/youtube-yukle.js
// YouTube'a video yükler — resumable upload API

// ── Token yenile ─────────────────────────────────────────────────────────────
async function tokenYenile(tokens, env) {
  if (Date.now() < tokens.expires_at - 60000) return tokens

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type:    'refresh_token',
    }).toString(),
  })

  const data = await res.json()
  if (data.error) throw new Error(`Token yenileme hatası: ${data.error_description}`)

  const yeniTokens = {
    access_token:  data.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    Date.now() + (data.expires_in * 1000),
  }
  await env.HABERLER.put('youtube_tokens', JSON.stringify(yeniTokens))
  return yeniTokens
}

// ── Resumable upload ──────────────────────────────────────────────────────────
async function videoYukle(videoBuffer, mimeType, metadata, accessToken) {
  // 1) Upload session başlat
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': videoBuffer.byteLength.toString(),
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`Upload init hatası: ${err}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('Upload URL alınamadı')

  // 2) Video yükle
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type':   mimeType,
      'Content-Length': videoBuffer.byteLength.toString(),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Video yükleme hatası: ${err}`)
  }

  return await uploadRes.json()
}

// ── Ana handler ───────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const apiKey = request.headers.get('X-API-Key') || ''
  const cmsToken = apiKey && apiKey !== env.RSS_API_KEY ? await env.HABERLER.get('token:' + apiKey, 'json') : null
  if (apiKey !== env.RSS_API_KEY && !cmsToken)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  // Token kontrolü
  const tokensRaw = await env.HABERLER.get('youtube_tokens', 'json')
  if (!tokensRaw?.refresh_token)
    return Response.json({ hata: 'YouTube bağlantısı yok — önce /api/youtube-auth ile yetkilendir' }, { status: 401 })

  try {
    const { videoUrl, baslik, aciklama, etiketler = [], kategoriId = '25' } = await request.json()
    // kategoriId: 25 = Haberler ve Politika

    if (!videoUrl) return Response.json({ hata: 'videoUrl zorunlu' }, { status: 400 })
    if (!baslik)   return Response.json({ hata: 'baslik zorunlu' }, { status: 400 })

    // Token yenile
    const tokens = await tokenYenile(tokensRaw, env)

    // Videoyu çek
    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) throw new Error(`Video çekilemedi: ${videoUrl}`)
    const mimeType    = videoRes.headers.get('content-type') || 'video/mp4'
    const videoBuffer = await videoRes.arrayBuffer()

    // YouTube metadata
    const metadata = {
      snippet: {
        title:       baslik.slice(0, 100),
        description: aciklama || '',
        tags:        etiketler.slice(0, 30),
        categoryId:  kategoriId,
        defaultLanguage: 'tr',
      },
      status: {
        privacyStatus:           'public',
        selfDeclaredMadeForKids: false,
      },
    }

    const sonuc = await videoYukle(videoBuffer, mimeType, metadata, tokens.access_token)

    const videoId  = sonuc.id
    const videoLink = `https://www.youtube.com/watch?v=${videoId}`

    // Log
    try {
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      all.unshift({
        platform:  'youtube',
        post_id:   videoId,
        baslik:    baslik.slice(0, 80),
        kullanici: request.headers.get('X-Kullanici') || 'admin',
        tip:       'video',
        tarih:     new Date().toISOString(),
      })
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0, 500)))
    } catch(e) { console.warn('Log:', e.message) }

    return Response.json({
      basarili:   true,
      video_id:   videoId,
      video_url:  videoLink,
      embed_url:  `https://www.youtube.com/embed/${videoId}`,
    })
  } catch(e) {
    console.error('YouTube yükleme hatası:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
