import { useState, useEffect, useRef, useCallback } from 'react'
import GorselSablon from './GorselSablon.jsx'
import GorselEditor from './GorselEditor.jsx'
import OtoGorselUret from './OtoGorselUret.jsx'

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const MOCK = [
  { id:1, baslik:'Başkan Büyükkılıç, Bünyan Devlet Hastanesinde vatandaşlarla buluştu', icerik:'Kayseri Büyükşehir Belediye Başkanı Dr. Memduh Büyükkılıç, Bünyan Devlet Hastanesinde tedavi gören vatandaşları ziyaret etti. Başkan, hastaların ve yakınlarının sorunlarını dinleyerek geçmiş olsun dileklerini iletti.', gorsel:'https://service.1ha.com.tr/medias/cover-1763390663443.jpg', kategori:'Güncel', tarih:'17.11.2025', durum:'bekliyor' },
  { id:2, baslik:'Uzmanlardan uyarı: Göz kuruluğu göz sağlığını tehdit ediyor', icerik:'Göz hastalıkları uzmanları, özellikle ekran başında uzun süre oturanları tehdit eden göz kuruluğu sorununa dikkat çekti ve günde birkaç kez göz egzersizi yapılmasını tavsiye etti.', gorsel:'https://service.1ha.com.tr/medias/cover-1762957574915.jpg', kategori:'Sağlık', tarih:'12.11.2025', durum:'bekliyor' },
  { id:3, baslik:'MİSİAD Başkanı Öncel: Ekonomide sorunlara çözüm gecikmemeli', icerik:'MİSİAD Başkanı Serkan Öncel, Türkiye ekonomisinde yaşanan sorunların çözümünde vakit kaybetmemek gerektiğini vurguladı.', gorsel:'https://service.1ha.com.tr/medias/cover-1761227526724.jpg', kategori:'Ekonomi', tarih:'23.10.2025', durum:'islendi' },
  { id:4, baslik:'Gesi Mesire Alanı genişliyor ve botanik bahçeye dönüşüyor', icerik:'Kayseri\'nin sevilen mesire alanlarından Gesi, hem büyüyor hem de botanik bahçeye dönüştürülüyor.', gorsel:'https://service.1ha.com.tr/medias/cover-1761311996121.jpeg', kategori:'Belediye Haberleri', tarih:'24.10.2025', durum:'yayinda' },
  { id:5, baslik:'40 yeni araç ve Albayrak Caddesi hizmete giriyor', icerik:'Kayseri Büyükşehir Belediyesi toplu taşıma filosuna 40 yeni araç katıyor ve Albayrak Caddesi güzergahını yeniliyor.', gorsel:'https://service.1ha.com.tr/medias/cover-1760529551644.jpg', kategori:'Belediye Haberleri', tarih:'15.10.2025', durum:'bekliyor' },
  { id:6, baslik:'Kayseri\'de pamuk üretimiyle yeni bir dönem başlıyor', icerik:'Kayseri\'de tarımsal çeşitlilik kapsamında pamuk üretimine geçiş çalışmaları başladı.', gorsel:'https://service.1ha.com.tr/medias/cover-1761306246659.jpeg', kategori:'Güncel', tarih:'24.10.2025', durum:'bekliyor' },
]

const KAT = {
  'Güncel':             { bg:'#1a1010', c:'#ff7b7b', b:'#5a1a1a' },
  'Sağlık':            { bg:'#0e1a16', c:'#5de8c0', b:'#1a4a38' },
  'Ekonomi':           { bg:'#1a1608', c:'#ffc85a', b:'#4a3a08' },
  'Belediye Haberleri':{ bg:'#0e1626', c:'#6db3ff', b:'#1a3060' },
  'Asayiş':            { bg:'#1a1108', c:'#ffaa5a', b:'#4a2a08' },
  'Spor':              { bg:'#13102a', c:'#a89cff', b:'#2a2060' },
  'Eğitim':            { bg:'#0e1a0e', c:'#7dd67d', b:'#1a401a' },
  'Turizm':            { bg:'#1a1608', c:'#ffc85a', b:'#4a3a08' },
  'Genel':             { bg:'#0e1626', c:'#6db3ff', b:'#1a3060' },
  'Siyaset':           { bg:'#13102a', c:'#c0b8ff', b:'#2a2060' },
}
const kat = k => KAT[k] || KAT['Genel']

const DURUM = {
  bekliyor:  { bg:'#1a1608', c:'#ffc85a', b:'#4a3a08', l:'Bekliyor' },
  isleniyor: { bg:'#0e1626', c:'#6db3ff', b:'#1a3060', l:'İşleniyor…' },
  islendi:   { bg:'#0e1a16', c:'#5de8c0', b:'#1a4a38', l:'İşlendi' },
  yayinda:   { bg:'#0e1a0e', c:'#7dd67d', b:'#1a401a', l:'Yayında' },
}
const dur = d => DURUM[d] || DURUM.bekliyor

// ── SHARED ─────────────────────────────────────────────────────────────────
const Ic = ({ n, size = 15, style = {} }) =>
  <i className={`ti ti-${n}`} aria-hidden="true" style={{ fontSize: size, ...style }} />

const KatBadge = ({ k }) => {
  const s = kat(k)
  return <span style={{ fontSize:11, fontWeight:500, background:s.bg, color:s.c, border:`0.5px solid ${s.b}`, padding:'2px 9px', borderRadius:20, whiteSpace:'nowrap' }}>{k}</span>
}

