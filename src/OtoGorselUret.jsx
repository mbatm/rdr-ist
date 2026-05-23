// ── OTO GÖRSEL ÜRET — SVG tasarım + Canvas görsel/metin ─────────────────
// SVG: sizin tasarımınız (bantlar, logolar, gradient, badge şekli)
// Canvas: haber görseli (arka plan) + metin
import { useState, useEffect } from 'react'

const MANIFEST = {
  "facebook": {
    "w": 1200,
    "h": 630,
    "bandH": 64.0,
    "baslik": {
      "x": 64.668,
      "y": 481.1357,
      "fontSize": 54.638
    },
    "spot_baslik": {
      "x": 66.0957,
      "y": 580.1035,
      "fontSize": 25.5276
    },
    "tarih": {
      "x": 1074.2568,
      "y": 611.5059,
      "fontSize": 19.08
    },
    "kategori": null
  },
  "instagram": {
    "w": 1080,
    "h": 1080,
    "bandH": 91.2,
    "baslik": {
      "x": 72.3062,
      "y": 795.374,
      "fontSize": 72.4759
    },
    "spot_baslik": {
      "x": 74.4922,
      "y": 940.4033,
      "fontSize": 39.0543
    },
    "tarih": {
      "x": 928.0,
      "y": 1027.5273,
      "fontSize": 22.477
    },
    "kategori": null
  },
  "twitter": {
    "w": 1600,
    "h": 900,
    "bandH": 85.2,
    "baslik": {
      "x": 88.376,
      "y": 684.3184,
      "fontSize": 60.0
    },
    "spot_baslik": {
      "x": 90.2754,
      "y": 822.2051,
      "fontSize": 33.9666
    },
    "tarih": {
      "x": 1431.7168,
      "y": 813.9883,
      "fontSize": 25.3875
    },
    "kategori": null
  },
  "youtube": {
    "w": 1280,
    "h": 720,
    "bandH": 68.1,
    "baslik": {
      "x": 70.9229,
      "y": 553.6553,
      "fontSize": 60.0
    },
    "spot_baslik": {
      "x": 72.4424,
      "y": 669.5928,
      "fontSize": 27.1817
    },
    "tarih": {
      "x": 1145.9297,
      "y": 653.0176,
      "fontSize": 20.3163
    },
    "kategori": null
  }
}
const FORMATLAR = ['instagram','facebook','twitter','youtube']

