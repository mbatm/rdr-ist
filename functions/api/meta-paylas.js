export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { gorsel_url, video_url, metin, platform = 'her_ikisi', is_video, is_carousel, galeri_urls = [],
            fb_page_ids, ig_ids, fb_page_id, ig_id: reqIgId,
            source_id, baslik, ig_story, ig_story_gorsel, ig_kolabor,
            kayserim_link, video_dur } = body

    // gorsel_url yoksa galeri_urls[0]'dan al (GaleriModul carousel paylaşımı)
    const efektifGorselUrl = gorsel_url || (is_carousel && galeri_urls?.[0]) || null
    if (!efektifGorselUrl && !video_url) return Response.json({ hata: 'gorsel_url veya video_url gerekli' }, { status: 400 })

    // R2'ye kopyala — Instagram 1ha CDN ve Backblaze URL'lerine erişemiyor
    // Instagram günlük kota kontrolü — 50 post/gün limiti
    const kotaKontrol = async (igId, pageToken) => {
      try {
        const res  = await fetch(
          `https://graph.facebook.com/v21.0/${igId}/content_publishing_limit?fields=quota_usage,config&access_token=${pageToken}`
        )
        const data = await res.json()
        const kota = data?.data?.[0]
        if (!kota) return { ok: true, kullanim: 0, limit: 50 }
        const kullanim = kota.quota_usage || 0
        const limit    = kota.config?.quota_total || 50
        return { ok: kullanim < limit - 2, kullanim, limit }
      } catch {
        return { ok: true, kullanim: 0, limit: 50 }
      }
    }

    // PAYLAŞIM NETLİK FORMÜLÜ: media_publish 'id' döndürdüyse post %100 yayınlanmıştır.
    // Ek teyit için permalink çekilir — permalink varsa hem kesin kanıt hem tıklanabilir link.
    const permalinkTeyit = async (mediaId, pageToken) => {
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?fields=permalink&access_token=${pageToken}`)
        const d = await r.json()
        return d.permalink || null
      } catch { return null }
    }

    // media_publish YANITINI NETLEŞTİRİR:
    // Meta bazen (özellikle çok hesaba paralel paylaşımda) geçici 190 gibi hatalar
    // döndürür ama içeriği ASLINDA yayınlar. Hata durumunda 4sn bekleyip container'ın
    // status_code'u sorulur — PUBLISHED ise paylaşım başarılı kabul edilir.
    const igPublishNetlestir = async (igId, containerId, pageToken, igUsername, ekstra = {}) => {
      const pRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ creation_id: containerId, access_token: pageToken }),
      })
      const pData = await pRes.json()
      if (!pData.error) {
        return { ok:true, media_id:pData.id, ig_username:igUsername, permalink: await permalinkTeyit(pData.id, pageToken), ...ekstra }
      }
      // Şüpheli hata — Meta yayınlamış olabilir, container durumuyla doğrula
      await new Promise(r=>setTimeout(r,4000))
      try {
        const sRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${pageToken}`)
        const sD = await sRes.json()
        if (sD.status_code === 'PUBLISHED') {
          return { ok:true, media_id:null, ig_username:igUsername,
            dogrulama:'Meta hata döndürdü ama container PUBLISHED — içerik gerçekte yayınlandı',
            gecici_hata:(pData.error.message||'').slice(0,100), ...ekstra }
        }
      } catch {}
      return { hata: pData.error.message }
    }

    const r2Kopyala = async (url, tip = 'gorsel') => {
      if (!url) return url
      // Zaten medya.rdr.ist ise kopyalama
      if (!url || url.includes('medya.rdr.ist')) return url
      // Sadece bilinen sorunlu domain'leri kopyala
      const sorunlu = ['backblazeb2.com', '1ha.com.tr', 'creatomate-c8xg3hsxdu', 'cdn.']
      if (!sorunlu.some(d => url.includes(d))) return url
      try {
        const res = await fetch(url)
        if (!res.ok) return url
        const buf = await res.arrayBuffer()
        const ext = tip === 'video' ? 'mp4' : 'jpg'
        const key = `paylas/${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`
        await env.MEDYA.put(key, buf, {
          httpMetadata: { contentType: tip === 'video' ? 'video/mp4' : 'image/jpeg' }
        })
        return `https://medya.rdr.ist/${key}`
      } catch { return url }
    }

    // URL'lerin string olduğundan emin ol
    const guvenliVideoUrl  = typeof video_url      === 'string' ? video_url      : null
    const guvenliGorselUrl = typeof efektifGorselUrl === 'string' ? efektifGorselUrl : null

    // Video ve görsel URL'lerini R2'ye kopyala — Instagram Backblaze/1ha/CDN'e erişemiyor
    const efektifVideo  = guvenliVideoUrl  ? await r2Kopyala(guvenliVideoUrl,  'video')  : null
    const efektifGorsel = guvenliGorselUrl ? await r2Kopyala(guvenliGorselUrl, 'gorsel') : null

    const meta     = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    if (!hesaplar.length) return Response.json({ hata: 'Bağlı hesap bulunamadı.' }, { status: 401 })

    const secilenFbIds = fb_page_ids?.length ? fb_page_ids : (fb_page_id ? [fb_page_id] : [hesaplar[0].page_id])

    // ig_id username bazlı dedup
    // ÖNEMLİ: ig_ids boş/undefined gelirse "hiç hesap seçilmedi" demektir — tüm hesaplara fallback YAPMA
    const igIstendi = platform === 'instagram' || platform === 'her_ikisi'
    const tumIgIds = ig_ids?.length ? ig_ids : (reqIgId ? [reqIgId] : [])
    const gorulmusUsernames = new Set()
    const secilenIgIds = igIstendi ? [...new Set(tumIgIds.map(String))].filter(id => {
      const h = hesaplar.find(x=>String(x.ig_id)===String(id))
      const uname = h?.ig_username || null
      if (!uname) return true
      if (gorulmusUsernames.has(uname)) return false
      gorulmusUsernames.add(uname)
      return true
    }) : []

    // Page token kullan — user token DEĞİL (user token kişisel hesabı kilitler)
    // Her sayfa/IG hesabı kendi page_token'ını kullanır
    // userToken kaldırıldı — sayfa.page_token kullan
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
                url: efektifGorselUrl,
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
        const sayfa = hesaplar.find(h=>String(h.ig_id)===String(igId))

        if (!sayfa?.page_token) {
          sonuclar.instagram[igId] = { hata: 'Bu IG hesabına ait token kaydı yok — Meta token yenile (yanlış hesapla paylaşım riskine karşı ilk hesaba düşülmüyor)' }
          return
        }

        // Kota kontrolü — günde 50 post limiti
        const kota = await kotaKontrol(igId, sayfa.page_token)
        if (!kota.ok) {
          sonuclar.instagram[igId] = {
            hata: `Günlük limit doldu (${kota.kullanim}/${kota.limit}) — yarın sıfırlanır`,
            kota_doldu: true,
            kullanim: kota.kullanim,
            limit: kota.limit,
          }
          return
        }

        // Carousel (çoklu görsel)
        if (is_carousel && galeri_urls.length > 1) {
          try {
            // Her görsel için container oluştur
            const containerIds = []
            for (const itemUrl of galeri_urls) {
              const isItemVideo = (itemUrl || '').includes('.mp4') || (itemUrl || '').includes('video')
              const itemBody = isItemVideo
                ? { video_url: itemUrl, media_type: 'VIDEO', is_carousel_item: true, access_token: sayfa.page_token }
                : { image_url: itemUrl, is_carousel_item: true, access_token: sayfa.page_token }
              const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify(itemBody),
              })
              const cData = await cRes.json()
              if (cData.error) {
                console.error('[carousel] item hata:', itemUrl.substring(0,60), cData.error.message)
              } else {
                containerIds.push(cData.id)
              }
            }
            if (containerIds.length === 0) {
              sonuclar.instagram[igId] = { hata: "Hicbir gorsel yuklenemedi — URL'ler Instagram tarafindan erisilemiyebilir" }
            } else if (containerIds.length > 1) {
              // Carousel container oluştur
              const carRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                  media_type: 'CAROUSEL',
                  children: containerIds.join(','),
                  caption: metin,
                  access_token: sayfa.page_token,
                }),
              })
              const carData = await carRes.json()
              if (!carData.error) {
                await new Promise(r=>setTimeout(r,2000))
                sonuclar.instagram[igId] = await igPublishNetlestir(igId, carData.id, sayfa.page_token, sayfa.ig_username, { carousel: true })
              } else {
                sonuclar.instagram[igId] = { hata: carData.error.message }
              }
            }
          } catch(e) { sonuclar.instagram[igId] = { hata: e.message } }
        }
        // Feed post
        else if (is_video && (efektifVideo || video_url)) {
          // Render edilmiş video (medya.rdr.ist) ise REELS, ham video ise foto olarak paylaş
          const kullanilanVideo = efektifVideo || video_url || ''
          const isR2Video = (kullanilanVideo || '').includes('medya.rdr.ist')
          const igMediaType = isR2Video ? 'REELS' : 'IMAGE'
          const igBody = isR2Video
            ? { video_url: kullanilanVideo, caption: metin, media_type: 'REELS', share_to_feed: true }
            : { image_url: efektifGorsel || kullanilanVideo, caption: metin }
          const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              ...igBody,
              ...(ig_kolabor?.length ? { collaborators:ig_kolabor } : {}),
              access_token:sayfa.page_token
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
                `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${sayfa.page_token}`
              )
              const statusData = await statusRes.json()
              if (statusData.status_code === 'FINISHED') {
                sonuclar.instagram[igId] = await igPublishNetlestir(igId, containerId, sayfa.page_token, sayfa.ig_username)
                published = true
                break
              } else if (statusData.status_code === 'ERROR') {
                // Tam hata detayını al
                const errRes = await fetch(
                  `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${sayfa.page_token}`
                )
                const errData = await errRes.json()
                sonuclar.instagram[igId] = { hata: 'Video ERROR: ' + JSON.stringify(errData.status || errData) }
                published = true
                break
              }
            }
            if (!published) {
              // Zaman aşımı — container_id KV'ye kaydet, video-durum endpoint'i publish eder
              try {
                await env.HABERLER.put(
                  `ig_container:${containerId}`,
                  JSON.stringify({ igId, pageToken: sayfa.page_token, ig_username: sayfa.ig_username, tarih: new Date().toISOString() }),
                  { expirationTtl: 60 * 60 * 24 }  // 24 saat
                )
              } catch {}
              sonuclar.instagram[igId] = { bekliyor: true, container_id: containerId, ig_username: sayfa.ig_username }
            }
          }
        } else if (gorsel_url) {
          const cRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              image_url:gorsel_url, caption:metin,
              ...(ig_kolabor?.length ? { collaborators:ig_kolabor } : {}),
              access_token:sayfa.page_token
            }),
          })
          const cData = await cRes.json()
          if (cData.error) {
            sonuclar.instagram[igId] = { hata:cData.error.message }
          } else {
            await new Promise(r=>setTimeout(r,2000))
            sonuclar.instagram[igId] = await igPublishNetlestir(igId, cData.id, sayfa.page_token, sayfa.ig_username)
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
              body: JSON.stringify({ video_url, media_type:'REELS', access_token:sayfa.page_token }),
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
                body: JSON.stringify({ image_url:storyImg, access_token:sayfa.page_token }),
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
          post_id:s.media_id||'', permalink:s.permalink||'', kullanici, tip:is_video?'video':'foto',
          hesap:s.ig_username||igKey.replace('_story',''),
          ig_id:igKey.replace('_story',''), tarih:new Date().toISOString() })
      }
      await env.HABERLER.put('paylas_log', JSON.stringify(all.slice(0,500)))
    } catch(e){ console.warn('Log:', e.message) }

    return Response.json({ basarili:true, sonuclar })
  } catch(e) {
    console.error('[meta-paylas] HATA:', e.message, e.stack?.split('\n')[1])
    return Response.json({ hata: e.message, stack: e.stack?.split('\n')[0] }, { status:500 })
  }
}
