export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video, is_carousel, galeri_urls = [],
            fb_page_ids, ig_ids, fb_page_id, ig_id: reqIgId,
            source_id, baslik, ig_story, ig_story_gorsel, ig_kolabor,
            kayserim_link, video_dur } = body

    if (!gorsel_url && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    if (!hesaplar.length) return Response.json({ hata: 'Bağlı hesap bulunamadı.' }, { status: 401 })

    const secilenFbIds = fb_page_ids?.length ? fb_page_ids : (fb_page_id ? [fb_page_id] : [hesaplar[0].page_id])

    // ig_id username bazlı dedup
    const tumIgIds = ig_ids?.length ? ig_ids : (reqIgId ? [reqIgId] : hesaplar.filter(h=>h.ig_id).map(h=>String(h.ig_id)))
    const gorulmusUsernames = new Set()
    const secilenIgIds = [...new Set(tumIgIds.map(String))].filter(id => {
      const h = hesaplar.find(x=>String(x.ig_id)===String(id))
      const uname = h?.ig_username || null
      if (!uname) return true
      if (gorulmusUsernames.has(uname)) return false
      gorulmusUsernames.add(uname)
      return true
    })

    const userToken = meta.longToken || hesaplar[0]?.page_token
    const sonuclar = {}

    // ── FACEBOOK ─────────────────────────────────────────────────────────────
    if (platform === 'facebook' || platform === 'her_ikisi') {
      sonuclar.facebook = {}
      for (const pid of secilenFbIds) {
        const sayfa  = hesaplar.find(h=>h.page_id===pid) || hesaplar[0]
        const pToken = sayfa.page_token
        if (is_video && video_url) {
          const vBody = { file_url:video_url, description:metin, published:true, access_token:pToken }
          if (kayserim_link) {
            vBody.call_to_action = JSON.stringify({ type:'LEARN_MORE', value:{ link:kayserim_link } })
          }
          const res  = await fetch(`https://graph.facebook.com/v21.0/${pid}/videos`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(vBody),
          })
          const data = await res.json()
          sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.id, page_name:sayfa.page_name }
        } else if (gorsel_url) {
          let data
          if (kayserim_link) {
            // Önce görseli yükle, sonra link ekle
            // name/description/picture parametreleri URL sahibine özgü — kullanmıyoruz
            const fotoRes = await fetch(`https://graph.facebook.com/v21.0/${pid}/photos`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                url: gorsel_url,
                caption: metin + '\n\n' + kayserim_link,
                published: true,
                access_token: pToken,
              }),
            })
            data = await fotoRes.json()
            sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.post_id||data.id, page_name:sayfa.page_name }
          } else {
            const res = await fetch(`https://graph.facebook.com/v21.0/${pid}/photos`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ url:gorsel_url, caption:metin, published:true, access_token:pToken }),
            })
            data = await res.json()
            sonuclar.facebook[pid] = data.error ? { hata:data.error.message } : { ok:true, post_id:data.post_id||data.id, page_name:sayfa.page_name }
          }
        }
      }
    }

    // ── INSTAGRAM FEED ────────────────────────────────────────────────────────
    if (platform === 'instagram' || platform === 'her_ikisi') {
      sonuclar.instagram = {}
      await Promise.all(secilenIgIds.map(async (igId) => {
        const sayfa = hesaplar.find(h=>String(h.ig_id)===String(igId)) || hesaplar[0]

        // Carousel (çoklu görsel)
        if (is_carousel && galeri_urls.length > 1) {
          try {
            // Her görsel için container oluştur
            const containerIds = []
            for (const imgUrl of galeri_urls) {
              const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ image_url: imgUrl, is_carousel_item: true, access_token: userToken }),
              })
              const cData = await cRes.json()
              if (!cData.error) containerIds.push(cData.id)
            }
            if (containerIds.length > 1) {
              // Carousel container oluştur
              const carRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                  media_type: 'CAROUSEL',
                  children: containerIds.join(','),
                  caption: metin,
                  access_token: userToken,
                }),
              })
              const carData = await carRes.json()
              if (!carData.error) {
                await new Promise(r=>setTimeout(r,2000))
                const pRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ creation_id: carData.id, access_token: userToken }),
                })
                const pData = await pRes.json()
                sonuclar.instagram[igId] = pData.error
                  ? { hata: pData.error.message }
                  : { ok:true, media_id: pData.id, ig_username: sayfa.ig_username, carousel: true }
              } else {
                sonuclar.instagram[igId] = { hata: carData.error.message }
              }
            }
          } catch(e) { sonuclar.instagram[igId] = { hata: e.message } }
        }
        // Feed post
        else if (is_video && video_url) {
          const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              video_url, caption:metin, media_type:'REELS', share_to_feed:true,
              ...(ig_kolabor?.length ? { collaborators:ig_kolabor } : {}),
              access_token:userToken
            }),
          })
          const cData = await cRes.json()
          if (cData.error) {
            sonuclar.instagram[igId] = { hata:`Container(${cData.error.code}): ${cData.error.message}` }
          } else {
            // Container hazır olana kadar bekle, sonra publish et
            const containerId = cData.id
            let published = false
            for (let i = 0; i < 10; i++) {
              await new Promise(r => setTimeout(r, 3000))
              const statusRes = await fetch(
                `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${userToken}`
              )
              const statusData = await statusRes.json()
              if (statusData.status_code === 'FINISHED') {
                const pRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ creation_id: containerId, access_token: userToken }),
                })
                const pData = await pRes.json()
                sonuclar.instagram[igId] = pData.error
                  ? { hata: pData.error.message }
                  : { ok:true, media_id: pData.id, ig_username: sayfa.ig_username }
                published = true
                break
              } else if (statusData.status_code === 'ERROR') {
                sonuclar.instagram[igId] = { hata: 'Video işleme hatası: ' + (statusData.status || 'ERROR') }
                published = true
                break
              }
            }
            if (!published) {
              sonuclar.instagram[igId] = { hata: 'Video işleme zaman aşımı — container: ' + containerId }
            }
          }
        } else if (gorsel_url) {
          const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              image_url:gorsel_url, caption:metin,
              ...(ig_kolabor?.length ? { collaborators:ig_kolabor } : {}),
              access_token:userToken
            }),
          })
          const cData = await cRes.json()
          if (cData.error) {
            sonuclar.instagram[igId] = { hata:cData.error.message }
          } else {
            await new Promise(r=>setTimeout(r,2000))
            const pRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ creation_id:cData.id, access_token:userToken }),
            })
            const pData = await pRes.json()
            sonuclar.instagram[igId] = pData.error ? { hata:pData.error.message } : { ok:true, media_id:pData.id, ig_username:sayfa.ig_username }
          }
        }

        // Story
        if (ig_story) {
          const storyKey = igId + '_story'
          const useVideoStory = is_video && video_url && video_dur !== null && Number(video_dur) <= 59

          if (useVideoStory) {
            // Video story: REELS yöntemi (çalışan yöntem)
            const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ video_url, media_type:'REELS', access_token:userToken }),
            })
            const cData = await cRes.json()
            sonuclar.instagram[storyKey] = cData.error
              ? { hata:`Story video: ${cData.error.message}` }
              : { bekliyor:true, container_id:cData.id, ig_username:sayfa.ig_username, story:true }
          } else {
            // Görsel story: /stories endpoint dene
            const storyImg = ig_story_gorsel || gorsel_url
            if (storyImg) {
              const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/stories`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ image_url:storyImg, access_token:userToken }),
              })
              const cData = await cRes.json()
              sonuclar.instagram[storyKey] = cData.error
                ? { hata:`Story: ${cData.error.message} (${cData.error.code})` }
                : { ok:true, media_id:cData.id, story:true, ig_username:sayfa.ig_username }
            }
          }
        }
      })) // end Promise.all
    }

    // Log kaydet
    try {
      const kullanici = request.headers.get('X-Kullanici') || 'admin'
      const all = await env.HABERLER.get('paylas_log', 'json') || []
      for (const [pid, s] of Object.entries(sonuclar.facebook||{})) {
        if (s.ok) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80),
          platform:'facebook', post_id:s.post_id||'', kullanici,
          tip:is_video?'video':'foto', hesap:s.page_name||pid, page_id:pid,
          tarih:new Date().toISOString() })
      }
      for (const [igKey, s] of Object.entries(sonuclar.instagram||{})) {
        if (s.ok||s.bekliyor) all.unshift({ source_id:source_id||'', baslik:(baslik||'').slice(0,80),
          platform:s.story?'instagram_story':'instagram',
          post_id:s.media_id||'', kullanici, tip:is_video?'video':'foto',
          hesap:s.ig_username||igKey.replace('_story',''),
          ig_id:igKey.replace('_story',''), tarih:new Date().toISOString() })
      }
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0,500)))
    } catch(e){ console.warn('Log:', e.message) }

    return Response.json({ basarili:true, sonuclar })
  } catch(e) {
    return Response.json({ hata:e.message }, { status:500 })
  }
}
