/**
 * POST /api/meta-paylas
 * Body: { gorsel_url, video_url, metin, platform, is_video, fb_page_id?, ig_id?, source_id?, baslik? }
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video,
            fb_page_ids, ig_ids, fb_page_id, ig_id: reqIgId, source_id, baslik } = body

    if (!gorsel_url && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    if (!hesaplar.length) return Response.json({ hata: 'Bağlı hesap bulunamadı.' }, { status: 401 })

    // Çoklu veya tekli hesap seçimi
    const secilenFbIds = fb_page_ids?.length ? fb_page_ids : (fb_page_id ? [fb_page_id] : [hesaplar[0].page_id])
    const secilenIgIds = ig_ids?.length ? ig_ids : (reqIgId ? [reqIgId] : hesaplar.filter(h=>h.ig_id).map(h=>h.ig_id).slice(0,1))

    const sonuclar = {}

    // ── FACEBOOK ──────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      sonuclar.facebook = {}
      for (const pid of secilenFbIds) {
        const sayfa = hesaplar.find(h=>h.page_id===pid) || hesaplar[0]
        const pageToken = sayfa.page_token
        if (is_video && video_url) {
          const res = await fetch(`https://graph.facebook.com/v19.0/${pid}/videos`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ file_url:video_url, description:metin, published:true, access_token:pageToken }),
          })
          const data = await res.json()
          sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.id, page_name:sayfa.page_name }
        } else if (gorsel_url) {
          const res = await fetch(`https://graph.facebook.com/v19.0/${pid}/photos`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ url:gorsel_url, caption:metin, published:true, access_token:pageToken }),
          })
          const data = await res.json()
          sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.post_id||data.id, page_name:sayfa.page_name }
        }
      }
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    if (platform === 'instagram' || platform === 'her_ikisi') {
      sonuclar.instagram = {}
      const userToken = meta.longToken || hesaplar[0]?.page_token
      for (const igId of secilenIgIds) {
        const sayfa = hesaplar.find(h=>h.ig_id===igId) || hesaplar[0]
        if (is_video && video_url) {
          const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ video_url, caption:metin, media_type:'REELS', share_to_feed:true, access_token:userToken }),
          })
          const cData = await cRes.json()
          sonuclar.instagram[igId] = cData.error
            ? { hata:`Container(${cData.error.code}): ${cData.error.message}` }
            : { bekliyor:true, container_id:cData.id, mesaj:'Video işleniyor…', ig_username:sayfa.ig_username }
        } else if (gorsel_url) {
          const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ image_url:gorsel_url, caption:metin, access_token:userToken }),
          })
          const cData = await cRes.json()
          if (cData.error) {
            sonuclar.instagram[igId] = { hata:cData.error.message }
          } else {
            await new Promise(r=>setTimeout(r,2000))
            const pRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ creation_id:cData.id, access_token:userToken }),
            })
            const pData = await pRes.json()
            sonuclar.instagram[igId] = pData.error
              ? { hata:pData.error.message }
              : { ok:true, media_id:pData.id, ig_username:sayfa.ig_username }
          }
        }
      }
    }

    // Paylaşım logu
    try {
      const kullanici = request.headers.get('X-Kullanici') || 'admin'
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      // Facebook logları
      for (const [pid, sonuc] of Object.entries(sonuclar.facebook||{})) {
        if (sonuc.ok) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80),
          platform:'facebook', post_id:sonuc.post_id||'', kullanici, tip:is_video?'video':'foto',
          hesap:sonuc.page_name||pid, page_id:pid, tarih:new Date().toISOString() })
      }
      // Instagram logları
      for (const [igId, sonuc] of Object.entries(sonuclar.instagram||{})) {
        if (sonuc.ok||sonuc.bekliyor) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80),
          platform:'instagram', post_id:sonuc.media_id||'', kullanici, tip:is_video?'video':'foto',
          hesap:sonuc.ig_username||igId, ig_id:igId, tarih:new Date().toISOString() })
      }
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0,500)))
    } catch(e) { console.warn('Log hatası:', e.message) }

    return Response.json({ basarili: true, sonuclar })
  } catch(e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}
