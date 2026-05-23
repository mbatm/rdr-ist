// ── GÖRSEL ŞABLON EDİTÖRÜ ───────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'

const BASE_MANIFEST = {
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
const Ic = ({n,sz=14}) => <i className={`ti ti-${n}`} aria-hidden style={{fontSize:sz}}/>

// ── SmartCrop yükle ───────────────────────────────────────────────────────
let smartCropReady = false
function loadSmartCrop() {
  if (smartCropReady || window.SmartCrop) { smartCropReady=true; return Promise.resolve() }
  return new Promise(res => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/smartcrop/2.0.5/smartcrop.min.js'
    s.onload = () => { smartCropReady=true; res() }
    document.head.appendChild(s)
  })
}

function loadImg(src, cross=false) {
  return new Promise(res => {
    const img = new Image()
    if (cross) img.crossOrigin='anonymous'
    img.onload=()=>res(img); img.onerror=()=>res(null); img.src=src
  })
}

function wrapText(ctx, text, maxW, maxLines=3) {
  const words=(text||'').split(' '); const lines=[]; let cur=''
  for (const w of words) {
    const test=cur?cur+' '+w:w
    if (ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w}else cur=test
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
async function getSvg(fmt) {
  if(svgCache[fmt])return svgCache[fmt]
  const v=Math.floor(Date.now()/3600000)
  const txt=await fetch('/templates/'+fmt+'.svg?v='+v).then(r=>r.text())
  const blob=new Blob([txt],{type:'image/svg+xml'})
  const url=URL.createObjectURL(blob)
  const img=await loadImg(url)
  URL.revokeObjectURL(url)
  svgCache[fmt]=img; return img
}

// ── ANA RENDER FONKSİYONU (Editor + OtoGorselUret ortak) ─────────────────
async function renderCanvas(canvas, fmt, haber, settings={}) {
  const base = BASE_MANIFEST[fmt]; if(!base) return
  const m = {
    ...base,
    baslik:      {...base.baslik,      ...settings.baslik},
    spot_baslik: {...base.spot_baslik, ...settings.spot_baslik},
    kategori:    {...base.kategori,    ...settings.kategori},
  }
  const {w,h,bandH,pad} = m
  canvas.width=w; canvas.height=h
  const ctx=canvas.getContext('2d')
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'

  // Arka plan
  const gorselUrl=haber.gorsel_url||haber.gorsel||''
  if(gorselUrl){
    const proxyUrl='/api/gorsel-proxy?url='+encodeURIComponent(gorselUrl)
    const bg=await loadImg(proxyUrl,true)
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
  } else {ctx.fillStyle='#1a2535';ctx.fillRect(0,0,w,h)}

  // SVG chrome
  const chrome=await getSvg(fmt)
  if(chrome)ctx.drawImage(chrome,0,0,w,h)

  // Layout
  const kH=m.kategori.fontSize*1.55
  const bottomY=h-pad*0.45
  const badgeTopY=bottomY-kH

  const bm=m.baslik, sm=m.spot_baslik, km=m.kategori
  const baslik=(haber.sosyal_baslik||haber.site_basligi||haber.baslik||'Haber Başlığı')
  const spot=(haber.ozet||'Spot başlık metni burada görünür.')
  const tarih=haber.tarih||new Date().toLocaleDateString('tr-TR')
  const kategori=(haber.kategori||'GÜNCEL').toUpperCase()

  const bLineH=bm.fontSize*1.32
  const maxTitleLn=w>h?2:3
  ctx.font='600 '+bm.fontSize+'px Poppins,Arial'
  const bLines=wrapText(ctx,baslik,w-bm.x-pad,maxTitleLn)
  const spotF=sm.fontSize
  const spotLineH=spotF*1.38
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
  if(settings.stripeVisible!==false){
    const strW=Math.max(4,Math.round(w*0.004))
    ctx.fillStyle=settings.stripeColor||'#ED1C24'
    ctx.fillRect(bm.x-strW-Math.round(w*0.01),actualTitleY-bm.fontSize*0.82,strW,bLines.length*bLineH)
  }

  // Spot + highlight
  if(spot){
    const lastTitleBaseline=actualTitleY+(bLines.length-1)*bLineH
    const spotStartBaseline=lastTitleBaseline+spotF*1.25+8
    const spotLines=wrapText(ctx,spot,w-sm.x-pad,maxSpotLn)
    ctx.font='400 '+spotF+'px "Open Sans",Arial'
    const hlColor=settings.highlightColor||'#ED1C24'
    const hlOpacity=settings.highlightOpacity??0.38
    ctx.globalAlpha=hlOpacity
    ctx.fillStyle=hlColor
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
  const badgeColor=settings.badgeColor||'#ED1C24'
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
}

// ── SETTINGS PANEL ────────────────────────────────────────────────────────
function Slider({label,value,min,max,step=1,onChange}){
  return <div style={{marginBottom:10}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--muted)',marginBottom:4}}>
      <span>{label}</span><span style={{color:'var(--text)'}}>{typeof value==='number'?value.toFixed(step<1?1:0):value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}
      style={{width:'100%'}}/>
  </div>
}

function ColorRow({label,value,onChange}){
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
    <span style={{fontSize:12,color:'var(--muted)'}}>{label}</span>
    <input type="color" value={value} onChange={e=>onChange(e.target.value)}
      style={{width:36,height:26,border:'0.5px solid var(--border)',borderRadius:4,cursor:'pointer',background:'none'}}/>
  </div>
}

// ── EDİTÖR ────────────────────────────────────────────────────────────────
export default function GorselEditor({onKapat, ornek}) {
  const [fmt,   setFmt]  = useState('instagram')
  const [settings, setSett] = useState({
    stripeVisible:   true,
    stripeColor:     '#ED1C24',
    highlightColor:  '#ED1C24',
    highlightOpacity: 0.38,
    badgeColor:      '#ED1C24',
    baslik:      {},
    spot_baslik: {},
  })
  const [preview, setPreview] = useState(null)
  const [busy,    setBusy]    = useState(false)
  const [saved,   setSaved]   = useState(false)
  const canvasRef = useRef(null)

  const ornek_haber = ornek || {
    sosyal_baslik: 'Kayseri\'de Önemli Gelişme: Son Dakika Haberi',
    ozet: 'Kayseri merkezde meydana gelen gelişmeler haberlere yansıdı.',
    kategori: 'Güncel',
    tarih: new Date().toLocaleDateString('tr-TR'),
    gorsel_url: '',
  }

  const render = useCallback(async () => {
    setBusy(true)
    const cv = canvasRef.current
    await renderCanvas(cv, fmt, ornek_haber, settings)
    const pw=Math.min(BASE_MANIFEST[fmt].w,520)
    const ph=Math.round(pw*BASE_MANIFEST[fmt].h/BASE_MANIFEST[fmt].w)
    const prev=document.createElement('canvas')
    prev.width=pw*2;prev.height=ph*2
    prev.getContext('2d').drawImage(cv,0,0,prev.width,prev.height)
    setPreview(prev.toDataURL('image/jpeg',.88))
    setBusy(false)
  },[fmt,settings,ornek_haber])

  useEffect(()=>{render()},[fmt,settings])

  const save = async () => {
    const body={id:'varsayilan',...BASE_MANIFEST,settings}
    await fetch('/api/sablon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  const upd = (key,val) => setSett(p=>({...p,[key]:val}))
  const updBaslik = (key,val) => setSett(p=>({...p,baslik:{...p.baslik,[key]:val}}))
  const updSpot   = (key,val) => setSett(p=>({...p,spot_baslik:{...p.spot_baslik,[key]:val}}))
  const bm = {...BASE_MANIFEST[fmt]?.baslik, ...settings.baslik}
  const sm = {...BASE_MANIFEST[fmt]?.spot_baslik, ...settings.spot_baslik}

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0.75rem 1rem',borderBottom:'0.5px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{fontWeight:600,fontSize:14}}>Şablon Editörü</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
          {FORMATLAR.map(f=>{
            const on=fmt===f
            return <button key={f} onClick={()=>setFmt(f)}
              style={{fontSize:11,background:on?'rgba(230,57,70,.15)':'transparent',border:`0.5px solid ${on?'rgba(230,57,70,.4)':'var(--border)'}`,color:on?'#ff7b7b':'var(--muted)'}}>
              {f}
            </button>
          })}
          <button onClick={save}
            style={{fontWeight:500,background:saved?'rgba(0,212,170,.2)':'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',fontSize:12}}>
            <Ic n={saved?'check':'device-floppy'} sz={13}/> {saved?'Kaydedildi!':'Kaydet'}
          </button>
          {onKapat&&<button onClick={onKapat} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="x" sz={13}/>
          </button>}
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Sol: Ayarlar */}
        <div style={{width:210,borderRight:'0.5px solid var(--border)',overflowY:'auto',padding:'0.75rem',flexShrink:0}}>
          <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Başlık</div>
          <Slider label="Font boyutu" value={bm.fontSize} min={30} max={100} step={0.5} onChange={v=>updBaslik('fontSize',v)}/>
          <Slider label="Y pozisyonu" value={bm.y} min={200} max={900} step={1} onChange={v=>updBaslik('y',v)}/>

          <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'12px 0 10px'}}>Spot Başlık</div>
          <Slider label="Font boyutu" value={sm.fontSize} min={14} max={60} step={0.5} onChange={v=>updSpot('fontSize',v)}/>
          <ColorRow label="Highlight rengi" value={settings.highlightColor} onChange={v=>upd('highlightColor',v)}/>
          <Slider label="Opaklık" value={settings.highlightOpacity} min={0.1} max={0.8} step={0.05} onChange={v=>upd('highlightOpacity',v)}/>

          <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'12px 0 10px'}}>Sol Şerit</div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',marginBottom:8}}>
            <input type="checkbox" checked={settings.stripeVisible!==false}
              onChange={e=>upd('stripeVisible',e.target.checked)}/> Göster
          </label>
          <ColorRow label="Renk" value={settings.stripeColor} onChange={v=>upd('stripeColor',v)}/>

          <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'12px 0 10px'}}>Kategori Badge</div>
          <ColorRow label="Renk" value={settings.badgeColor} onChange={v=>upd('badgeColor',v)}/>

          <button onClick={()=>setSett({stripeVisible:true,stripeColor:'#ED1C24',highlightColor:'#ED1C24',highlightOpacity:0.38,badgeColor:'#ED1C24',baslik:{},spot_baslik:{}})}
            style={{width:'100%',fontSize:11,marginTop:8,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="refresh" sz={11}/> Sıfırla
          </button>
        </div>

        {/* Orta: Önizleme */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',background:'var(--surface)',overflow:'auto'}}>
          <canvas ref={canvasRef} style={{display:'none'}}/>
          {busy&&!preview&&<div style={{color:'var(--muted)',fontSize:13}}><Ic n="loader-2" sz={16}/> Yükleniyor…</div>}
          {preview&&<img src={preview} alt="Önizleme"
            style={{maxWidth:'min(500px,100%)',maxHeight:'65vh',borderRadius:8,border:'0.5px solid var(--border)',display:'block',
              opacity:busy?0.6:1,transition:'opacity .2s'}}/>}
        </div>
      </div>

      {/* Alt: Açıklama */}
      <div style={{padding:'8px 1rem',borderTop:'0.5px solid var(--border)',fontSize:11,color:'var(--muted)',flexShrink:0}}>
        Değişiklikler anlık önizlemeye yansır — "Kaydet" ile KV'ye yazılır ve tüm yeni üretimler bu ayarları kullanır.
      </div>
    </div>
  )
}
