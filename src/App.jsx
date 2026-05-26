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

// ── VIDEO İŞLE BİLEŞENİ ──────────────────────────────────────────────────
function VideoIsle({ haber, baslik, kategori, spot, onVideoHazir }) {
  const [renders,   setRenders]  = useState({}) // { dikey: {render_id, url, snapshot}, yatay: {...} }
  const [loading,   setLoading]  = useState({}) // { dikey: bool, yatay: bool }
  const [hatalar,   setHatalar]  = useState({})
  const [format,    setFormat]   = useState('dikey')

  // KV'den kayıtlı videoları yükle
  useEffect(() => {
    if (!haber?.source_id) return
    const kayitli = {}
    const sid = haber.source_id
    ;['dikey','yatay'].forEach(fmt => {
      const url = haber[`video_${fmt}`]
      const snap = haber[`video_${fmt}_snapshot`]
      if (url) { kayitli[fmt] = { url, snapshot: snap }; onVideoHazir?.({ format: fmt, url, snapshot: snap }) }
    })
    if (Object.keys(kayitli).length) setRenders(kayitli)
  }, [haber?.source_id])

  const isle = async (fmt) => {
    const formatlar = fmt === 'her_ikisi' ? ['dikey','yatay'] : [fmt]
    setLoading(p => { const n={...p}; formatlar.forEach(f=>n[f]=true); return n })
    setHatalar(p => { const n={...p}; formatlar.forEach(f=>delete n[f]); return n })

    try {
      const res = await fetch('/api/video-isle', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          video_url: haber.video,
          baslik: baslik||haber.baslik,
          spot: spot||haber.ozet||'',
          kategori: kategori||haber.kategori,
          tarih: haber.tarih,
          source_id: haber.source_id,
          format: fmt,
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)

      // Her render için poll başlat
      for (const r of data.renders) {
        pollRender(r.render_id, r.format)
      }
    } catch(e) {
      setLoading(p => { const n={...p}; formatlar.forEach(f=>n[f]=false); return n })
      setHatalar(p => { const n={...p}; formatlar.forEach(f=>n[f]=e.message); return n })
    }
  }

  const pollRender = (renderId, fmt) => {
    const timer = setInterval(async () => {
      try {
        const res  = await fetch(`/api/video-durum?render_id=${renderId}`)
        const data = await res.json()
        if (data.status === 'succeeded') {
          clearInterval(timer)
          const entry = { url: data.render_url, snapshot: data.snapshot }
          setRenders(p => ({...p, [fmt]: entry}))
          setLoading(p => ({...p, [fmt]: false}))
          // Ayrı KV key'e kaydet (merge sorunu yok)
          fetch('/api/video-url', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              source_id: haber.source_id,
              format:    fmt,
              url:       data.render_url,
              snapshot:  data.snapshot || '',
            })
          }).catch(e => console.warn('Video URL kayıt hatası:', e.message))
          onVideoHazir?.({ format: fmt, url: data.render_url, snapshot: data.snapshot })
        } else if (data.status === 'failed') {
          clearInterval(timer)
          setLoading(p => ({...p, [fmt]: false}))
          setHatalar(p => ({...p, [fmt]: 'Render başarısız'}))
        }
      } catch {}
    }, 4000)
  }

  const FORMATLAR = [
    { id:'dikey',    label:'Dikey (IG/FB)',  ic:'device-mobile' },
    { id:'yatay',    label:'Yatay (X/YT)',   ic:'device-desktop' },
    { id:'her_ikisi',label:'İkisi birden',   ic:'copy' },
  ]

  return (
    <div style={{marginBottom:8}}>
      {/* Format butonları */}
      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
        {FORMATLAR.map(({id,label,ic}) => (
          <button key={id} onClick={()=>isle(id)}
            disabled={loading.dikey||loading.yatay}
            style={{fontSize:12,background:'rgba(230,57,70,.12)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b',display:'flex',alignItems:'center',gap:5}}>
            <Ic n={ic} size={12}/>
            {id==='dikey'&&loading.dikey ? 'Hazırlanıyor…' :
             id==='yatay'&&loading.yatay ? 'Hazırlanıyor…' :
             id==='her_ikisi'&&(loading.dikey||loading.yatay) ? 'Hazırlanıyor…' : label}
          </button>
        ))}
      </div>

      {/* Render sonuçları */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {['dikey','yatay'].map(fmt => {
          const r = renders[fmt]
          const isLoading = loading[fmt]
          const hata = hatalar[fmt]
          if (!r && !isLoading && !hata) return null
          return (
            <div key={fmt} style={{background:'rgba(255,255,255,.04)',borderRadius:6,padding:8,border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase'}}>{fmt}</div>
              {isLoading && <div style={{fontSize:12,color:'var(--muted)',display:'flex',gap:6,alignItems:'center'}}><Ic n="loader-2" size={12}/>Render ediliyor…</div>}
              {hata && <div style={{fontSize:11,color:'#ff7b7b'}}><Ic n="alert-circle" size={11}/> {hata}</div>}
              {r?.url && (
                <>
                  {r.snapshot && <img src={r.snapshot} alt={fmt} style={{width:'100%',borderRadius:4,marginBottom:6,border:'0.5px solid var(--border)'}}/>}
                  <div style={{display:'flex',gap:4}}>
                    <a href={r.url} download={`kayserim-${fmt}.mp4`} style={{flex:1}}>
                      <button style={{width:'100%',fontSize:10,background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                        <Ic n="download" size={10}/> İndir
                      </button>
                    </a>
                    <button onClick={()=>isle(fmt)} style={{fontSize:10,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                      <Ic n="refresh" size={10}/>
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}




// ── META PAYLAŞIM ─────────────────────────────────────────────────────────
function MetaPaylas({ content, selectedHaber, gorselUrls, kayserimLink='', videoRenders={} }) {
  const isVideo = !!(selectedHaber?.video)
  const [fbTip,    setFbTip]   = useState(isVideo ? 'video' : 'foto')
  const [igTip,    setIgTip]   = useState(isVideo ? 'video' : 'foto')
  const [igStory,    setIgStory]    = useState(false)
  const [igKolabor,  setIgKolabor]  = useState('')
  const [videoDur,   setVideoDur]   = useState(null) // saniye cinsinden video süresi
  const [fbMetin,  setFbMetin]  = useState('')
  const [igMetin,  setIgMetin]  = useState('')
  const [gonderiyor, setGond]  = useState(false)
  const [sonuc,    setSonuc]   = useState(null)
  const [hata,     setHata]    = useState(null)
  const [kvVideo,  setKvVideo] = useState({})
  const [hesaplar, setHesaplar] = useState({ facebook: [], instagram: [] })
  const [secilenFb, setSecilenFb] = useState([])
  const [secilenIg, setSecilenIg] = useState([])

  // Bağlı hesapları yükle
  useEffect(() => {
    Promise.all([
      fetch('/api/hesaplar').then(r=>r.json()),
      fetch('/api/auth?token='+(localStorage.getItem('cms_token')||'')).then(r=>r.json()).catch(()=>({}))
    ]).then(([h, u]) => {
      // Kullanıcının yetki verilen sayfaları varsa filtrele
      const izinliSayfalar = u?.sayfalar || null
      const fbFiltered = izinliSayfalar
        ? (h.facebook||[]).filter(p => izinliSayfalar.includes(p.page_id))
        : (h.facebook||[])
      const igFiltered = izinliSayfalar
        ? (h.instagram||[]).filter(p => izinliSayfalar.includes(p.page_id))
        : (h.instagram||[])
      setHesaplar({ facebook: fbFiltered, instagram: igFiltered })
      setSecilenFb([])
      setSecilenIg([])
    }).catch(()=>{})
  }, [])

  // Video URL'lerini KV'den yükle + video süresini oku
  useEffect(() => {
    if (!selectedHaber?.source_id || !isVideo) return
    fetch('/api/video-url?source_id=' + encodeURIComponent(selectedHaber.source_id))
      .then(r => r.json())
      .then(data => { if (data.dikey || data.yatay) setKvVideo(data) })
      .catch(() => {})
    // Video süresini oku
    const videoUrl = selectedHaber?.video
    if (videoUrl) {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => setVideoDur(Math.round(v.duration))
      v.onerror = () => setVideoDur(null)
      v.src = videoUrl
    }
  }, [selectedHaber?.source_id])

  // Video haber değişince tip güncelle
  useEffect(() => {
    setFbTip(isVideo ? 'video' : 'foto')
    setIgTip(isVideo ? 'video' : 'foto')
    setIgStory(false)
  }, [selectedHaber?.source_id])

  useEffect(() => {
    const link = kayserimLink || ''
    const linkStr = link ? `\n\n🔗 ${link}` : ''
    const linkKisa = link ? `\n\nTamamını oku: ${link}` : ''

    // Facebook: başlık + spot + link
    const fbHam = content?.facebook || content?.sosyal_baslik || content?.site_basligi || ''
    setFbMetin(fbHam + linkKisa)

    // Instagram: Claude'un ürettiği optimize instagram metni öncelikli
    const temizle = (t='') => t
      .replace(/^[A-ZÇĞİÖŞÜa-zçğışöüı\s]+\s*\([^)]+\)\s*[-–—:]\s*/,'') // KAYSERİ (1HA)- vs kaldır
      .replace(/\n{3,}/g, '\n\n') // 3+ satır boşluğu → tek satır boşluk
      .replace(/[ \t]+\n/g, '\n') // satır sonu boşlukları temizle
      .replace(/^\s+/,'').trim()
    const igHam = content?.instagram ? temizle(content.instagram)
                : temizle(content?.optimize_icerik || content?.ozet || content?.site_basligi || '')
    const igSon = link ? `\n\n🔗 ${link}` : ''
    setIgMetin(igHam.slice(0, 2200) + igSon)
  }, [content, kayserimLink])

  const paylas = async (platform) => {
    setGond(true); setSonuc(null); setHata(null)
    try {
      const tip = platform === 'facebook' ? fbTip : igTip
      const gorselUrl = gorselUrls?.[platform === 'facebook' ? 'facebook' : 'instagram'] ||
                        gorselUrls?.instagram || gorselUrls?.facebook ||
                        selectedHaber?.gorsel_url || selectedHaber?.gorsel || ''
      const storyGorselUrl = gorselUrls?.story || gorselUrl  // story formatı öncelikli
      const videoUrl = kvVideo?.dikey ||
                      videoRenders?.dikey?.url ||
                      selectedHaber?.video_dikey ||
                      selectedHaber?.video || ''
      console.log('Paylaş debug:', { kvVideo, videoRenders_dikey: videoRenders?.dikey?.url, video_dikey: selectedHaber?.video_dikey, kullanilan: videoUrl })

      const token = localStorage.getItem('cms_token') || ''
      const kullanici = token
        ? (await fetch('/api/auth?token='+token).then(r=>r.json()).catch(()=>({}))).kullanici || 'editor'
        : 'editor'
      const metin = platform === 'instagram' ? igMetin : fbMetin
      const res = await fetch('/api/meta-paylas', {
        method:'POST', headers:{'Content-Type':'application/json','X-Kullanici':kullanici},
        body: JSON.stringify({
          source_id:    selectedHaber?.source_id,
          baslik:       content?.site_basligi||'',
          gorsel_url:   gorselUrl,
          video_url:    videoUrl,
          metin,
          platform,
          is_video:     tip === 'video',
          fb_page_ids:  secilenFb.length ? secilenFb : undefined,
          ig_ids:       secilenIg.length ? secilenIg : undefined,
          ig_story:     igStory,
          ig_story_gorsel: igStory ? storyGorselUrl : undefined,
          video_dur:    videoDur,
          ig_kolabor:   igKolabor ? igKolabor.split(',').map(s=>s.trim().replace('@','')).filter(Boolean) : undefined,
          kayserim_link: kayserimLink || '',
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)

      // Instagram video container bekleyenleri poll et
      const igSonuclar = data.sonuclar?.instagram || {}
      const bekleyenler = Object.entries(igSonuclar).filter(([,s])=>s.bekliyor&&s.container_id)
      if (bekleyenler.length) {
        setSonuc(data)
        for (const [igId, igSonuc] of bekleyenler) {
          let attempts = 0
          const poll = async () => {
            if (attempts++ > 24) { setSonuc(p=>({...p,sonuclar:{...p.sonuclar,instagram:{...p.sonuclar.instagram,[igId]:{hata:'Zaman aşımı'}}}})); return }
            try {
              const r = await fetch('/api/ig-publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({container_id:igSonuc.container_id, ig_id:igId.replace('_story','')})})
              const d = await r.json()
              if (d.bekliyor) {
                setSonuc(p=>({...p,sonuclar:{...p.sonuclar,instagram:{...p.sonuclar.instagram,[igId]:{bekliyor:true,mesaj:`Video işleniyor… (${attempts}/24)`}}}}))
                setTimeout(poll,5000)
              } else {
                setSonuc(p=>({...p,sonuclar:{...p.sonuclar,instagram:{...p.sonuclar.instagram,[igId]:d}}}))
              }
            } catch(e){ setSonuc(p=>({...p,sonuclar:{...p.sonuclar,instagram:{...p.sonuclar.instagram,[igId]:{hata:e.message}}}})) }
          }
          setTimeout(poll,5000)
        }
      } else {
        setSonuc(data)
        // Paylaşım flag'lerini güncelle
        const fbOk = Object.values(data.sonuclar?.facebook||{}).some(s=>s.ok)
        const igOk = Object.values(data.sonuclar?.instagram||{}).some(s=>s.ok)
        if (fbOk) await fetch('/api/haber-kaydet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selectedHaber,paylasildi_fb:new Date().toISOString()})}).catch(()=>{})
        if (igOk) await fetch('/api/haber-kaydet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selectedHaber,paylasildi_ig:new Date().toISOString()})}).catch(()=>{})
      }
    } catch(e) { setHata(e.message) }
    setGond(false)
  }

  const TipSec = ({ val, onChange, label }) => (
    <div style={{display:'flex',gap:4,marginBottom:8}}>
      <span style={{fontSize:11,color:'var(--muted)',marginRight:4}}>{label}:</span>
      {[['foto','Fotoğraf'],['video','Video']].map(([v,l])=>(
        <button key={v} onClick={()=>onChange(v)} disabled={v==='video'&&!isVideo}
          style={{fontSize:11,background:val===v?'rgba(24,119,242,.2)':'transparent',
            border:`0.5px solid ${val===v?'rgba(24,119,242,.4)':'var(--border)'}`,
            color:val===v?'#4dabf7':'var(--muted)',opacity:v==='video'&&!isVideo?0.4:1}}>
          {l}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{marginBottom:'0.875rem'}}>
      {/* Hesap seçim — kompakt */}
      {(hesaplar.facebook?.length > 0 || hesaplar.instagram?.length > 0) && (
        <div style={{marginBottom:10,border:'0.5px solid #30363d',borderRadius:6,overflow:'hidden',background:'#0d1117'}}>
          {hesaplar.facebook?.length > 0 && (
            <div style={{borderBottom: hesaplar.instagram?.length ? '0.5px solid #30363d' : 'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 10px',background:'rgba(24,119,242,.07)'}}>
                <span style={{fontSize:11,color:'#4dabf7',fontWeight:500}}>Facebook — {secilenFb.length}/{hesaplar.facebook.length} seçili</span>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setSecilenFb(hesaplar.facebook.map(h=>h.page_id))} style={{fontSize:10,background:'transparent',border:'none',color:'#4dabf7',cursor:'pointer'}}>Tümü</button>
                  <button onClick={()=>setSecilenFb([])} style={{fontSize:10,background:'transparent',border:'none',color:'#8891a5',cursor:'pointer'}}>Temizle</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:1,maxHeight:130,overflowY:'auto',padding:4}}>
                {hesaplar.facebook.map(h=>(
                  <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',cursor:'pointer',
                    borderRadius:3,background:secilenFb.includes(h.page_id)?'rgba(24,119,242,.12)':'transparent'}}>
                    <input type="checkbox" checked={secilenFb.includes(h.page_id)}
                      onChange={e=>setSecilenFb(p=>e.target.checked?[...p,h.page_id]:p.filter(x=>x!==h.page_id))}
                      style={{flexShrink:0,width:13,height:13}}/>
                    <span style={{fontSize:11,color:'#cdd3de'}}>{h.page_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {hesaplar.instagram?.length > 0 && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 10px',background:'rgba(225,48,108,.07)'}}>
                <span style={{fontSize:11,color:'#E1306C',fontWeight:500}}>Instagram — {secilenIg.length}/{hesaplar.instagram.length} seçili</span>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setSecilenIg(hesaplar.instagram.map(h=>h.ig_id))} style={{fontSize:10,background:'transparent',border:'none',color:'#E1306C',cursor:'pointer'}}>Tümü</button>
                  <button onClick={()=>setSecilenIg([])} style={{fontSize:10,background:'transparent',border:'none',color:'#8891a5',cursor:'pointer'}}>Temizle</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:1,maxHeight:100,overflowY:'auto',padding:4}}>
                {hesaplar.instagram.map(h=>(
                  <label key={h.ig_id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',cursor:'pointer',
                    borderRadius:3,background:secilenIg.includes(h.ig_id)?'rgba(225,48,108,.12)':'transparent'}}>
                    <input type="checkbox" checked={secilenIg.includes(h.ig_id)}
                      onChange={e=>setSecilenIg(p=>e.target.checked?[...p,h.ig_id]:p.filter(x=>x!==h.ig_id))}
                      style={{flexShrink:0,width:13,height:13}}/>
                    <span style={{fontSize:11,color:'#cdd3de'}}>@{h.username||h.ig_id}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TipSec val={fbTip} onChange={setFbTip} label="Facebook" />

      <TipSec val={igTip} onChange={setIgTip} label="Instagram" />
      {/* Instagram Story */}
      {(() => {
        const storyTip = isVideo && videoDur !== null && videoDur <= 59 ? 'video' : 'gorsel'
        const storyEtiket = storyTip === 'video'
          ? `Story - Video (${videoDur}s)`
          : isVideo && videoDur > 59
            ? `Story - Görsel (video ${videoDur}s > 59s)`
            : 'Story - Görsel'
        return (
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#8891a5',marginBottom:6,cursor:'pointer'}}>
            <input type="checkbox" checked={igStory} onChange={e=>setIgStory(e.target.checked)}/>
            <span>{storyEtiket}</span>
          </label>
        )
      })()}
      {/* Instagram Kolaboratör */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'#8891a5',marginBottom:3}}>
          Kolaboratör hesaplar <span style={{opacity:.6}}>(virgülle ayır, @ olmadan)</span>
        </div>
        <input value={igKolabor} onChange={e=>setIgKolabor(e.target.value)}
          placeholder="ornek_hesap, diger_hesap"
          style={{width:'100%',fontSize:12,boxSizing:'border-box'}}/>
        {igKolabor && <div style={{fontSize:10,color:'#4dabf7',marginTop:3}}>
          ℹ️ Davet gönderilir, karşı tarafın kabul etmesi gerekir
        </div>}
      </div>

      {/* Kullanılacak video URL'si */}
      {isVideo && (() => {
        const vUrl = kvVideo?.dikey || videoRenders?.dikey?.url || selectedHaber?.video_dikey || selectedHaber?.video || ''
        const isIslenmis = !!(kvVideo?.dikey || videoRenders?.dikey?.url || selectedHaber?.video_dikey)
        return <div style={{fontSize:10,color:isIslenmis?'#00D4AA':'rgba(255,180,0,.8)',marginBottom:8,wordBreak:'break-all'}}>
          {isIslenmis ? '✓ İşlenmiş video' : '⚠ Ham video'}: {vUrl.slice(0,60)}…
        </div>
      })()}

      <div style={{marginBottom:10}}>
        <div style={{fontSize:11,color:'#1877F2',marginBottom:3}}>Facebook metni</div>
        <textarea value={fbMetin} onChange={e=>setFbMetin(e.target.value)} rows={3}
          style={{width:'100%',fontSize:12,marginBottom:8,resize:'vertical',boxSizing:'border-box'}}/>
        <div style={{fontSize:11,color:'#E1306C',marginBottom:3}}>Instagram metni</div>
        <textarea value={igMetin} onChange={e=>setIgMetin(e.target.value)} rows={4}
          style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box'}}/>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
        {[['facebook','Facebook','#1877F2'],['instagram','Instagram','#E1306C'],['her_ikisi','FB + IG','#4dabf7']].map(([p,l,c])=>(
          <button key={p} onClick={()=>paylas(p)} disabled={gonderiyor}
            style={{fontSize:12,background:`rgba(${p==='facebook'?'24,119,242':p==='instagram'?'225,48,108':'24,119,242'},.15)`,
              border:`0.5px solid ${c}44`,color:c}}>
            <Ic n={gonderiyor?'loader-2':'send'} size={13}/> {l}
          </button>
        ))}
      </div>

      {hata && <div style={{background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'rgba(230,57,70,.9)'}}>
        <Ic n="alert-circle" size={13}/> {hata}
      </div>}
      {sonuc && <div style={{background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:12}}>
        <div style={{color:'#00D4AA',fontWeight:500,marginBottom:6}}><Ic n="check" size={14}/> Paylaşıldı!</div>
        {Object.entries(sonuc.sonuclar?.facebook||{}).map(([pid,s])=>(
          <div key={pid} style={{color:'var(--muted)'}}>Facebook ({s.page_name||pid}): {s.ok?'✓':'✗ '+(s.hata||'Hata')}</div>
        ))}
        {Object.entries(sonuc.sonuclar?.instagram||{}).map(([igKey,s])=>(
          <div key={igKey} style={{color:'var(--muted)'}}>
            {s.story ? '📸 Story' : 'Instagram'} (@{s.ig_username||igKey.replace('_story','')}):
            {s.ok ? ' ✓' : s.bekliyor ? ' ⏳ '+( s.mesaj||'İşleniyor…') : ' ✗ '+(s.hata||'Hata')}
          </div>
        ))}
      </div>}
    </div>
  )
}


// ── SHARED FORM COMPONENTS — Isleme dışında tanımlı (focus korunması için) ──
const Divider = ({label,ic}) => (
  <div style={{display:'flex',alignItems:'center',gap:8,borderTop:'0.5px solid var(--border)',paddingTop:'0.875rem',marginTop:'1rem',marginBottom:'0.75rem'}}>
    <Ic n={ic} size={14}/> <span style={{fontSize:11,fontWeight:500,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</span>
  </div>
)

const EField = ({label,field,ec,set,multi=false,rows=3}) => (
  <div style={{marginBottom:'0.75rem'}}>
    <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
    {multi
      ? <textarea value={ec[field]||''} onChange={e=>set(field,e.target.value)} rows={rows}
          style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>
      : <input value={ec[field]||''} onChange={e=>set(field,e.target.value)} style={{width:'100%',fontSize:13}}/>}
  </div>
)

// ── ISLEME ────────────────────────────────────────────────────────────────
function Isleme({ content, processing, error, selectedHaber }) {
  const [ec,          setEc]       = useState({})
  const [link,        setLink]     = useState('')
  const [mode,        setMode]     = useState('edit')
  const [gorselUrls,  setGUrls]    = useState({})
  const [videoRenders,setVRenders] = useState({})
  const [kaydediliyor,setKyd]      = useState(false)

  useEffect(() => {
    if (content) {
      setEc({...content})
      setLink(content.kayserim_link || selectedHaber?.kayserim_link || '')
      setMode('edit'); setGUrls({})
      // KV'deki işlenmiş videoları yükle
      const vr = {}
      if (selectedHaber?.video_dikey) vr.dikey = { url: selectedHaber.video_dikey, snapshot: selectedHaber.video_dikey_snapshot }
      if (selectedHaber?.video_yatay) vr.yatay = { url: selectedHaber.video_yatay, snapshot: selectedHaber.video_yatay_snapshot }
      setVRenders(vr)
    }
  }, [content?.url_slug])

  const set = (f,v) => setEc(p=>({...p,[f]:v}))

  // ec hangi habere ait? Farklı haberden kalıyorsa selectedHaber'ın değerlerini kullan
  const ecAyniHaber = ec.source_id === selectedHaber?.source_id || ec.url_slug === selectedHaber?.url_slug

  const editedHaber = selectedHaber ? {
    ...selectedHaber,
    sosyal_baslik: ecAyniHaber ? (ec.sosyal_baslik||ec.site_basligi||selectedHaber.sosyal_baslik||selectedHaber.baslik) : (selectedHaber.sosyal_baslik||selectedHaber.baslik),
    site_basligi:  ecAyniHaber ? (ec.site_basligi||selectedHaber.site_basligi||selectedHaber.baslik) : (selectedHaber.site_basligi||selectedHaber.baslik),
    ozet:          ecAyniHaber ? (ec.ozet||selectedHaber.ozet||selectedHaber.icerik?.slice(0,120)) : (selectedHaber.ozet||selectedHaber.icerik?.slice(0,120)),
    kategori:      ecAyniHaber ? (ec.kategori||selectedHaber.kategori) : selectedHaber.kategori,
    tarih:         selectedHaber.tarih,
    kayserim_link: link || selectedHaber.kayserim_link || '',
  } : null

  const kaydet = async () => {
    setKyd(true)
    try {
      const body = {
        ...ec,
        source_id:    selectedHaber?.source_id,
        source_url:   selectedHaber?.source_url,
        baslik:       selectedHaber?.baslik,
        gorsel:       selectedHaber?.gorsel,
        gorsel_url:   selectedHaber?.gorsel_url||selectedHaber?.gorsel,
        video:        selectedHaber?.video||'',
        // İşlenmiş videoları koru
        video_dikey:  videoRenders?.dikey?.url || selectedHaber?.video_dikey || '',
        video_yatay:  videoRenders?.yatay?.url || selectedHaber?.video_yatay || '',
        video_dikey_snapshot: videoRenders?.dikey?.snapshot || selectedHaber?.video_dikey_snapshot || '',
        video_yatay_snapshot: videoRenders?.yatay?.snapshot || selectedHaber?.video_yatay_snapshot || '',
        tarih_iso:    selectedHaber?.tarih_iso||new Date().toISOString(),
        kayserim_link: link,
        kaydedildi:   new Date().toISOString(),
        durum: 'islendi',
      }
      await fetch('/api/haber-kaydet', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
      })
      // Paylaş moduna geç — selectedHaber'ı güncelle
      if (selectedHaber) {
        Object.assign(selectedHaber, {
          kayserim_link: link,
          video_dikey: body.video_dikey,
          video_yatay: body.video_yatay,
          video_dikey_snapshot: body.video_dikey_snapshot,
        })
      }
      setMode('paylas')
    } catch(e){console.error(e)}
    setKyd(false)
  }

  if (processing) return (
    <div style={{padding:'1.25rem',display:'flex',alignItems:'center',gap:10,color:'#4488FF'}}>
      <Ic n="loader-2" size={18}/> <span style={{fontSize:14}}>Claude işliyor…</span>
    </div>
  )

  if (error) return (
    <div style={{padding:'1.25rem',color:'#E63946',fontSize:13}}>
      <Ic n="alert-circle" size={14}/> {error}
    </div>
  )

  if (!content||!ec.site_basligi) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:320,gap:12}}>
      <Ic n="bolt" size={36} style={{color:'rgba(255,255,255,0.1)'}}/>
      <p style={{fontSize:14,color:'var(--muted)'}}>Henüz işlenmiş haber yok.</p>
    </div>
  )

  // PAYLAŞ MODU
  if (mode==='paylas') return (
    <div style={{padding:'1.25rem',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem'}}>
        <div style={{background:'rgba(0,212,170,.1)',border:'0.5px solid rgba(0,212,170,.25)',borderRadius:'var(--radius-md)',padding:'10px 14px',flex:1}}>
          <div style={{fontSize:14,fontWeight:500,color:'#00D4AA'}}>✓ Kaydedildi</div>
          <div style={{fontSize:12,color:'rgba(0,212,170,.7)',marginTop:2}}>{ec.site_basligi}</div>
        </div>
        <button onClick={()=>setMode('edit')} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="edit" size={13}/> Düzenle
        </button>
      </div>
      <Divider label="Sosyal medya görselleri" ic="photo"/>
      <OtoGorselUret key={editedHaber?.source_id} haber={editedHaber} onGorsellerHazir={g=>setGUrls(g.urls)}/>
      <Divider label="Paylaş" ic="send"/>
      <MetaPaylas content={ec} selectedHaber={selectedHaber} gorselUrls={gorselUrls} kayserimLink={link} videoRenders={videoRenders}/>
    </div>
  )

  // DÜZENLEME MODU
  return (
    <div style={{padding:'1.25rem',overflowY:'auto'}}>
      <div style={{display:'flex',gap:8,marginBottom:'1.25rem',alignItems:'center'}}>
        <div style={{flex:1,fontSize:13,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {ec.site_basligi||'Haber düzenleniyor…'}
        </div>
        <button onClick={kaydet} disabled={kaydediliyor}
          style={{fontWeight:600,background:'rgba(0,212,170,.15)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',whiteSpace:'nowrap',flexShrink:0}}>
          <Ic n={kaydediliyor?'loader-2':'device-floppy'} size={14}/>
          {kaydediliyor?'Kaydediliyor…':'Kaydet & Paylaşıma Geç →'}
        </button>
      </div>

      <Divider label="SEO & web içeriği" ic="world"/>
      <EField ec={ec} set={set} label="Site başlığı (SEO)" field="site_basligi"/>
      <EField ec={ec} set={set} label="H1 başlığı" field="h1_basligi"/>
      <EField ec={ec} set={set} label="Sosyal medya başlığı" field="sosyal_baslik"/>
      <EField ec={ec} set={set} label="Meta description" field="meta_description"/>
      <EField ec={ec} set={set} label="URL slug" field="url_slug"/>
      <EField ec={ec} set={set} label="Özet" field="ozet"/>
      <EField ec={ec} set={set} label="Optimize içerik" field="optimize_icerik" multi rows={6}/>

      <div style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>
          kayserim.net linki
        </div>
        <input type="url" value={link} onChange={e=>setLink(e.target.value)}
          placeholder="https://www.kayserim.net/haber/28040684/..."
          style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
      </div>

      <Divider label="Sosyal medya metinleri" ic="share"/>
      <EField ec={ec} set={set} label="Instagram" field="instagram" multi rows={3}/>
      <EField ec={ec} set={set} label="Facebook" field="facebook" multi rows={3}/>
      <EField ec={ec} set={set} label="X / Twitter" field="x_twitter" multi rows={2}/>
      <EField ec={ec} set={set} label="YouTube başlık" field="youtube_baslik"/>
      <EField ec={ec} set={set} label="YouTube açıklama" field="youtube_aciklama" multi rows={3}/>

      {selectedHaber?.video && (
        <>
          <Divider label="Video" ic="video"/>
          <video key={selectedHaber.video} src={selectedHaber.video} controls
            style={{width:'100%',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border)',maxHeight:240,background:'#000',marginBottom:8}}/>
          <VideoIsle haber={selectedHaber} baslik={ec.sosyal_baslik||ec.site_basligi}
            kategori={ec.kategori} spot={ec.ozet}
            onVideoHazir={({format,url,snapshot})=>setVRenders(p=>({...p,[format]:{url,snapshot}}))}/>
        </>
      )}

      <Divider label="Görsel önizleme" ic="photo"/>
      <OtoGorselUret key={editedHaber?.source_id} haber={editedHaber} onGorsellerHazir={g=>setGUrls(g.urls)}/>
    </div>
  )
}


// ── AUTH HOOK ─────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cms_token')
    if (!token) { setLoading(false); return }
    fetch('/api/auth?token=' + token)
      .then(r => r.json())
      .then(d => { if (d.gecerli) setUser({...d, token}); else localStorage.removeItem('cms_token') })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const girisYap = async (kullanici, sifre) => {
    const res  = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({kullanici, sifre}) })
    const data = await res.json()
    if (data.hata) throw new Error(data.hata)
    localStorage.setItem('cms_token', data.token)
    setUser(data)
    return data
  }

  const cikisYap = () => {
    localStorage.removeItem('cms_token')
    setUser(null)
  }

  return { user, loading, girisYap, cikisYap }
}

// ── LOGIN EKRANI ──────────────────────────────────────────────────────────
function LoginEkrani({ onGiris }) {
  const [kullanici, setKullanici] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [busy, setBusy] = useState(false)

  const giris = async e => {
    e.preventDefault()
    setBusy(true); setHata('')
    try { await onGiris(kullanici, sifre) }
    catch(e) { setHata(e.message) }
    setBusy(false)
  }

  return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{width:320,padding:'2rem',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
        <div style={{fontWeight:700,fontSize:22,color:'#ff7b7b',marginBottom:8,letterSpacing:'-0.02em'}}>rdr.ist</div>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:'1.5rem'}}>kayserim.net CMS</div>
        <form onSubmit={giris}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>KULLANICI ADI</div>
            <input value={kullanici} onChange={e=>setKullanici(e.target.value)} autoFocus
              style={{width:'100%',fontSize:13,boxSizing:'border-box'}} placeholder="admin"/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>ŞİFRE</div>
            <input type="password" value={sifre} onChange={e=>setSifre(e.target.value)}
              style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
          </div>
          {hata && <div style={{fontSize:12,color:'#ff7b7b',marginBottom:12}}>{hata}</div>}
          <button type="submit" disabled={busy} style={{width:'100%',background:'rgba(0,212,170,.15)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',fontWeight:600,padding:'10px'}}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}


// ── HESAP YÖNETİMİ ────────────────────────────────────────────────────────
function HesapYonetimi() {
  const [hesaplar, setHesaplar] = useState({ facebook:[], instagram:[] })
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = () => {
    setYukleniyor(true)
    fetch('/api/hesaplar').then(r=>r.json()).then(d=>{ setHesaplar(d); setYukleniyor(false) }).catch(()=>setYukleniyor(false))
  }

  useEffect(()=>{ yukle() }, [])

  const sil = async (page_id, page_name) => {
    if (!confirm(`"${page_name}" hesabı kaldırılsın mı?`)) return
    const token = localStorage.getItem('cms_token') || ''
    await fetch('/api/hesaplar', {
      method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
      body: JSON.stringify({ islem:'sil', page_id })
    })
    yukle()
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:500}}>Bağlı Hesaplar</span>
        <a href="/api/meta-auth" target="_blank">
          <button style={{fontSize:12,background:'rgba(24,119,242,.15)',border:'0.5px solid rgba(24,119,242,.3)',color:'#4dabf7'}}>
            <Ic n="plus" size={12}/> Hesap Ekle
          </button>
        </a>
      </div>
      {yukleniyor && <div style={{color:'var(--muted)',fontSize:13}}>Yükleniyor…</div>}
      {hesaplar.facebook?.map(h => {
        const ig = hesaplar.instagram?.find(i=>i.page_id===h.page_id)
        return (
          <div key={h.page_id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'12px 14px',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {h.picture && <img src={h.picture} alt="" style={{width:36,height:36,borderRadius:'50%',flexShrink:0}}/>}
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{h.page_name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,display:'flex',gap:8}}>
                  <span style={{color:'#1877F2'}}>Facebook</span>
                  {ig && <span style={{color:'#E1306C'}}>Instagram @{ig.username||ig.ig_id}</span>}
                </div>
              </div>
              <button onClick={()=>sil(h.page_id, h.page_name)}
                style={{fontSize:11,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                <Ic n="unlink" size={11}/> Kaldır
              </button>
            </div>
          </div>
        )
      })}
      {!yukleniyor && !hesaplar.facebook?.length && (
        <div style={{color:'var(--muted)',fontSize:13}}>
          Henüz hesap eklenmemiş. <a href="/api/meta-auth" target="_blank" style={{color:'#4dabf7'}}>Hesap Ekle →</a>
        </div>
      )}
    </div>
  )
}

// ── KULLANICI DÜZENLEME FORMU ──────────────────────────────────────────────
function DuzenleForm({ u, token, tumHesaplar, onKaydet }) {
  const [form, setForm] = useState({ ...u, sifre: '', sayfalar: u.sayfalar||[] })
  const [busy, setBusy] = useState(false)

  const kaydet = async () => {
    setBusy(true)
    try {
      const body = { islem:'guncelle', kullanici:form.kullanici, ad:form.ad, rol:form.rol,
        sayfalar: form.sayfalar?.length ? form.sayfalar : null,
        ...(form.sifre ? { sifre:form.sifre } : { sifre: u.sifre||'?' }) }
      const res = await fetch('/api/kullanicilar', {
        method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.ok) onKaydet({ kullanici:form.kullanici, ad:form.ad, rol:form.rol, sayfalar:form.sayfalar })
    } catch(e){}
    setBusy(false)
  }

  return (
    <div style={{marginTop:10,paddingTop:10,borderTop:'0.5px solid var(--border)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>AD SOYAD</div>
          <input value={form.ad} onChange={e=>setForm(p=>({...p,ad:e.target.value}))} style={{width:'100%',fontSize:12}}/>
        </div>
        <div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>YENİ ŞİFRE (opsiyonel)</div>
          <input type="password" value={form.sifre} onChange={e=>setForm(p=>({...p,sifre:e.target.value}))} style={{width:'100%',fontSize:12}} placeholder="Değiştirmek için yaz"/>
        </div>
        <div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>ROL</div>
          <select value={form.rol} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}
            style={{width:'100%',fontSize:12,background:'var(--surface)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'5px 8px'}}>
            <option value="editor">Editör</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {tumHesaplar.facebook?.length > 0 && (
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>SAYFA YETKİLERİ <span style={{opacity:.6}}>(boş = tümü)</span></div>
          <div style={{maxHeight:110,overflowY:'auto',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'4px 0'}}>
            {tumHesaplar.facebook.map(h=>(
              <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 8px',cursor:'pointer',width:'100%'}}>
                <input type="checkbox"
                  checked={(form.sayfalar||[]).includes(h.page_id)}
                  onChange={e=>{
                    const cur = form.sayfalar||[]
                    setForm(p=>({...p, sayfalar: e.target.checked?[...cur,h.page_id]:cur.filter(x=>x!==h.page_id)}))
                  }}/>
                <span style={{color:'#cdd3de',fontSize:11}}>{h.page_name}</span>
              </label>
            ))}
          </div>
          <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>Seçili: {(form.sayfalar||[]).length||'Tümü'}</div>
        </div>
      )}
      <button onClick={kaydet} disabled={busy}
        style={{fontSize:11,background:'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
        <Ic n={busy?'loader-2':'check'} size={11}/> Kaydet
      </button>
    </div>
  )
}

// ── ADMIN LOG PANELİ ──────────────────────────────────────────────────────
function AdminLog({ onKapat }) {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [sekme, setSekme] = useState('log')
  const [users, setUsers] = useState([])
  const [yeniK, setYeniK] = useState({ kullanici:'', sifre:'', ad:'', rol:'editor', sayfalar:[] })
  const [duzenleK, setDuzenleK] = useState(null) // düzenlenen kullanıcı
  const [tumHesaplar, setTumHesaplar] = useState({ facebook:[] })
  const [kayit, setKayit] = useState(false)
  const [siliyor, setSiliyor] = useState('')
  const token = localStorage.getItem('cms_token') || ''

  const yukleLog = () => {
    fetch('/api/paylas-log?admin=1', { headers:{'X-Token':token} })
      .then(r=>r.json()).then(d=>{ setLog(Array.isArray(d)?d:[]); setLoading(false) }).catch(()=>setLoading(false))
  }

  useEffect(() => {
    yukleLog()
    fetch('/api/kullanicilar?token='+token, { headers:{'X-Token':token} })
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setUsers(d) }).catch(()=>{})
    fetch('/api/hesaplar')
      .then(r=>r.json()).then(d=>setTumHesaplar(d)).catch(()=>{})
  }, [])

  const kaydet = async (form) => {
    if (!form.kullanici || !form.sifre) return
    setKayit(true)
    try {
      const res = await fetch('/api/kullanicilar', {
        method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
        body: JSON.stringify({ islem:'guncelle', ...form, sayfalar: form.sayfalar?.length ? form.sayfalar : null })
      })
      const data = await res.json()
      if (data.ok) {
        setUsers(p => p.some(u=>u.kullanici===form.kullanici)
          ? p.map(u=>u.kullanici===form.kullanici ? {...u,rol:form.rol,ad:form.ad,sayfalar:form.sayfalar} : u)
          : [...p, {kullanici:form.kullanici,rol:form.rol,ad:form.ad,sayfalar:form.sayfalar}])
        setYeniK({ kullanici:'', sifre:'', ad:'', rol:'editor', sayfalar:[] })
        setDuzenleK(null)
      }
    } catch(e){}
    setKayit(false)
  }

  const paylasSil = async (l) => {
    if (!l.post_id) return alert('Post ID yok — silinemez')
    if (!confirm(`${l.platform} paylaşımı silinsin mi?`)) return
    setSiliyor(l.post_id)
    try {
      const res = await fetch('/api/paylas-sil', {
        method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
        body: JSON.stringify({ platform:l.platform, post_id:l.post_id, page_id:l.page_id })
      })
      const data = await res.json()
      if (data.ok) {
        setLog(p=>p.filter(x=>x.post_id!==l.post_id))
      } else if (data.log_silindi) {
        setLog(p=>p.filter(x=>x.post_id!==l.post_id))
        if (data.post_url) window.open(data.post_url, '_blank')
        alert('Instagram API silme izni yok.\nGönderi logdan kaldırıldı.\nManuel silmek için Instagram açıldı.')
      } else {
        alert('Hata: ' + data.hata)
      }
    } catch(e) { alert(e.message) }
    setSiliyor('')
  }

  const kullaniciEkle = () => kaydet(yeniK)

  const kullaniciSil = async (k) => {
    if (!confirm(`"${k}" silinsin mi?`)) return
    await fetch('/api/kullanicilar', {
      method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
      body: JSON.stringify({ islem:'sil', kullanici:k })
    })
    setUsers(p=>p.filter(u=>u.kullanici!==k))
  }

  // Sayfa yetki seçici
  const SayfaSecici = ({ form, setForm }) => (
    tumHesaplar.facebook?.length > 0 ? (
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>SAYFA YETKİLERİ <span style={{opacity:.6}}>(boş = tümü)</span></div>
        <div style={{maxHeight:110,overflowY:'auto',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'4px 0'}}>
          {tumHesaplar.facebook.map(h=>(
            <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 8px',cursor:'pointer',width:'100%'}}>
              <input type="checkbox"
                checked={(form.sayfalar||[]).includes(h.page_id)}
                onChange={e=>{
                  const cur = form.sayfalar||[]
                  setForm(p=>({...p, sayfalar: e.target.checked?[...cur,h.page_id]:cur.filter(x=>x!==h.page_id)}))
                }}/>
              <span style={{color:'#cdd3de',fontSize:11}}>{h.page_name}</span>
            </label>
          ))}
        </div>
        <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>Seçili: {(form.sayfalar||[]).length||'Tümü'}</div>
      </div>
    ) : null
  )

  const PLT_COLORS = { facebook:'#1877F2', instagram:'#E1306C', twitter:'#1DA1F2', youtube:'#FF0000' }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',flexShrink:0}}>
        <button onClick={onKapat} style={{background:'transparent',border:'0.5px solid var(--border)',fontSize:12}}><Ic n="arrow-left" size={12}/> Geri</button>
        {['log','kullanicilar','hesaplar'].map(s=>(
          <button key={s} onClick={()=>setSekme(s)}
            style={{fontSize:12,background:sekme===s?'rgba(255,255,255,.08)':'transparent',border:sekme===s?'0.5px solid rgba(255,255,255,.2)':'0.5px solid transparent',fontWeight:sekme===s?500:400}}>
            {s==='log' ? `📋 Paylaşım Logu (${log.length})` : s==='kullanicilar' ? '👥 Kullanıcılar' : '🔗 Hesaplar'}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0.75rem'}}>

        {sekme==='log' && (<>
          {loading && <div style={{color:'var(--muted)',fontSize:13}}>Yükleniyor…</div>}
          {log.map((l,i)=>(
            <div key={i} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 12px',marginBottom:6,display:'flex',gap:10,alignItems:'flex-start'}}>
              <div style={{fontSize:10,background:`${PLT_COLORS[l.platform]||'#666'}22`,color:PLT_COLORS[l.platform]||'#aaa',border:`0.5px solid ${PLT_COLORS[l.platform]||'#666'}44`,borderRadius:4,padding:'2px 6px',flexShrink:0,textTransform:'capitalize'}}>{l.platform}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.baslik||l.source_id}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span>👤 {l.kullanici}</span>
                  {l.hesap&&<span>📄 {l.hesap}</span>}
                  <span>{l.tip==='video'?'🎬 Video':'📷 Fotoğraf'}</span>
                  <span>{l.tarih?new Date(l.tarih).toLocaleString('tr-TR'):''}</span>
                  {l.post_id&&<span style={{fontFamily:'var(--mono)',fontSize:10}}>ID: {l.post_id}</span>}
                </div>
              </div>
              {l.post_id && (
                <button onClick={()=>paylasSil(l)} disabled={siliyor===l.post_id}
                  style={{fontSize:11,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b',flexShrink:0}}>
                  <Ic n={siliyor===l.post_id?'loader-2':'trash'} size={11}/> Sil
                </button>
              )}
            </div>
          ))}
          {!loading&&log.length===0&&<div style={{color:'var(--muted)',fontSize:13}}>Henüz paylaşım yapılmamış.</div>}
        </>)}

        {sekme==='kullanicilar' && (<>
          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'1rem',marginBottom:'1rem'}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Yeni Kullanıcı Ekle</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>KULLANICI ADI</div>
                <input value={yeniK.kullanici} onChange={e=>setYeniK(p=>({...p,kullanici:e.target.value}))} style={{width:'100%',fontSize:13}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>ŞİFRE</div>
                <input type="password" value={yeniK.sifre} onChange={e=>setYeniK(p=>({...p,sifre:e.target.value}))} style={{width:'100%',fontSize:13}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>AD SOYAD</div>
                <input value={yeniK.ad} onChange={e=>setYeniK(p=>({...p,ad:e.target.value}))} style={{width:'100%',fontSize:13}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>ROL</div>
                <select value={yeniK.rol} onChange={e=>setYeniK(p=>({...p,rol:e.target.value}))} style={{width:'100%',fontSize:13,background:'var(--surface)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'6px 8px'}}>
                  <option value="editor">Editör</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {tumHesaplar.facebook?.length > 0 && <SayfaSecici form={yeniK} setForm={setYeniK}/>}
            <button onClick={kullaniciEkle} disabled={kayit||!yeniK.kullanici||!yeniK.sifre}
              style={{background:'rgba(0,212,170,.15)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',fontSize:12}}>
              <Ic n={kayit?'loader-2':'user-plus'} size={12}/> Ekle
            </button>
          </div>

          {users.map(u=>(
            <div key={u.kullanici}>
              <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Ic n="user" size={16}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{u.ad||u.kullanici}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{u.kullanici} · {u.rol==='admin'?'Admin':'Editör'}
                      {u.sayfalar?.length ? ` · ${u.sayfalar.length} sayfa` : ' · Tümü'}
                    </div>
                  </div>
                  <button onClick={()=>setDuzenleK(duzenleK===u.kullanici?null:u.kullanici)}
                    style={{fontSize:11,background:'rgba(255,255,255,.06)',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
                    <Ic n="edit" size={11}/> Düzenle
                  </button>
                  {u.kullanici!=='admin'&&<button onClick={()=>kullaniciSil(u.kullanici)}
                    style={{fontSize:11,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                    <Ic n="trash" size={11}/> Sil
                  </button>}
                </div>
                {duzenleK===u.kullanici && (
                  <DuzenleForm u={u} token={token} tumHesaplar={tumHesaplar}
                    onKaydet={guncellenen=>{
                      setUsers(p=>p.map(x=>x.kullanici===guncellened?.kullanici||u.kullanici?{...x,...guncellened}:x))
                      setDuzenleK(null)
                    }}/>
                )}
              </div>
            </div>
          ))}
        </>)}

        {sekme==='hesaplar' && <HesapYonetimi/>}
      </div>
    </div>
  )
}
export default function App() {
  const { user, loading, girisYap, cikisYap } = useAuth()
  const [adminLog, setAdminLog] = useState(false)
  const [tab, setTab] = useState('haberler')
  const [haberler, setHaberler] = useState([])
  const [selectedHaber, setSelectedHaber] = useState(null)
  const [detayHaber, setDetayHaber] = useState(null)
  const [content, setContent] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('hepsi')
  const [arama, setArama] = useState('')
  const [yenileniyor, setYenileniyor] = useState(false)
  const [gorselEditor, setGorselEditor] = useState(false)

  const yenile = useCallback(async () => {
    setYenileniyor(true)
    try {
      const [rssRes, kvRes] = await Promise.all([
        fetch('/api/haberler').catch(()=>({ok:false})),
        fetch('/api/haberler').catch(()=>({ok:false})),
      ])
      const kvListe = kvRes.ok ? await kvRes.json().catch(()=>[]) : []
      const rssHaberler = Array.isArray(kvListe) ? kvListe : []
      // Tarih_iso'ya göre sırala (en yeni önce), düzenleme zamanı sıralamayı bozmasın
      rssHaberler.sort((a,b) => {
        const ta = a.tarih_iso || a.kaydedildi || ''
        const tb = b.tarih_iso || b.kaydedildi || ''
        return tb.localeCompare(ta)
      })
      setHaberler(rssHaberler)
    } catch(e){console.error(e)}
    setYenileniyor(false)
  },[])

  useEffect(()=>{yenile()},[])

  const isle = async (h) => {
    setSelectedHaber(h); setContent(null); setProcessing(true); setError(null)
    try {
      const res = await fetch('/api/oto-isle?source_id='+encodeURIComponent(h.source_id||h.baslik))
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      const kv = await fetch('/api/haberler').then(r=>r.json()).catch(()=>[])
      const bulunan = Array.isArray(kv) ? kv.find(x=>x.source_id===h.source_id) : null
      const merged  = { ...data, kayserim_link: bulunan?.kayserim_link || h.kayserim_link || data.kayserim_link || '' }
      // selectedHaber'a da kayserim_link ekle
      Object.assign(h, { kayserim_link: merged.kayserim_link })
      setContent(merged)
      setTab('isleme')
    } catch(e){ setError(e.message) }
    setProcessing(false)
  }

  const haberleriGoster = haberler
    .filter(h=>filter==='hepsi'||h.durum===filter)
    .filter(h=>!arama||h.baslik?.toLowerCase().includes(arama.toLowerCase())||h.site_basligi?.toLowerCase().includes(arama.toLowerCase()))

  if (loading) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',background:'var(--bg)'}}>Yükleniyor…</div>
  if (!user) return <LoginEkrani onGiris={girisYap}/>
  if (adminLog) return <AdminLog onKapat={()=>setAdminLog(false)}/>

  if (gorselEditor) return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      <GorselEditor onKapat={()=>setGorselEditor(false)} ornek={selectedHaber}/>
    </div>
  )

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:16,color:'#ff7b7b',letterSpacing:'-0.02em'}}>rdr.ist</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {[['haberler','1ha akışı','rss']].map(([id,label,ic])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{fontSize:12,background:tab===id?'rgba(255,255,255,.08)':'transparent',
                border:tab===id?'0.5px solid rgba(255,255,255,.2)':'0.5px solid transparent',fontWeight:tab===id?500:400}}>
              <Ic n={ic} size={12}/> {label}
            </button>
          ))}
          <button onClick={()=>setGorselEditor(true)} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="adjustments" size={12}/> Şablon
          </button>
          {user?.rol==='admin'&&<button onClick={()=>setAdminLog(true)} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="clipboard-list" size={12}/> Log
          </button>}
          <button onClick={yenile} disabled={yenileniyor} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n={yenileniyor?'loader-2':'refresh'} size={12}/>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'0 8px',background:'rgba(255,255,255,.04)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)'}}>
            <span style={{fontSize:11,color:'var(--muted)'}}>{user?.ad||user?.kullanici}</span>
            <button onClick={cikisYap} style={{fontSize:11,background:'transparent',border:'none',color:'var(--muted)',padding:'2px 4px'}}>
              <Ic n="logout" size={11}/>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        <div style={{width:340,borderRight:'0.5px solid var(--border)',overflowY:'auto',padding:'0.75rem',flexShrink:0}}>
            <div style={{display:'flex',gap:6,marginBottom:'0.75rem',flexWrap:'wrap'}}>
              {['hepsi','bekliyor','islendi','yayinda'].map(f=>{
                const cnt=f==='hepsi'?haberler.length:haberler.filter(h=>h.durum===f).length
                const on=filter===f
                return (
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{background:on?'rgba(255,255,255,.08)':'transparent',border:on?'0.5px solid rgba(255,255,255,.2)':'0.5px solid var(--border)',fontWeight:on?500:400}}>
                    {f==='hepsi'?'Tümü':DURUM[f]?.l}
                    <span style={{fontSize:11,background:'rgba(255,255,255,.06)',color:'var(--muted)',padding:'1px 6px',borderRadius:10}}>{cnt}</span>
                  </button>
                )
              })}
            </div>
            <input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Haber ara…"
              style={{width:'100%',fontSize:13,marginBottom:'0.75rem',boxSizing:'border-box'}}/>
            {haberleriGoster.map((h,i)=>(
              <div key={h.source_id||i} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'0.75rem',marginBottom:'0.5rem'}}>
                <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                  {(h.gorsel||h.gorsel_url)&&<img src={h.gorsel_url||h.gorsel} alt="" style={{width:56,height:40,objectFit:'cover',borderRadius:'var(--radius-sm)',flexShrink:0}} onError={e=>e.target.style.display='none'}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,lineHeight:1.4,marginBottom:4}}>{h.site_basligi||h.baslik}</div>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                      <KatBadge k={h.kategori||'Güncel'}/>
                      <DurumBadge d={h.durum||'bekliyor'}/>
                      {h.tarih&&<span style={{fontSize:11,color:'var(--muted)'}}>{h.tarih}</span>}
                      {h.video&&<span style={{fontSize:10,background:'rgba(230,57,70,.1)',color:'#ff7b7b',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(230,57,70,.2)'}}>VIDEO</span>}
                      {h.video_dikey&&<span style={{fontSize:10,background:'rgba(0,212,170,.08)',color:'#00D4AA',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(0,212,170,.2)'}}>🎬</span>}
                      {h.paylasildi_fb&&<span style={{fontSize:10,background:'rgba(24,119,242,.08)',color:'#4dabf7',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(24,119,242,.2)'}}>FB</span>}
                      {h.paylasildi_ig&&<span style={{fontSize:10,background:'rgba(225,48,108,.08)',color:'#E1306C',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(225,48,108,.2)'}}>IG</span>}
                    </div>
                  </div>
                  <button onClick={()=>{setSelectedHaber(h);setContent(h.durum==='islendi'?h:null);setTab('isleme')}}
                    style={{fontSize:11,flexShrink:0,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                    Detay
                  </button>
                  <button onClick={()=>isle(h)} style={{fontSize:11,flexShrink:0,background:'rgba(0,212,170,.1)',border:'0.5px solid rgba(0,212,170,.25)',color:'#00D4AA'}}>
                    <Ic n="bolt" size={12}/> İşle
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Sağ panel - her zaman görünür */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <Isleme content={content} processing={processing} error={error} selectedHaber={selectedHaber}/>
        </div>
      </div>
    </div>
  )
}
