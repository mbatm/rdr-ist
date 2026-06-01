// ── OTO GÖRSEL ÜRET v2.5 ───────────────────────────────────────────────
import { useState, useEffect } from 'react'

const MANIFEST = {
  "facebook": {
    "w": 1200,
    "h": 630,
    "bandH": 64.0,
    "pad": 46,
    "baslik": {
      "x": 90,
      "y": 481.1,
      "fontSize": 54.6
    },
    "spot_baslik": {
      "x": 90,
      "y": 580.1,
      "fontSize": 25.5
    },
    "tarih": {
      "x": 1154,
      "y": 611.5,
      "fontSize": 19.1
    },
    "kategori": {
      "x": 90,
      "y": 611.5,
      "fontSize": 19.1
    }
  },
  "instagram": {
    "w": 1080,
    "h": 1080,
    "bandH": 91.2,
    "pad": 41,
    "baslik": {
      "x": 108,
      "y": 795.4,
      "fontSize": 72.5
    },
    "spot_baslik": {
      "x": 108,
      "y": 940.4,
      "fontSize": 39.1
    },
    "tarih": {
      "x": 1039,
      "y": 1027.5,
      "fontSize": 22.5
    },
    "kategori": {
      "x": 108,
      "y": 1027.5,
      "fontSize": 22.5
    }
  },
  "twitter": {
    "w": 1600,
    "h": 900,
    "bandH": 85.2,
    "pad": 61,
    "baslik": {
      "x": 110,
      "y": 684.3,
      "fontSize": 60.0
    },
    "spot_baslik": {
      "x": 110,
      "y": 822.2,
      "fontSize": 34.0
    },
    "tarih": {
      "x": 1539,
      "y": 859.0,
      "fontSize": 25.4
    },
    "kategori": {
      "x": 110,
      "y": 859.0,
      "fontSize": 25.4
    }
  },
  "youtube": {
    "w": 1280,
    "h": 720,
    "bandH": 68.1,
    "pad": 49,
    "baslik": {
      "x": 70.9,
      "y": 553.7,
      "fontSize": 60.0
    },
    "spot_baslik": {
      "x": 100,
      "y": 669.6,
      "fontSize": 27.2
    },
    "tarih": {
      "x": 1231,
      "y": 690.0,
      "fontSize": 20.3
    },
    "kategori": {
      "x": 100,
      "y": 690.0,
      "fontSize": 20.3
    }
  },
  "story": {
    "w": 1080,
    "h": 1920,
    "bandH": 130,
    "pad": 54,
    "baslik": { "x": 54, "y": 1350, "fontSize": 62 },
    "spot_baslik": { "x": 54, "y": 1560, "fontSize": 36 },
    "kategori": { "x": 54, "y": 200, "fontSize": 32 }
  }
}
const FORMATLAR = ['instagram','facebook','twitter','youtube']
const STORY_FORMAT = 'story'

let scReady=false
function loadSmartCrop(){
  if(scReady||window.SmartCrop){scReady=true;return Promise.resolve()}
  return new Promise(res=>{
    const s=document.createElement('script')
    s.src='https://cdnjs.cloudflare.com/ajax/libs/smartcrop/2.0.5/smartcrop.min.js'
    s.onload=()=>{scReady=true;res()}
    document.head.appendChild(s)
  })
}

function loadImg(src,cross=false){
  return new Promise(res=>{
    const img=new Image()
    if(cross)img.crossOrigin='anonymous'
    img.onload=()=>res(img);img.onerror=()=>res(null);img.src=src
  })
}

function wrapText(ctx,text,maxW,maxLines=3){
  const words=(text||'').split(' ');const lines=[];let cur=''
  for(const w of words){
    const test=cur?cur+' '+w:w
    if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w}else cur=test
  }
  if(cur)lines.push(cur)
  return lines.slice(0,maxLines)
}

function pill(ctx,x,y,w,h,r,fill){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill()
}

const svgCache={}
async function getSvg(fmt){
  if(svgCache[fmt])return svgCache[fmt]
  const v=Math.floor(Date.now()/3600000)
  const txt=await fetch('/templates/'+fmt+'.svg?v='+v).then(r=>r.text())
  const blob=new Blob([txt],{type:'image/svg+xml'})
  const url=URL.createObjectURL(blob)
  const img=await loadImg(url)
  URL.revokeObjectURL(url)
  svgCache[fmt]=img;return img
}

