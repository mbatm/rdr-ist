// ── OTO GÖRSEL ÜRET — SmartCrop + SVG chrome + Canvas metin ────────────
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
const FORMATLAR = ['instagram','facebook','twitter','youtube']

// SmartCrop yükle (AI kadrajlama)
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

// Cloudflare KV'den kayıtlı ayarları oku
let savedSettings=null
async function getSettings(){
  if(savedSettings)return savedSettings
  try{
    const r=await fetch('/api/sablon?id=varsayilan')
    const d=await r.json()
    savedSettings=d.settings||{}
  }catch{savedSettings={}}
  return savedSettings
}

async function renderFormat(fmt,haber){
  const base=MANIFEST[fmt];if(!base)return null
  const sett=await getSettings()
  const m={
    ...base,
    baslik:     {...base.baslik,     ...(sett.baslik||{})},
    spot_baslik:{...base.spot_baslik,...(sett.spot_baslik||{})},
    kategori:   {...base.kategori,   ...(sett.kategori||{})},
  }
  const{w,h,bandH,pad}=m

  const cv=document.createElement('canvas')
  cv.width=w;cv.height=h
  const ctx=cv.getContext('2d')
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'

  // 1. Arka plan — SmartCrop ile akıllı kadraj
  const gUrl=haber.gorsel_url||haber.gorsel||''
  if(gUrl){
    const bg=await loadImg('/api/gorsel-proxy?url='+encodeURIComponent(gUrl),true)
    if(bg){
      await loadSmartCrop()
      let sx=0,sy=0,sw=bg.width,sh=bg.height
      if(window.SmartCrop){
        try{
          const result=await window.SmartCrop.crop(bg,{width:w,height:h,minScale:0.8})
          const c=result.topCrop
          sx=c.x;sy=c.y;sw=c.width;sh=c.height
        }catch(e){}
      }
      if(!sw||!sh){const s=Math.max(w/bg.width,h/bg.height);sx=(bg.width-w/s)/2;sy=(bg.height-h/s)/2;sw=w/s;sh=h/s}
      ctx.drawImage(bg,sx,sy,sw,sh,0,0,w,h)
    }
  }else{ctx.fillStyle='#1a2535';ctx.fillRect(0,0,w,h)}

  // 2. SVG chrome
  const chrome=await getSvg(fmt)
  if(chrome)ctx.drawImage(chrome,0,0,w,h)

  // 3. Layout — alttan yukarı
  const bm=m.baslik,sm=m.spot_baslik,km=m.kategori
  const kH=km.fontSize*1.55
  const bottomY=h-pad*0.45
  const badgeTopY=bottomY-kH
  const baslik=haber.sosyal_baslik||haber.site_basligi||haber.baslik||''
  const spot=haber.ozet||''
  const tarih=haber.tarih||new Date().toLocaleDateString('tr-TR')
  const kategori=(haber.kategori||'GÜNCEL').toUpperCase()

  const bLineH=bm.fontSize*1.32
  const maxTitleLn=w>h?2:3
  ctx.font='600 '+bm.fontSize+'px Poppins,Arial'
  const bLines=wrapText(ctx,baslik,w-bm.x-pad,maxTitleLn)
  const spotF=sm.fontSize,spotLineH=spotF*1.38
  const maxSpotLn=w>h?1:2
  const spotBlockH=maxSpotLn*spotLineH+spotF*0.2
  const spotBaseY=badgeTopY-8
  const titleBaseY=spotBaseY-spotBlockH-6
  const titleStartY=titleBaseY-bLines.length*bLineH+bLineH
  const actualTitleY=Math.min(bm.y,titleStartY)

  // Başlık
  ctx.fillStyle='#fff'
  ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=14;ctx.shadowOffsetY=1
  bLines.forEach((ln,i)=>ctx.fillText(ln,bm.x,actualTitleY+i*bLineH))
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0

  // Sol şerit
  if(sett.stripeVisible!==false){
    const strW=Math.max(4,Math.round(w*0.004))
    ctx.fillStyle=sett.stripeColor||'#ED1C24'
    ctx.fillRect(bm.x-strW-Math.round(w*0.01),actualTitleY-bm.fontSize*0.82,strW,bLines.length*bLineH)
  }

  // Spot + highlight
  if(spot){
    const lastTitleBaseline=actualTitleY+(bLines.length-1)*bLineH
    const spotStartBaseline=lastTitleBaseline+spotF*1.25+8
    const spotLines=wrapText(ctx,spot,w-sm.x-pad,maxSpotLn)
    ctx.font='400 '+spotF+'px "Open Sans",Arial'
    const hlColor=sett.highlightColor||'#ED1C24'
    const hlOpacity=sett.highlightOpacity??0.38
    ctx.globalAlpha=hlOpacity;ctx.fillStyle=hlColor
    spotLines.forEach((ln,i)=>{
      const lw=ctx.measureText(ln).width
      const ly=spotStartBaseline+i*spotLineH
      ctx.fillRect(sm.x-spotF*0.3,ly-spotF*0.82-spotF*0.18,lw+spotF*0.6,spotF+spotF*0.36)
    })
    ctx.globalAlpha=1
    ctx.fillStyle='rgba(255,255,255,.95)'
    ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=6;ctx.shadowOffsetY=1
    spotLines.forEach((ln,i)=>ctx.fillText(ln,sm.x,spotStartBaseline+i*spotLineH))
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0
  }

  // Badge
  const badgeColor=sett.badgeColor||'#ED1C24'
  ctx.font='700 '+km.fontSize+'px Poppins,Arial'
  const kw=ctx.measureText(kategori).width
  const kPad=km.fontSize*0.55,kR=kH*0.42
  pill(ctx,km.x,badgeTopY,kw+kPad*2,kH,kR,badgeColor)
  ctx.fillStyle='#fff';ctx.textBaseline='middle'
  ctx.fillText(kategori,km.x+kPad,badgeTopY+kH*0.5)
  ctx.textBaseline='alphabetic'

  // Tarih
  const tmF=base.tarih.fontSize
  ctx.font='400 '+tmF+'px "Open Sans",Arial'
  ctx.fillStyle='rgba(255,255,255,.82)'
  ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=5
  const tw=ctx.measureText(tarih).width
  ctx.textBaseline='middle'
  ctx.fillText(tarih,w-pad-tw,badgeTopY+kH*0.5)
  ctx.textBaseline='alphabetic'
  ctx.shadowColor='transparent';ctx.shadowBlur=0

  return cv.toDataURL('image/jpeg',.93)
}