function loadImg(src, cross=false) {
  return new Promise(res => {
    const img = new Image()
    if (cross) img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

function wrapText(ctx, text, maxW, maxLines=3) {
  const words = (text||'').split(' ')
  const lines=[]; let cur=''
  for (const w of words) {
    const test = cur ? cur+' '+w : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur=w }
    else cur=test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, maxLines)
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// SVG chrome cache
const svgCache = {}
async function getSvgChrome(format) {
  if (svgCache[format]) return svgCache[format]
  const res = await fetch('/templates/' + format + '.svg')
  const txt = await res.text()
  const blob = new Blob([txt], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const img  = await loadImg(url)
  URL.revokeObjectURL(url)
  if (img) svgCache[format] = img
  return img
}

async function renderFormat(format, haber) {
  const meta = MANIFEST[format]
  if (!meta) return null
  const { w, h } = meta
  const pad = Math.round(w*0.038)

  const canvas = document.createElement('canvas')
  canvas.width=w; canvas.height=h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'

  // 1. Arka plan görseli (Canvas — proxy ile CORS yok)
  const gorselUrl = haber.gorsel_url || haber.gorsel || ''
  if (gorselUrl) {
    const bg = await loadImg('/api/gorsel-proxy?url=' + encodeURIComponent(gorselUrl), true)
    if (bg) {
      const s=Math.max(w/bg.width,h/bg.height)
      ctx.drawImage(bg,(w-bg.width*s)/2,(h-bg.height*s)/2,bg.width*s,bg.height*s)
    }
  } else {
    ctx.fillStyle='#1a2535'; ctx.fillRect(0,0,w,h)
  }

  // 2. SVG chrome overlay — SİZİN TASARIMINIZ
  const chrome = await getSvgChrome(format)
  if (chrome) ctx.drawImage(chrome, 0, 0, w, h)

  // 3. Metin (Canvas — manifest pozisyonları)
  const baslik   = haber.sosyal_baslik||haber.site_basligi||haber.baslik||''
  const spot     = haber.ozet||''
  const tarih    = haber.tarih||new Date().toLocaleDateString('tr-TR')
  const kategori = (haber.kategori||'GÜNCEL').toUpperCase()

  const bm=meta.baslik, sm=meta.spot_baslik, tm=meta.tarih, km=meta.kategori

  if (bm) {
    const maxW = w - bm.x - pad
    ctx.font = '600 ' + bm.fontSize + 'px Poppins, Arial'
    ctx.fillStyle='#ffffff'
    ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=14; ctx.shadowOffsetY=1
    const lines = wrapText(ctx, baslik, maxW, 3)
    const lineH = bm.fontSize*1.32
    lines.forEach((ln,i) => ctx.fillText(ln, bm.x, bm.y + i*lineH))
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0

    // Spot başlık
    if (sm && spot) {
      const spotY = bm.y + lines.length*lineH + sm.fontSize*0.6
      ctx.font = '400 ' + sm.fontSize + 'px "Open Sans", Arial'
      ctx.fillStyle='rgba(255,255,255,0.88)'
      ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=10; ctx.shadowOffsetY=1
      wrapText(ctx,spot,w-sm.x-pad,2).forEach((ln,i)=>
        ctx.fillText(ln, sm.x, spotY+i*sm.fontSize*1.38))
      ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0
    }
  }

  // Tarih
  if (tm) {
    ctx.font = '400 ' + tm.fontSize + 'px "Open Sans", Arial'
    ctx.fillStyle='rgba(255,255,255,0.85)'
    ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=6
    const tw=ctx.measureText(tarih).width
    ctx.fillText(tarih, tm.x-tw, tm.y)
    ctx.shadowColor='transparent'; ctx.shadowBlur=0
  }

  // Kategori badge
  if (km) {
    const fs=km.fontSize||20, kPad=fs*0.6, kH=fs*1.6, kR=kH*0.4
    ctx.font = '700 ' + fs + 'px Poppins, Arial'
    const kw=ctx.measureText(kategori).width
    ctx.fillStyle='#ED1C24'
    roundRect(ctx, km.x, km.y-kH*0.8, kw+kPad*2, kH, kR); ctx.fill()
    ctx.fillStyle='#ffffff'
    ctx.fillText(kategori, km.x+kPad, km.y)
  }

  return canvas.toDataURL('image/jpeg',0.93)
}

const Ic=({n,size=14})=><i className={`ti ti-${n}`} aria-hidden="true" style={{fontSize:size}}/>

export default function OtoGorselUret({ haber }) {
  const [gorseller, setGorseller] = useState({})
  const [yukleniyor, setYukl]     = useState(false)

  useEffect(()=>{
    if (!haber?.source_id) return
    let iptal=false
    setGorseller({}); setYukl(true)
    ;(async()=>{
      const sonuc={}
      for (const fmt of FORMATLAR) {
        if (iptal) break
        try { sonuc[fmt]=await renderFormat(fmt,haber) } catch(e){console.warn(fmt,e.message)}
        if (!iptal) setGorseller({...sonuc})
      }
      if (!iptal) setYukl(false)
    })()
    return ()=>{iptal=true}
  },[haber?.source_id])

  if (yukleniyor && !Object.keys(gorseller).length) return (
    <div style={{padding:'10px 0',fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:8}}>
      <Ic n="loader-2" size={14}/> Görseller hazırlanıyor…
    </div>
  )
  if (!Object.keys(gorseller).length) return null

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {FORMATLAR.map(fmt=>{
          const src=gorseller[fmt]; if (!src) return null
          const meta=MANIFEST[fmt]
          return (
            <div key={fmt}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase'}}>
                {fmt} · {meta.w}×{meta.h}
              </div>
              <img src={src} alt={fmt} style={{width:'100%',borderRadius:6,border:'0.5px solid var(--border)',display:'block',marginBottom:4}}/>
              <a href={src} download={`kayserim-${fmt}-${Date.now()}.jpg`}>
                <button style={{width:'100%',fontSize:11,background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                  <Ic n="download" size={11}/> İndir
                </button>
              </a>
            </div>
          )
        })}
      </div>
      {yukleniyor&&<div style={{fontSize:11,color:'var(--muted)',marginTop:8}}><Ic n="loader-2" size={11}/> Devam ediyor…</div>}
    </div>
  )
}
