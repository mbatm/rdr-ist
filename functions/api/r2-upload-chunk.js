/**
 * POST /api/r2-upload-chunk
 * Büyük dosyaları parça parça R2'ye yükler
 * Body: FormData { chunk: Blob, key: string, index: number, total: number }
 */
export async function onRequestPost({ request, env }) {
  const token = request.headers.get('X-Token') || ''
  if (!token) return Response.json({ hata: 'Token gerekli' }, { status: 401 })
  const kullanici = await env.HABERLER.get(`token:${token}`, 'json')
  if (!kullanici) return Response.json({ hata: 'Geçersiz token' }, { status: 401 })

  try {
    const form  = await request.formData()
    const chunk = form.get('chunk')   // Blob
    const key   = form.get('key')     // benzersiz dosya adı
    const index = parseInt(form.get('index') || '0')
    const total = parseInt(form.get('total') || '1')

    if (!chunk || !key) return Response.json({ hata: 'chunk ve key gerekli' }, { status: 400 })

    // Her parçayı geçici olarak sakla
    const chunkBuf = await chunk.arrayBuffer()
    await env.MEDYA.put(`chunks/${key}_${index}`, chunkBuf, {
      httpMetadata: { contentType: 'application/octet-stream' }
    })

    // Tüm parçalar yüklendiyse birleştir
    if (index === total - 1) {
      const parts = []
      for (let i = 0; i < total; i++) {
        const part = await env.MEDYA.get(`chunks/${key}_${i}`)
        if (!part) return Response.json({ hata: `Parça ${i} bulunamadı` }, { status: 500 })
        parts.push(await part.arrayBuffer())
      }

      // Birleştir
      const combined = new Uint8Array(parts.reduce((acc, p) => acc + p.byteLength, 0))
      let offset = 0
      for (const p of parts) {
        combined.set(new Uint8Array(p), offset)
        offset += p.byteLength
      }

      // Final dosyayı kaydet
      const ext      = key.split('.').pop() || 'mp4'
      const finalKey = `yuklemeler/${key}`
      const mimeType = ext === 'mp4' ? 'video/mp4' : ext === 'mov' ? 'video/quicktime' : 'video/mp4'
      
      await env.MEDYA.put(finalKey, combined.buffer, {
        httpMetadata: { contentType: mimeType }
      })

      // Geçici parçaları sil
      for (let i = 0; i < total; i++) {
        await env.MEDYA.delete(`chunks/${key}_${i}`).catch(() => {})
      }

      return Response.json({
        ok: true,
        tamamlandi: true,
        url: `https://medya.rdr.ist/${finalKey}`,
        key: finalKey,
      })
    }

    return Response.json({ ok: true, tamamlandi: false, index, total })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
