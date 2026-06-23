import { useState, useEffect, useCallback } from 'react'

/**
 * Keşfet Radar paneli — İZOLE component.
 * Rakip yerel haber fırsatlarını Discover skoruna göre listeler,
 * "Bu konuyu yaz" ile Claude'dan ÖZGÜN + Discover-optimize taslak üretir
 * ve mevcut Manuel Haber editörüne aktarır (onManuelAc).
 *
 * Props: { user, onGeri, onManuelAc }
 */

const RENK = {
  acil:   { bg: 'rgba(230,57,70,0.10)',  bd: 'rgba(230,57,70,0.35)',  c: '#ff7b7b', et: 'ACİL YAZ' },
  firsat: { bg: 'rgba(255,183,0,0.10)',  bd: 'rgba(255,183,0,0.30)',  c: '#FFB700', et: 'FIRSAT' },
  izle:   { bg: 'rgba(255,255,255,0.03)',bd: 'var(--border)',          c: 'var(--muted)', et: 'İZLE' },
}
const TUR_ET = {
  olay:'Olay', hava:'Hava', vefat:'Vefat', spor:'Spor', ekonomi:'Ekonomi',
  egitim:'Eğitim', gundem:'Gündem', kisi:'Kişi', diger:'Diğer',
}

function yas(pubDate) {
  const t = Date.parse(pubDate)
  if (!t || isNaN(t)) return ''
  const dk = Math.max(0, (Date.now() - t) / 6e4)
  if (dk < 60) return `${Math.round(dk)} dk önce`
  const s = dk / 60
  if (s < 24) return `${Math.round(s)} saat önce`
  return `${Math.round(s / 24)} gün önce`
}