const Ic=({n,sz=14})=><i className={`ti ti-${n}`} aria-hidden style={{fontSize:sz}}/>

export default function OtoGorselUret({haber}){
  const[items,setItems]=useState({})
  const[busy,setBusy]=useState(false)

  useEffect(()=>{
    if(!haber?.source_id)return
    let stop=false;setItems({});setBusy(true)
    ;(async()=>{
      const acc={}
      for(const fmt of FORMATLAR){
        if(stop)break
        try{acc[fmt]=await renderFormat(fmt,haber)}catch(e){console.warn(fmt,e.message)}
        if(!stop)setItems({...acc})
      }
      if(!stop)setBusy(false)
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
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase'}}>{fmt}·{mm.w}×{mm.h}</div>
            <img src={src} alt={fmt} style={{width:'100%',borderRadius:6,border:'0.5px solid var(--border)',display:'block',marginBottom:4}}/>
            <a href={src} download={`kayserim-${fmt}.jpg`}>
              <button style={{width:'100%',fontSize:11,background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                <Ic n="download" sz={11}/>İndir
              </button>
            </a>
          </div>
        })}
      </div>
      {busy&&<div style={{fontSize:11,color:'var(--muted)',marginTop:8,display:'flex',gap:6,alignItems:'center'}}><Ic n="loader-2" sz={11}/>Devam ediyor…</div>}
    </div>
  )
}
