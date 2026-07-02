// functions/api/twitter-test.js
// OAuth imzasını test eder — tweet atmaz, sadece credentials doğrular

async function oauthSign(method, url, extraParams = {}, creds) {
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const ts    = Math.floor(Date.now() / 1000).toString()

  const oaParams = {
    oauth_consumer_key:     creds.apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        ts,
    oauth_token:            creds.accessToken,
    oauth_version:          '1.0',
    ...extraParams,
  }

  const paramStr = Object.keys(oaParams).sort()
    .map(k => `${pct(k)}=${pct(oaParams[k])}`).join('&')

  const base = `${method.toUpperCase()}&${pct(url)}&${pct(paramStr)}`
  const signingKey = `${pct(creds.apiSecret)}&${pct(creds.accessTokenSecret)}`

  const encoder   = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(base))
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))

  oaParams.oauth_signature = sig

  const header = Object.keys(oaParams)
    .filter(k => k.startsWith('oauth_'))
    .sort()
    .map(k => `${pct(k)}="${pct(oaParams[k])}"`)
    .join(', ')

  return `OAuth ${header}`
}

const pct = v => encodeURIComponent(String(v ?? ''))

export async function onRequestGet({ request, env }) {
  const apiKey = request.headers.get('X-API-Key')
  const ref = request.headers.get('referer') || ''
  if (apiKey !== env.RSS_API_KEY && !ref.includes('rdr.ist'))
    return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const creds = {
    apiKey:            env.TWITTER_API_KEY,
    apiSecret:         env.TWITTER_API_SECRET,
    accessToken:       env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
  }

  // Env değerlerinin ilk/son karakterlerini göster (güvenli)
  const envDurum = {
    TWITTER_API_KEY:            creds.apiKey    ? `✓ (${creds.apiKey.slice(0,4)}…${creds.apiKey.slice(-4)}, len:${creds.apiKey.length})`    : '✗ EKSİK',
    TWITTER_API_SECRET:         creds.apiSecret ? `✓ (${creds.apiSecret.slice(0,4)}…${creds.apiSecret.slice(-4)}, len:${creds.apiSecret.length})` : '✗ EKSİK',
    TWITTER_ACCESS_TOKEN:       creds.accessToken ? `✓ (${creds.accessToken.slice(0,6)}…${creds.accessToken.slice(-4)}, len:${creds.accessToken.length})` : '✗ EKSİK',
    TWITTER_ACCESS_TOKEN_SECRET:creds.accessTokenSecret ? `✓ (${creds.accessTokenSecret.slice(0,4)}…${creds.accessTokenSecret.slice(-4)}, len:${creds.accessTokenSecret.length})` : '✗ EKSİK',
  }

  // Twitter verify_credentials ile test et
  const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json'
  const auth = await oauthSign('GET', verifyUrl, {}, creds)

  let twitterSonuc = null
  try {
    const res  = await fetch(verifyUrl, { headers: { Authorization: auth } })
    twitterSonuc = await res.json()
  } catch(e) {
    twitterSonuc = { fetch_hata: e.message }
  }

  return Response.json({
    env: envDurum,
    twitter_verify: twitterSonuc,
  })
}
