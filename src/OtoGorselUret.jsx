// ── OTO GÖRSEL ÜRET ─────────────────────────────────────────────────────
import { useState, useEffect } from 'react'

const MANIFEST = {
  "facebook": {
    "w": 1200,
    "h": 630,
    "bandH": 64.0,
    "pad": 46,
    "baslik": {
      "x": 64.7,
      "y": 481.1,
      "fontSize": 54.6
    },
    "spot_baslik": {
      "x": 66.1,
      "y": 580.1,
      "fontSize": 25.5
    },
    "tarih": {
      "x": 1154,
      "y": 611.5,
      "fontSize": 19.1
    },
    "kategori": {
      "x": 66.0,
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
      "x": 72.3,
      "y": 795.4,
      "fontSize": 72.5
    },
    "spot_baslik": {
      "x": 74.5,
      "y": 940.4,
      "fontSize": 39.1
    },
    "tarih": {
      "x": 1039,
      "y": 1027.5,
      "fontSize": 22.5
    },
    "kategori": {
      "x": 74.5,
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
      "x": 88.4,
      "y": 684.3,
      "fontSize": 60.0
    },
    "spot_baslik": {
      "x": 90.3,
      "y": 822.2,
      "fontSize": 34.0
    },
    "tarih": {
      "x": 1539,
      "y": 859.0,
      "fontSize": 25.4
    },
    "kategori": {
      "x": 90.3,
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
      "x": 72.4,
      "y": 669.6,
      "fontSize": 27.2
    },
    "tarih": {
      "x": 1231,
      "y": 690.0,
      "fontSize": 20.3
    },
    "kategori": {
      "x": 72.4,
      "y": 690.0,
      "fontSize": 20.3
    }
  }
}
const FORMATLAR = ['instagram','facebook','twitter','youtube','story']
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

async function renderFormat(fmt, haber) {
  const base = MANIFEST[fmt]; if(!base) return null
  const sett = await getSettings()
  const m = {
    ...base,
    baslik:      {...base.baslik,      ...(sett.baslik||{})},
    spot_baslik: {...base.spot_baslik, ...(sett.spot_baslik||{})},
    kategori:    {...base.kategori,    ...(sett.kategori||{})},
  }
  const { w, h, bandH, pad } = m

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
    const domain   = (haber.kayserim_link && haber.kayserim_link.includes('kayserim'))
      ? 'kayserim.net'
      : 'kayserim.net'
    const linkFont = Math.round(w * 0.036)
    const lbH      = Math.round(linkFont * 2.4)
    const lbW      = Math.round(w * 0.6)
    const rx       = Math.round((w - lbW) / 2)
    const ry       = h - Math.round(pad * 3.2)  // alt kenardan sabit mesafe
    const r        = lbH / 2
    const txt      = `🔗  ${domain}  ↑`

    // Beyaz pill
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, lbW, lbH, r)
    } else {
      ctx.moveTo(rx+r,ry); ctx.lineTo(rx+lbW-r,ry)
      ctx.quadraticCurveTo(rx+lbW,ry,rx+lbW,ry+r); ctx.lineTo(rx+lbW,ry+lbH-r)
      ctx.quadraticCurveTo(rx+lbW,ry+lbH,rx+lbW-r,ry+lbH); ctx.lineTo(rx+r,ry+lbH)
      ctx.quadraticCurveTo(rx,ry+lbH,rx,ry+lbH-r); ctx.lineTo(rx,ry+r)
      ctx.quadraticCurveTo(rx,ry,rx+r,ry); ctx.closePath()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0

    // Metin
    ctx.font = `700 ${linkFont}px "Open Sans", Arial`
    ctx.fillStyle = '#1a1a2e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(txt, rx + lbW/2, ry + lbH/2)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.globalAlpha = 1
  }
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
          const b64=await renderFormat(fmt,haber)
          if(b64){
            acc[fmt]=b64
            const url=await gorselYukle(b64,haber.source_id,fmt)
            if(url){
              urlAcc[fmt]=url
              if(fmt===STORY_FORMAT) setStoryUrl(url)
            }
          }
        }catch(e){console.warn(fmt,e.message)}
        if(!stop){setItems({...acc});setUrls({...urlAcc})}
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
      {/* Story önizleme */}
      {items[STORY_FORMAT] && (
        <div style={{marginTop:10}}>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
            <span>STORY · 1080×1920</span>
            {urls[STORY_FORMAT]&&<span style={{color:'#E1306C',fontSize:10}}>✓ Story hazır</span>}
          </div>
          <div style={{maxWidth:180}}>
            <img src={items[STORY_FORMAT]} alt="story" style={{width:'100%',borderRadius:6,border:'0.5px solid rgba(225,48,108,.3)',display:'block',marginBottom:4}}/>
            <a href={items[STORY_FORMAT]} download="kayserim-story.jpg">
              <button style={{width:'100%',fontSize:11,background:'rgba(225,48,108,.08)',border:'0.5px solid rgba(225,48,108,.25)',color:'#E1306C'}}>
                <Ic n="download" sz={11}/>Story İndir
              </button>
            </a>
          </div>
        </div>
      )}
      {busy&&<div style={{fontSize:11,color:'var(--muted)',marginTop:8,display:'flex',gap:6,alignItems:'center'}}><Ic n="loader-2" sz={11}/>Devam ediyor…</div>}
    </div>
  )
}
