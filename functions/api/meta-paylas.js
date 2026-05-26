export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video,
            fb_page_ids, ig_ids, fb_page_id, ig_id: reqIgId,
            source_id, baslik, ig_story, ig_story_gorsel, ig_kolabor, kayserim_link, video_dur } = body

    if (!gorsel_url && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    if (!hesaplar.length) return Response.json({ hata: 'Bağlı hesap bulunamadı.' }, { status: 401 })

    const secilenFbIds = fb_page_ids?.length ? fb_page_ids : (fb_page_id ? [fb_page_id] : [hesaplar[0].page_id])
    // ig_id + username çift dedup — aynı hesaba birden fazla atma
    const tumIgIds = ig_ids?.length ? ig_ids : (reqIgId ? [reqIgId] : hesaplar.filter(h=>h.ig_id).map(h=>String(h.ig_id)))
    const gorulmusUsernames = new Set()
    const secilenIgIds = [...new Set(tumIgIds.map(String))].filter(id => {
      const h = hesaplar.find(x=>String(x.ig_id)===String(id))
      const uname = h?.ig_username || null
      if (!uname) return true // username yoksa ID bazlı tekil sayılır
      if (gorulmusUsernames.has(uname)) return false
      gorulmusUsernames.add(uname)
      return true
    })
    const userToken    = meta.longToken || hesaplar[0]?.page_token

    const sonuclar = {}

    // ── FACEBOOK ────────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      sonuclar.facebook = {}
      let ilkPostId = null

      for (const pid of secilenFbIds) {
        const sayfa = hesaplar.find(h=>h.page_id===pid) || hesaplar[0]
        const pToken = sayfa.page_token

        if (is_video && video_url) {
          const res = await fetch(`https://graph.facebook.com/v19.0/${pid}/videos`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ file_url:video_url, description:metin, published:true, access_token:pToken }),
          })
          const data = await res.json()
          sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.id, page_name:sayfa.page_name }
          if (data.id && !ilkPostId) ilkPostId = data.id
        } else if (gorsel_url) {
          const res = await fetch(`https://graph.facebook.com/v19.0/${pid}/photos`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ url:gorsel_url, caption:metin, published:true, access_token:pToken }),
          })
          const data = await res.json()
          sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.post_id||data.id, page_name:sayfa.page_name }
          if ((data.post_id||data.id) && !ilkPostId) ilkPostId = data.post_id||data.id
        }
      }
    }

    // ── INSTAGRAM ────────────────────────────────────────────────────────────
    if (platform === 'instagram' || platform === 'her_ikisi') {
      sonuclar.instagram = {}

      for (const igId of secilenIgIds) {
        const sayfa = hesaplar.find(h=>h.ig_id===igId) || hesaplar[0]

        // Normal post (feed)
        if (is_video && video_url) {
          const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ video_url, caption:metin, media_type:'REELS', share_to_feed:true, access_token:userToken, ...(ig_kolabor?.length ? { collaborators: ig_kolabor } : {}) }),
          })
          const cData = await cRes.json()
          sonuclar.instagram[igId] = cData.error
            ? { hata:`Container(${cData.error.code}): ${cData.error.message}` }
            : { bekliyor:true, container_id:cData.id, ig_username:sayfa.ig_username }
        } else if (gorsel_url) {
          const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ image_url:gorsel_url, caption:metin, access_token:userToken, ...(ig_kolabor?.length ? { collaborators: ig_kolabor } : {}) }),
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
            sonuclar.instagram[igId] = pData.error ? { hata:pData.error.message } : { ok:true, media_id:pData.id, ig_username:sayfa.ig_username }
          }
        }

        // Instagram Story
        if (ig_story) {
          const storyKey = igId + '_story'
          // Video < 59s ise video story, değilse görsel story
          const useVideoStory = is_video && video_url && video_dur !== null && video_dur <= 59

          if (useVideoStory) {
            // Video story — /stories endpoint dene, olmadı /media fallback
            const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/stories`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ video_url, access_token:userToken }),
            })
            const cData = await cRes.json()
            if (cData.error) {
              const kod = cData.error.code
              const msg = (kod===10||kod===200||kod===100)
                ? `Story izni yok (@${sayfa.ig_username||igId}). Meta Business > Ayarlar > Instagram > Stories Publishing iznini etkinleştirin.`
                : `Story video: ${cData.error.message} (${kod})`
              sonuclar.instagram[storyKey] = { hata: msg }
            } else {
              sonuclar.instagram[storyKey] = { bekliyor:true, container_id:cData.id, ig_username:sayfa.ig_username, story:true }
            }
          } else {
            // Görsel story — story formatı görseli öncelikli
            const storyImg = ig_story_gorsel || gorsel_url
            if (storyImg) {
              // Photo story — /stories endpoint dene
              const cRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/stories`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ image_url:storyImg, access_token:userToken }),
              })
              const cData = await cRes.json()
              if (cData.error) {
                const kod = cData.error.code
                // Story API sadece belirli hesaplarda çalışır
                // Meta Business > Ayarlar > Instagram > İzinler > Stories Publishing
                const msg = (kod===10||kod===200||kod===100)
                  ? `Story izni yok (@${sayfa.ig_username||igId}). Meta Business > Ayarlar > Instagram > Stories Publishing iznini etkinleştirin.`
                  : `Story: ${cData.error.message} (${kod})`
                sonuclar.instagram[storyKey] = { hata: msg }
              } else {
                sonuclar.instagram[storyKey] = { ok:true, media_id:cData.id, story:true, ig_username:sayfa.ig_username }
              }
            }
          }
        }
      }
    }

    // Log
    try {
      const kullanici = request.headers.get('X-Kullanici') || 'admin'
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      for (const [pid, s] of Object.entries(sonuclar.facebook||{})) {
        if (s.ok) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80), platform:'facebook',
          post_id:s.post_id||'', kullanici, tip:is_video?'video':'foto', hesap:s.page_name||pid, page_id:pid,
          tarih:new Date().toISOString() })
      }
      for (const [igKey, s] of Object.entries(sonuclar.instagram||{})) {
        if (s.ok||s.bekliyor) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80),
          platform: s.story ? 'instagram_story' : 'instagram',
          post_id:s.media_id||'', kullanici, tip:is_video?'video':'foto',
          hesap:s.ig_username||igKey, ig_id:igKey.replace('_story',''),
          tarih:new Date().toISOString() })
      }
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0,500)))
    } catch(e) { console.warn('Log:', e.message) }

    return Response.json({ basarili:true, sonuclar })
  } catch(e) {
    return Response.json({ hata:e.message }, { status:500 })
  }
}