let savedSettings=null
async function getSettings(){
  if(savedSettings)return savedSettings
  try{const r=await fetch('/api/sablon?id=varsayilan');const d=await r.json();savedSettings=d.settings||{}}
  catch{savedSettings={}}
  return savedSettings
}

async function gorselYukle(b64,sid,fmt){
  try{
    const r=await fetch('/api/gorsel-yukle',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({data:b64,source_id:sid,format:fmt})})
    return (await r.json()).url||null
  }catch{return null}
}


// ── PNG TABANLI RENDER — kayserim.net yeni şablon ────────────────────────────
// JSON şablon koordinatları: 720x1280 (dikey), 1200x630 (yatay)
const PNG_ASSETS = {
  dikey: {
    w: 720, h: 1280,
    // Orijinal PNG 1080px geniş → 720px canvas'a oran: 720/1080 = 0.667
    ustBant:  { src: '/templates/ust-bant.png',  x: 0, y: 0,   w: 720, h: 295 },
    altBant:  { src: '/templates/alt-bant.png',  x: 0, y: 778, w: 720, h: 502 },
    pil:      { src: '/templates/pil.png',       x: 499, y: 300, w: 163, h: 59 }, // bantın altına
    tarihImg: { src: '/templates/tarih.png',     x: 500, y: 325, w: 165, h: 55 }, // bantın altına
    baslik:   { x: 53,  y: 700, maxW: 640, fontSize: 50, maxLines: 3 },
    spot:     { x: 53,  y: 820, maxW: 640, fontSize: 27, maxLines: 3 },
    kategori: { x: 698, y: 318, fontSize: 20, textAlign: 'right' },
    tarih:    { x: 698, y: 342, fontSize: 16, textAlign: 'right' }
  },
  yatay: {
    w: 1200, h: 630,
    // Orijinal PNG 1920px geniş → 1200px canvas'a oran: 1200/1920 = 0.625
    ustBant:  { src: '/templates/yatayust.png', x: 0, y: 0,   w: 1200, h: 130 },
    altBant:  { src: '/templates/yatayalt.png', x: 0, y: 326, w: 1200, h: 304 },
    baslik:   { x: 80,  y: 400, maxW: 1050, fontSize: 52, maxLines: 2 },
    spot:     { x: 80,  y: 475, maxW: 1050, fontSize: 28, maxLines: 2 },
    kategori: { x: 1178, y: 108, fontSize: 22, textAlign: 'right' },
    tarih:    { x: 1178, y: 130, fontSize: 18, textAlign: 'right' }
  }
}

// PNG asset cache
const pngCache = {}
async function loadPngAsset(src) {
  if (pngCache[src]) return pngCache[src]
  const img = await loadImg(src, true)
  if (img) pngCache[src] = img
  return img
}

