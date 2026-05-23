// ── OTO GÖRSEL ÜRET — SVG overlay + Canvas metin/görsel ─────────────────
import { useState, useEffect } from 'react'

const MANIFEST = {
  "facebook": {
    "w": 1200,
    "h": 630,
    "baslik": {
      "x": 64.668,
      "y": 481.1357,
      "fontSize": 54.638,
      "fontFamily": "Poppins-SemiBold",
      "fill": "#FFFFFF"
    },
    "spot_baslik": {
      "x": 66.0957,
      "y": 580.1035,
      "fontSize": 25.5276,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "tarih": {
      "x": 1074.2568,
      "y": 611.5059,
      "fontSize": 19.08,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "kategori": {
      "x": 1168,
      "y": 580,
      "fontSize": 20,
      "fill": "#ED1C24"
    }
  },
  "instagram": {
    "w": 1080,
    "h": 1080,
    "baslik": {
      "x": 72.3062,
      "y": 795.374,
      "fontSize": 72.4759,
      "fontFamily": "Poppins-SemiBold",
      "fill": "#FFFFFF"
    },
    "spot_baslik": {
      "x": 74.4922,
      "y": 940.4033,
      "fontSize": 39.0543,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "tarih": {
      "x": 928,
      "y": 1027.5273,
      "fontSize": 22.477,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "kategori": {
      "x": 226,
      "y": 1030,
      "fontSize": 20,
      "fill": "#ED1C24"
    }
  },
  "twitter": {
    "w": 1600,
    "h": 900,
    "baslik": {
      "x": 88.376,
      "y": 684.3184,
      "fontSize": 60,
      "fontFamily": "Poppins-SemiBold",
      "fill": "#FFFFFF"
    },
    "spot_baslik": {
      "x": 90.2754,
      "y": 822.2051,
      "fontSize": 33.9666,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "tarih": {
      "x": 1431.7168,
      "y": 813.9883,
      "fontSize": 25.3875,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "kategori": {
      "x": 1556.5,
      "y": 850,
      "fontSize": 20,
      "fill": "#ED1C24"
    }
  },
  "youtube": {
    "w": 1280,
    "h": 720,
    "baslik": {
      "x": 70.9229,
      "y": 553.6553,
      "fontSize": 60,
      "fontFamily": "Poppins-SemiBold",
      "fill": "#FFFFFF"
    },
    "spot_baslik": {
      "x": 72.4424,
      "y": 669.5928,
      "fontSize": 27.1817,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "tarih": {
      "x": 1145.9297,
      "y": 653.0176,
      "fontSize": 20.3163,
      "fontFamily": "MyriadPro-Regular",
      "fill": "#FFFFFF"
    },
    "kategori": {
      "x": 1245.7,
      "y": 670,
      "fontSize": 20,
      "fill": "#ED1C24"
    }
  }
}
const FORMATLAR = ['instagram','facebook','twitter','youtube']

// Görsel yükle (crossOrigin destekli)
function loadImg(src, cross = false) {
  return new Promise((res) => {
    const img = new Image()
    if (cross) img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

// Metin satır sarmala (canvas measureText ile)
function wrapText(ctx, text, maxW, maxLines = 3) {
  const words = (text || '').split(' ')
  const lines = []; let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, maxLines)
}

// Tek format render
async function renderFormat(format, haber) {
  const meta = MANIFEST[format]
  if (!meta) return null
  const { w, h } = meta

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 1. Arka plan görseli (proxy üzerinden)
  const gorselUrl = haber.gorsel_url || haber.gorsel || ''
  if (gorselUrl) {
    const proxyUrl = `/api/gorsel-proxy?url=${encodeURIComponent(gorselUrl)}`
    const bg = await loadImg(proxyUrl, true)
    if (bg) {
      const s = Math.max(w / bg.width, h / bg.height)
      ctx.drawImage(bg, (w - bg.width * s) / 2, (h - bg.height * s) / 2, bg.width * s, bg.height * s)
    }
  } else {
    ctx.fillStyle = '#1a2535'; ctx.fillRect(0, 0, w, h)
  }

  // 2. SVG overlay — arka_plan katmanını boşalt, metinleri kaldır
  const svgRes = await fetch(`/templates/${format}.svg`)
  let svg = await svgRes.text()

  // Arka plan layer içeriğini temizle (sadece boş rect bırak)
  svg = svg.replace(/<g id="arka_x5F_plan">[sS]*?<\/g>/,
    `<g id="arka_x5F_plan"><rect width="${w}" height="${h}" fill="none"/></g>`)

  // Metin layerlarını boşalt (canvas'ta çizeceğiz)
  ;['baslik','spot_x5F_baslik','tarih','kategori_x5F_badge'].forEach(id => {
    svg = svg.replace(new RegExp(`<g id="${id}">[\\s\\S]*?<\/g>`), `<g id="${id}"></g>`)
  })

  // Görsel placeholder'ı temizle
  svg = svg.replace(/xlink:href="{{GORSEL_URL}}"/g, 'xlink:href=""')
  svg = svg.replace(/xlink:href="HABER_GORSELI_PLACEHOLDER"/g, 'xlink:href=""')

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const bUrl = URL.createObjectURL(blob)
  const svgImg = await loadImg(bUrl)
  if (svgImg) ctx.drawImage(svgImg, 0, 0, w, h)
  URL.revokeObjectURL(bUrl)

  // 3. Metin — Canvas API ile
  const baslik   = haber.sosyal_baslik || haber.site_basligi || haber.baslik || ''
  const spot     = haber.ozet || ''
  const tarih    = haber.tarih || new Date().toLocaleDateString('tr-TR')
  const kategori = (haber.kategori || 'GÜNCEL').toUpperCase()

  // Başlık
  const bm = meta.baslik
  const maxW = w - bm.x - 60
  ctx.font = `600 ${bm.fontSize}px Poppins, Arial`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 1

  const bLines = wrapText(ctx, baslik, maxW, 3)
  const bLineH = bm.fontSize * 1.3
  bLines.forEach((line, i) => ctx.fillText(line, bm.x, bm.y + i * bLineH))

  // Spot başlık
  const sm = meta.spot_baslik
  // Spot başlangıç Y'sini dinamik hesapla (başlık bitişinden)
  const spotY = bm.y + bLines.length * bLineH + sm.fontSize * 0.8
  ctx.font = `400 ${sm.fontSize}px 'Open Sans', Arial`
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.shadowBlur = 8
  const sLines = wrapText(ctx, spot, w - sm.x - 60, 2)
  sLines.forEach((line, i) => ctx.fillText(line, sm.x, spotY + i * sm.fontSize * 1.4))

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

  // Tarih
  const tm = meta.tarih
  ctx.font = `400 ${tm.fontSize}px 'Open Sans', Arial`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  const tw = ctx.measureText(tarih).width
  ctx.fillText(tarih, tm.x - tw, tm.y)

  // Kategori badge — pozisyonu SVG'deki kırmızı badge'e göre
  const km = meta.kategori
  const kText = kategori
  ctx.font = `700 ${km.fontSize}px Poppins, Arial`
  const kw = ctx.measureText(kText).width
  const kPad = km.fontSize * 0.55
  const kH   = km.fontSize * 1.5
  const kX   = bm.x  // Sol hizalı (başlıkla aynı x)
  const kY   = tm.y - kH * 0.2
  const kR   = kH * 0.45

  ctx.fillStyle = '#ED1C24'
  ctx.beginPath()
  ctx.roundRect(kX, kY - kH * 0.75, kw + kPad * 2, kH, kR)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(kText, kX + kPad, kY)

  return canvas.toDataURL('image/jpeg', 0.93)
}

const Ic = ({ n, size = 14 }) =>
  <i className={`ti ti-${n}`} aria-hidden="true" style={{ fontSize: size }} />

export default function OtoGorselUret({ haber }) {
  const [gorseller, setGorseller] = useState({})
  const [yukleniyor, setYukl]     = useState(false)

  useEffect(() => {
    if (!haber?.source_id) return
    let iptal = false
    setGorseller({})
    setYukl(true)

    ;(async () => {
      const sonuc = {}
      for (const fmt of FORMATLAR) {
        if (iptal) break
        try { sonuc[fmt] = await renderFormat(fmt, haber) }
        catch (e) { console.warn(fmt, e.message) }
        if (!iptal) setGorseller({ ...sonuc })
      }
      if (!iptal) setYukl(false)
    })()

    return () => { iptal = true }
  }, [haber?.source_id])

  if (yukleniyor && !Object.keys(gorseller).length) return (
    <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Ic n="loader-2" size={14} /> Sosyal medya görselleri hazırlanıyor…
    </div>
  )

  if (!Object.keys(gorseller).length) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FORMATLAR.map(fmt => {
          const src = gorseller[fmt]
          if (!src) return null
          const meta = MANIFEST[fmt]
          return (
            <div key={fmt}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {fmt} · {meta.w}×{meta.h}
              </div>
              <img src={src} alt={fmt} style={{ width: '100%', borderRadius: 6, border: '0.5px solid var(--border)', display: 'block', marginBottom: 4 }} />
              <a href={src} download={`kayserim-${fmt}-${Date.now()}.jpg`}>
                <button style={{ width: '100%', fontSize: 11, background: 'rgba(0,212,170,.08)', border: '0.5px solid rgba(0,212,170,.25)', color: '#00D4AA' }}>
                  <Ic n="download" size={11} /> İndir
                </button>
              </a>
            </div>
          )
        })}
      </div>
      {yukleniyor && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}><Ic n="loader-2" size={11}/> Diğer formatlar hazırlanıyor…</div>}
    </div>
  )
}
