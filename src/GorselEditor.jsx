import { useState, useEffect, useRef, useCallback } from 'react'

// ── LOGOLAR ───────────────────────────────────────────────────────────────
const LOGOLAR = {
  icon:  'data:image/png;base64,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',
  beyaz: 'data:image/png;base64,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',
}

const FORMATLAR = [
  { id:'instagram', w:1080, h:1080, etiket:'Instagram 1:1' },
  { id:'facebook',  w:1200, h:630,  etiket:'Facebook 1.91:1' },
  { id:'x',         w:1600, h:900,  etiket:'X 16:9' },
  { id:'youtube',   w:1280, h:720,  etiket:'YouTube 16:9' },
]

const Ic = ({n,size=14,style={}}) =>
  <i className={`ti ti-${n}`} aria-hidden="true" style={{fontSize:size,...style}}/>

// ── CANVAS RENDER (editor + export için ortak) ────────────────────────────
async function renderSablon(ctx, { w, h, bgImg, sablon, data={} }) {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Arka plan
  if (bgImg) {
    const s = Math.max(w/bgImg.width, h/bgImg.height)
    ctx.drawImage(bgImg, (w-bgImg.width*s)/2, (h-bgImg.height*s)/2, bgImg.width*s, bgImg.height*s)
  } else {
    ctx.fillStyle = '#1a2535'
    ctx.fillRect(0,0,w,h)
  }

  // Gradient overlay
  if (sablon.gradient?.aktif) {
    const g = ctx.createLinearGradient(0,0,0,h)
    const b = sablon.gradient.bitis || 'rgba(0,0,0,0.88)'
    g.addColorStop(0, sablon.gradient.baslangic || 'rgba(0,0,0,0)')
    g.addColorStop(1, b)
    ctx.fillStyle = g
    ctx.fillRect(0,0,w,h)
  }

  const imgCache = {}
  const loadImg = src => new Promise(res => {
    if (imgCache[src]) { res(imgCache[src]); return }
    const img = new Image()
    img.onload = () => { imgCache[src]=img; res(img) }
    img.onerror = () => res(null)
    img.src = src
  })

  for (const el of (sablon.elementler||[])) {
    if (el.gizli) continue

    if (el.tip === 'rect') {
      ctx.globalAlpha = el.opaklık ?? 1
      ctx.fillStyle = el.renk || '#D63031'
      ctx.fillRect(el.x*w, el.y*h, el.w*w, el.h*h)
      ctx.globalAlpha = 1
    }

    else if (el.tip === 'logo') {
      const src = LOGOLAR[el.src]
      if (!src) continue
      const img = await loadImg(src)
      if (!img) continue
      const iw = el.w*w
      const ih = iw * (img.naturalHeight/img.naturalWidth)
      ctx.drawImage(img, el.x*w, el.y*h, iw, ih)
    }

    else if (el.tip === 'metin') {
      const text = data[el.alan] || el.onizleme || el.etiket || ''
      if (!text) continue
      const fsize = Math.round(el.boyut*w)
      ctx.font = `${el.agirlik||'600'} ${fsize}px Arial, sans-serif`
      ctx.fillStyle = el.renk || '#ffffff'
      if (el.golge) {
        ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 1
      }
      const maxW = el.w*w
      const words = text.split(' ')
      const lines = []; let cur = ''
      for (const wrd of words) {
        const test = cur ? cur+' '+wrd : wrd
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wrd }
        else cur = test
      }
      if (cur) lines.push(cur)
      const maxLines = el.satirSayisi || 3
      const lh = fsize * 1.35
      lines.slice(0,maxLines).forEach((ln,i) => ctx.fillText(ln, el.x*w, el.y*h + lh*(i+1) - lh*0.2))
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    }

    else if (el.tip === 'badge') {
      const text = (data[el.alan] || 'GENEL').toUpperCase()
      const fsize = Math.round(el.boyut*w)
      ctx.font = `700 ${fsize}px Arial, sans-serif`
      const tw = ctx.measureText(text).width
      const ph = fsize*0.55, pv = fsize*0.68
      const bw = tw+ph*2, bh = fsize*1.4
      const r  = bh*0.45
      ctx.fillStyle = el.bgRenk || '#D63031'
      ctx.beginPath()
      const bx=el.x*w, by=el.y*h-bh*0.5
      ctx.roundRect(bx,by,bw,bh,r); ctx.fill()
      ctx.fillStyle = el.metinRenk || '#ffffff'
      ctx.fillText(text, bx+ph, by+pv)
    }

    else if (el.tip === 'tarih') {
      const text = data.tarih || new Date().toLocaleDateString('tr-TR')
      const fsize = Math.round(el.boyut*w)
      ctx.font = `400 ${fsize}px Arial, sans-serif`
      ctx.fillStyle = el.renk || 'rgba(255,255,255,0.82)'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4
      const tw = ctx.measureText(text).width
      const bx = el.hizalama==='sag' ? el.x*w-tw : el.x*w
      ctx.fillText(text, bx, el.y*h)
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
    }
  }
}