async function renderPngFormat(fmt, haber) {
  const cfg = fmt === 'yatay' ? PNG_ASSETS.yatay : PNG_ASSETS.dikey
  const { w, h } = cfg

  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'

  // 1. Arka plan görseli
  const gUrl = haber.gorsel_url || haber.gorsel || ''
  if (gUrl) {
    const bg = await loadImg('/api/gorsel-proxy?url=' + encodeURIComponent(gUrl), true)
    if (bg) {
      await loadSmartCrop()
      let sx=0, sy=0, sw=bg.width, sh=bg.height
      if (window.SmartCrop) {
        try {
          const r = await window.SmartCrop.crop(bg, { width:w, height:h, minScale:0.8 })
          const c = r.topCrop; sx=c.x; sy=c.y; sw=c.width; sh=c.height
        } catch {}
      }
      if (!sw||!sh) { const s=Math.max(w/bg.width,h/bg.height); sx=(bg.width-w/s)/2; sy=(bg.height-h/s)/2; sw=w/s; sh=h/s }
      ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, w, h)
    }
  } else {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h)
  }

  // 2. Gradient overlay
  const grad = ctx.createLinearGradient(0, h*0.15, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  grad.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

  // 3. PNG katmanları
  const layers = ['ustBant', 'altBant', 'pil', 'tarihImg'].filter(k => cfg[k])
  for (const key of layers) {
    const layer = cfg[key]
    const img = await loadPngAsset(layer.src)
    if (!img) continue
    // Alt bant her zaman alt kenara yapışık
    if (key === 'altBant') {
      ctx.drawImage(img, layer.x, h - layer.h, layer.w, layer.h)
    } else {
      ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h)
    }
  }

  // 4. Metinler
  const baslik   = haber.sosyal_baslik || haber.site_basligi || haber.baslik || ''
  const spot     = haber.ozet || ''
  const tarih    = haber.tarih || new Date().toLocaleDateString('tr-TR')
  const kategori = (haber.kategori || 'GÜNCEL').toUpperCase()

  // Kategori
  const km = cfg.kategori
  ctx.font = `700 ${km.fontSize}px Poppins,Arial`
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8
  ctx.fillText(kategori, km.x, km.y)
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0

  // Tarih
  const tm = cfg.tarih
  ctx.font = `300 ${tm.fontSize}px Poppins,Arial`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(tarih, tm.x, tm.y)

  // Başlık — auto-size
  const bm = cfg.baslik
  let bFontSize = bm.fontSize
  const minBFont = bm.fontSize * 0.5
  ctx.font = `700 ${bFontSize}px Poppins,Arial`
  let bLines = wrapText(ctx, baslik, bm.maxW, bm.maxLines)
  // Font küçült — tüm satırlar sığana kadar
  while (bFontSize > minBFont) {
    ctx.font = `700 ${bFontSize}px Poppins,Arial`
    bLines = wrapText(ctx, baslik, bm.maxW, bm.maxLines)
    const totalH = bLines.length * bFontSize * 1.25
    if (totalH <= bm.fontSize * bm.maxLines * 1.35) break
    bFontSize *= 0.92
  }
  const bLineH = bFontSize * 1.28
  ctx.font = `700 ${bFontSize}px Poppins,Arial`
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 1
  bLines.forEach((ln, i) => ctx.fillText(ln, bm.x, bm.y + i * bLineH))
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

  // Sol kırmızı şerit
  const strW = Math.max(4, Math.round(w * 0.004))
  ctx.fillStyle = '#ED1C24'
  ctx.fillRect(bm.x - strW - Math.round(w * 0.012), bm.y - bFontSize * 0.85, strW, bLines.length * bLineH)

  // Spot — auto-size
  if (spot) {
    const sm = cfg.spot
    let sFontSize = sm.fontSize
    const minSFont = sm.fontSize * 0.45
    ctx.font = `400 ${sFontSize}px "Open Sans",Arial`
    let sLines = wrapText(ctx, spot, sm.maxW, sm.maxLines)
    while (sFontSize > minSFont) {
      ctx.font = `400 ${sFontSize}px "Open Sans",Arial`
      sLines = wrapText(ctx, spot, sm.maxW, sm.maxLines)
      const totalH = sLines.length * sFontSize * 1.4
      if (totalH <= sm.fontSize * sm.maxLines * 1.5) break
      sFontSize *= 0.92
    }
    const sLineH = sFontSize * 1.38
    // Başlığın hemen altına yerleştir
    const spotY = bm.y + bLines.length * bLineH + sFontSize * 0.6

    ctx.font = `400 ${sFontSize}px "Open Sans",Arial`
    // Highlight arka plan
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#ED1C24'
    sLines.forEach((ln, i) => {
      const lw = ctx.measureText(ln).width
      ctx.fillRect(sm.x - sFontSize*0.3, spotY + i*sLineH - sFontSize*0.85, lw + sFontSize*0.6, sFontSize * 1.3)
    })
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1
    sLines.forEach((ln, i) => ctx.fillText(ln, sm.x, spotY + i * sLineH))
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  }

  return cv.toDataURL('image/jpeg', 0.93)
}

