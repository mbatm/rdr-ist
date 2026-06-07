/**
 * Render Cache Yardımcı Modülü
 * 
 * Hash hesaplama: kaynak URL + template ID + modifications → MD5-benzeri hash
 * KV'de saklarız: render_cache:{hash} → { url, tarih, template_id }
 * TTL: 30 gün
 * 
 * Bu sayede:
 * - Aynı video + aynı başlık → tekrar render YOK
 * - Başlık değişti → yeni hash → yeni render
 * - Kadraj değişti → yeni hash → yeni render
 */

// Basit ama yeterince eşsiz hash fonksiyonu
export function renderHash(templateId, modifications) {
  const str = templateId + '::' + JSON.stringify(modifications, Object.keys(modifications).sort())
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// Cache'den render URL al
export async function cacheGet(env, hash) {
  try {
    const val = await env.HABERLER.get(`render_cache:${hash}`, 'json')
    return val?.url || null
  } catch { return null }
}

// Cache'e render URL kaydet (30 gün)
export async function cacheSet(env, hash, url, meta = {}) {
  try {
    await env.HABERLER.put(
      `render_cache:${hash}`,
      JSON.stringify({ url, tarih: new Date().toISOString(), ...meta }),
      { expirationTtl: 60 * 60 * 24 * 10 }
    )
  } catch {}
}