// ── ELEMENT PROPERTİES PANELİ ─────────────────────────────────────────────
function PropPanel({ el, onChange }) {
  if (!el) return (
    <div style={{padding:'1rem',color:'var(--muted)',fontSize:13,textAlign:'center'}}>
      Bir eleman seçin
    </div>
  )

  const F = ({label, children}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      {children}
    </div>
  )

  return (
    <div style={{padding:'0.75rem',overflowY:'auto',maxHeight:'100%'}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12,color:'var(--text)'}}>{el.etiket}</div>

      {(el.tip==='rect'||el.tip==='badge') && (
        <F label="Renk">
          <input type="color" value={el.renk||el.bgRenk||'#D63031'}
            onChange={e=>onChange({...el,[el.bgRenk?'bgRenk':'renk']:e.target.value})}
            style={{width:'100%',height:32,border:'0.5px solid var(--border)',borderRadius:6,cursor:'pointer',background:'none'}}/>
        </F>
      )}

      {el.tip==='metin' && <>
        <F label="Metin rengi">
          <input type="color" value={el.renk?.startsWith('rgba')?'#ffffff':el.renk||'#ffffff'}
            onChange={e=>onChange({...el,renk:e.target.value})}
            style={{width:'100%',height:32,border:'0.5px solid var(--border)',borderRadius:6,cursor:'pointer',background:'none'}}/>
        </F>
        <F label={`Yazı boyutu (şu an: ${Math.round(el.boyut*100)}%)`}>
          <input type="range" min={1} max={8} step={0.1}
            value={Math.round(el.boyut*100)}
            onChange={e=>onChange({...el,boyut:Number(e.target.value)/100})}
            style={{width:'100%'}}/>
        </F>
        <F label="Gölge">
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
            <input type="checkbox" checked={!!el.golge} onChange={e=>onChange({...el,golge:e.target.checked})}/>
            Gölge aktif
          </label>
        </F>
      </>}

      {(el.tip==='rect') && <>
        <F label={`Opaklık (${Math.round((el.opaklık??1)*100)}%)`}>
          <input type="range" min={0} max={100} step={1}
            value={Math.round((el.opaklık??1)*100)}
            onChange={e=>onChange({...el,opaklık:Number(e.target.value)/100})}
            style={{width:'100%'}}/>
        </F>
        <F label={`Yükseklik (${Math.round(el.h*100)}%)`}>
          <input type="range" min={1} max={20} step={0.5}
            value={Math.round(el.h*100)}
            onChange={e=>onChange({...el,h:Number(e.target.value)/100})}
            style={{width:'100%'}}/>
        </F>
      </>}

      <F label="Dikey konum (Y)">
        <input type="range" min={0} max={99} step={0.5}
          value={Math.round(el.y*100)}
          onChange={e=>onChange({...el,y:Number(e.target.value)/100})}
          style={{width:'100%'}}/>
      </F>

      <F label="Görünürlük">
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
          <input type="checkbox" checked={!el.gizli} onChange={e=>onChange({...el,gizli:!e.target.checked})}/>
          Göster
        </label>
      </F>
    </div>
  )
}

