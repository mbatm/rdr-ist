/**
 * POST /api/claude
 * Cloudflare Pages Function — Claude API proxy
 * ANTHROPIC_API_KEY environment variable olarak Cloudflare dashboard'dan eklenir
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return Response.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return Response.json(
      { error: 'Claude API isteği başarısız', detail: err.message },
      { status: 500 }
    )
  }
}
