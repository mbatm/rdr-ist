/**
 * POST /api/gorsel
 * Replicate FLUX.1-schnell ile görsel üretir
 * REPLICATE_API_KEY → Cloudflare env variable
 */
export async function onRequestPost({ request, env }) {
  try {
    const { prompt } = await request.json()

    const res = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'wait', // Senkron — sonuç hazır olunca döner (~5-10sn)
        },
        body: JSON.stringify({
          input: {
            prompt,
            width: 1280,
            height: 720,
            num_inference_steps: 4,
            output_format: 'jpg',
            output_quality: 85,
          },
        }),
      }
    )

    const data = await res.json()

    if (data.error) {
      return Response.json({ error: data.error }, { status: 500 })
    }

    const url = Array.isArray(data.output) ? data.output[0] : data.output

    if (url) {
      return Response.json({ url, id: data.id })
    }

    // Prefer: wait timeout olursa id dön, client tekrar sorgular
    return Response.json({ id: data.id, status: data.status })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/gorsel?id=xxx
 * Prediction durumunu sorgular
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return Response.json({ error: 'id gerekli' }, { status: 400 })

  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${env.REPLICATE_API_KEY}` },
  })
  const data = await res.json()
  const imgUrl = Array.isArray(data.output) ? data.output[0] : data.output

  return Response.json({ status: data.status, url: imgUrl || null, error: data.error || null })
}
