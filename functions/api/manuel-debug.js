// functions/api/manuel-debug.js — geçici debug endpoint

export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token')
  const kul   = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kul) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  const { baslik='Test başlık', metin='Test metin Kayseri haberi deneme içeriği.', kategori='Güncel' } = await request.json().catch(()=>({}))

  // Claude raw response
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role:'user', content: `SADECE JSON döndür:\n{"site_basligi":"test başlık","instagram":"test ig","facebook":"test fb","x_twitter":"test tw"}` }],
    }),
  })

  const cd = await claudeRes.json()
  const rawText = cd.content?.[0]?.text || 'BOŞ'

  let parsed = null
  try {
    const s = rawText.indexOf('{'), e = rawText.lastIndexOf('}')
    if (s >= 0 && e > s) parsed = JSON.parse(rawText.slice(s, e+1))
  } catch(err) { parsed = { parse_hata: err.message } }

  return Response.json({
    claude_status: claudeRes.status,
    claude_error:  cd.error || null,
    raw_text:      rawText,
    parsed,
    env_check: {
      anthropic_key: env.ANTHROPIC_API_KEY ? `✓ (${env.ANTHROPIC_API_KEY.slice(0,8)}…)` : '✗ EKSİK',
    }
  })
}