// ── ANA EDİTÖR ───────────────────────────────────────────────────────────
export default function GorselEditor({ onKapat }) {
  const [format,    setFormat]   = useState('instagram')
  const [sablon,    setSablon]   = useState(null)
  const [secili,    setSecili]   = useState(null)
  const [kaydediyor,setKayd]     = useState(false)
  const [yukleniyor,setYukl]     = useState(true)
  const [onizleme,  setOnizleme] = useState(null)
  const canvasRef = useRef(null)
  const fmt = FORMATLAR.find(f=>f.id===format)

  // Template yükle
  useEffect(()=>{
    fetch('/api/sablon?id=varsayilan')
      .then(r=>r.json())
      .then(d=>{ setSablon(d); setYukl(false) })
      .catch(()=>setYukl(false))
  },[])

  // Canvas render
  const render = useCallback(async ()=>{
    if (!sablon||!canvasRef.current) return
    const canvas = canvasRef.current
    const DPR = 1 // editörde 1x yeterli
    canvas.width  = fmt.w * DPR
    canvas.height = fmt.h * DPR
    const ctx = canvas.getContext('2d')
    ctx.scale(DPR,DPR)
    const ornek = { sosyal_baslik:'Kayseri OSBde trafik kazasi: 3 yarali', ozet:'Olay yerine gelen ekipler yaralilari hastaneye kaldirdi.', kategori:'Asayis', tarih:'21.05.2026' }
    await renderSablon(ctx,{ w:fmt.w, h:fmt.h, bgImg:null, sablon, data:ornek })
    setOnizleme(canvas.toDataURL('image/jpeg',0.85))
  },[sablon,format,fmt])

  useEffect(()=>{ if(sablon) render() },[sablon,format])

  const updateEl = useCallback((guncel)=>{
    setSablon(prev=>({
      ...prev,
      elementler: prev.elementler.map(e=>e.id===guncel.id?guncel:e)
    }))
    setSecili(guncel)
  },[])

  const kaydet = async ()=>{
    setKayd(true)
    await fetch('/api/sablon',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...sablon, id:'varsayilan'})
    })
    setKayd(false)
    alert('Şablon kaydedildi ✓')
  }

  if (yukleniyor) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400}}><Ic n="loader-2" size={24}/></div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0.75rem 1rem',borderBottom:'0.5px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{fontWeight:600,fontSize:14}}>Görsel Şablon Editörü</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
          {FORMATLAR.map(f=>{
            const on=format===f.id
            return <button key={f.id} onClick={()=>setFormat(f.id)}
              style={{fontSize:11,background:on?'rgba(230,57,70,.15)':'transparent',border:`0.5px solid ${on?'rgba(230,57,70,.4)':'var(--border)'}`,color:on?'#ff7b7b':'var(--muted)'}}>
              {f.etiket}
            </button>
          })}
          <button onClick={kaydet} disabled={kaydediyor}
            style={{fontWeight:500,background:'rgba(0,212,170,.15)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',fontSize:12}}>
            <Ic n={kaydediyor?'loader-2':'device-floppy'} size={13}/> {kaydediyor?'Kaydediliyor…':'Kaydet'}
          </button>
          {onKapat && <button onClick={onKapat} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="x" size={13}/> Kapat
          </button>}
        </div>
      </div>

      {/* Ana alan */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* Sol: Eleman listesi */}
        <div style={{width:180,borderRight:'0.5px solid var(--border)',overflowY:'auto',flexShrink:0}}>
          <div style={{padding:'8px 10px',fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid var(--border)'}}>Elemanlar</div>
          {(sablon?.elementler||[]).map(el=>{
            const on = secili?.id===el.id
            return (
              <div key={el.id} onClick={()=>setSecili(el)}
                style={{padding:'8px 12px',cursor:'pointer',background:on?'rgba(255,255,255,0.06)':'transparent',borderBottom:'0.5px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:10,height:10,borderRadius:2,background:el.renk||el.bgRenk||'rgba(255,255,255,0.3)',flexShrink:0,opacity:el.gizli?0.3:1}}/>
                <span style={{fontSize:12,color:el.gizli?'var(--muted)':'var(--text)',opacity:el.gizli?0.5:1}}>{el.etiket}</span>
              </div>
            )
          })}
        </div>

        {/* Orta: Önizleme */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',background:'var(--surface)',overflow:'auto'}}>
          <div style={{position:'relative',maxWidth:'100%',maxHeight:'100%'}}>
            <canvas ref={canvasRef} style={{display:'none'}}/>
            {onizleme && <img src={onizleme} alt="Önizleme"
              style={{maxWidth:'min(500px,100%)',maxHeight:'60vh',borderRadius:8,border:'0.5px solid var(--border)',display:'block'}}/>}
            {!onizleme && <div style={{width:400,height:300,background:'rgba(255,255,255,0.03)',border:'0.5px dashed var(--border)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:13}}>
              Yükleniyor…
            </div>}
          </div>
        </div>

        {/* Sağ: Özellikler */}
        <div style={{width:220,borderLeft:'0.5px solid var(--border)',overflowY:'auto',flexShrink:0}}>
          <div style={{padding:'8px 10px',fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid var(--border)'}}>Özellikler</div>
          <PropPanel el={secili} onChange={updateEl}/>
        </div>
      </div>

      {/* Gradient ayarları */}
      <div style={{padding:'10px 1rem',borderTop:'0.5px solid var(--border)',display:'flex',gap:16,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
        <span style={{fontSize:12,color:'var(--muted)'}}>Gradient overlay:</span>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}>
          <input type="checkbox" checked={!!sablon?.gradient?.aktif}
            onChange={e=>setSablon(p=>({...p,gradient:{...p.gradient,aktif:e.target.checked}}))}/>
          Aktif
        </label>
        <span style={{fontSize:12,color:'var(--muted)'}}>Bitiş rengi:</span>
        <input type="color" defaultValue="#000000"
          onChange={e=>{const v=e.target.value; setSablon(p=>({...p,gradient:{...p.gradient,bitis:v+'cc'}}))}}
          style={{width:32,height:24,border:'0.5px solid var(--border)',borderRadius:4,cursor:'pointer',background:'none'}}/>
        <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>Değişiklikler önizlemede anlık yansır — "Kaydet" ile KV'ye yazılır</span>
      </div>
    </div>
  )
}

export { renderSablon }
