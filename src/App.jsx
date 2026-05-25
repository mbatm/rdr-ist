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
          // KV'ye kaydet
          await fetch('/api/haber-kaydet', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              ...haber,
              [`video_${fmt}`]: data.render_url,
              [`video_${fmt}_snapshot`]: data.snapshot,
            })
          })
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
  const [fbTip,  setFbTip]  = useState('foto')  // 'foto' | 'video'
  const [igTip,  setIgTip]  = useState('foto')
  const [metin,  setMetin]  = useState('')
  const [gonderiyor, setGond] = useState(false)
  const [sonuc,  setSonuc]  = useState(null)
  const [hata,   setHata]   = useState(null)

  const isVideo = !!(selectedHaber?.video)

  useEffect(() => {
    const ham = content?.facebook || content?.site_basligi || ''
    setMetin(kayserimLink ? `${ham}\n\n🔗 ${kayserimLink}` : ham)
  }, [content, kayserimLink])

  const paylas = async (platform) => {
    setGond(true); setSonuc(null); setHata(null)
    try {
      const tip = platform === 'facebook' ? fbTip : igTip
      const gorselUrl = gorselUrls?.[platform === 'facebook' ? 'facebook' : 'instagram'] ||
                        gorselUrls?.instagram || gorselUrls?.facebook ||
                        selectedHaber?.gorsel_url || selectedHaber?.gorsel || ''
      const videoUrl  = videoRenders?.dikey?.url || selectedHaber?.video || ''

      const res = await fetch('/api/meta-paylas', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gorsel_url: gorselUrl,
          video_url:  videoUrl,
          metin,
          platform,
          is_video: tip === 'video',
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setSonuc(data)
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
      <TipSec val={fbTip} onChange={setFbTip} label="Facebook" />
      <TipSec val={igTip} onChange={setIgTip} label="Instagram" />

      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Paylaşım metni</div>
      <textarea value={metin} onChange={e=>setMetin(e.target.value)} rows={3}
        style={{width:'100%',fontSize:12,marginBottom:10,resize:'vertical',boxSizing:'border-box'}}/>

      <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
        {[['her_ikisi','FB + IG'],['facebook','Facebook'],['instagram','Instagram']].map(([p,l])=>(
          <button key={p} onClick={()=>paylas(p)} disabled={gonderiyor}
            style={{fontSize:12,background:'rgba(24,119,242,.15)',border:'0.5px solid rgba(24,119,242,.3)',color:'#4dabf7'}}>
            <Ic n={gonderiyor?'loader-2':'send'} size={13}/> {l}
          </button>
        ))}
      </div>

      {hata && <div style={{background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'rgba(230,57,70,.9)'}}>
        <Ic n="alert-circle" size={13}/> {hata}
      </div>}
      {sonuc && <div style={{background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.25)',borderRadius:'var(--radius-md)',padding:'10px 14px',fontSize:12}}>
        <div style={{color:'#00D4AA',fontWeight:500,marginBottom:6}}><Ic n="check" size={14}/> Paylaşıldı!</div>
        {sonuc.sonuclar?.facebook && <div style={{color:'var(--muted)'}}>Facebook: {sonuc.sonuclar.facebook.ok?'✓':'✗ '+sonuc.sonuclar.facebook.hata}</div>}
        {sonuc.sonuclar?.instagram && <div style={{color:'var(--muted)'}}>Instagram: {sonuc.sonuclar.instagram.ok?'✓':'✗ '+sonuc.sonuclar.instagram.hata}</div>}
      </div>}
    </div>
  )
}

// ── ISLEME ────────────────────────────────────────────────────────────────
function Isleme({ content, processing, error, selectedHaber }) {
  const [ec,          setEc]       = useState({})
  const [link,        setLink]     = useState('')
  const [mode,        setMode]     = useState('edit')
  const [gorselUrls,  setGUrls]    = useState({})
  const [videoRenders,setVRenders] = useState({})
  const [kaydediliyor,setKyd]      = useState(false)

  useEffect(() => {
    if (content) { setEc({...content}); setMode('edit'); setLink(''); setGUrls({}); setVRenders({}) }
  }, [content?.url_slug])

  const set = (f,v) => setEc(p=>({...p,[f]:v}))

  const editedHaber = selectedHaber ? {
    ...selectedHaber,
    sosyal_baslik: ec.sosyal_baslik||ec.site_basligi||selectedHaber.baslik,
    site_basligi:  ec.site_basligi||selectedHaber.baslik,
    ozet:          ec.ozet||selectedHaber.icerik?.slice(0,120),
    kategori:      ec.kategori||selectedHaber.kategori,
    tarih:         selectedHaber.tarih,
  } : null

  const kaydet = async () => {
    setKyd(true)
    try {
      await fetch('/api/haber-kaydet', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          ...ec,
          source_id:    selectedHaber?.source_id,
          source_url:   selectedHaber?.source_url,
          baslik:       selectedHaber?.baslik,
          gorsel:       selectedHaber?.gorsel,
          gorsel_url:   selectedHaber?.gorsel_url||selectedHaber?.gorsel,
          video:        selectedHaber?.video||'',
          tarih_iso:    selectedHaber?.tarih_iso||new Date().toISOString(),
          kayserim_link: link,
          kaydedildi:   new Date().toISOString(),
          durum: 'islendi',
        }),
      })
      setMode('paylas')
    } catch(e){console.error(e)}
    setKyd(false)
  }

  const Divider = ({label,ic}) => (
    <div style={{display:'flex',alignItems:'center',gap:8,borderTop:'0.5px solid var(--border)',paddingTop:'0.875rem',marginTop:'1rem',marginBottom:'0.75rem'}}>
      <Ic n={ic} size={14}/> <span style={{fontSize:11,fontWeight:500,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</span>
    </div>
  )

  const EField = ({label,field,multi=false,rows=3}) => (
    <div style={{marginBottom:'0.75rem'}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      {multi
        ? <textarea value={ec[field]||''} onChange={e=>set(field,e.target.value)} rows={rows}
            style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>
        : <input value={ec[field]||''} onChange={e=>set(field,e.target.value)} style={{width:'100%',fontSize:13}}/>}
    </div>
  )

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
      <OtoGorselUret haber={editedHaber} onGorsellerHazir={g=>setGUrls(g.urls)}/>
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
      <EField label="Site başlığı (SEO)" field="site_basligi"/>
      <EField label="H1 başlığı" field="h1_basligi"/>
      <EField label="Sosyal medya başlığı" field="sosyal_baslik"/>
      <EField label="Meta description" field="meta_description"/>
      <EField label="URL slug" field="url_slug"/>
      <EField label="Özet" field="ozet"/>
      <EField label="Optimize içerik" field="optimize_icerik" multi rows={6}/>

      <div style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>
          kayserim.net linki
        </div>
        <input type="url" value={link} onChange={e=>setLink(e.target.value)}
          placeholder="https://www.kayserim.net/haber/28040684/..."
          style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
      </div>

      <Divider label="Sosyal medya metinleri" ic="share"/>
      <EField label="Instagram" field="instagram" multi rows={3}/>
      <EField label="Facebook" field="facebook" multi rows={3}/>
      <EField label="X / Twitter" field="x_twitter" multi rows={2}/>
      <EField label="YouTube başlık" field="youtube_baslik"/>
      <EField label="YouTube açıklama" field="youtube_aciklama" multi rows={3}/>

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
      <OtoGorselUret haber={editedHaber} onGorsellerHazir={g=>setGUrls(g.urls)}/>
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
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
      setContent(bulunan||data)
      setTab('isleme')
    } catch(e){ setError(e.message) }
    setProcessing(false)
  }

  const haberleriGoster = haberler
    .filter(h=>filter==='hepsi'||h.durum===filter)
    .filter(h=>!arama||h.baslik?.toLowerCase().includes(arama.toLowerCase())||h.site_basligi?.toLowerCase().includes(arama.toLowerCase()))

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
          {[['haberler','1ha akışı','rss'],['isleme','İşleme','bolt']].map(([id,label,ic])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{fontSize:12,background:tab===id?'rgba(255,255,255,.08)':'transparent',
                border:tab===id?'0.5px solid rgba(255,255,255,.2)':'0.5px solid transparent',fontWeight:tab===id?500:400}}>
              <Ic n={ic} size={12}/> {label}
            </button>
          ))}
          <button onClick={()=>setGorselEditor(true)} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="adjustments" size={12}/> Şablon
          </button>
          <button onClick={yenile} disabled={yenileniyor} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n={yenileniyor?'loader-2':'refresh'} size={12}/>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        {tab==='haberler' && (
          <div style={{flex:1,overflowY:'auto',padding:'0.75rem'}}>
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
        )}

        {tab==='isleme' && (
          <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <Isleme content={content} processing={processing} error={error} selectedHaber={selectedHaber}/>
          </div>
        )}
      </div>
    </div>
  )
}
