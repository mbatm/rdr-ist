// ── SVG TABANLI OTOMATİK GÖRSEL ÜRETME SİSTEMİ ──────────────────────────
// Haber düştüğünde otomatik olarak 4 format PNG üretir
// Kaynaklar: /public/templates/{format}.svg + manifest.json

import { useState, useEffect, useCallback } from 'react'

const MANIFEST = {
  "facebook": {
    "w": 1200,
    "h": 630,
    "baslik": {
      "x": 64.668,
      "y": 481.1357,
      "fontSize": 54.638,
      "fontFamily": "Poppins"
    },
    "spot_baslik": {
      "x": 66.0957,
      "y": 580.1035,
      "fontSize": 25.5276,
      "fontFamily": "Open Sans"
    },
    "tarih": {
      "x": 1074.2568,
      "y": 611.5059,
      "fontSize": 19.08,
      "fontFamily": "Open Sans"
    }
  },
  "instagram": {
    "w": 1080,
    "h": 1080,
    "baslik": {
      "x": 72.3062,
      "y": 795.374,
      "fontSize": 72.4759,
      "fontFamily": "Poppins"
    },
    "spot_baslik": {
      "x": 74.4922,
      "y": 940.4033,
      "fontSize": 39.0543,
      "fontFamily": "Open Sans"
    },
    "tarih": {
      "x": 928,
      "y": 1027.5273,
      "fontSize": 22.477,
      "fontFamily": "Open Sans"
    }
  },
  "twitter": {
    "w": 1600,
    "h": 900,
    "baslik": {
      "x": 88.376,
      "y": 684.3184,
      "fontSize": 60,
      "fontFamily": "Poppins"
    },
    "spot_baslik": {
      "x": 90.2754,
      "y": 822.2051,
      "fontSize": 33.9666,
      "fontFamily": "Open Sans"
    },
    "tarih": {
      "x": 1431.7168,
      "y": 813.9883,
      "fontSize": 25.3875,
      "fontFamily": "Open Sans"
    }
  },
  "youtube": {
    "w": 1280,
    "h": 720,
    "baslik": {
      "x": 70.9229,
      "y": 553.6553,
      "fontSize": 60,
      "fontFamily": "Poppins"
    },
    "spot_baslik": {
      "x": 72.4424,
      "y": 669.5928,
      "fontSize": 27.1817,
      "fontFamily": "Open Sans"
    },
    "tarih": {
      "x": 1145.9297,
      "y": 653.0176,
      "fontSize": 20.3163,
      "fontFamily": "Open Sans"
    }
  }
}

const FORMATLAR = ['instagram','facebook','twitter','youtube']

// Google Fonts yükle (Canvas için)
async function fontYukle() {
  const fonts = [
    new FontFace('Poppins', "url(https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2)", { weight: '600' }),
    new FontFace('Open Sans', "url(https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsiH0C4n.woff2)", { weight: '400' }),
  ]
  await Promise.all(fonts.map(async f => { try { await f.load(); document.fonts.add(f) } catch {} }))
}

