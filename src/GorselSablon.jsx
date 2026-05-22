import { useState, useEffect, useRef, useCallback } from 'react'

const ICON_SRC  = 'data:image/png;base64,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'
const BEYAZ_SRC = 'data:image/png;base64,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'
const DPR = 2

const FORMATS = [
  { id:'instagram', w:1080, h:1080, label:'Instagram', ic:'brand-instagram' },
  { id:'facebook',  w:1200, h:630,  label:'Facebook',  ic:'brand-facebook'  },
  { id:'x',         w:1600, h:900,  label:'X',         ic:'brand-x'         },
  { id:'youtube',   w:1280, h:720,  label:'YouTube',   ic:'brand-youtube'   },
]

function wrapText(ctx, text, maxW, maxLines=3) {
  if (!text) return []
  const words = text.split(' ')
  const lines = []; let cur = ''
  for (const w of words) {
    const test = cur ? cur+' '+w : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, maxLines)
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function detectBrightness(ctx,w,h,textPos){
  try {
    const sy = textPos==='bottom' ? Math.floor(h*.45) : Math.floor(h*.08)
    const d  = ctx.getImageData(0,sy,w,Math.floor(h*.38)).data
    let sum = 0
    for (let i=0;i<d.length;i+=4) sum += d[i]*.299+d[i+1]*.587+d[i+2]*.114
    return (sum/(d.length/4)) < 110
  } catch { return true }
}

async function drawTemplate(ctx,{ bgImg,w,h,baslik,spotBaslik,kategori,tarih,textPos,icon,logo }){
  const pad  = Math.round(w*.038)
  const barH = Math.round(h*.065)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (bgImg) {
    const scale = Math.max(w/bgImg.width, h/bgImg.height)
    const sw=bgImg.width*scale, sh=bgImg.height*scale
    ctx.drawImage(bgImg,(w-sw)/2,(h-sh)/2,sw,sh)
  } else { ctx.fillStyle='#1a2535'; ctx.fillRect(0,0,w,h) }

  const isDark = detectBrightness(ctx,w,h,textPos)

  if (textPos==='bottom') {
    const g=ctx.createLinearGradient(0,h*.15,0,h)
    g.addColorStop(0,'rgba(0,0,0,0)')
    g.addColorStop(.5,'rgba(0,0,0,.45)')
    g.addColorStop(1,isDark?'rgba(0,0,0,.82)':'rgba(0,0,0,.92)')
    ctx.fillStyle=g
  } else {
    const g=ctx.createLinearGradient(0,0,0,h*.78)
    g.addColorStop(0,isDark?'rgba(0,0,0,.72)':'rgba(0,0,0,.88)')
    g.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=g
  }
  ctx.fillRect(0,0,w,h)
  if (!isDark) { ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(0,0,w,h) }

  ctx.fillStyle='#D63031'; ctx.fillRect(0,0,w,barH)

  if (icon) {
    const ih=Math.round(barH*.72)
    ctx.drawImage(icon,pad,(barH-ih)/2,ih,ih)
  }
  if (logo) {
    const lh=Math.round(barH*.58)
    const lw=Math.round(lh*(logo.naturalWidth/logo.naturalHeight))
    ctx.drawImage(logo,w-pad-lw,(barH-lh)/2,lw,lh)
  }

  const stripeW  = Math.round(w*.005)
  const textX    = pad+stripeW+Math.round(w*.02)
  const textMaxW = w-textX-pad
  const titleSz  = Math.round(w*.046)
  const spotSz   = Math.round(w*.026)
  const lineH    = titleSz*1.32
  const spotLineH = spotSz*1.4

  ctx.font = `700 ${titleSz}px Arial, "Helvetica Neue", sans-serif`
  const titleLines = wrapText(ctx,baslik||'',textMaxW,3)
  ctx.font = `400 ${spotSz}px Arial, "Helvetica Neue", sans-serif`
  const spotLines  = spotBaslik ? wrapText(ctx,spotBaslik,textMaxW,2) : []

  const titleH  = titleLines.length*lineH
  const gapSpot = spotLines.length>0 ? Math.round(w*.014) : 0
  const spotH   = spotLines.length*spotLineH
  const blockH  = titleH+gapSpot+spotH
  const stripeH = blockH+Math.round(h*.016)
  const badgeSz   = Math.round(h*.038)
  const bottomPad = Math.round(h*.032)+badgeSz+Math.round(h*.02)
  const blockY = textPos==='bottom' ? h-bottomPad-blockH : barH+Math.round(h*.03)

  ctx.fillStyle='#D63031'
  ctx.fillRect(pad,blockY-Math.round(h*.005),stripeW,stripeH)

  ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=isDark?10:22; ctx.shadowOffsetY=2
  ctx.fillStyle='#ffffff'
  ctx.font = `700 ${titleSz}px Arial, "Helvetica Neue", sans-serif`
  titleLines.forEach((line,i)=>ctx.fillText(line,textX,blockY+lineH*(i+1)-lineH*.22))

  if (spotLines.length) {
    ctx.font = `400 ${spotSz}px Arial, "Helvetica Neue", sans-serif`
    ctx.fillStyle='rgba(255,255,255,.88)'; ctx.shadowBlur=isDark?6:15
    const sy0=blockY+titleH+gapSpot
    spotLines.forEach((line,i)=>ctx.fillText(line,textX,sy0+spotLineH*(i+1)-spotLineH*.22))
  }
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0

  const badgeY   = h-badgeSz-Math.round(h*.028)
  const badgeFnt = Math.round(badgeSz*.46)
  const badgeTxt = (kategori||'GENEL').toUpperCase()
  ctx.font = `700 ${badgeFnt}px Arial, sans-serif`
  const btw = ctx.measureText(badgeTxt).width
  const bph = Math.round(badgeSz*.55), bpv = Math.round(badgeSz*.68)
  const bw  = btw+bph*2
  ctx.fillStyle='#D63031'
  roundRect(ctx,pad,badgeY,bw,badgeSz,Math.round(badgeSz*.48)); ctx.fill()
  ctx.fillStyle='#fff'
  ctx.font = `700 ${badgeFnt}px Arial, sans-serif`
  ctx.fillText(badgeTxt,pad+bph,badgeY+bpv)

  if (tarih) {
    ctx.font = `400 ${badgeFnt}px Arial, sans-serif`
    ctx.fillStyle='rgba(255,255,255,.82)'
    ctx.shadowColor='rgba(0,0,0,.8)'; ctx.shadowBlur=4
    const dtw=ctx.measureText(tarih).width
    ctx.fillText(tarih,w-pad-dtw,badgeY+bpv)
    ctx.shadowBlur=0
  }
}

const Ic = ({n, size=15, style={}}) =>
  <i className={`ti ti-${n}`} aria-hidden="true" style={{fontSize:size,...style}}/>

export default function GorselSablon({ gorselUrl, baslik, spotBaslik, kategori, tarih }) {
  const [format,   setFormat]  = useState('instagram')
  const [textPos,  setTextPos] = useState('bottom')
  const [rendering,setRend]    = useState(false)
  const [preview,  setPreview] = useState(null)
  const [error,    setError]   = useState(null)
  const [logos,    setLogos]   = useState({ icon:null, logo:null })
  const canvasRef = useRef(null)

  useEffect(()=>{
    const load = src => new Promise(res=>{
      const img=new Image(); img.onload=()=>res(img); img.onerror=()=>res(null); img.src=src
    })
    Promise.all([load(ICON_SRC),load(BEYAZ_SRC)]).then(([icon,logo])=>setLogos({icon,logo}))
  },[])

  // gorselUrl değişince önizlemeyi sıfırla
  useEffect(()=>{ setPreview(null); setError(null) },[gorselUrl])

  const render = useCallback(async (fmt=format)=>{
    if (!gorselUrl) return
    setRend(true); setError(null); setPreview(null)
    const f=FORMATS.find(x=>x.id===fmt)
    const canvas=canvasRef.current
    canvas.width=f.w*DPR; canvas.height=f.h*DPR
    const ctx=canvas.getContext('2d')
    ctx.scale(DPR,DPR)

    const proxyUrl = `/api/gorsel-proxy?url=${encodeURIComponent(gorselUrl)}`
    const bgImg = await new Promise(res=>{
      const img=new Image(); img.crossOrigin='anonymous'
      img.onload=()=>res(img); img.onerror=()=>res(null); img.src=proxyUrl
    })

    try {
      await drawTemplate(ctx,{bgImg,w:f.w,h:f.h,baslik,spotBaslik,kategori,tarih,textPos,icon:logos.icon,logo:logos.logo})
      const pw=Math.min(f.w,500), ph=Math.round(pw*f.h/f.w)
      const prev=document.createElement('canvas')
      prev.width=pw*DPR; prev.height=ph*DPR
      prev.getContext('2d').drawImage(canvas,0,0,prev.width,prev.height)
      setPreview(prev.toDataURL('image/jpeg',.9))
    } catch(e) { setError('Hata: '+e.message) }
    setRend(false)
  },[format,gorselUrl,baslik,spotBaslik,kategori,tarih,textPos,logos])

  const download = async (fmt)=>{
    const f=FORMATS.find(x=>x.id===fmt)
    if (canvasRef.current.width!==f.w*DPR) { await render(fmt) }
    const a=document.createElement('a')
    a.href=canvasRef.current.toDataURL('image/png')
    a.download=`kayserim-${fmt}-${Date.now()}.png`
    a.click()
  }

  if (!gorselUrl) return (
    <div style={{padding:'0.875rem',background:'rgba(255,255,255,.04)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--muted)',textAlign:'center'}}>
      Haber görseli bulunamadı
    </div>
  )

  return (
    <div>
      <canvas ref={canvasRef} style={{display:'none'}}/>
      <div style={{display:'flex',gap:6,marginBottom:'0.875rem',flexWrap:'wrap'}}>
        {FORMATS.map(f=>{
          const on=format===f.id
          return <button key={f.id} onClick={()=>setFormat(f.id)}
            style={{background:on?'rgba(230,57,70,.15)':'transparent',border:`0.5px solid ${on?'rgba(230,57,70,.4)':'var(--border)'}`,color:on?'#ff7b7b':'var(--muted)',fontWeight:on?500:400,fontSize:12}}>
            <Ic n={f.ic} size={13}/>{f.label}
            <span style={{marginLeft:4,fontSize:10,color:'var(--muted)',opacity:.7}}>{f.w}x{f.h}</span>
          </button>
        })}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:'0.875rem'}}>
        {[['bottom','layout-navbar-expand','Metin altta'],['top','layout-navbar','Metin ustte']].map(([pos,ic,lbl])=>{
          const on=textPos===pos
          return <button key={pos} onClick={()=>setTextPos(pos)}
            style={{background:on?'rgba(255,255,255,.08)':'transparent',border:`0.5px solid ${on?'rgba(255,255,255,.2)':'var(--border)'}`,fontWeight:on?500:400,fontSize:12}}>
            <Ic n={ic} size={13}/>{lbl}
          </button>
        })}
      </div>
      <button onClick={()=>render()} disabled={rendering}
        style={{fontWeight:500,background:'rgba(230,57,70,.15)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b',marginBottom:'1rem'}}>
        <Ic n={rendering?'loader-2':'photo'} size={15}/>
        {rendering?'Sablon uygulanıyor…':'Sablon Uygula & Onizle (2x kalite)'}
      </button>
      {error && <div style={{background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',padding:'9px 12px',fontSize:12,color:'rgba(230,57,70,.9)',marginBottom:'0.875rem'}}>
        <Ic n="alert-circle" size={13}/> {error}
      </div>}
      {preview && <div>
        <img src={preview} alt="Onizleme" style={{width:'100%',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border)',display:'block',marginBottom:'0.75rem'}}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {FORMATS.map(f=>(
            <button key={f.id} onClick={()=>download(f.id)}
              style={{fontSize:12,background:'rgba(0,212,170,.1)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
              <Ic n="download" size={13}/>{f.label} PNG
            </button>
          ))}
        </div>
      </div>}
    </div>
  )
}