// ── STORY RENDER — tamamen bağımsız ─────────────────────────────────────────
async function renderStory(haber) {
  const W=1080,H=1920,BAND=130,PAD=54
  const cv=document.createElement('canvas')
  cv.width=W; cv.height=H
  const ctx=cv.getContext('2d')
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'

  // Arka plan
  const gUrl=haber.gorsel_url||haber.gorsel||''
  if(gUrl){
    const bg=await loadImg('/api/gorsel-proxy?url='+encodeURIComponent(gUrl),true)
    if(bg){
      await loadSmartCrop()
      let sx=0,sy=0,sw=bg.width,sh=bg.height
      if(window.SmartCrop){try{const r=await window.SmartCrop.crop(bg,{width:W,height:H,minScale:0.8});const c=r.topCrop;sx=c.x;sy=c.y;sw=c.width;sh=c.height}catch{}}
      if(!sw||!sh){const s=Math.max(W/bg.width,H/bg.height);sx=(bg.width-W/s)/2;sy=(bg.height-H/s)/2;sw=W/s;sh=H/s}
      ctx.drawImage(bg,sx,sy,sw,sh,0,0,W,H)
    }else{ctx.fillStyle='#1a2535';ctx.fillRect(0,0,W,H)}
  }else{ctx.fillStyle='#1a2535';ctx.fillRect(0,0,W,H)}

  // Gradient
  const g1=ctx.createLinearGradient(0,H*0.3,0,H)
  g1.addColorStop(0,'rgba(0,0,0,0)');g1.addColorStop(0.6,'rgba(0,0,0,0.65)');g1.addColorStop(1,'rgba(0,0,0,0.93)')
  ctx.fillStyle=g1;ctx.fillRect(0,0,W,H)

  // Üst bant
  ctx.fillStyle='#ED1C24';ctx.fillRect(0,0,W,BAND)
  ctx.font=`700 ${Math.round(BAND*0.44)}px Poppins,Arial`
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText('kayserim',W/2,BAND/2)
  ctx.textAlign='left';ctx.textBaseline='alphabetic'

  // Kategori pill
  const kat=(haber.kategori||'GÜNCEL').toUpperCase()
  ctx.font='700 28px Poppins,Arial'
  const kw=ctx.measureText(kat).width
  ctx.fillStyle='#ED1C24';ctx.fillRect(PAD-8,200,kw+28,40)
  ctx.fillStyle='#fff';ctx.fillText(kat,PAD,228)

  // Başlık
  const baslik=haber.sosyal_baslik||haber.site_basligi||haber.baslik||''
  ctx.font='600 56px Poppins,Arial'
  const bLines=wrapText(ctx,baslik,W-PAD*2-10,3)
  const bLineH=76,bStartY=1280
  ctx.fillStyle='#ED1C24';ctx.fillRect(PAD,bStartY-46,6,bLines.length*bLineH+4)
  ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=14;ctx.shadowOffsetY=2
  bLines.forEach((ln,i)=>ctx.fillText(ln,PAD+20,bStartY+i*bLineH))
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0

  // Spot
  const spot=haber.ozet||''
  if(spot){
    ctx.font='400 32px "Open Sans",Arial'
    const sLines=wrapText(ctx,spot,W-PAD*2,3)
    const sY=bStartY+bLines.length*bLineH+26
    ctx.globalAlpha=0.36;ctx.fillStyle='#ED1C24'
    sLines.forEach((ln,i)=>{const lw=ctx.measureText(ln).width;ctx.fillRect(PAD-8,sY+i*50-26,lw+16,42)})
    ctx.globalAlpha=1;ctx.fillStyle='rgba(255,255,255,.95)';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=5
    sLines.forEach((ln,i)=>ctx.fillText(ln,PAD,sY+i*50))
    ctx.shadowColor='transparent';ctx.shadowBlur=0
  }

  // Link etiketi
  const lFont=40,lbH=90,lbW=560
  const rx=Math.round((W-lbW)/2),ry=H-175,r=lbH/2
  ctx.beginPath()
  ctx.moveTo(rx+r,ry);ctx.lineTo(rx+lbW-r,ry);ctx.quadraticCurveTo(rx+lbW,ry,rx+lbW,ry+r)
  ctx.lineTo(rx+lbW,ry+lbH-r);ctx.quadraticCurveTo(rx+lbW,ry+lbH,rx+lbW-r,ry+lbH)
  ctx.lineTo(rx+r,ry+lbH);ctx.quadraticCurveTo(rx,ry+lbH,rx,ry+lbH-r)
  ctx.lineTo(rx,ry+r);ctx.quadraticCurveTo(rx,ry,rx+r,ry);ctx.closePath()
  ctx.shadowColor='rgba(0,0,0,0.45)';ctx.shadowBlur=10
  ctx.fillStyle='rgba(255,255,255,0.96)';ctx.fill()
  ctx.shadowColor='transparent';ctx.shadowBlur=0
  ctx.fillStyle='#ED1C24';ctx.fillRect(rx+14,ry+lbH*0.2,5,lbH*0.6)
  ctx.font=`700 ${lFont}px Poppins,"Open Sans",Arial`
  ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText('🔗  kayserim.net  ↑',rx+lbW/2,ry+lbH/2)
  ctx.textAlign='left';ctx.textBaseline='alphabetic'

  return cv.toDataURL('image/jpeg',0.93)
}