// Metin satır sarmala
function wrapText(ctx, text, maxW, fontSize) {
  const words = text.split(' ')
  const lines = []; let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

// SVG şablonunu canvas'a render et
async function renderFormat(format, { gorselUrl, baslik, spotBaslik, kategori, tarih }) {
  const meta = MANIFEST[format]
  if (!meta) return null

  // SVG şablonunu çek
  const svgRes = await fetch(`/templates/${format}.svg`)
  let svgText  = await svgRes.text()

  // Arka plan görseli: base64 olarak al (CORS için proxy)
  let gorselB64 = ''
  if (gorselUrl) {
    try {
      const r = await fetch(`/api/gorsel-proxy?url=${encodeURIComponent(gorselUrl)}`)
      const buf = await r.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const mime = gorselUrl.includes('.png') ? 'image/png' : 'image/jpeg'
      gorselB64 = `data:${mime};base64,${b64}`
    } catch {}
  }

  // SVG'ye görseli yerleştir
  svgText = svgText.replace(/xlink:href="{{GORSEL_URL}}"/g,
    gorselB64 ? `xlink:href="${gorselB64}"` : 'xlink:href=""')

  // Metin içeriklerini SVG'de değiştir
  const kaynakBaslik = 'Haber Başlığı Bu Kısma'
  const kaynakSpot   = 'Spot Başlık İçin Gerekli Alan'

  // Baslik metni değiştir (tspan içinde)
  svgText = svgText.replace(
    new RegExp(`(<tspan[^>]*>)${kaynakBaslik}</tspan>([\\s\\S]*?<tspan[^>]*>)Gelecek</tspan>`, 'g'),
    (_, open, mid) => {
      const maxW = meta.w - meta.baslik.x - 60
      const lines = wrapLines(baslik || '', maxW, meta.baslik.fontSize)
      return lines.map((l, i) => `${open}${l}</tspan>`).join('')
    }
  )

  // Baslik single tspan fallback
  svgText = svgText.replace(new RegExp(kaynakBaslik, 'g'), baslik || kaynakBaslik)
  svgText = svgText.replace(/Gelecek/g, '')
  svgText = svgText.replace(new RegExp(kaynakSpot, 'g'), spotBaslik || '')

  // Tarih
  svgText = svgText.replace(/23\.05\.2026/g, tarih || new Date().toLocaleDateString('tr-TR'))

  // Kategori badge metni
  svgText = svgText.replace(/GÜN[CK]EL|GÜNCEL|GENEL|SPOR|EKONOMİ/g, (kategori || 'GÜNCEL').toUpperCase())

  // Canvas'a render et
  const DPR    = 1
  const canvas = document.createElement('canvas')
  canvas.width  = meta.w * DPR
  canvas.height = meta.h * DPR
  const ctx = canvas.getContext('2d')

  const blob   = new Blob([svgText], { type: 'image/svg+xml' })
  const url    = URL.createObjectURL(blob)
  await new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); res() }
    img.onerror = rej
    img.src = url
  })
  URL.revokeObjectURL(url)

  return canvas.toDataURL('image/jpeg', 0.93)
}

function wrapLines(text, maxPx, fontSize) {
  // Yaklaşık karakter başına piksel
  const chPx = fontSize * 0.55
  const maxCh = Math.floor(maxPx / chPx)
  const words = text.split(' ')
  const lines = []; let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (test.length > maxCh && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

// ── OTO RENDER BİLEŞENİ ──────────────────────────────────────────────────
// Haber detayı açılınca otomatik tüm formatları render eder
export default function OtoGorselUret({ haber, onHazir }) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [gorseller, setGorseller]   = useState({})

  useEffect(() => {
    if (!haber) return
    let iptal = false

    ;(async () => {
      setYukleniyor(true)
      await fontYukle()
      const sonuc = {}
      for (const fmt of FORMATLAR) {
        if (iptal) break
        try {
          sonuc[fmt] = await renderFormat(fmt, {
            gorselUrl:  haber.gorsel_url || haber.gorsel || '',
            baslik:     haber.sosyal_baslik || haber.site_basligi || haber.baslik || '',
            spotBaslik: haber.ozet || '',
            kategori:   haber.kategori || 'Güncel',
            tarih:      haber.tarih || new Date().toLocaleDateString('tr-TR'),
          })
        } catch (e) { console.warn(fmt, e) }
      }
      if (!iptal) {
        setGorseller(sonuc)
        setYukleniyor(false)
        onHazir?.(sonuc)
      }
    })()

    return () => { iptal = true }
  }, [haber?.source_id])

  if (yukleniyor) return (
    <div style={{padding:'10px',fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:8}}>
      <i className="ti ti-loader-2" style={{fontSize:14}}/> Sosyal medya görselleri oluşturuluyor…
    </div>
  )

  if (!Object.keys(gorseller).length) return null

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
        {FORMATLAR.map(fmt => gorseller[fmt] && (
          <div key={fmt}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase'}}>{fmt}</div>
            <img src={gorseller[fmt]} alt={fmt}
              style={{width:'100%',borderRadius:6,border:'0.5px solid var(--border)',display:'block'}}/>
            <a href={gorseller[fmt]} download={`kayserim-${fmt}.jpg`}>
              <button style={{marginTop:4,width:'100%',fontSize:11,background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                <i className="ti ti-download" style={{fontSize:11}}/> İndir
              </button>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