const DurumBadge = ({ d }) => {
  const s = dur(d)
  return <span style={{ fontSize:11, fontWeight:500, background:s.bg, color:s.c, border:`0.5px solid ${s.b}`, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>{s.l}</span>
}

// ── LOGIN ──────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')

  const doLogin = () => {
    if ((u === 'admin' && p === 'radar2024') || (u === 'editor' && p === 'editor123')) {
      onLogin({ name: u === 'admin' ? 'Admin' : 'Editör', role: u })
    } else {
      setErr('Kullanıcı adı veya şifre hatalı')
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:340, background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'2rem' }}>
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:48, height:48, background:'rgba(230,57,70,0.15)', border:'0.5px solid rgba(230,57,70,0.3)', borderRadius:'var(--radius-md)', marginBottom:12 }}>
            <Ic n="radar" size={24} style={{ color:'#E63946' }} />
          </div>
          <div style={{ fontSize:20, fontWeight:600, color:'var(--text)' }}>rdr.ist</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>kayserim.net içerik yönetim sistemi</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Kullanıcı adı</div>
            <input type="text" value={u} onChange={e => { setU(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="kullanici_adi" autoFocus />
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Şifre</div>
            <input type="password" value={p} onChange={e => { setP(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" />
          </div>
          {err && <div style={{ background:'rgba(230,57,70,0.12)', border:'0.5px solid rgba(230,57,70,0.3)', borderRadius:'var(--radius-md)', padding:'8px 12px', fontSize:13, color:'#ff7b7b' }}>{err}</div>}
          <button onClick={doLogin} style={{ justifyContent:'center', fontWeight:600, background:'var(--accent)', border:'none', color:'#fff', padding:'10px', marginTop:4 }}>
            <Ic n="arrow-right" size={14} /> Giriş yap
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, user, onLogout, bekCnt }) {
  const nav = [
    { id:'dashboard', ic:'layout-dashboard', l:'Dashboard' },
    { id:'haberler',  ic:'rss',              l:'1ha akışı', badge: bekCnt },
    { id:'yeni',      ic:'pencil',           l:'Yeni haber' },
    { id:'isleme',    ic:'bolt',             l:'İşleme sonucu' },
    { id:'editor',    ic:'vector-bezier-2',  l:'Şablon Editörü' },
    { id:'ayarlar',   ic:'settings',         l:'Ayarlar' },
  ]
  return (
    <aside style={{ width:210, minHeight:'100vh', background:'var(--surface)', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'1.25rem 1rem', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, background:'rgba(230,57,70,0.15)', border:'0.5px solid rgba(230,57,70,0.3)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Ic n="radar" size={16} style={{ color:'#E63946' }} />
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>rdr.ist</div>
          <div style={{ fontSize:10, color:'var(--muted)' }}>kayserim.net CMS</div>
        </div>
      </div>

      <nav style={{ flex:1, padding:'0.75rem 0.5rem' }}>
        {nav.map(item => {
          const on = active === item.id
          return (
            <div key={item.id} onClick={() => setActive(item.id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:'var(--radius-md)', cursor:'pointer', marginBottom:2, background: on ? 'rgba(255,255,255,0.05)' : 'transparent', borderLeft: on ? '2px solid var(--accent)' : '2px solid transparent', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Ic n={item.ic} size={15} />
                <span style={{ fontSize:13, fontWeight: on ? 500 : 400 }}>{item.l}</span>
              </div>
              {item.badge > 0 && <span style={{ fontSize:10, fontWeight:600, background:'rgba(230,57,70,0.2)', color:'#ff7b7b', border:'0.5px solid rgba(230,57,70,0.4)', padding:'1px 6px', borderRadius:10 }}>{item.badge}</span>}
            </div>
          )
        })}
      </nav>

      <div style={{ padding:'0.75rem 1rem', borderTop:'0.5px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <div style={{ width:28, height:28, background:'rgba(68,136,255,0.15)', border:'0.5px solid rgba(68,136,255,0.3)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'var(--blue)' }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{user?.name}</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', justifyContent:'center', fontSize:12, color:'var(--muted)' }}>
          <Ic n="logout" size={13} /> Çıkış
        </button>
      </div>
    </aside>
  )
}

// ── TOP BAR ────────────────────────────────────────────────────────────────
function TopBar({ page, notifications, showN, setShowN }) {
  const titles = { dashboard:'Dashboard', haberler:'1ha haber akışı', yeni:'Yeni haber girişi', isleme:'İşleme sonucu', ayarlar:'Ayarlar' }
  const ref = useRef(null)
  useEffect(() => {
    if (!showN) return
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setShowN(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showN])

  return (
    <div style={{ height:52, background:'var(--surface)', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.25rem', flexShrink:0 }}>
      <h1 style={{ margin:0, fontSize:16, fontWeight:500 }}>{titles[page] || ''}</h1>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#00D4AA' }} />
          <span style={{ fontSize:12, color:'var(--muted)' }}>1ha bağlı</span>
        </div>
        <div ref={ref} style={{ position:'relative' }}>
          <button onClick={() => setShowN(v => !v)} style={{ position:'relative', background:'transparent', border:'0.5px solid var(--border)' }}>
            <Ic n="bell" size={15} />
            {notifications.length > 0 && <span style={{ position:'absolute', top:-4, right:-4, background:'var(--accent)', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>{notifications.length}</span>}
          </button>
          {showN && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', width:270, background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', zIndex:50, overflow:'hidden' }}>
              <div style={{ padding:'8px 12px', borderBottom:'0.5px solid var(--border)', fontSize:11, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Bildirimler</div>
              {notifications.slice(0,6).map(n => (
                <div key={n.id} style={{ padding:'9px 12px', borderBottom:'0.5px solid var(--border)', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <Ic n={n.type==='success'?'check':n.type==='error'?'alert-circle':'info-circle'} size={14} style={{ color:n.type==='success'?'#00D4AA':n.type==='error'?'#E63946':'#4488FF', marginTop:2, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{n.text}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function Dashboard({ haberler, setSelected, setActive, setContent, onYenile }) {
  const bek = haberler.filter(h => h.durum === 'bekliyor').length
  const isl = haberler.filter(h => h.durum === 'islendi').length
  const yay = haberler.filter(h => h.durum === 'yayinda').length
  const stats = [
    { l:'Bekleyen', v:bek, ic:'clock',  bg:'rgba(255,183,0,0.12)',   c:'#FFB700' },
    { l:'İşlendi',  v:isl, ic:'check',  bg:'rgba(0,212,170,0.12)',   c:'#00D4AA' },
    { l:'Yayında',  v:yay, ic:'world',  bg:'rgba(68,136,255,0.12)',  c:'#4488FF' },
    { l:'Toplam',   v:haberler.length, ic:'news', bg:'rgba(255,255,255,0.05)', c:'var(--muted)' },
  ]
  return (
    <div style={{ padding:'1.25rem', overflowY:'auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:'1.25rem' }}>
        {stats.map(s => (
          <div key={s.l} style={{ background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1rem' }}>
            <div style={{ width:30, height:30, background:s.bg, borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <Ic n={s.ic} size={15} style={{ color:s.c }} />
            </div>
            <div style={{ fontSize:26, fontWeight:600, color:'var(--text)' }}>{s.v}</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'rgba(0,212,170,0.08)', border:'0.5px solid rgba(0,212,170,0.2)', borderRadius:'var(--radius-md)', padding:'9px 14px', display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#00D4AA', flexShrink:0 }} />
        <span style={{ fontSize:13, color:'#00D4AA' }}>1ha.com.tr RSS akışı aktif — haberler otomatik izleniyor</span>
        <span style={{ marginLeft:'auto', fontSize:12, color:'rgba(0,212,170,0.6)' }}>az önce</span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>Son haberler</div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={onYenile} style={{ fontSize:12, color:'#00D4AA', background:'rgba(0,212,170,0.08)', border:'0.5px solid rgba(0,212,170,0.25)' }}>
            <Ic n="refresh" size={12} /> Yenile & İşle
          </button>
          <button onClick={() => setActive('haberler')} style={{ fontSize:12, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)' }}>
            <Ic n="arrow-right" size={12} /> Tümünü gör
          </button>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {haberler.slice(0,6).map(h => (
          <div key={h.id} onClick={() => {
            if (h.durum === 'islendi' && h.site_basligi) { setContent(h); setSelected(h); setActive('isleme') }
            else { setSelected(h); setActive('yeni') }
          }} style={{ background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 12px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            {h.video && !h.gorsel_url && !h.gorsel ? (
              <div style={{ width:52, height:36, borderRadius:5, flexShrink:0, background:'rgba(230,57,70,0.15)', border:'0.5px solid rgba(230,57,70,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Ic n="player-play" size={16} style={{ color:'#ff7b7b' }} />
              </div>
            ) : (
              <img src={h.gorsel_url || h.gorsel} alt="" onError={e => e.target.style.display='none'} style={{ width:52, height:36, objectFit:'cover', borderRadius:5, flexShrink:0 }} />
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:5 }}>{h.baslik}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}><KatBadge k={h.kategori} /><span style={{ fontSize:11, color:'var(--muted)' }}>{h.tarih}</span></div>
            </div>
            <DurumBadge d={h.durum} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── HABERLER ───────────────────────────────────────────────────────────────
function Haberler({ haberler, setSelected, setActive, setContent }) {
  const [filter, setFilter] = useState('hepsi')
  const [arama, setArama]   = useState('')
  const list = haberler
    .filter(h => filter === 'hepsi' || h.durum === filter)
    .filter(h => !arama || h.baslik?.toLowerCase().includes(arama.toLowerCase()) || h.site_basligi?.toLowerCase().includes(arama.toLowerCase()))
  return (
    <div style={{ padding:'1.25rem', overflowY:'auto' }}>
      <div style={{ display:'flex', gap:6, marginBottom:'0.75rem', flexWrap:'wrap' }}>
        {['hepsi','bekliyor','islendi','yayinda'].map(f => {
          const cnt = f === 'hepsi' ? haberler.length : haberler.filter(h => h.durum === f).length
          const on = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ background: on ? 'rgba(255,255,255,0.08)' : 'transparent', border: on ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid var(--border)', fontWeight: on ? 500 : 400 }}>
              {f === 'hepsi' ? 'Tümü' : DURUM[f]?.l}
              <span style={{ fontSize:11, background:'rgba(255,255,255,0.06)', color:'var(--muted)', padding:'1px 6px', borderRadius:10 }}>{cnt}</span>
            </button>
          )
        })}
      </div>
      <input
        value={arama}
        onChange={e => setArama(e.target.value)}
        placeholder="Haber ara…"
        style={{ width:'100%', fontSize:13, marginBottom:'0.75rem', boxSizing:'border-box' }}
      />
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {list.map(h => (
          <div key={h.id} style={{ background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
            {h.video && !h.gorsel_url && !h.gorsel ? (
              <div style={{ width:56, height:38, borderRadius:5, flexShrink:0, background:'rgba(230,57,70,0.15)', border:'0.5px solid rgba(230,57,70,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Ic n="player-play" size={18} style={{ color:'#ff7b7b' }} />
              </div>
            ) : (
              <img src={h.gorsel_url || h.gorsel} alt="" onError={e => e.target.style.display='none'} style={{ width:56, height:38, objectFit:'cover', borderRadius:5, flexShrink:0 }} />
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:5 }}>{h.site_basligi || h.baslik}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}><KatBadge k={h.kategori} /><span style={{ fontSize:11, color:'var(--muted)' }}>{h.tarih} · 1ha.com.tr</span></div>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              <DurumBadge d={h.durum} />
              {h.durum === 'bekliyor' && (
                <button onClick={() => { setSelected(h); setActive('yeni') }} style={{ background:'rgba(230,57,70,0.15)', color:'#ff7b7b', border:'0.5px solid rgba(230,57,70,0.3)', fontWeight:500, fontSize:12 }}>
                  <Ic n="bolt" size={13} /> İşle
                </button>
              )}
              {h.durum === 'islendi' && h.site_basligi && (
                <button onClick={() => { setContent(h); setSelected(h); setActive('isleme') }} style={{ background:'rgba(0,212,170,0.1)', color:'#00D4AA', border:'0.5px solid rgba(0,212,170,0.3)', fontWeight:500, fontSize:12 }}>
                  <Ic n="eye" size={13} /> Detay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── YENİ HABER ─────────────────────────────────────────────────────────────
function YeniHaber({ selected, setSelected, onProcess, processing }) {
  const [mode, setMode] = useState(selected ? 'secili' : 'manuel')
  const [text, setText] = useState('')
  useEffect(() => { if (selected) setMode('secili') }, [selected])

  const go = () => {
    const t = mode === 'secili' && selected
      ? `Başlık: ${selected.baslik}\n\nİçerik: ${selected.icerik}\n\nKategori: ${selected.kategori}`
      : text
    if (t.trim().length < 50) { alert('En az 50 karakter haber metni gerekli.'); return }
    onProcess(t)
  }

  const canGo = !processing && (mode === 'manuel' ? text.trim().length >= 50 : !!selected)

  return (
    <div style={{ padding:'1.25rem', maxWidth:740, overflowY:'auto' }}>
      <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', background:'var(--surface)', borderRadius:'var(--radius-md)', padding:4, width:'fit-content' }}>
        {[{id:'secili',ic:'rss',l:"1ha'dan seç"},{id:'manuel',ic:'pencil',l:'Manuel giriş'}].map(tab => {
          const on = mode === tab.id
          return (
            <button key={tab.id} onClick={() => { setMode(tab.id); if (tab.id === 'manuel') setSelected(null) }} style={{ background: on ? 'var(--card)' : 'transparent', border: on ? '0.5px solid var(--border)' : '0.5px solid transparent', fontWeight: on ? 500 : 400, color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Ic n={tab.ic} size={13} /> {tab.l}
            </button>
          )
        })}
      </div>

      {mode === 'secili' && selected && (
        <div style={{ background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:'1rem' }}>
          <img src={selected.gorsel} alt="" onError={e => e.target.style.display='none'} style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
          <div style={{ padding:'1rem' }}>
            <div style={{ marginBottom:8 }}><KatBadge k={selected.kategori} /></div>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>{selected.baslik}</div>
            <p style={{ margin:0, fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{selected.icerik}</p>
          </div>
        </div>
      )}

      {mode === 'secili' && !selected && (
        <div style={{ background:'var(--surface)', border:'0.5px dashed var(--border)', borderRadius:'var(--radius-lg)', padding:'2rem', textAlign:'center', marginBottom:'1rem' }}>
          <Ic n="rss" size={32} style={{ display:'block', marginBottom:12, color:'var(--muted)' }} />
          <p style={{ color:'var(--muted)', fontSize:13, margin:0 }}>1ha akışından bir haber seçin veya manuel giriş yapın.</p>
        </div>
      )}

      {mode === 'manuel' && (
        <div style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>Ham haber metni</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Haber metnini buraya yapıştırın..." rows={10} style={{ fontSize:14 }} />
          <div style={{ fontSize:12, color:'var(--muted)', textAlign:'right', marginTop:4 }}>{text.length} karakter</div>
        </div>
      )}

      <button onClick={go} disabled={!canGo} style={{ fontWeight:500, background: canGo ? 'rgba(230,57,70,0.15)' : 'transparent', border: canGo ? '0.5px solid rgba(230,57,70,0.3)' : '0.5px solid var(--border)', color: canGo ? '#ff7b7b' : 'var(--muted)' }}>
        <Ic n={processing ? 'loader-2' : 'bolt'} size={15} />
        {processing ? 'Claude işliyor…' : 'Haberi işle (Claude + Ahrefs)'}
      </button>

      {processing && (
        <div style={{ marginTop:'0.75rem', background:'rgba(68,136,255,0.08)', border:'0.5px solid rgba(68,136,255,0.2)', borderRadius:'var(--radius-md)', padding:'10px 14px' }}>
          <div style={{ fontSize:13, color:'#4488FF', fontWeight:500, marginBottom:3 }}>SEO paketi hazırlanıyor…</div>
          <div style={{ fontSize:12, color:'rgba(68,136,255,0.7)' }}>Başlık · Meta description · URL slug · Optimize içerik · Sosyal medya · Görsel prompt</div>
        </div>
      )}
    </div>
  )
}

// ── VIDEO İŞLE BİLEŞENİ (Creatomate) ─────────────────────────────────────
function VideoIsle({ haber, baslik, kategori }) {
  const [durum,    setDurum]  = useState(null)
  const [renderId, setRender] = useState(null)
  const [videoUrl, setVUrl]   = useState(null)
  const [progress, setProgress] = useState(0)
  const [hataMsg,  setHataMsg]  = useState('')

  const isle = async () => {
    setDurum('rendering'); setProgress(0); setVUrl(null); setHataMsg('')
    try {
      const res  = await fetch('/api/video-isle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: haber.video,
          baslik:    baslik || haber.baslik,
          kategori:  kategori || haber.kategori,
          tarih:     haber.tarih,
          source_id: haber.source_id,
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setRender(data.render_id)
    } catch (e) { setDurum('error'); setHataMsg(e.message) }
  }

  // Render durumunu poll et
  useEffect(() => {
    if (!renderId || durum === 'done' || durum === 'error') return
    const timer = setInterval(async () => {
      try {
        const res  = await fetch(`/api/video-durum?render_id=${renderId}`)
        const data = await res.json()
        setProgress(data.progress || 0)
        if (data.status === 'succeeded') {
          setVUrl(data.render_url); setDurum('done'); clearInterval(timer)
        } else if (data.status === 'failed') {
          setDurum('error'); clearInterval(timer)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(timer)
  }, [renderId, durum])

  return (
    <div style={{ marginBottom:8 }}>
      {!durum && (
        <button onClick={isle}
          style={{ fontSize:12, background:'rgba(230,57,70,.12)', border:'0.5px solid rgba(230,57,70,.3)', color:'#ff7b7b' }}>
          <Ic n="wand" size={13}/> Creatomate ile Branding Ekle
        </button>
      )}

      {durum === 'rendering' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)' }}>
          <Ic n="loader-2" size={13}/>
          Video işleniyor… {progress > 0 && `${Math.round(progress * 100)}%`}
        </div>
      )}

      {durum === 'done' && videoUrl && (
        <div>
          <div style={{ fontSize:11, color:'#00D4AA', marginBottom:6 }}>✓ Video hazır</div>
          <video src={videoUrl} controls
            style={{ width:'100%', borderRadius:'var(--radius-md)', border:'0.5px solid rgba(0,212,170,.3)', maxHeight:240, background:'#000' }}/>
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <a href={videoUrl} download="kayserim-video.mp4">
              <button style={{ fontSize:11, background:'rgba(0,212,170,.08)', border:'0.5px solid rgba(0,212,170,.25)', color:'#00D4AA' }}>
                <Ic n="download" size={11}/> İndir
              </button>
            </a>
            <button onClick={isle} style={{ fontSize:11, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)' }}>
              Yeniden İşle
            </button>
          </div>
        </div>
      )}

      {durum === 'error' && (
        <div style={{ fontSize:12, color:'#ff7b7b' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
            <Ic n="alert-circle" size={13}/> İşleme hatası
            <button onClick={isle} style={{ fontSize:11 }}>Tekrar dene</button>
          </div>
          {hataMsg && <div style={{ fontSize:11, color:'rgba(255,123,123,.7)', fontFamily:'var(--mono)', lineHeight:1.5, wordBreak:'break-all' }}>{hataMsg}</div>}
        </div>
      )}
    </div>
  )
}


function MetaPaylas({ content, selectedHaber, gorselUrls, kayserimLink = '' }) {
  const [platform, setPlatform] = useState('her_ikisi')
  const [gonderiyor, setGond]   = useState(false)
  const [sonuc,      setSonuc]  = useState(null)
  const [hata,       setHata]   = useState(null)
  const [metin,      setMetin]  = useState('')

  // Platform veya içerik değişince metni güncelle
  useEffect(() => {
    const ham = platform === 'facebook'
      ? content?.facebook || content?.site_basligi || ''
      : content?.instagram || content?.site_basligi || ''
    const finalMetin = kayserimLink ? `${ham}\n\n🔗 ${kayserimLink}` : ham
    setMetin(finalMetin)
  }, [platform, content, kayserimLink])

  const paylas = async () => {
    // Görsel URL: template > orijinal > video
    const videoUrl  = selectedHaber?.video || ''
    const isVideo   = !!videoUrl
    const gorselUrl = gorselUrls?.instagram || gorselUrls?.facebook ||
                      selectedHaber?.gorsel_url || selectedHaber?.gorsel || ''

    if (!gorselUrl && !videoUrl) { setHata('Paylaşılacak görsel bulunamadı'); return }

    setGond(true); setSonuc(null); setHata(null)
    try {
      const res  = await fetch('/api/meta-paylas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          gorsel_url: platform === 'facebook'
            ? gorselUrls?.facebook || gorselUrl
            : gorselUrls?.instagram || gorselUrl,
          video_url:  videoUrl,
          metin,
          platform,
          is_video: isVideo,
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setSonuc(data)
    } catch (e) { setHata(e.message) }
    setGond(false)
  }

  const isVideo = !!selectedHaber?.video
  const templateHazir = Object.keys(gorselUrls || {}).length > 0

  return (
    <div style={{ marginBottom: '0.875rem' }}>
      {/* Template durum */}
      <div style={{ fontSize: 11, color: templateHazir ? '#00D4AA' : 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Ic n={templateHazir ? 'circle-check' : 'loader-2'} size={12} />
        {templateHazir ? 'Template görseller hazır — paylaşımda kullanılacak' : 'Template görseller yükleniyor…'}
      </div>

      {/* Video uyarısı */}
      {isVideo && <div style={{ background: 'rgba(255,180,0,.08)', border: '0.5px solid rgba(255,180,0,.3)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: 'rgba(255,180,0,.9)', marginBottom: 8 }}>
        <Ic n="video" size={12} /> Video haber — Facebook ve Instagram'a video olarak paylaşılacak
      </div>}

      {/* Platform */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[['her_ikisi','FB + IG'],['facebook','Facebook'],['instagram','Instagram']].map(([val,lbl]) => {
          const on = platform === val
          return <button key={val} onClick={() => setPlatform(val)}
            style={{ fontSize: 12, background: on ? 'rgba(24,119,242,.15)' : 'transparent', border: `0.5px solid ${on ? 'rgba(24,119,242,.4)' : 'var(--border)'}`, color: on ? '#4dabf7' : 'var(--muted)' }}>
            {lbl}
          </button>
        })}
      </div>

      {/* kayserim.net linki — Isleme'den prop olarak geliyor */}
      {kayserimLink && <div style={{ fontSize:11, color:'#00D4AA', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
        <Ic n="link" size={11}/> Link eklenecek: {kayserimLink.slice(0,50)}…
      </div>}

      {/* Metin düzenleme */}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Paylaşım metni (düzenlenebilir)</div>
      <textarea value={metin} onChange={e => setMetin(e.target.value)} rows={3}
        style={{ width: '100%', fontSize: 12, marginBottom: 10, resize: 'vertical', boxSizing: 'border-box' }} />

      <button onClick={paylas} disabled={gonderiyor}
        style={{ fontWeight: 500, background: 'rgba(24,119,242,.15)', border: '0.5px solid rgba(24,119,242,.3)', color: '#4dabf7', marginBottom: 8 }}>
        <Ic n={gonderiyor ? 'loader-2' : 'send'} size={14} />
        {gonderiyor ? 'Paylaşılıyor…' : 'Paylaş'}
      </button>

      {hata && <div style={{ background: 'rgba(230,57,70,.08)', border: '0.5px solid rgba(230,57,70,.3)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: 'rgba(230,57,70,.9)' }}>
        <Ic n="alert-circle" size={13} /> {hata}
      </div>}

      {sonuc && <div style={{ background: 'rgba(0,212,170,.08)', border: '0.5px solid rgba(0,212,170,.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: '#00D4AA', fontWeight: 500, marginBottom: 6 }}><Ic n="check" size={14} /> Paylaşıldı!</div>
        {sonuc.sonuclar?.facebook && <div style={{ color: 'var(--muted)' }}>
          Facebook: {sonuc.sonuclar.facebook.ok ? '✓ ' + (sonuc.sonuclar.facebook.post_id || '') : '✗ ' + sonuc.sonuclar.facebook.hata}
        </div>}
        {sonuc.sonuclar?.instagram && <div style={{ color: 'var(--muted)' }}>
          Instagram: {sonuc.sonuclar.instagram.ok ? '✓ ' + (sonuc.sonuclar.instagram.media_id || '') : '✗ ' + sonuc.sonuclar.instagram.hata}
        </div>}
      </div>}
    </div>
  )
}



function Isleme({ content, processing, error, selectedHaber }) {
  const [ec,       setEc]     = useState({})   // editable content
  const [link,     setLink]   = useState('')
  const [mode,     setMode]   = useState('edit') // 'edit' | 'paylas'
  const [gorselUrls,setGUrls] = useState({})
  const [kaydediliyor,setKyd] = useState(false)
  const [kaydedildi, setKd]   = useState(false)

  // content değişince editör state'ini güncelle
  useEffect(() => {
    if (content) { setEc({...content}); setMode('edit'); setLink(''); setGUrls({}) }
  }, [content?.url_slug])

  const set = (field, val) => setEc(p => ({...p, [field]: val}))

  // Düzenlenmiş haberi OtoGorselUret için hazırla
  const editedHaber = selectedHaber ? {
    ...selectedHaber,
    sosyal_baslik: ec.sosyal_baslik || ec.site_basligi || selectedHaber.baslik,
    site_basligi:  ec.site_basligi  || selectedHaber.baslik,
    ozet:          ec.ozet          || selectedHaber.icerik?.slice(0,120),
    kategori:      ec.kategori      || selectedHaber.kategori,
    tarih:         selectedHaber.tarih,
  } : null

  const kaydet = async () => {
    setKyd(true)
    try {
      const kayit = {
        ...ec,
        source_id:  selectedHaber?.source_id,
        source_url: selectedHaber?.source_url,
        baslik:     selectedHaber?.baslik,
        gorsel:     selectedHaber?.gorsel,
        gorsel_url: selectedHaber?.gorsel_url || selectedHaber?.gorsel,
        video:      selectedHaber?.video || '',
        tarih_iso:  selectedHaber?.tarih_iso || new Date().toISOString(),
        kayserim_link: link,
        kaydedildi: new Date().toISOString(),
        durum: 'islendi',
      }
      const liste = await fetch('/api/haberler').then(r => r.json()).catch(() => [])
      const updated = [kayit, ...liste.filter(h => h.source_id !== kayit.source_id)].slice(0, 200)
      await fetch('/api/haber-kaydet', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(kayit),
      })
      setKd(true); setMode('paylas')
    } catch (e) { console.error(e) }
    setKyd(false)
  }

  const Divider = ({ label, ic }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, borderTop:'0.5px solid var(--border)', paddingTop:'0.875rem', marginTop:'1rem', marginBottom:'0.75rem' }}>
      <Ic n={ic} size={14} style={{ color:'var(--muted)' }} />
      <span style={{ fontSize:11, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</span>
    </div>
  )

  const EField = ({ label, field, multi=false, rows=3 }) => (
    <div style={{ marginBottom:'0.75rem' }}>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
      {multi
        ? <textarea value={ec[field]||''} onChange={e=>set(field,e.target.value)} rows={rows}
            style={{ width:'100%', fontSize:13, resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
        : <input value={ec[field]||''} onChange={e=>set(field,e.target.value)}
            style={{ width:'100%', fontSize:13 }} />}
    </div>
  )

  if (processing) return (
    <div style={{ padding:'1.25rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:'#4488FF' }}>
        <Ic n="loader-2" size={18}/> <span style={{ fontSize:14 }}>Claude işliyor…</span>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ padding:'1.25rem' }}>
      <div style={{ color:'#E63946', fontSize:13 }}><Ic n="alert-circle" size={14}/> {error}</div>
    </div>
  )

  if (!content || !ec.site_basligi) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:12 }}>
      <Ic n="bolt" size={36} style={{ color:'rgba(255,255,255,0.1)' }} />
      <p style={{ fontSize:14, color:'var(--muted)' }}>Henüz işlenmiş haber yok.</p>
    </div>
  )

  // ── PAYLAŞ MODU ────────────────────────────────────────────────────────────
  if (mode === 'paylas') return (
    <div style={{ padding:'1.25rem', overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.25rem' }}>
        <div style={{ background:'rgba(0,212,170,.1)', border:'0.5px solid rgba(0,212,170,.25)', borderRadius:'var(--radius-md)', padding:'10px 14px', flex:1 }}>
          <div style={{ fontSize:14, fontWeight:500, color:'#00D4AA' }}>✓ Kaydedildi — paylaşıma hazır</div>
          <div style={{ fontSize:12, color:'rgba(0,212,170,.7)', marginTop:2 }}>{ec.site_basligi}</div>
        </div>
        <button onClick={() => setMode('edit')} style={{ fontSize:12, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)' }}>
          <Ic n="edit" size={13}/> Düzenle
        </button>
      </div>

      <Divider label="Sosyal medya görselleri" ic="photo" />
      <OtoGorselUret haber={editedHaber} onGorsellerHazir={g => setGUrls(g.urls)} />

      <Divider label="Paylaş" ic="send" />
      <MetaPaylas content={ec} selectedHaber={selectedHaber} gorselUrls={gorselUrls} kayserimLink={link} />
    </div>
  )

  // ── DÜZENLEME MODU ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'1.25rem', overflowY:'auto' }}>

      {/* Üst toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', alignItems:'center' }}>
        <div style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {ec.site_basligi || 'Haber düzenleniyor…'}
        </div>
        <button onClick={kaydet} disabled={kaydediliyor}
          style={{ fontWeight:600, background:'rgba(0,212,170,.15)', border:'0.5px solid rgba(0,212,170,.3)', color:'#00D4AA', whiteSpace:'nowrap', flexShrink:0 }}>
          <Ic n={kaydediliyor?'loader-2':'device-floppy'} size={14}/>
          {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet & Paylaşıma Geç →'}
        </button>
      </div>

      {/* SEO */}
      <Divider label="SEO & web içeriği" ic="world" />
      <EField label="Site başlığı (SEO)" field="site_basligi" />
      <EField label="H1 başlığı" field="h1_basligi" />
      <EField label="Sosyal medya başlığı (görsel için)" field="sosyal_baslik" />
      <EField label="Meta description" field="meta_description" />
      <EField label="URL slug" field="url_slug" />
      <EField label="Özet" field="ozet" />
      <EField label="Optimize haber içeriği" field="optimize_icerik" multi rows={6} />

      {/* kayserim.net linki */}
      <div style={{ marginBottom:'0.75rem' }}>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          kayserim.net linki <span style={{ color:'rgba(255,255,255,.2)', textTransform:'none', letterSpacing:0 }}>— yayınladıktan sonra girin</span>
        </div>
        <input type="url" value={link} onChange={e=>setLink(e.target.value)}
          placeholder="https://www.kayserim.net/haber/28040684/..." style={{ width:'100%', fontSize:13, boxSizing:'border-box' }} />
      </div>

      {/* Sosyal medya metinleri */}
      <Divider label="Sosyal medya metinleri" ic="share" />
      <EField label="Instagram" field="instagram" multi rows={3} />
      <EField label="Facebook" field="facebook" multi rows={3} />
      <EField label="X / Twitter" field="x_twitter" multi rows={2} />
      <EField label="YouTube başlık" field="youtube_baslik" />
      <EField label="YouTube açıklama" field="youtube_aciklama" multi rows={3} />

      {/* Video */}
      {(selectedHaber?.video) && (
        <>
          <Divider label="Video" ic="video" />
          <video key={selectedHaber.video} src={selectedHaber.video} controls
            style={{ width:'100%', borderRadius:'var(--radius-md)', border:'0.5px solid var(--border)', maxHeight:240, background:'#000', marginBottom:8 }}/>
          <VideoIsle haber={selectedHaber} baslik={ec.sosyal_baslik||ec.site_basligi} kategori={ec.kategori} />
        </>
      )}

      {/* Sosyal görsel önizleme */}
      <Divider label="Sosyal medya görseli önizleme" ic="photo" />
      <OtoGorselUret haber={editedHaber} onGorsellerHazir={g => setGUrls(g.urls)} />

    </div>
  )
}


// ── AYARLAR ────────────────────────────────────────────────────────────────
function Ayarlar() {
  const rows = [
    { t:'1ha.com.tr RSS API',               v:'RSS_API_KEY (Cloudflare env)',       s:'aktif' },
    { t:'Claude API (Anthropic)',            v:'ANTHROPIC_API_KEY (Cloudflare env)', s:'aktif' },
    { t:'Ahrefs API',                        v:'AHREFS_API_KEY (Cloudflare env)',    s:'aktif' },
    { t:'kayserim.net API',                  v:'Henüz tanımlanmadı',                s:'bekliyor' },
    { t:'Meta Graph API (Instagram/Facebook)',v:'Henüz tanımlanmadı',               s:'bekliyor' },
    { t:'X API v2',                          v:'Henüz tanımlanmadı',                s:'bekliyor' },
    { t:'Replicate API (FLUX görsel)',        v:'Henüz tanımlanmadı',               s:'bekliyor' },
  ]
  return (
    <div style={{ padding:'1.25rem', maxWidth:580, overflowY:'auto' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rows.map(r => (
          <div key={r.t} style={{ background:'var(--card)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>{r.t}</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', marginTop:2 }}>{r.v}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:500, background: r.s==='aktif' ? 'rgba(0,212,170,0.12)' : 'rgba(255,183,0,0.12)', color: r.s==='aktif' ? '#00D4AA' : '#FFB700', border:`0.5px solid ${r.s==='aktif' ? 'rgba(0,212,170,0.3)' : 'rgba(255,183,0,0.3)'}`, padding:'3px 9px', borderRadius:20, flexShrink:0 }}>
              {r.s === 'aktif' ? 'Aktif' : 'Bekliyor'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState('login')
  const [user, setUser]       = useState(null)
  const [active, setActive]   = useState('dashboard')
  const [haberler, setHaberler] = useState(MOCK)
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState(null)
  const [processing, setProc] = useState(false)
  const [apiError, setApiErr] = useState(null)
  const [notifs, setNotifs]   = useState([
    { id:1, text:"6 haber 1ha'dan yüklendi", type:'success', time:'az önce' },
    { id:2, text:'Sistem aktif ve bağlı',    type:'info',    time:'5 dk' },
  ])
  const [showN, setShowN] = useState(false)

  const addNotif = useCallback((text, type = 'info') => {
    setNotifs(prev => [{ id: Date.now(), text, type, time: 'az önce' }, ...prev.slice(0, 6)])
  }, [])

  // ── YENİLE: RSS + oto-isle tetikle ──────────────────────────────────────
  const yenile = useCallback(async () => {
    addNotif('Yenileniyor…', 'info')
    try {
      // 1. Oto-isle tetikle (cron ile aynı iş)
      const otoRes  = await fetch('/api/oto-isle')
      const otoData = await otoRes.json()
      if (otoData.islendi > 0) addNotif(`${otoData.islendi} yeni haber işlendi ✓`, 'success')

      // 2. KV + RSS yeniden çek
      const kvRes   = await fetch('/api/haberler')
      const kvListe = kvRes.ok ? await kvRes.json() : []
      const kvMap   = new Map(kvListe.map(h => [h.source_id, h]))

      const rssRes  = await fetch('/api/rss')
      if (!rssRes.ok) throw new Error('RSS alınamadı')
      const xml     = await rssRes.text()
      const parser  = new DOMParser()
      const doc     = parser.parseFromString(xml, 'text/xml')
      const items   = doc.querySelectorAll('item')

      const rssHaberler = Array.from(items).slice(0, 30).map((item, i) => {
        const enc      = item.querySelector('enclosure')
        const dt       = item.querySelector('pubDate')?.textContent
        const link     = item.querySelector('link')?.textContent?.trim() || ''
        const enc_type = enc?.getAttribute('type') || ''
        const enc_url  = enc?.getAttribute('url') || ''
        const sourceId = link.split('/').pop() || link
        const kvHaber  = kvMap.get(sourceId)
        const rssGorsel = enc_type.startsWith('video/') ? '' : enc_url
        const rssVideo  = enc_type.startsWith('video/') ? enc_url : ''
        const base = {
          id: i + 100, source_id: sourceId,
          baslik: item.querySelector('title')?.textContent?.trim() || '',
          icerik: item.querySelector('description')?.textContent?.replace(/<[^>]*>/g,'').trim() || '',
          gorsel: rssGorsel, video: rssVideo,
          kategori: item.querySelector('category')?.textContent?.trim() || 'Genel',
          tarih: dt ? new Date(dt).toLocaleDateString('tr-TR') : '',
          durum: kvHaber ? 'islendi' : 'bekliyor',
          ...(kvHaber || {}),
        }
        if (!base.gorsel)     base.gorsel     = rssGorsel
        if (!base.gorsel_url) base.gorsel_url = base.gorsel
        if (!base.video)      base.video      = rssVideo
        return base
      }).filter(h => h.baslik.length > 5)

      const rssIds  = new Set(rssHaberler.map(h => h.source_id))
      const eskiler = kvListe.filter(h => h.source_id && !rssIds.has(h.source_id))
        .slice(0, 100).map((h, i) => ({ ...h, id: i + 1000, durum: 'islendi' }))

      const tumHaberler = [...eskiler, ...rssHaberler]
      tumHaberler.sort((a, b) => new Date(b.tarih_iso || b.tarih || 0) - new Date(a.tarih_iso || a.tarih || 0))
      setHaberler(tumHaberler)
      addNotif(`${tumHaberler.length} haber güncellendi`, 'success')
    } catch (e) { addNotif('Yenileme hatası: ' + e.message, 'warning') }
  }, [addNotif])

  // Giriş sonrası: KV + RSS birleştir, işlendi durumunu koru
  useEffect(() => {
    if (page !== 'app') return
    ;(async () => {
      try {
        // 1. KV'deki işlenmiş haberleri çek
        const kvRes  = await fetch('/api/haberler')
        const kvListe = kvRes.ok ? await kvRes.json() : []
        const kvMap  = new Map(kvListe.map(h => [h.source_id, h]))

        // 2. 1ha RSS'i çek
        const rssRes = await fetch('/api/rss')
        if (!rssRes.ok) throw new Error(`RSS HTTP ${rssRes.status}`)
        const xml    = await rssRes.text()
        const parser = new DOMParser()
        const doc    = parser.parseFromString(xml, 'text/xml')
        const items  = doc.querySelectorAll('item')

        const rssHaberler = Array.from(items).slice(0, 30).map((item, i) => {
          const enc    = item.querySelector('enclosure')
          const dt     = item.querySelector('pubDate')?.textContent
          const link   = item.querySelector('link')?.textContent?.trim() || ''
          const enc_type = enc?.getAttribute('type') || ''
          const enc_url  = enc?.getAttribute('url') || ''
          const sourceId = link.split('/').pop() || link

          // KV'de bu haber var mı?
          const kvHaber = kvMap.get(sourceId)

          const rssGorsel = enc_type.startsWith('video/') ? '' : enc_url
          const rssVideo  = enc_type.startsWith('video/') ? enc_url : ''

          const base = {
            id:        i + 100,
            source_id: sourceId,
            baslik:    item.querySelector('title')?.textContent?.trim() || '',
            icerik:    item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').trim() || '',
            gorsel:    rssGorsel,
            video:     rssVideo,
            kategori:  item.querySelector('category')?.textContent?.trim() || 'Genel',
            tarih:     dt ? new Date(dt).toLocaleDateString('tr-TR') : '',
            durum:     kvHaber ? 'islendi' : 'bekliyor',
            ...(kvHaber || {}),
          }

          // KV'deki boş değerler RSS değerlerini ezmesin
          if (!base.gorsel)     base.gorsel     = rssGorsel
          if (!base.gorsel_url) base.gorsel_url = base.gorsel
          if (!base.video)      base.video      = rssVideo

          return base
        }).filter(h => h.baslik.length > 5)

        // 3. RSS'te olmayan eski KV haberlerini başa ekle
        const rssIds  = new Set(rssHaberler.map(h => h.source_id))
        const eskiler = kvListe
          .filter(h => h.source_id && !rssIds.has(h.source_id))
          .slice(0, 100)
          .map((h, i) => ({ ...h, id: i + 1000, durum: 'islendi' }))

        const tumHaberler = [...eskiler, ...rssHaberler]

        // Tarih sıralaması — en yeni en üstte
        tumHaberler.sort((a, b) => {
          const dateA = new Date(a.tarih_iso || a.tarih || 0)
          const dateB = new Date(b.tarih_iso || b.tarih || 0)
          return dateB - dateA
        })

        setHaberler(tumHaberler)

        const yeniSayi = rssHaberler.filter(h => h.durum === 'bekliyor').length
        const islSayi  = rssHaberler.filter(h => h.durum === 'islendi').length
        addNotif(`${rssHaberler.length} haber yüklendi — ${islSayi} işlendi, ${yeniSayi} bekliyor`, 'success')

      } catch (e) {
        addNotif('Yükleme hatası: ' + e.message, 'warning')
      }

      // Arka planda otomatik işleme
      try {
        const otoRes  = await fetch('/api/oto-isle')
        const otoData = await otoRes.json()
        if (otoData.islendi > 0) {
          addNotif(`${otoData.islendi} haber otomatik işlendi → RSS güncellendi ✓`, 'success')
        }
      } catch { /* sessiz */ }
    })()
  }, [page])

  // Claude API — /api/claude üzerinden (Cloudflare Pages Function, API key gizli)
  const process = useCallback(async (text) => {
    setProc(true)
    setContent(null)
    setApiErr(null)
    setActive('isleme')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: 'Sen radar.ist editör sistemi üzerinden çalışan, kayserim.net için kıdemli SEO editörüsün. Kayseri odaklı yerel haber sitesi için içerik üretiyorsun. SADECE geçerli JSON döndür, başka hiçbir şey yazma.',
          messages: [{ role: 'user', content:
`Bu haberi al ve kayserim.net için tam içerik paketi üret:\n\n${text}\n\n
Şu JSON yapısını döndür (başka hiçbir şey yazma):
{
  "site_basligi": "max 70 karakter SEO uyumlu başlık",
  "h1_basligi": "H1 başlığı",
  "meta_description": "max 155 karakter",
  "url_slug": "kisa-slug-tire-ile",
  "optimize_icerik": "H2 başlıklı tam haber min 300 kelime, Kayseri doğal geçsin",
  "instagram": "150-200 karakter, emoji ve hashtag dahil",
  "facebook": "100-150 karakter",
  "x_twitter": "max 230 karakter, 2-3 hashtag",
  "youtube_baslik": "max 80 karakter",
  "youtube_aciklama": "250-300 karakter",
  "hedef_kelimeler": ["kelime1","kelime2","kelime3","kelime4","kelime5"],
  "kategori": "Güncel",
  "oncelik": "yuksek",
  "gorsel_prompt": "realistic news photo prompt in English, max 15 words"
}` }]
        })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().then(t => t.slice(0,200))}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error + (data.detail ? ': ' + data.detail : ''))
      const raw = data.content?.[0]?.text || '{}'
      const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      setContent(parsed)
      if (selected) setHaberler(prev => prev.map(h => h.id === selected.id ? { ...h, durum: 'islendi' } : h))
      addNotif('Haber paketi hazır ✓', 'success')
    } catch (e) {
      const msg = e.message || 'Bilinmeyen hata'
      setApiErr(msg)
      addNotif('API hatası: ' + msg.slice(0, 60), 'error')
    }
    setProc(false)
  }, [selected, addNotif])

  if (page === 'login') {
    return <Login onLogin={u => { setUser(u); setPage('app') }} />
  }

  const bekCnt = haberler.filter(h => h.durum === 'bekliyor').length

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={() => { setPage('login'); setUser(null) }} bekCnt={bekCnt} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar page={active} notifications={notifs} showN={showN} setShowN={setShowN} />
        <div style={{ flex:1, overflow:'auto' }}>
          {active === 'dashboard' && <Dashboard haberler={haberler} setSelected={setSelected} setActive={setActive} setContent={setContent} onYenile={yenile} />}
          {active === 'haberler'  && <Haberler  haberler={haberler} setSelected={setSelected} setActive={setActive} setContent={setContent} />}
          {active === 'yeni'      && <YeniHaber selected={selected} setSelected={setSelected} onProcess={process} processing={processing} />}
          {active === 'isleme'    && <Isleme content={content} processing={processing} error={apiError} selectedHaber={selected} />}
          {active === 'editor'    && <GorselEditor onKapat={() => setActive('isleme')} />}
          {active === 'ayarlar'   && <Ayarlar />}
        </div>
      </div>
    </div>
  )
}
