/**
 * GET /api/meta-token-saglik
 * Tüm Meta hesaplarının token durumunu raporlar (190 avcısı).
 */
export async function onRequestGet({ request, env }) {
  try {
    const meta = await env.HABERLER.get('meta_tokens', 'json') || {}
    const hesaplar = meta.hesaplar || []
    if (!hesaplar.length) return Response.json({ hata: 'Kayıtlı hesap yok' }, { status: 404 })

    // Mükerrer ig_id tespiti — aynı IG hesabı birden çok sayfaya bağlıysa
    // biri bayat token taşıyabilir: "paylaşıldı ama hata gösterdi" çelişkisinin ana sebebi.
    const igSayilari = {}
    for (const h of hesaplar) if (h.ig_id) igSayilari[h.ig_id] = (igSayilari[h.ig_id] || 0) + 1

    const rapor = await Promise.all(hesaplar.map(async (h) => {
      const sonuc = {
        page_name: h.page_name, page_id: h.page_id,
        ig_username: h.ig_username, ig_id: h.ig_id,
        mukerrer_ig: h.ig_id ? igSayilari[h.ig_id] > 1 : false,
      }
      try {
        // Sayfa token'ı canlı mı? /me çağrısı 190 dönerse token ölü.
        const r = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${h.page_token}`)
        const d = await r.json()
        if (d.error) {
          sonuc.token = 'GEÇERSİZ'
          sonuc.hata_kodu = d.error.code
          sonuc.hata = d.error.message.slice(0, 120)
        } else {
          sonuc.token = 'GEÇERLİ'
          // Süre bilgisi: System User sayfa token'ları normalde süresizdir;
          // debug_token ile expires_at netleştirilir (0 = süresiz).
          if (meta.system_token) {
            try {
              const dr = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${h.page_token}&access_token=${meta.system_token}`)
              const dd = await dr.json()
              const exp = dd?.data?.expires_at
              sonuc.son_kullanma = exp === 0 ? 'süresiz' : exp ? new Date(exp * 1000).toISOString() : 'bilinmiyor'
              const dexp = dd?.data?.data_access_expires_at
              if (dexp) sonuc.veri_erisim_sonu = new Date(dexp * 1000).toISOString().slice(0, 10)
            } catch {}
          }
        }
      } catch (e) { sonuc.token = 'ERİŞİM HATASI'; sonuc.hata = e.message }
      return sonuc
    }))

    const gecersizler = rapor.filter(r => r.token !== 'GEÇERLİ')
    return Response.json({
      ok: true,
      kaydedildi: meta.kaydedildi || null,
      toplam: rapor.length,
      gecersiz_sayisi: gecersizler.length,
      ozet: gecersizler.length
        ? `${gecersizler.length} hesabın token'ı geçersiz — /api/meta-system-token'a YENİ System User token girin (tüm sayfa tokenları yenilenir)`
        : 'Tüm tokenlar geçerli',
      rapor,
    })
  } catch (e) {
    return Response.json({ hata: e.message }, { status: 500 })
  }
}