async function renderFormat(fmt, haber) {
  const base = MANIFEST[fmt]
  if(!base) { console.error('MANIFEST['+fmt+'] YOK'); return null }
  const sett = await getSettings()
  const m = {
    ...base,
    baslik:      {...base.baslik,      ...(sett.baslik||{})},
    spot_baslik: {...base.spot_baslik, ...(sett.spot_baslik||{})},
    kategori:    {...base.kategori,    ...(sett.kategori||{})},
  }
  const { w, h, bandH, pad } = m
  if(!w||!h) { console.error(fmt+': w veya h eksik',{w,h,base}); return null }

  const cv = document.createElement('canvas')
  cv.width=w; cv.height=h
  const ctx = cv.getContext('2d')
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'

  // 1. Arka plan
  const gUrl = haber.gorsel_url||haber.gorsel||''
  if(gUrl){
    const bg = await loadImg('/api/gorsel-proxy?url='+encodeURIComponent(gUrl), true)
    if(bg){
      await loadSmartCrop()
      let sx=0,sy=0,sw=bg.width,sh=bg.height
      if(window.SmartCrop){
        try{const r=await window.SmartCrop.crop(bg,{width:w,height:h,minScale:0.8});const c=r.topCrop;sx=c.x;sy=c.y;sw=c.width;sh=c.height}catch{}
      }
      if(!sw||!sh){const s=Math.max(w/bg.width,h/bg.height);sx=(bg.width-w/s)/2;sy=(bg.height-h/s)/2;sw=w/s;sh=h/s}
      ctx.drawImage(bg,sx,sy,sw,sh,0,0,w,h)
    }
  } else {
    ctx.fillStyle='#1a2535'; ctx.fillRect(0,0,w,h)
  }

  // 2. Alt gradient overlay
  const grad = ctx.createLinearGradient(0,h*0.2,0,h)
  grad.addColorStop(0,'rgba(0,0,0,0)')
  grad.addColorStop(0.5,'rgba(0,0,0,0.5)')
  grad.addColorStop(1,'rgba(0,0,0,0.92)')
  ctx.fillStyle=grad; ctx.fillRect(0,0,w,h)

  // 3. SVG chrome (story için doğrudan canvas, diğerleri için SVG)
  if (fmt === 'story') {
    // Üst kırmızı bant
    ctx.fillStyle = '#ED1C24'
    ctx.fillRect(0, 0, w, bandH)
    // Logo
    ctx.font = `700 ${Math.round(bandH * 0.4)}px Poppins, Arial`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('kayserim', w / 2, bandH / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    // Alt gradient overlay
    const storyGrad = ctx.createLinearGradient(0, h * 0.35, 0, h)
    storyGrad.addColorStop(0, 'rgba(0,0,0,0)')
    storyGrad.addColorStop(0.5, 'rgba(0,0,0,0.5)')
    storyGrad.addColorStop(1, 'rgba(0,0,0,0.92)')
    ctx.fillStyle = storyGrad
    ctx.fillRect(0, 0, w, h)
  } else {
    const chrome = await getSvg(fmt)
    if (chrome) ctx.drawImage(chrome, 0, 0, w, h)
  }

  const bm  = m.baslik
  const sm  = m.spot_baslik
  const km  = m.kategori
  const badgeColor = sett.badgeColor||'#ED1C24'

  const baslik   = haber.sosyal_baslik||haber.site_basligi||haber.baslik||''
  const spot     = haber.ozet||''   // tam metin, kesmeden
  const tarih    = haber.tarih||new Date().toLocaleDateString('tr-TR')
  const kategori = (haber.kategori||'GÜNCEL').toUpperCase()

  // ── KATEGORİ + TARİH: Sağda, logo altında, alt alta ───────────────────
  const kFontSize = km.fontSize * 0.88
  const kH        = kFontSize * 1.55
  const kPad      = kFontSize * 0.5
  const kGap      = 6

  ctx.font = '700 '+kFontSize+'px Poppins,Arial'
  const kw = ctx.measureText(kategori).width
  const kBandY = bandH + 14
  const kX = w - pad - kw - kPad*2
  pill(ctx, kX, kBandY, kw+kPad*2, kH, kH*0.4, badgeColor)
  ctx.fillStyle='#fff'; ctx.textBaseline='middle'
  ctx.fillText(kategori, kX+kPad, kBandY+kH*0.5)
  ctx.textBaseline='alphabetic'

  const tFontSize = kFontSize * 0.85
  ctx.font = '400 '+tFontSize+'px "Open Sans",Arial'
  ctx.fillStyle='rgba(255,255,255,0.82)'
  ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=5
  const tw = ctx.measureText(tarih).width
  const tY = kBandY + kH + kGap + tFontSize
  ctx.fillText(tarih, w-pad-tw, tY)
  ctx.shadowColor='transparent'; ctx.shadowBlur=0

  // ── ALTTAN YUKARI LAYOUT ────────────────────────────────────────────────
  const bottomY = fmt === 'story'
    ? h - Math.round(pad * 6.5)  // story: link etiketi için yer bırak
    : h - pad * 1.1
  const maxTitleLn = w > h ? 2 : 3
  const maxSpotLn  = w > h ? 2 : 3
  const spotMaxW   = w - bm.x - pad
  const bMaxW      = w - bm.x - pad

  // Spot font auto-size (tam metni sığdır)
  let spotFont = sm.fontSize
  const minFont = sm.fontSize * 0.45
  ctx.font = '400 '+spotFont+'px "Open Sans",Arial'
  while(spotFont > minFont) {
    const chPerLine = Math.floor(spotMaxW / (spotFont * 0.52))
    const linesNeeded = Math.min(maxSpotLn, Math.ceil(spot.length / chPerLine))
    const needed = linesNeeded * spotFont * 1.38
    const available = h * (w > h ? 0.28 : 0.32)  // alttan alan
    if(needed <= available) break
    spotFont *= 0.92
    ctx.font = '400 '+spotFont+'px "Open Sans",Arial'
  }
  spotFont = Math.max(spotFont, minFont)
  const spotLineH = spotFont * 1.38
  const spotLines = wrapText(ctx, spot, spotMaxW, maxSpotLn)
  const spotBlockH = spotLines.length * spotLineH

  // Başlık
  const bLineH = bm.fontSize * 1.32
  ctx.font = '600 '+bm.fontSize+'px Poppins,Arial'
  const bLines = wrapText(ctx, baslik, bMaxW, maxTitleLn)
  const titleBlockH = bLines.length * bLineH

  // Toplam blok yüksekliği
  const gap = spotFont * 0.8
  const totalH = titleBlockH + (spot ? gap + spotBlockH : 0)

  // Alt padding'den yukarı hesapla
  const blockStartY = bottomY - totalH
  const titleStartY = blockStartY
  const spotStartY  = titleStartY + titleBlockH + gap

  // Başlık çiz
  ctx.fillStyle='#fff'
  ctx.shadowColor='rgba(0,0,0,.95)'; ctx.shadowBlur=14; ctx.shadowOffsetY=1
  bLines.forEach((ln,i) => ctx.fillText(ln, bm.x, titleStartY+i*bLineH))
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0

  // Sol kırmızı şerit
  if(sett.stripeVisible!==false){
    const strW = Math.max(4, Math.round(w*0.004))
    ctx.fillStyle = sett.stripeColor||'#ED1C24'
    ctx.fillRect(bm.x-strW-Math.round(w*0.012), titleStartY-bm.fontSize*0.82, strW, titleBlockH)
  }

  // Spot çiz
  if(spot && spotLines.length){
    ctx.font = '400 '+spotFont+'px "Open Sans",Arial'
    const hlColor   = sett.highlightColor||'#ED1C24'
    const hlOpacity = sett.highlightOpacity??0.38
    ctx.globalAlpha = hlOpacity; ctx.fillStyle = hlColor
    spotLines.forEach((ln,i)=>{
      const lw = ctx.measureText(ln).width
      const ly = spotStartY + i*spotLineH
      ctx.fillRect(sm.x-spotFont*0.3, ly-spotFont*0.82-spotFont*0.18, lw+spotFont*0.6, spotFont+spotFont*0.36)
    })
    ctx.globalAlpha=1
    ctx.fillStyle='rgba(255,255,255,.95)'
    ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=6; ctx.shadowOffsetY=1
    spotLines.forEach((ln,i) => ctx.fillText(ln, sm.x, spotStartY+i*spotLineH))
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0
  }

  // Story için link etiketi — alt bölgede sabit konum
  if(fmt === 'story'){
    const domain   = 'kayserim.net'
    const linkFont = Math.round(w * 0.042)
    const lbH      = Math.round(linkFont * 2.6)
    const lbW      = Math.round(w * 0.65)
    const rx       = Math.round((w - lbW) / 2)
    const ry       = Math.round(h * 0.88)  // %88 aşağıda, sabit yüzde
    const r        = lbH / 2
    const txt      = `🔗  ${domain}  ↑`

    // Arka plan pill
    ctx.globalAlpha = 1
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, lbW, lbH, r)
    } else {
      ctx.moveTo(rx+r,ry); ctx.lineTo(rx+lbW-r,ry)
      ctx.quadraticCurveTo(rx+lbW,ry,rx+lbW,ry+r)
      ctx.lineTo(rx+lbW,ry+lbH-r)
      ctx.quadraticCurveTo(rx+lbW,ry+lbH,rx+lbW-r,ry+lbH)
      ctx.lineTo(rx+r,ry+lbH)
      ctx.quadraticCurveTo(rx,ry+lbH,rx,ry+lbH-r)
      ctx.lineTo(rx,ry+r)
      ctx.quadraticCurveTo(rx,ry,rx+r,ry)
      ctx.closePath()
    }
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=16
    ctx.fillStyle='rgba(255,255,255,0.97)'
    ctx.fill()
    ctx.shadowColor='transparent'; ctx.shadowBlur=0

    // Kırmızı sol aksan çizgisi
    ctx.fillStyle='#ED1C24'
    ctx.fillRect(rx+12, ry+lbH*0.2, 4, lbH*0.6)

    // Metin
    ctx.font=`700 ${linkFont}px Poppins,"Open Sans",Arial`
    ctx.fillStyle='#111111'
    ctx.textAlign='center'
    ctx.textBaseline='middle'
    ctx.fillText(txt, rx+lbW/2, ry+lbH/2)
    ctx.textAlign='left'; ctx.textBaseline='alphabetic'
    ctx.globalAlpha=1
  }

  return cv.toDataURL('image/jpeg',.93)
}