export default function KesfetRadar({ user, onGeri, onManuelAc }) {
  const token = localStorage.getItem('cms_token') || ''
  const [firsatlar, setFirsatlar] = useState([])
  const [sonTarama, setSonTarama] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [tariyor, setTariyor] = useState(false)
  const [uretilen, setUretilen] = useState(null) // o an taslak üretilen fırsat id
  const [filtre, setFiltre] = useState('aktif')   // aktif | hepsi | acil
  const [hata, setHata] = useState(null)

  const getir = useCallback(async () => {
    setYukleniyor(true); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-radar?action=list&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      setFirsatlar(d.firsatlar || [])
      setSonTarama(d.son_tarama || null)
    } catch (e) { setHata(e.message) }
    setYukleniyor(false)
  }, [token])

  useEffect(() => { getir() }, [getir])

  const tara = async () => {
    setTariyor(true); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-radar?action=scan&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      await getir()
    } catch (e) { setHata('Tarama hatası: ' + e.message) }
    setTariyor(false)
  }

  const isaretle = async (id, alan) => {
    setFirsatlar(fs => fs.map(f => f.id === id ? { ...f, [alan]: true } : f))
    try {
      await fetch(`/api/kesfet-radar?action=mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark', id, alan, secret: token }),
      })
    } catch (_) {}
  }

  // "Bu konuyu yaz" → Claude'dan ÖZGÜN + Discover taslak → Manuel editöre aktar
  const yaz = async (f) => {
    setUretilen(f.id); setHata(null)
    const sistem = `Sen kayserim.net için çalışan kıdemli bir yerel haber editörüsün. Görevin, bir KONU sinyalinden Google Discover'a düşecek ÖZGÜN bir haber taslağı yazmak.

KURALLAR (Şubat 2026 Discover core update sonrası):
- Verilen rakip başlığı SADECE konu sinyalidir. ASLA kopyalama, yeniden yazma değil; konuyu kendi orijinal kelimelerinle, sıfırdan, daha derin ve Kayseri-yerel açıdan ele al.
- og_baslik: merak uyandıran ama temel bilgiyi saklamayan, dürüst başlık. Tıklama tuzağı (clickbait) yok — vaadini metin karşılamalı. Mümkünse somut sayı/yer/yerellik içersin.
- site_baslik: SEO uyumlu, max 70 karakter, "Kayseri" doğal geçsin.
- metin: en az 350 kelime, H2 alt başlıklarıyla (## ile), "ne oldu" + "neden / Kayseri için ne anlama geliyor" bağlamı. İlk paragrafta ana bilgi.
- Bilgi uydurma. Emin olmadığın detayı genel/temkinli yaz, doğrulanması gerekenleri [DOĞRULA: ...] olarak işaretle.
- Sadece JSON döndür, başka hiçbir şey yazma.`

    const kullanici = `KONU SİNYALİ (rakip başlığı, sadece referans): "${f.baslik}"
Kaynak alan(lar): ${f.kaynaklar.join(', ')}
Tür: ${TUR_ET[f.tur] || f.tur}
Yerel: ${f.yerel ? 'evet' : 'belirsiz'}

Şu JSON'u üret:
{
  "og_baslik": "...",
  "site_baslik": "...",
  "kategori": "Güncel | Asayiş | Spor | Ekonomi | Eğitim | Yaşam",
  "metin": "## ...\\n\\n..."
}`

    try {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: sistem,
          messages: [{ role: 'user', content: kullanici }],
        }),
      })
      const d = await r.json()
      const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
      const json = JSON.parse(text.replace(/```json|```/g, '').trim())

      // Fırsatı "yazıldı" işaretle (hatırlatma listesinden düşsün)
      isaretle(f.id, 'yazildi')

      // Mevcut Manuel Haber editörüne aktar — kanıtlanmış prefill akışı
      onManuelAc({
        baslik:     json.site_baslik || f.baslik,
        metin:      json.metin || '',
        kategori:   json.kategori || 'Güncel',
        gorsel_url: f.gorsel_url || '',
        keyword:    json.og_baslik || '',  // og başlığı manuel tarafında kullanılabilir
        kaynak_url: f.link || '',
      })
    } catch (e) {
      setHata('Taslak üretilemedi: ' + e.message)
      setUretilen(null)
    }
  }

  const gorunen = firsatlar.filter(f => {
    if (filtre === 'acil')  return f.durum === 'acil' && !f.yazildi && !f.gizli
    if (filtre === 'aktif') return !f.yazildi && !f.gizli
    return true
  })
  const acilSayisi   = firsatlar.filter(f => f.durum === 'acil' && !f.yazildi && !f.gizli).length
  const firsatSayisi = firsatlar.filter(f => f.durum === 'firsat' && !f.yazildi && !f.gizli).length

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 1rem', height: 48, borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#9b6bff' }}>Keşfet Radar</div>
        <button onClick={onGeri} style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)' }}>← Menü</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {sonTarama?.zaman && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Son tarama: {yas(sonTarama.zaman)}</span>}
          <button onClick={tara} disabled={tariyor}
            style={{ fontSize: 12, color: '#9b6bff', background: 'rgba(155,107,255,0.10)', border: '0.5px solid rgba(155,107,255,0.30)' }}>
            {tariyor ? 'Taranıyor…' : '⟳ Şimdi tara'}
          </button>
        </div>
      </div>

      {/* Özet / hatırlatma şeridi */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 1rem', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: acilSayisi ? '#ff7b7b' : 'var(--muted)' }}>
          {acilSayisi > 0 ? `🔴 ${acilSayisi} konu acil — rakipte var, sende yok` : 'Acil fırsat yok'}
        </div>
        {firsatSayisi > 0 && <div style={{ fontSize: 13, color: '#FFB700' }}>🟡 {firsatSayisi} fırsat</div>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[['aktif', 'Aktif'], ['acil', 'Acil'], ['hepsi', 'Hepsi']].map(([id, l]) => (
            <button key={id} onClick={() => setFiltre(id)}
              style={{ fontSize: 11, background: filtre === id ? 'rgba(255,255,255,.08)' : 'transparent', border: filtre === id ? '0.5px solid rgba(255,255,255,.2)' : '0.5px solid transparent', color: filtre === id ? 'var(--text)' : 'var(--muted)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Kaynak durumu */}
      {sonTarama?.kaynak_durum && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 1rem', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          {sonTarama.kaynak_durum.map(k => (
            <span key={k.domain} style={{ fontSize: 10, color: k.ok ? '#00D4AA' : '#E63946', background: 'rgba(255,255,255,.03)', border: '0.5px solid var(--border)', padding: '2px 7px', borderRadius: 10 }}>
              {k.ok ? '●' : '○'} {k.domain} {k.ok ? `(${k.adet})` : '— feed yok'}
            </span>
          ))}
        </div>
      )}

      {hata && <div style={{ padding: '8px 1rem', color: '#ff7b7b', fontSize: 12 }}>{hata}</div>}

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {yukleniyor ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20 }}>Yükleniyor…</div>
        ) : gorunen.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
            Fırsat yok. "Şimdi tara" ile rakip feed'lerini tarayın.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gorunen.map(f => {
              const r = RENK[f.durum] || RENK.izle
              return (
                <div key={f.id} style={{ background: r.bg, border: `0.5px solid ${r.bd}`, borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', opacity: f.yazildi || f.gizli ? 0.55 : 1 }}>
                  {f.gorsel_url
                    ? <img src={f.gorsel_url} alt="" onError={e => (e.target.style.display = 'none')} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 6, flexShrink: 0, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📰</div>}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: r.c, background: r.bg, border: `0.5px solid ${r.bd}`, padding: '1px 6px', borderRadius: 4 }}>{r.et}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9b6bff' }}>{f.skor}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>· {TUR_ET[f.tur] || f.tur}</span>
                      {f.yerel && <span style={{ fontSize: 10, color: '#00D4AA' }}>· yerel</span>}
                      {f.kaynak_sayisi >= 2 && <span style={{ fontSize: 10, color: '#FFB700' }}>· {f.kaynak_sayisi} kaynak (trend)</span>}
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{yas(f.pubDate)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.35 }}>{f.baslik}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {f.bizde_var ? 'sende benzeri var' : 'sende yok'} · {f.kaynaklar.join(', ')}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={() => yaz(f)} disabled={uretilen === f.id || f.yazildi}
                        style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: f.yazildi ? 'rgba(255,255,255,.1)' : 'rgba(155,107,255,0.85)', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: f.yazildi ? 'default' : 'pointer' }}>
                        {uretilen === f.id ? 'Taslak üretiliyor…' : f.yazildi ? '✓ Yazıldı' : '✍ Bu konuyu yaz'}
                      </button>
                      {f.link && <a href={f.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>Kaynak ↗</a>}
                      {!f.gizli && !f.yazildi && (
                        <button onClick={() => isaretle(f.id, 'gizli')}
                          style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
                          Gizle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
