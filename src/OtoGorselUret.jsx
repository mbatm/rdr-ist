// ── OTO GÖRSEL ÜRET v3 — Creatomate tabanlı ────────────────────────────────
import { useState, useEffect, useRef } from 'react'

const FORMATLAR = [
  { key: 'dikey', label: 'Dikey (Instagram)', format: 'dikey' },
  { key: 'yatay', label: 'Yatay (FB/TW/YT)',  format: 'yatay' },
]

export default function OtoGorselUret({ haber, onGorsellerHazir, kadraj = null }) {
  const [items, setItems] = useState({})
  const [busy,  setBusy]  = useState(false)
  const [hata,  setHata]  = useState(null)
  const stopRef = useRef(false)

  useEffect(() => {
    if (!haber?.source_id) return
    const gorselUrl = haber.gorsel_url || haber.gorsel || ''
    if (!gorselUrl) return

    stopRef.current = false
    setItems({})
    setHata(null)
    setBusy(true)

    const tarih    = haber.tarih_iso
      ? new Date(haber.tarih_iso).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
      : new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
    const kategori = haber.kategori || 'GÜNCEL'
    const baslik   = haber.sosyal_baslik || haber.site_basligi || haber.baslik || ''
    const spot     = haber.ozet || ''
    const imgUrl   = gorselUrl.startsWith('http') ? gorselUrl : `https://rdr.ist${gorselUrl}`

    ;(async () => {
      const acc  = {}
      const urls = {}

      for (const { key, format } of FORMATLAR) {
        if (stopRef.current) break
        try {
          const res  = await fetch('/api/gorsel-uret', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ gorsel_url: imgUrl, baslik, spot, kategori, tarih, format, kadraj }),
          })
          const data = await res.json()
          if (data.url && !stopRef.current) {
            acc[key]  = data.url
            urls[key] = data.url
            setItems(p => ({ ...p, [key]: data.url }))
          } else if (data.hata) {
            console.warn(`${key} render hatası:`, data.hata)
          }
        } catch (e) {
          console.warn(`${key} hata:`, e.message)
        }
      }

      if (!stopRef.current) {
        setBusy(false)
        // gorselUrls uyumluluğu — eski formatlar
        const compat = {
          instagram: urls.dikey,
          facebook:  urls.yatay,
          twitter:   urls.yatay,
          youtube:   urls.yatay,
        }
        onGorsellerHazir?.({ items: acc, urls: compat })
      }
    })()

    return () => { stopRef.current = true }
  }, [haber?.source_id, haber?.gorsel_url, haber?.gorsel])

  if (busy && Object.keys(items).length === 0)
    return (
      <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--muted)' }}>
        ⏳ Creatomate görsel üretiyor…
      </div>
    )

  if (hata) return <div style={{ fontSize: 12, color: '#ff7b7b', padding: '8px 0' }}>⚠️ {hata}</div>
  if (Object.keys(items).length === 0) return null

  return (
    <div>
      {busy && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          ⏳ {Object.keys(items).length}/{FORMATLAR.length} görsel hazır…
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FORMATLAR.map(({ key, label }) => {
          const src = items[key]
          if (!src) return null
          return (
            <div key={key}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between' }}>
                <span>{label}</span>
                <span style={{ color: '#00D4AA' }}>✓</span>
              </div>
              <img src={src} alt={key}
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}
                onError={e => { e.target.style.opacity = '0.3' }}/>
              <a href={src} download={`${key}-${haber?.source_id}.png`}
                style={{ display: 'block', textAlign: 'center', fontSize: 10, color: 'var(--muted)', marginTop: 4, textDecoration: 'none', padding: '3px 0', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
                ↓ İndir
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