const Ic=({n,sz=14})=><i className={`ti ti-${n}`} aria-hidden style={{fontSize:sz}}/>

export default function OtoGorselUret({haber, onGorsellerHazir}){
  const[items,setItems]=useState({})
  const[urls,setUrls]=useState({})
  const[busy,setBusy]=useState(false)
  const[storyUrl,setStoryUrl]=useState(null)

  useEffect(()=>{
    if(!haber?.source_id)return
    let stop=false;setItems({});setUrls({});setBusy(true);setStoryUrl(null)
    ;(async()=>{
      const acc={},urlAcc={}
      for(const fmt of FORMATLAR){
        if(stop)break
        try{
          // PNG tabanlı yeni şablon kullan
          const b64=await renderPngFormat(fmt==='instagram'?'dikey':fmt==='facebook'||fmt==='twitter'||fmt==='youtube'?'yatay':fmt, haber)
          if(b64){
            acc[fmt]=b64
            const url=await gorselYukle(b64,haber.source_id,fmt)
            if(url) urlAcc[fmt]=url
          }
        }catch(e){console.warn(fmt,e.message)}
        if(!stop){setItems({...acc});setUrls({...urlAcc})}
      }
      // Story ayrı render
      if(!stop){
        try{
          const sb64=await renderStory(haber)
          if(sb64){
            acc[STORY_FORMAT]=sb64
            setItems({...acc})
            const surl=await gorselYukle(sb64,haber.source_id,STORY_FORMAT)
            if(surl){urlAcc[STORY_FORMAT]=surl;setStoryUrl(surl);if(!stop)setUrls({...urlAcc})}
          }else{
            console.error('renderStory null/undefined döndü')
          }
        }catch(e){
          console.error('Story render HATA:',e)
          acc[STORY_FORMAT+'_err']=e.message
          setItems({...acc})
        }
      }
      if(!stop){setBusy(false);onGorsellerHazir?.({items:acc,urls:urlAcc})}
    })()
    return()=>{stop=true}
  },[haber?.source_id])

  if(busy&&!Object.keys(items).length)
    return<div style={{padding:'10px 0',fontSize:12,color:'var(--muted)',display:'flex',gap:8,alignItems:'center'}}><Ic n="loader-2" sz={14}/>Görseller hazırlanıyor…</div>
  if(!Object.keys(items).length)return null

  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {FORMATLAR.map(fmt=>{
          const src=items[fmt];if(!src)return null
          const mm=MANIFEST[fmt]
          return<div key={fmt}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',display:'flex',justifyContent:'space-between'}}>
              <span>{fmt}·{mm.w}×{mm.h}</span>
              {urls[fmt]&&<span style={{color:'#00D4AA',fontSize:10}}>✓</span>}
            </div>
            <img src={src} alt={fmt} style={{width:'100%',borderRadius:6,border:'0.5px solid var(--border)',display:'block',marginBottom:4}}/>
            <a href={src} download={`kayserim-${fmt}.jpg`}>
              <button style={{width:'100%',fontSize:11,background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                <Ic n="download" sz={11}/>İndir
              </button>
            </a>
          </div>
        })}
      </div>
      {/* Story önizleme — ayrı bölüm */}
      <div style={{marginTop:12,padding:10,background:'rgba(225,48,108,.06)',border:'0.5px solid rgba(225,48,108,.25)',borderRadius:6}}>
        <div style={{fontSize:11,color:'#E1306C',fontWeight:500,marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>📱 Instagram Story (1080×1920)</span>
          {urls[STORY_FORMAT]&&<span style={{fontSize:10,color:'#00D4AA'}}>✓ KV'ye yüklendi</span>}
          {!items[STORY_FORMAT]&&busy&&<span style={{fontSize:10,color:'var(--muted)'}}>Hazırlanıyor…</span>}
        </div>
        {items[STORY_FORMAT] ? (
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <img src={items[STORY_FORMAT]} alt="story"
              style={{width:90,borderRadius:4,border:'1px solid rgba(225,48,108,.4)',display:'block',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>
                Link etiketi görsel üzerine işlenmiş durumda.
              </div>
              <a href={items[STORY_FORMAT]} download="kayserim-story.jpg">
                <button style={{fontSize:11,background:'rgba(225,48,108,.1)',border:'0.5px solid rgba(225,48,108,.3)',color:'#E1306C'}}>
                  <Ic n="download" sz={11}/> Story İndir
                </button>
              </a>
            </div>
          </div>
        ) : (
          <div style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:8}}>
            {busy ? <><Ic n="loader-2" sz={12}/>Üretiliyor…</> : 
             items[STORY_FORMAT+'_err'] ? <span style={{color:'#ff7b7b'}}>Hata: {items[STORY_FORMAT+'_err']}</span> :
             'Story görseli üretilmedi'}
          </div>
        )}
      </div>
      {busy&&<div style={{fontSize:11,color:'var(--muted)',marginTop:8,display:'flex',gap:6,alignItems:'center'}}><Ic n="loader-2" sz={11}/>Devam ediyor…</div>}
    </div>
  )
}
