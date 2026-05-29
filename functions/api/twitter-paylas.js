// functions/api/twitter-paylas.js
// Twitter/X OAuth 1.0a + v1.1 medya yükleme + v2 tweet

import { createHmac } from "node:crypto"

// ── OAuth 1.0a imzalayıcı ────────────────────────────────────────────────────
function oauthSign(method, url, extraParams = {}, creds) {
  const nonce    = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const ts       = Math.floor(Date.now() / 1000).toString()
  const oaParams = {
    oauth_consumer_key:     creds.apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp:        ts,
    oauth_token:            creds.accessToken,
    oauth_version:          '1.0',
    ...extraParams,
  }
  const paramStr = Object.keys(oaParams).sort()
    .map(k => `${pct(k)}=${pct(oaParams[k])}`).join('&')
  const base  = `${method.toUpperCase()}&${pct(url)}&${pct(paramStr)}`
  const key   = `${pct(creds.apiSecret)}&${pct(creds.accessTokenSecret)}`
  const sig   = createHmac('sha256', key).update(base).digest('base64')
  oaParams.oauth_signature = sig
  const header = Object.keys(oaParams).filter(k=>k.startsWith('oauth_')).sort()
    .map(k=>`${pct(k)}="${pct(oaParams[k])}"`)
    .join(', ')
  return `OAuth ${header}`
}

const pct = v => encodeURIComponent(String(v ?? ''))

// ── Medya yükle — INIT / APPEND / FINALIZE ───────────────────────────────────
async function mediaYukle(buffer, mimeType, creds) {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const isVideo   = mimeType.startsWith('video')

  // INIT
  const initBody = new URLSearchParams({
    command:        'INIT',
    total_bytes:    buffer.byteLength.toString(),
    media_type:     mimeType,
    media_category: isVideo ? 'tweet_video' : 'tweet_image',
  })
  const initAuth = oauthSign('POST', uploadUrl, {}, creds)
  const initRes  = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: initAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: initBody.toString(),
  })
  if (!initRes.ok) throw new Error(`INIT: ${await initRes.text()}`)
  const { media_id_string } = await initRes.json()

  // APPEND — 5 MB chunk
  const CHUNK = 5 * 1024 * 1024
  let seg = 0
  for (let off = 0; off < buffer.byteLength; off += CHUNK) {
    const chunk = buffer.slice(off, off + CHUNK)
    const fd = new FormData()
    fd.append('command',       'APPEND')
    fd.append('media_id',      media_id_string)
    fd.append('segment_index', seg.toString())
    fd.append('media',         new Blob([chunk], { type: mimeType }))
    const appAuth = oauthSign('POST', uploadUrl, {}, creds)
    const appRes  = await fetch(uploadUrl, { method:'POST', headers:{ Authorization: appAuth }, body: fd })
    if (!appRes.ok && appRes.status !== 204) throw new Error(`APPEND seg${seg}: ${await appRes.text()}`)
    seg++
  }

  // FINALIZE
  const finBody = new URLSearchParams({ command: 'FINALIZE', media_id: media_id_string })
  const finAuth = oauthSign('POST', uploadUrl, {}, creds)
  const finRes  = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: finAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: finBody.toString(),
  })
  if (!finRes.ok) throw new Error(`FINALIZE: ${await finRes.text()}`)
  const finData = await finRes.json()

  // Video işlenme bekleme
  if (finData.processing_info) {
    await bekleVideo(media_id_string, creds)
  }
  return media_id_string
}

async function bekleVideo(mediaId, creds) {
  const base = 'https://upload.twitter.com/1.1/media/upload.json'
  for (let i = 0; i < 30; i++) {
    const url  = `${base}?command=STATUS&media_id=${mediaId}`
    const auth = oauthSign('GET', base, { command: 'STATUS', media_id: mediaId }, creds)
    const res  = await fetch(url, { headers: { Authorization: auth } })
    if (!res.ok) break
    const d = await res.json()
    const { state, progress_percent } = d.processing_info || {}
    if (state === 'succeeded') return
    if (state === 'failed')    throw new Error('Video işleme başarısız')
    await new Promise(r => setTimeout(r, progress_percent < 50 ? 3000 : 1500))
  }
}

// ── Tweet at (v2) ────────────────────────────────────────────────────────────
async function tweetAt(metin, mediaIds, creds) {
  const url  = 'https://api.twitter.com/2/tweets'
  const body = { text: metin }
  if (mediaIds?.length) body.media = { media_ids: mediaIds }
  const auth = oauthSign('POST', url, {}, creds)
  const res  = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Tweet: ${await res.text()}`)
  return await res.json()
}

// ── Ana handler ──────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  // Auth
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey !== env.RSS_API_KEY)
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const creds = {
    apiKey:             env.TWITTER_API_KEY,
    apiSecret:          env.TWITTER_API_SECRET,
    accessToken:        env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret:  env.TWITTER_ACCESS_TOKEN_SECRET,
  }
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessTokenSecret)
    return Response.json({ hata: 'Twitter API env eksik' }, { status: 500 })

  try {
    const { metin, gorselUrl, videoUrl, gorselBase64, gorselMimeType } = await request.json()
    if (!metin) return Response.json({ hata: 'metin zorunlu' }, { status: 400 })

    let mediaIds = []

    if (gorselBase64 && gorselMimeType) {
      // Base64 PNG (OtoGorselUret'ten)
      const bin = Uint8Array.from(atob(gorselBase64), c => c.charCodeAt(0))
      mediaIds.push(await mediaYukle(bin.buffer, gorselMimeType, creds))
    } else if (gorselUrl) {
      const r = await fetch(gorselUrl)
      if (!r.ok) throw new Error(`Görsel çekilemedi: ${gorselUrl}`)
      mediaIds.push(await mediaYukle(await r.arrayBuffer(), r.headers.get('content-type') || 'image/jpeg', creds))
    } else if (videoUrl) {
      const r = await fetch(videoUrl)
      if (!r.ok) throw new Error(`Video çekilemedi: ${videoUrl}`)
      mediaIds.push(await mediaYukle(await r.arrayBuffer(), r.headers.get('content-type') || 'video/mp4', creds))
    }

    const sonuc = await tweetAt(metin, mediaIds, creds)

    // Log
    try {
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      all.unshift({
        platform:  'twitter',
        post_id:   sonuc.data?.id || '',
        baslik:    metin.slice(0, 80),
        kullanici: request.headers.get('X-Kullanici') || 'admin',
        tip:       mediaIds.length ? (videoUrl ? 'video' : 'foto') : 'metin',
        tarih:     new Date().toISOString(),
      })
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0, 500)))
    } catch(e) { console.warn('Log:', e.message) }

    return Response.json({
      basarili:  true,
      tweet_id:  sonuc.data?.id,
      tweet_url: `https://twitter.com/i/web/status/${sonuc.data?.id}`,
      media_ids: mediaIds,
    })
  } catch(e) {
    console.error('Twitter hata:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
