/**
 * R2 Multipart Upload — büyük dosyalar için
 * 
 * POST /api/r2-upload-chunk?action=start   → uploadId, key döner
 * POST /api/r2-upload-chunk?action=part    → partNumber, uploadId, key ile parça yükle → etag döner
 * POST /api/r2-upload-chunk?action=finish  → tüm part'ları birleştir → final URL döner
 * POST /api/r2-upload-chunk?action=abort   → iptal et
 */

async function authKontrol(request, env) {
  const token = request.headers.get('X-Token') || ''
  if (!token) return null
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  return kullanici
}

export async function onRequestPost({ request, env }) {
  const url    = new URL(request.url)
  const action = url.searchParams.get('action') || 'start'

  const kullanici = await authKontrol(request, env)
  if (!kullanici) return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

  try {
    // ── BAŞLAT ────────────────────────────────────────────────────
    if (action === 'start') {
      const { filename, type } = await request.json()
      const ext  = (filename || 'video.mp4').split('.').pop()
      const key  = `yuklemeler/${Date.now()}_${Math.random().toString(36).slice(2,5)}.${ext}`
      const mime = type || (ext === 'mp4' ? 'video/mp4' : 'video/quicktime')

      const upload = await env.MEDYA.createMultipartUpload(key, {
        httpMetadata: { contentType: mime }
      })

      return Response.json({
        ok: true,
        uploadId: upload.uploadId,
        key,
        final_url: `https://medya.rdr.ist/${key}`,
      })
    }

    // ── PARÇA YÜKLE ────────────────────────────────────────────────
    if (action === 'part') {
      const uploadId   = url.searchParams.get('uploadId')
      const key        = url.searchParams.get('key')
      const partNumber = parseInt(url.searchParams.get('part') || '1')

      if (!uploadId || !key) return Response.json({ hata: 'uploadId ve key gerekli' }, { status: 400 })

      const upload = env.MEDYA.resumeMultipartUpload(key, uploadId)
      const buf    = await request.arrayBuffer()
      const part   = await upload.uploadPart(partNumber, buf)

      return Response.json({ ok: true, etag: part.etag, part: partNumber })
    }

    // ── BİTİR ──────────────────────────────────────────────────────
    if (action === 'finish') {
      const { uploadId, key, parts } = await request.json()
      // parts: [{ partNumber, etag }, ...]

      if (!uploadId || !key || !parts?.length)
        return Response.json({ hata: 'uploadId, key, parts gerekli' }, { status: 400 })

      const upload = env.MEDYA.resumeMultipartUpload(key, uploadId)
      await upload.complete(parts)

      return Response.json({
        ok: true,
        url: `https://medya.rdr.ist/${key}`,
        key,
      })
    }

    // ── İPTAL ──────────────────────────────────────────────────────
    if (action === 'abort') {
      const { uploadId, key } = await request.json()
      if (uploadId && key) {
        const upload = env.MEDYA.resumeMultipartUpload(key, uploadId)
        await upload.abort()
      }
      return Response.json({ ok: true })
    }

    return Response.json({ hata: 'Geçersiz action' }, { status: 400 })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
