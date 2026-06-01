/**
 * POST /api/medya-yukle
 * Büyük dosyaları R2'ye yükler, public URL döner
 * 
 * Multipart form data:
 *   file: dosya
 *   source_id: kaynak ID
 *   tip: gorsel | video
 * 
 * VEYA JSON:
 *   data: base64
 *   source_id: string
 *   format: string
 *   mime: string
 */
export async function onRequestPost({ request, env }) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let fileBuffer, fileName, mimeType, sourceId, tip

    if (contentType.includes('multipart/form-data')) {
      // ── Form data — büyük dosyalar için ──────────────────────────────────────
      const form = await request.formData()
      const file = form.get('file')
      if (!file) return Response.json({ hata: 'Dosya bulunamadı' }, { status: 400 })

      sourceId   = form.get('source_id') || `upload_${Date.now()}`
      tip        = form.get('tip') || (file.type?.startsWith('video') ? 'video' : 'gorsel')
      mimeType   = file.type || (tip === 'video' ? 'video/mp4' : 'image/jpeg')
      fileName   = file.name || `${tip}_${Date.now()}`
      fileBuffer = await file.arrayBuffer()

    } else {
      // ── JSON base64 — küçük dosyalar için (geriye dönük uyumluluk) ──────────
      const body = await request.json()
      const { data, source_id, format, mime } = body
      if (!data || !source_id) return Response.json({ hata: 'data ve source_id zorunlu' }, { status: 400 })

      sourceId   = source_id
      tip        = format?.startsWith('video') ? 'video' : 'gorsel'
      mimeType   = mime || (tip === 'video' ? 'video/mp4' : 'image/jpeg')
      const ext  = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('webm') ? 'webm' : mimeType.includes('png') ? 'png' : 'jpg'
      fileName   = `${format || tip}_${Date.now()}.${ext}`

      // Base64 → ArrayBuffer
      const binary = atob(data)
      const bytes  = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      fileBuffer = bytes.buffer
    }

    // ── Boyut kontrolü — R2 limiti yok ama makul bir üst sınır ──────────────
    const boyutMB = fileBuffer.byteLength / (1024 * 1024)
    if (boyutMB > 500) {
      return Response.json({ hata: `Dosya çok büyük: ${boyutMB.toFixed(0)}MB. Max 500MB.` }, { status: 413 })
    }

    // ── R2'ye yükle ──────────────────────────────────────────────────────────
    const ext    = mimeType.includes('mp4') ? 'mp4'
                 : mimeType.includes('webm') ? 'webm'
                 : mimeType.includes('mov')  ? 'mov'
                 : mimeType.includes('png')  ? 'png'
                 : mimeType.includes('gif')  ? 'gif'
                 : 'jpg'
    const key    = `${sourceId}/${tip}_${Date.now()}.${ext}`

    await env.MEDYA.put(key, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    })

    // Public URL — R2 public bucket URL (Creatomate için direkt erişilebilir)
    const publicUrl = env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL}/${key}`
      : `https://pub-32335234789a400fb2dfd799a98dc5e0.r2.dev/${key}`

    return Response.json({ ok: true, url: publicUrl, key, boyutMB: Math.round(boyutMB * 10) / 10 })

  } catch(e) {
    console.error('medya-yukle:', e)
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
