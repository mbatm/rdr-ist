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

  const doLogin = async () => {
    setErr('')
    try {
      const res  = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kullanici: u, sifre: p }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('cms_token', data.token)
        onLogin(data.kullanici)
      } else {
        setErr(data.hata || 'Kullanıcı adı veya şifre hatalı')
      }
    } catch(e) {
      setErr('Bağlantı hatası')
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
      // Medya boyutunu belirle — video yoksa görsel boyutlarını al
      const mediaUrl  = haber.video || haber.gorsel_url || haber.gorsel || ''
      const isVideo   = !!haber.video
      const medyaBilgi = haber.medyalar?.find(m=>m.tip===(isVideo?'video':'gorsel')) || haber.medyalar?.[0]

      const res = await fetch('/api/video-isle', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          video_url:  isVideo ? mediaUrl : undefined,
          gorsel_url: !isVideo ? mediaUrl : undefined,
          genislik:   medyaBilgi?.genislik,
          yukseklik:  medyaBilgi?.yukseklik,
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
  // story görseli — bileşen seviyesinde hesapla
  const storyGorselUrl = gorselUrls?.story ||
                         gorselUrls?.instagram || gorselUrls?.facebook ||
                         selectedHaber?.gorsel_url || selectedHaber?.gorsel || ''
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
      {/* Instagram Story — indir + link kopyala + IG aç */}
      <StoryPaylasButon
        storyGorselUrl={storyGorselUrl}
        kayserimLink={kayserimLink}
        isVideo={isVideo}
        videoDur={videoDur}
        kvVideo={kvVideo}
        videoRenders={videoRenders}
        selectedHaber={selectedHaber}
      />
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


// ── YOUTUBE YÜKLEME ───────────────────────────────────────────────────────────
function YoutubeYukle({ content, selectedHaber, videoRenders={}, kayserimLink='' }) {
  const [baslik,     setBaslik]     = useState('')
  const [aciklama,   setAciklama]   = useState('')
  const [etiketler,  setEtiketler]  = useState('')
  const [gonderiyor, setGond]       = useState(false)
  const [sonuc,      setSonuc]      = useState(null)
  const [hata,       setHata]       = useState(null)

  useEffect(() => {
    if (!content && !selectedHaber) return
    const b = content?.site_basligi || selectedHaber?.baslik || ''
    const kat = content?.kategori || selectedHaber?.kategori || ''
    const link = kayserimLink ? `\n\n🔗 ${kayserimLink}` : ''
    const a = (content?.optimize_icerik || content?.meta_description || '').replace(/<[^>]*>/g,'').slice(0,4000)
    setBaslik(b.slice(0,100))
    setAciklama((a + link).slice(0,5000))
    setEtiketler(['Kayseri', 'KayseriHaber', kat||'Haber', 'kayserimnet'].filter(Boolean).join(', '))
  }, [content?.url_slug, kayserimLink])

  const videoUrl = videoRenders?.yatay?.url || selectedHaber?.video_yatay || selectedHaber?.video || ''

  const yukle = async () => {
    if (!videoUrl) { setHata('Yatay video bulunamadı — Video İşle bölümünden oluşturun'); return }
    if (!baslik.trim()) { setHata('Başlık zorunlu'); return }
    setGond(true); setSonuc(null); setHata(null)
    try {
      const token     = localStorage.getItem('cms_token') || ''
      const kullanici = token
        ? (await fetch('/api/auth?token=' + token).then(r=>r.json()).catch(()=>({}))).kullanici || 'editor'
        : 'editor'

      const res  = await fetch('/api/youtube-yukle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': (import.meta.env?.VITE_RSS_API_KEY || 'cmp6vldho000210g6tt26pvc5'), 'X-Kullanici': kullanici },
        body: JSON.stringify({
          videoUrl,
          baslik,
          aciklama,
          etiketler: etiketler.split(',').map(e=>e.trim()).filter(Boolean),
          kategoriId: '25',
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setSonuc(data)
      if (data.basarili && selectedHaber) {
        await fetch('/api/haber-kaydet', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selectedHaber, paylasildi_yt: new Date().toISOString(), youtube_url: data.video_url }),
        }).catch(() => {})
      }
    } catch(e) { setHata(e.message) }
    setGond(false)
  }

  return (
    <div style={{marginBottom:'0.875rem'}}>
      {/* Video önizleme */}
      {videoUrl ? (
        <div style={{marginBottom:8,padding:6,background:'rgba(255,0,0,.05)',border:'0.5px solid rgba(255,0,0,.2)',borderRadius:6}}>
          <div style={{fontSize:10,color:'#ff4444',marginBottom:4}}>▶ Yatay Video</div>
          <div style={{fontSize:11,color:'var(--muted)',wordBreak:'break-all'}}>{videoUrl.slice(0,70)}…</div>
        </div>
      ) : (
        <div style={{marginBottom:8,fontSize:11,color:'rgba(255,180,0,.8)',padding:'5px 8px',background:'rgba(255,180,0,.06)',border:'0.5px solid rgba(255,180,0,.2)',borderRadius:4}}>
          ⚠ Yatay video yok — Video İşle bölümünden oluşturun
        </div>
      )}

      {/* Başlık */}
      <div style={{marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
          <div style={{fontSize:11,color:'#8899a6'}}>Başlık</div>
          <div style={{fontSize:11,color:'var(--muted)'}}>{baslik.length}/100</div>
        </div>
        <input value={baslik} onChange={e=>setBaslik(e.target.value.slice(0,100))}
          style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="Video başlığı..."/>
      </div>

      {/* Açıklama */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'#8899a6',marginBottom:3}}>Açıklama</div>
        <textarea value={aciklama} onChange={e=>setAciklama(e.target.value.slice(0,5000))} rows={4}
          style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box'}} placeholder="Video açıklaması..."/>
      </div>

      {/* Etiketler */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'#8899a6',marginBottom:3}}>Etiketler (virgülle ayır)</div>
        <input value={etiketler} onChange={e=>setEtiketler(e.target.value)}
          style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="Kayseri, Haber, ..."/>
      </div>

      {/* Yükle butonu */}
      <button onClick={yukle} disabled={gonderiyor||!videoUrl||!baslik.trim()}
        style={{fontSize:12,background:'rgba(255,0,0,.15)',border:'0.5px solid rgba(255,0,0,.4)',color:'#ff4444'}}>
        <Ic n={gonderiyor?'loader-2':'brand-youtube'} size={13}/> {gonderiyor?"Yükleniyor…":"▶ YouTube'a Yükle"}
      </button>

      {/* Hata / Sonuç */}
      {hata && (
        <div style={{marginTop:8,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'rgba(230,57,70,.9)'}}>
          <Ic n="alert-circle" size={13}/> {hata}
        </div>
      )}
      {sonuc?.basarili && (
        <div style={{marginTop:8,background:'rgba(255,0,0,.08)',border:'0.5px solid rgba(255,0,0,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'#ff4444'}}>
          <Ic n="check" size={13}/> Video yüklendi!{' '}
          <a href={sonuc.video_url} target="_blank" rel="noreferrer" style={{color:'#ff4444',fontWeight:600}}>
            YouTube'da gör →
          </a>
        </div>
      )}
    </div>
  )
}


// ── TWITTER PAYLAŞIM ─────────────────────────────────────────────────────────
function TwitterPaylas({ content, selectedHaber, gorselUrls, kayserimLink='', videoRenders={} }) {
  const isVideo = !!(selectedHaber?.video)
  const [metin,      setMetin]     = useState('')
  const [medyaTip,   setMedyaTip]  = useState('gorsel') // 'gorsel' | 'video' | 'yok'
  const [gonderiyor, setGond]      = useState(false)
  const [sonuc,      setSonuc]     = useState(null)
  const [hata,       setHata]      = useState(null)

  // Metin otomatik doldur
  useEffect(() => {
    if (!content && !selectedHaber) return
    const baslik  = content?.x_twitter || content?.sosyal_baslik || content?.site_basligi || selectedHaber?.baslik || ''
    const link    = kayserimLink ? `\n\n🔗 ${kayserimLink}` : ''
    const kat     = content?.kategori || selectedHaber?.kategori || ''
    const tag     = kat ? `\n\n#Kayseri #${kat.replace(/\s+/g,'')} #KayseriHaber` : '\n\n#Kayseri #KayseriHaber'
    const tam     = (baslik + link + tag).slice(0, 280)
    setMetin(tam)
  }, [content?.url_slug, kayserimLink])

  // Medya tipi: video haberde video, yoksa gorsel
  useEffect(() => {
    setMedyaTip(isVideo ? 'video' : 'gorsel')
  }, [selectedHaber?.source_id])

  const karKalan = 280 - metin.length
  const karRenk  = karKalan < 0 ? '#E63946' : karKalan < 20 ? '#FFB700' : 'var(--muted)'

  // Kullanılacak URL'ler
  const gorselUrl  = gorselUrls?.twitter || gorselUrls?.facebook || selectedHaber?.gorsel_url || selectedHaber?.gorsel || ''
  const videoUrl   = videoRenders?.yatay?.url || selectedHaber?.video_yatay || selectedHaber?.video || ''

  const paylas = async () => {
    if (!metin.trim() || karKalan < 0) return
    setGond(true); setSonuc(null); setHata(null)
    try {
      const token     = localStorage.getItem('cms_token') || ''
      const kullanici = token
        ? (await fetch('/api/auth?token=' + token).then(r=>r.json()).catch(()=>({}))).kullanici || 'editor'
        : 'editor'

      const payload = { metin }
      if (medyaTip === 'gorsel' && gorselUrl) {
        // OtoGorselUret'ten gelen data URL ise base64 olarak gönder
        if (gorselUrl.startsWith('data:')) {
          const [meta, b64] = gorselUrl.split(',')
          const mime = meta.match(/:(.*?);/)?.[1] || 'image/png'
          payload.gorselBase64   = b64
          payload.gorselMimeType = mime
        } else {
          payload.gorselUrl = gorselUrl
        }
      } else if (medyaTip === 'video' && videoUrl) {
        payload.videoUrl = videoUrl
      }

      const res  = await fetch('/api/twitter-paylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': (import.meta.env?.VITE_RSS_API_KEY || 'cmp6vldho000210g6tt26pvc5'), 'X-Kullanici': kullanici },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setSonuc(data)
      // paylasildi_tw flag
      if (data.basarili && selectedHaber) {
        await fetch('/api/haber-kaydet', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selectedHaber, paylasildi_tw: new Date().toISOString() }),
        }).catch(() => {})
      }
    } catch(e) { setHata(e.message) }
    setGond(false)
  }

  return (
    <div style={{marginBottom:'0.875rem'}}>
      {/* Karakter sayacı + metin */}
      <div style={{marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
          <div style={{fontSize:11,color:'#8899a6'}}>X / Twitter metni</div>
          <div style={{fontSize:12,fontWeight:600,color:karRenk}}>{karKalan}</div>
        </div>
        <textarea value={metin} onChange={e=>setMetin(e.target.value.slice(0,280))} rows={4}
          style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box',
            border:`0.5px solid ${karKalan<0?'#E63946':'var(--border)'}`}}/>
      </div>

      {/* Medya tipi seçimi */}
      <div style={{display:'flex',gap:4,marginBottom:8}}>
        <span style={{fontSize:11,color:'var(--muted)',marginRight:4}}>Medya:</span>
        {[['gorsel','Görsel'],['video','Video'],['yok','Yok']].map(([v,l])=>(
          <button key={v} onClick={()=>setMedyaTip(v)}
            disabled={v==='video'&&!isVideo}
            style={{fontSize:11,
              background:medyaTip===v?'rgba(29,161,242,.2)':'transparent',
              border:`0.5px solid ${medyaTip===v?'rgba(29,161,242,.5)':'var(--border)'}`,
              color:medyaTip===v?'#1da1f2':'var(--muted)',
              opacity:v==='video'&&!isVideo?0.4:1}}>
            {l}
          </button>
        ))}
      </div>

      {/* Medya önizleme */}
      {medyaTip==='gorsel' && gorselUrl && (
        <div style={{marginBottom:8,padding:6,background:'rgba(29,161,242,.05)',border:'0.5px solid rgba(29,161,242,.2)',borderRadius:6}}>
          <img src={gorselUrl} alt="twitter" style={{width:'100%',borderRadius:4,maxHeight:120,objectFit:'cover'}}/>
          <div style={{fontSize:10,color:'#1da1f2',marginTop:4}}>𝕏 {gorselUrls?.twitter?'1600×900 Twitter görseli':'Orijinal görsel'}</div>
        </div>
      )}
      {medyaTip==='gorsel' && !gorselUrl && (
        <div style={{marginBottom:8,fontSize:11,color:'rgba(255,180,0,.8)',padding:'5px 8px',background:'rgba(255,180,0,.06)',border:'0.5px solid rgba(255,180,0,.2)',borderRadius:4}}>
          ⚠ Görsel bulunamadı — yalnızca metin paylaşılacak
        </div>
      )}
      {medyaTip==='video' && videoUrl && (
        <div style={{marginBottom:8,fontSize:10,color:'#00D4AA',wordBreak:'break-all'}}>
          ✓ Yatay video: {videoUrl.slice(0,60)}…
        </div>
      )}
      {medyaTip==='video' && !videoUrl && (
        <div style={{marginBottom:8,fontSize:11,color:'rgba(255,180,0,.8)',padding:'5px 8px',background:'rgba(255,180,0,.06)',border:'0.5px solid rgba(255,180,0,.2)',borderRadius:4}}>
          ⚠ Yatay video yok — Video İşle bölümünden oluşturun
        </div>
      )}

      {/* Paylaş butonu */}
      <button onClick={paylas} disabled={gonderiyor||!metin.trim()||karKalan<0}
        style={{fontSize:12,background:'rgba(29,161,242,.15)',border:'0.5px solid rgba(29,161,242,.4)',color:'#1da1f2'}}>
        <Ic n={gonderiyor?'loader-2':'brand-x'} size={13}/> {gonderiyor?'Paylaşılıyor…':'𝕏 Tweet At'}
      </button>

      {/* Hata / Sonuç */}
      {hata && (
        <div style={{marginTop:8,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'rgba(230,57,70,.9)'}}>
          <Ic n="alert-circle" size={13}/> {hata}
        </div>
      )}
      {sonuc?.basarili && (
        <div style={{marginTop:8,background:'rgba(29,161,242,.08)',border:'0.5px solid rgba(29,161,242,.3)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontSize:12,color:'#1da1f2'}}>
          <Ic n="check" size={13}/> Tweet paylaşıldı!{' '}
          <a href={sonuc.tweet_url} target="_blank" rel="noreferrer" style={{color:'#1da1f2',fontWeight:600}}>
            Tweeti gör →
          </a>
        </div>
      )}
    </div>
  )
}




// ── MANUEL GÖRSEL EKLE (Kayserim.net modülü için) ────────────────────────────
function ManuelGorselEkle({ selectedHaber, onGorselEklendi }) {
  const [gorselUrl,  setGorselUrl]  = useState(selectedHaber?.gorsel_url || selectedHaber?.gorsel || '')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata,       setHata]       = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    setGorselUrl(selectedHaber?.gorsel_url || selectedHaber?.gorsel || '')
  }, [selectedHaber?.source_id])

  const dosyaSec = async (file) => {
    setYukleniyor(true); setHata(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const b64 = e.target.result.split(',')[1]
        const res = await fetch('/api/gorsel-yukle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: b64, source_id: selectedHaber?.source_id || 'manuel', format: `gorsel_${Date.now()}` }),
        })
        const data = await res.json()
        if (data.url) {
          setGorselUrl(data.url)
          onGorselEklendi?.(data.url)
          // selectedHaber'ı güncelle
          if (selectedHaber) {
            selectedHaber.gorsel_url = data.url
            selectedHaber.gorsel     = data.url
          }
        } else { setHata(data.hata || 'Yükleme hatası') }
        setYukleniyor(false)
      }
      reader.readAsDataURL(file)
    } catch(e) { setHata(e.message); setYukleniyor(false) }
  }

  return (
    <div style={{marginBottom:'0.75rem'}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>
        Manuel Görsel
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
        onChange={e=>e.target.files[0]&&dosyaSec(e.target.files[0])}/>
      <div style={{display:'flex',gap:6,alignItems:'flex-start'}}>
        {gorselUrl && (
          <img src={gorselUrl} alt="" style={{width:72,height:50,objectFit:'cover',borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)',flexShrink:0}}
            onError={e=>e.target.style.display='none'}/>
        )}
        <div style={{flex:1}}>
          <input value={gorselUrl} onChange={e=>{ setGorselUrl(e.target.value); onGorselEklendi?.(e.target.value); if(selectedHaber){ selectedHaber.gorsel_url=e.target.value; selectedHaber.gorsel=e.target.value } }}
            placeholder="https://... veya aşağıdan yükle"
            style={{width:'100%',fontSize:12,boxSizing:'border-box',marginBottom:4}}/>
          <button onClick={()=>fileRef.current?.click()} disabled={yukleniyor}
            style={{fontSize:11,background:'rgba(255,255,255,.06)',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
            <Ic n={yukleniyor?'loader-2':'upload'} size={11}/> {yukleniyor?'Yükleniyor…':'Görsel Yükle'}
          </button>
          {hata && <div style={{fontSize:10,color:'#ff7b7b',marginTop:3}}>{hata}</div>}
        </div>
      </div>
    </div>
  )
}

// ── STORY PAYLAŞ BUTONU ───────────────────────────────────────────────────────
function StoryPaylasButon({ storyGorselUrl, kayserimLink, isVideo, videoDur, kvVideo, videoRenders, selectedHaber }) {
  const [sonuc, setSonuc] = useState(null)

  const storyTip    = isVideo && videoDur !== null && videoDur <= 59 ? 'video' : 'gorsel'
  const storyVarMi  = storyGorselUrl || (storyTip === 'video' && (kvVideo?.dikey || videoRenders?.dikey?.url || selectedHaber?.video_dikey))

  const igAc = async () => {
    // 1) Kaydedilecek içerik: görsel veya link
    const indirUrl = storyGorselUrl || ''
    const kopyaMetin = kayserimLink || ''

    // 2) Görsel indir
    if (indirUrl) {
      try {
        const a = document.createElement('a')
        a.href = indirUrl
        a.download = 'story.jpg'
        a.click()
      } catch(e) {}
    }

    // 3) Link panoya kopyala
    if (kopyaMetin) {
      try { await navigator.clipboard.writeText(kopyaMetin) } catch(e) {}
    }

    // 4) Instagram aç
    setTimeout(() => { window.location.href = 'instagram://' }, 800)

    setSonuc(`✓ ${indirUrl?'Görsel indirildi':''}${indirUrl&&kopyaMetin?' · ':''}${kopyaMetin?'Link kopyalandı':''} — Instagram açılıyor…`)
  }

  return (
    <div style={{marginBottom:8}}>
      <div style={{fontSize:11,color:'#8891a5',marginBottom:6}}>Instagram Story</div>
      <div style={{padding:8,background:'rgba(225,48,108,.05)',border:'0.5px solid rgba(225,48,108,.15)',borderRadius:6}}>
        {storyGorselUrl ? (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <img src={storyGorselUrl} alt="story"
              style={{width:40,height:60,objectFit:'cover',borderRadius:4,border:'0.5px solid rgba(225,48,108,.3)',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:'#E1306C',marginBottom:5}}>
                📱 {storyTip==='video'?'Video Story':'Görsel Story'} hazır
              </div>
              <button onClick={igAc}
                style={{fontSize:11,background:'rgba(225,48,108,.15)',border:'0.5px solid rgba(225,48,108,.4)',color:'#E1306C',width:'100%'}}>
                <Ic n="download" size={11}/> İndir {kayserimLink?'· Link Kopyala':''} · Instagram Aç
              </button>
            </div>
          </div>
        ) : (
          <div style={{fontSize:10,color:'#8891a5',textAlign:'center',padding:'6px 0'}}>
            ⏳ Story görseli üretiliyor…
            {!storyVarMi && <span style={{display:'block',marginTop:3,color:'rgba(225,48,108,.5)'}}>Görsel önizleme bölümünden story formatını bekleyin</span>}
          </div>
        )}
        {sonuc && <div style={{fontSize:10,color:'#00D4AA',marginTop:5}}>{sonuc}</div>}
      </div>
    </div>
  )
}

// ── RSS'E EKLE BUTONU ────────────────────────────────────────────────────────
function RssEkleButon({ sourceId }) {
  const [durum,  setDurum]  = useState('bekliyor') // bekliyor | yukleniyor | tamam | hata
  const [mesaj,  setMesaj]  = useState('')
  const token = localStorage.getItem('cms_token') || ''

  const ekle = async () => {
    setDurum('yukleniyor')
    try {
      const res  = await fetch('/api/rss-ekle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify({ source_id: sourceId }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setDurum('tamam')
        setMesaj("RSS'e eklendi — kayserim.net'te görünecek")
    } catch(e) {
      setDurum('hata')
      setMesaj(e.message)
    }
  }

  if (durum === 'tamam') return (
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#00D4AA',
      padding:'4px 10px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',
      borderRadius:'var(--radius-sm)',whiteSpace:'nowrap'}}>
      <Ic n="rss" size={12}/> {mesaj}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:3}}>
      <button onClick={ekle} disabled={durum==='yukleniyor'}
        style={{fontSize:12,background:'rgba(255,183,0,.1)',border:'0.5px solid rgba(255,183,0,.3)',
          color:'#FFB700',whiteSpace:'nowrap',flexShrink:0}}>
        <Ic n={durum==='yukleniyor'?'loader-2':'rss'} size={12}/>
        {durum==='yukleniyor'?'Ekleniyor…':"RSS'e Ekle"}
      </button>
      {durum==='hata' && <div style={{fontSize:10,color:'#ff7b7b'}}>{mesaj}</div>}
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
  }, [content?.source_id, content?.url_slug])

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
      <Divider label="X / Twitter" ic="brand-x"/>
      <TwitterPaylas content={ec} selectedHaber={selectedHaber} gorselUrls={gorselUrls} kayserimLink={link} videoRenders={videoRenders}/>
      <Divider label="YouTube" ic="brand-youtube"/>
      <YoutubeYukle content={ec} selectedHaber={selectedHaber} videoRenders={videoRenders} kayserimLink={link}/>
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
        {/* RSS'e Ekle — sadece manuel haberler için */}
        {selectedHaber?.kaynak==='manuel' && (
          <RssEkleButon sourceId={selectedHaber.source_id}/>
        )}
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

      {/* Manuel görsel ekleme */}
      <ManuelGorselEkle selectedHaber={selectedHaber} onGorselEklendi={url=>{
        if(selectedHaber) selectedHaber.gorsel_url = url
      }}/>

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
            {yeniK.rol !== 'admin' && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Modül Yetkileri</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {[
                    ['modul_kayserim','kayserim.net Haber Girişi'],
                    ['modul_kayseradar','Kayseradar Veri Girişi'],
                    ['modul_reklam','Reklam Girişi'],
                    ['modul_manuel','Manuel Haber Girişi'],
                  ].map(([key,label])=>(
                    <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'4px 0'}}>
                      <input type="checkbox" checked={yeniK[key]!==false} onChange={e=>setYeniK(p=>({...p,[key]:e.target.checked}))}/>
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
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


// ── KAYSERADAR MODÜLÜ ─────────────────────────────────────────────────────────
const RADAR_SABLONLAR = [
  { id:'kaza',        label:'Kaza',          ic:'car-crash',      renk:'#E63946' },
  { id:'kayip',       label:'Kayıp',         ic:'user-search',    renk:'#FFB700' },
  { id:'kan',         label:'Kan İhtiyacı',  ic:'droplet',        renk:'#E63946' },
  { id:'trafik',      label:'Trafik',        ic:'traffic-cone',   renk:'#FFB700' },
  { id:'son_dakika',  label:'Son Dakika',    ic:'urgent',         renk:'#E63946' },
  { id:'yangin',      label:'Yangın',        ic:'flame',          renk:'#FF6B00' },
  { id:'acil',        label:'Acil Durum',    ic:'alert-triangle', renk:'#E63946' },
  { id:'calinti',     label:'Çalıntı',       ic:'shield-x',       renk:'#FFB700' },
  { id:'genel',       label:'Genel',         ic:'news',           renk:'#4488FF' },
  { id:'pati',        label:'Pati',          ic:'paw',            renk:'#00D4AA' },
  { id:'kaza_ani',    label:'Kaza Anı',      ic:'camera',         renk:'#E63946' },
  { id:'hirsiz',      label:'Hırsız Var',    ic:'eye',            renk:'#FFB700' },
  { id:'bulunmustur', label:'Bulunmuştur',   ic:'check-circle',   renk:'#00D4AA' },
  { id:'radar_yardim',label:'Radar Yardım',  ic:'heart-handshake',renk:'#4488FF' },
  { id:'sikayet',     label:'Şikayet',       ic:'message-report', renk:'#E63946' },
]

// Dosyayı base64'e çevirip yükle, public URL döndür
// Medya boyutlarını oku — görsel ve video için
async function medyaBoyutOku(file, dataUrl) {
  return new Promise((resolve) => {
    if (file.type.startsWith('video')) {
      const video = document.createElement('video')
      video.onloadedmetadata = () => {
        const dikey = video.videoHeight >= video.videoWidth
        resolve({ genislik: video.videoWidth, yukseklik: video.videoHeight, dikey })
      }
      video.onerror = () => resolve({ genislik: 0, yukseklik: 0, dikey: true })
      video.src = dataUrl
    } else {
      const img = new Image()
      img.onload = () => {
        const dikey = img.naturalHeight >= img.naturalWidth
        resolve({ genislik: img.naturalWidth, yukseklik: img.naturalHeight, dikey })
      }
      img.onerror = () => resolve({ genislik: 0, yukseklik: 0, dikey: true })
      img.src = dataUrl
    }
  })
}

async function dosyaYukle(file, sourceId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target.result
        const base64  = dataUrl.split(',')[1]
        const format  = file.type.startsWith('video') ? 'video' : 'gorsel'

        // Boyut bilgisini paralel al
        const boyut = await medyaBoyutOku(file, dataUrl)

        const res  = await fetch('/api/gorsel-yukle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: base64, source_id: sourceId, format: `${format}_${Date.now()}` }),
        })
        const data = await res.json()
        if (data.url) resolve({
          url:       data.url,
          tip:       format,
          adi:       file.name,
          mime:      file.type,
          dikey:     boyut.dikey,
          genislik:  boyut.genislik,
          yukseklik: boyut.yukseklik,
        })
        else reject(new Error(data.hata || 'Yükleme hatası'))
      } catch(err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

function KayseradarModul({ user, onGeri }) {
  const [ekran,        setEkran]      = useState('liste')
  const [seciliSablon, setSablon]     = useState(null)
  const [baslik,       setBaslik]     = useState('')
  const [metin,        setMetin]      = useState('')
  const [medyalar,     setMedyalar]   = useState([]) // { url, tip, adi, mime }
  const [yukleniyorM,  setYukleniyorM]= useState(false)
  const [isleniyor,    setIsleniyor]  = useState(false)
  const [onayKayit,    setOnayKayit]  = useState(null)
  const [liste,        setListe]      = useState([])
  const [seciliKayit,  setSecili]     = useState(null)
  const [paylasiyor,   setPaylasiyor] = useState(false)
  const [hata,         setHata]       = useState(null)
  const [pSonuc,       setPSonuc]     = useState(null)
  const [videoRenders, setVideoRenders] = useState({})
  const fileRef = useRef(null)
  const token   = localStorage.getItem('cms_token') || ''

  const listeYukle = async () => {
    try {
      const res  = await fetch('/api/kayseradar-isle', { headers: { 'X-Token': token } })
      const data = await res.json()
      setListe(Array.isArray(data) ? data : [])
    } catch(e) { console.error(e) }
  }

  useEffect(() => { listeYukle() }, [])

  // Dosya seç ve yükle
  const dosyaSec = async (files) => {
    setYukleniyorM(true); setHata(null)
    const sourceId = `radar_${Date.now()}`
    const yeniMedyalar = []
    for (const file of Array.from(files)) {
      try {
        const m = await dosyaYukle(file, sourceId)
        yeniMedyalar.push(m)
      } catch(e) { setHata(`${file.name}: ${e.message}`) }
    }
    setMedyalar(p => [...p, ...yeniMedyalar])
    setYukleniyorM(false)
  }

  const medyaSil = (idx) => setMedyalar(p => p.filter((_, i) => i !== idx))

  // İşle
  const isle = async () => {
    if (!seciliSablon)  { setHata('Şablon seçin'); return }
    if (!baslik.trim() && !metin.trim()) { setHata('Başlık veya metin girin'); return }
    setIsleniyor(true); setHata(null)
    try {
      const res  = await fetch('/api/kayseradar-isle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body:    JSON.stringify({ sablon: seciliSablon.id, baslik, metin, medyalar }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setOnayKayit(data.kayit)
      // Video render takibi başlat
      if (data.kayit.creatomate?.length) {
        const rv = {}
        for (const r of data.kayit.creatomate) {
          rv[r.format] = {
            render_id: r.render_id,
            status:    r.url ? 'succeeded' : (r.status || 'planned'),
            url:       r.url || null,
            tip:       r.tip || 'video',
          }
        }
        setVideoRenders(rv)
        // Henüz hazır olmayanları takip et
        const bekleyenler = data.kayit.creatomate.filter(r => !r.url && r.status !== 'succeeded')
        if (bekleyenler.length) takipBaslat(bekleyenler, data.kayit.id)
      }
      setEkran('onay')
    } catch(e) { setHata(e.message) }
    setIsleniyor(false)
  }

  // Creatomate render takibi
  const takipBaslat = (renders, kadasId) => {
    const bekleyenler = renders.filter(r => r.status !== 'succeeded')
    if (!bekleyenler.length) return
    const interval = setInterval(async () => {
      let tumTamam = true
      for (const r of bekleyenler) {
        try {
          const res  = await fetch(`/api/video-durum?render_id=${r.render_id}`)
          const data = await res.json()
          const renderUrl = data.url || data.render_url || null
          if (data.status === 'succeeded' || renderUrl) {
            setVideoRenders(p => ({ ...p, [r.format]: { ...p[r.format], status: 'succeeded', url: renderUrl } }))
            // Listedeki kaydı da güncelle
            setListe(prev => prev.map(li => li.render_id === r.render_id ? { ...li, render_url: renderUrl } : li))
            // KV kaydını güncelle
            setOnayKayit(p => p ? {
              ...p,
              [`video_${r.format}`]: { render_id: r.render_id, status: 'succeeded', url: data.url },
            } : p)
          } else if (data.status === 'failed') {
            setVideoRenders(p => ({ ...p, [r.format]: { ...p[r.format], status: 'failed' } }))
          } else {
            tumTamam = false
          }
        } catch(e) { tumTamam = false }
      }
      if (tumTamam) clearInterval(interval)
    }, 3000)
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000) // 5 dk timeout
  }

  const onayGuncelle = (alan, deger) => setOnayKayit(p => ({ ...p, [alan]: deger }))

  // Paylaş
  const paylas = async (kayit, platformlar, fbIds=[], igIds=[]) => {
    setPaylasiyor(true); setPSonuc(null); setHata(null)
    try {
      const res  = await fetch('/api/kayseradar-paylas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body:    JSON.stringify({ id: kayit.id, platformlar, fb_page_ids: fbIds, ig_ids: igIds, tw: platformlar.includes('twitter') }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setPSonuc(data.sonuclar)
      listeYukle()
      // Onay kaydını güncelle
      setOnayKayit(p => p ? { ...p, durum: 'yayinda', paylasimlar: data.sonuclar } : p)
    } catch(e) { setHata(e.message) }
    setPaylasiyor(false)
  }

  // Sil
  const sil = async (id, sosyaldan=false) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return
    try {
      const res  = await fetch('/api/kayseradar-sil', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body:    JSON.stringify({ id, sosyal_medyadan_da_sil: sosyaldan }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      listeYukle()
      if (seciliKayit?.id === id) { setSecili(null); setEkran('liste') }
      if (onayKayit?.id  === id) { setOnayKayit(null); setEkran('liste') }
    } catch(e) { setHata(e.message) }
  }

  // Sıfırla
  const sifirla = () => {
    setSablon(null); setBaslik(''); setMetin(''); setMedyalar([])
    setOnayKayit(null); setHata(null); setPSonuc(null); setVideoRenders({})
    setEkran('yeni')
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:8,background:'var(--surface)',flexShrink:0}}>
        <button onClick={onGeri} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="arrow-left" size={11}/> Menü
        </button>
        <div style={{width:1,height:16,background:'var(--border)'}}/>
        <Ic n="radar" size={15} style={{color:'#E63946'}}/>
        <div style={{fontSize:14,fontWeight:600}}>Kayseradar</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button onClick={sifirla}
            style={{fontSize:12,background:'rgba(230,57,70,.12)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
            <Ic n="plus" size={12}/> Yeni Giriş
          </button>
          <button onClick={listeYukle} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            <Ic n="refresh" size={11}/>
          </button>
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        {/* Sol — Liste */}
        <div style={{width:300,borderRight:'0.5px solid var(--border)',overflowY:'auto',padding:'0.75rem',flexShrink:0}}>
          {liste.length === 0 && (
            <div style={{textAlign:'center',padding:'2rem',color:'var(--muted)',fontSize:13}}>Henüz kayıt yok</div>
          )}
          {liste.map(item => {
            const sbl = RADAR_SABLONLAR.find(s=>s.id===item.sablon) || RADAR_SABLONLAR[8]
            const on  = seciliKayit?.id === item.id || onayKayit?.id === item.id
            return (
              <div key={item.id} onClick={async()=>{
                const res  = await fetch(`/api/kayseradar-isle?id=${item.id}`,{headers:{'X-Token':token}})
                const d    = await res.json()
                setSecili(d); setOnayKayit(null); setEkran('detay'); setPSonuc(null); setHata(null)
              }}
                style={{background:on?'rgba(230,57,70,.06)':'var(--surface)',border:`0.5px solid ${on?'rgba(230,57,70,.3)':'var(--border)'}`,borderRadius:'var(--radius-md)',marginBottom:6,cursor:'pointer',overflow:'hidden'}}>
                {/* Render görseli — hazırsa göster */}
                {item.render_url ? (
                  <img src={item.render_url} alt="" style={{width:'100%',height:120,objectFit:'cover',display:'block'}}
                    onError={e=>e.target.style.display='none'}/>
                ) : item.gorsel_url ? (
                  <img src={item.gorsel_url} alt="" style={{width:'100%',height:100,objectFit:'cover',display:'block',opacity:0.6}}
                    onError={e=>e.target.style.display='none'}/>
                ) : null}
                <div style={{padding:'8px 10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:600,color:sbl.renk,background:`${sbl.renk}18`,padding:'2px 7px',borderRadius:10,border:`0.5px solid ${sbl.renk}33`}}>{sbl.label}</span>
                    {item.medya_sayisi > 0 && <span style={{fontSize:10,color:'var(--muted)'}}>📎 {item.medya_sayisi}</span>}
                    <span style={{fontSize:10,color:item.durum==='yayinda'?'#00D4AA':'#FFB700',marginLeft:'auto'}}>{item.durum==='yayinda'?'✓ Yayında':'⏳ Bekliyor'}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:500,lineHeight:1.4,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.baslik}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{new Date(item.tarih).toLocaleString('tr-TR')}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sağ panel */}
        <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

          {/* ── YENİ GİRİŞ ── */}
          {(ekran==='yeni'||ekran==='liste') && !onayKayit && (
            <div style={{maxWidth:660}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>Yeni Kayseradar Girişi</div>

              {/* Şablon */}
              <div style={{marginBottom:'1rem'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Şablon Seç</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:5}}>
                  {RADAR_SABLONLAR.map(s=>(
                    <div key={s.id} onClick={()=>setSablon(s)}
                      style={{padding:'7px 9px',borderRadius:'var(--radius-md)',cursor:'pointer',
                        background:seciliSablon?.id===s.id?`${s.renk}18`:'var(--surface)',
                        border:`0.5px solid ${seciliSablon?.id===s.id?s.renk:'var(--border)'}`,
                        display:'flex',alignItems:'center',gap:5}}>
                      <Ic n={s.ic} size={12} style={{color:s.renk}}/>
                      <span style={{fontSize:11,fontWeight:seciliSablon?.id===s.id?600:400,color:seciliSablon?.id===s.id?s.renk:'var(--text)'}}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Başlık — kan ilanında gizle */}
              {seciliSablon?.id !== 'kan' && (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Başlık</div>
                  <input value={baslik} onChange={e=>setBaslik(e.target.value)} placeholder="Haber başlığı..."
                    style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                </div>
              )}

              {/* Metin */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>
                  {seciliSablon?.id === 'kan' ? 'Kan İlanı Metni' : 'Metin'}
                </div>
                <textarea value={metin} onChange={e=>setMetin(e.target.value)}
                  rows={seciliSablon?.id === 'kan' ? 6 : 4}
                  placeholder={seciliSablon?.id === 'kan'
                    ? 'Hastane adı, kan grubu, iletişim numarası...'
                    : 'Haber detayları...'}
                  style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
              </div>

              {/* Medya yükleme — kan ilanında gizle */}
              {seciliSablon?.id !== 'kan' && <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Görsel / Video Ekle</div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:'none'}}
                  onChange={e=>dosyaSec(e.target.files)}/>
                <div onClick={()=>fileRef.current?.click()}
                  style={{border:'1px dashed var(--border)',borderRadius:'var(--radius-md)',padding:'1rem',textAlign:'center',cursor:'pointer',background:'var(--surface)',marginBottom:8}}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();dosyaSec(e.dataTransfer.files)}}>
                  {yukleniyorM
                    ? <span style={{fontSize:12,color:'var(--muted)'}}>Yükleniyor…</span>
                    : <span style={{fontSize:12,color:'var(--muted)'}}>📎 Dosya seç veya sürükle bırak (görsel ve video)</span>
                  }
                </div>
                {/* Medya önizleme */}
                {medyalar.length > 0 && (
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {medyalar.map((m,i)=>(
                      <div key={i} style={{position:'relative',width:80,flexShrink:0}}>
                        {m.tip==='gorsel'
                          ? <img src={m.url} alt={m.adi} style={{width:80,height:60,objectFit:'cover',borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                          : <div style={{width:80,height:60,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Ic n="player-play" size={20} style={{color:'#ff7b7b'}}/>
                            </div>
                        }
                        <div style={{fontSize:9,color:'var(--muted)',textAlign:'center',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.adi}</div>
                        <button onClick={()=>medyaSil(i)}
                          style={{position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:'50%',background:'#E63946',border:'none',color:'#fff',fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>}

              {hata && <div style={{marginBottom:10,fontSize:12,color:'#ff7b7b',padding:'6px 10px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)'}}>{hata}</div>}

              <button onClick={isle} disabled={isleniyor||!seciliSablon}
                style={{fontSize:13,background:'rgba(230,57,70,.15)',border:'0.5px solid rgba(230,57,70,.4)',color:'#ff7b7b'}}>
                <Ic n={isleniyor?'loader-2':'sparkles'} size={13}/> {isleniyor?'İşleniyor…':'İşle & Onaya Sun'}
              </button>
            </div>
          )}

          {/* ── ONAY & PAYLAŞIM ── */}
          {ekran==='onay' && onayKayit && (
            <div style={{maxWidth:660}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'}}>
                <div style={{fontSize:14,fontWeight:600}}>Onay & Paylaşım</div>
                <span style={{fontSize:11,color:onayKayit.durum==='yayinda'?'#00D4AA':'#FFB700',
                  background:onayKayit.durum==='yayinda'?'rgba(0,212,170,.1)':'rgba(255,183,0,.1)',
                  padding:'2px 8px',borderRadius:10,border:`0.5px solid ${onayKayit.durum==='yayinda'?'rgba(0,212,170,.3)':'rgba(255,183,0,.3)'}`}}>
                  {onayKayit.durum==='yayinda'?'✓ Yayında':'⏳ Onay Bekliyor'}
                </span>
              </div>

              {/* Başlık düzenle */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Başlık</div>
                <input value={onayKayit.baslik} onChange={e=>onayGuncelle('baslik',e.target.value)}
                  style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
              </div>

              {/* Render önizleme — görsel veya video */}
              {Object.keys(videoRenders).length > 0 && (
                <div style={{marginBottom:12}}>
                  {Object.entries(videoRenders).map(([fmt,r])=>(
                    <div key={fmt} style={{marginBottom:8}}>
                      {r.status==='succeeded' && r.url ? (
                        <div style={{position:'relative'}}>
                          {(r.tip==='gorsel' || (!r.tip && r.url && /\.(jpg|jpeg|png|webp)/i.test(r.url))) ? (
                            // Görsel önizleme
                            <img src={r.url} alt="render"
                              style={{width:'100%',maxHeight:300,objectFit:'contain',borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}}
                              onError={e=>e.target.style.display='none'}/>
                          ) : (
                            // Video önizleme
                            <video src={r.url} controls
                              style={{width:'100%',maxHeight:300,borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}}/>
                          )}
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4,gap:6}}>
                            <span style={{fontSize:10,color:'#00D4AA'}}>✓ {fmt==='dikey'?'Dikey':'Yatay'} hazır</span>
                            <div style={{display:'flex',gap:4}}>
                              <a href={r.url} target="_blank" rel="noreferrer"
                                style={{fontSize:10,color:'#4488FF',border:'0.5px solid rgba(68,136,255,.3)',padding:'2px 8px',borderRadius:4}}>
                                Aç →
                              </a>
                              <a href={r.url} download={r.tip==='gorsel'?'radar.jpg':'radar.mp4'} target="_blank"
                                style={{fontSize:10,color:'#00D4AA',border:'0.5px solid rgba(0,212,170,.3)',padding:'2px 8px',borderRadius:4}}>
                                ↓ İndir
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : r.status==='failed' ? (
                        <div style={{fontSize:12,color:'#ff7b7b',padding:'6px 10px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)'}}>
                          ✗ {fmt==='dikey'?'Dikey':'Yatay'} render başarısız
                        </div>
                      ) : (
                        <div style={{fontSize:12,color:'#FFB700',padding:'8px 12px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',gap:8}}>
                          <Ic n="loader-2" size={13}/> {fmt==='dikey'?'Dikey':'Yatay'} işleniyor…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Orijinal medya önizleme — render yoksa */}
              {Object.keys(videoRenders).length === 0 && onayKayit.medyalar?.length > 0 && (
                <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {onayKayit.medyalar.map((m,i)=>(
                    <div key={i}>
                      {m.tip==='gorsel'
                        ? <img src={m.url} alt="" style={{height:100,borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                        : <div style={{height:80,width:120,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ff7b7b'}}>
                            <Ic n="player-play" size={18}/> Video
                          </div>
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* Platform metinleri */}
              {[['ig_metni','Instagram','#E1306C'],['tw_metni','Twitter/X','#1da1f2'],['fb_metni','Facebook','#4dabf7']].map(([alan,label,renk])=>(
                <div key={alan} style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:renk,marginBottom:4}}>{label} metni</div>
                  <textarea value={onayKayit[alan]||''} onChange={e=>onayGuncelle(alan,e.target.value)} rows={3}
                    style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box',borderColor:`${renk}33`}}/>
                  {alan==='tw_metni'&&<div style={{fontSize:10,color:(onayKayit[alan]||'').length>260?'#ff7b7b':'var(--muted)',textAlign:'right'}}>{(onayKayit[alan]||'').length}/280</div>}
                </div>
              ))}

              {/* Paylaşım butonları */}
              <div style={{padding:12,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Paylaş</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[['facebook','Facebook','#4dabf7'],['instagram','Instagram','#E1306C'],['twitter','Twitter/X','#1da1f2']].map(([p,l,renk])=>(
                    <button key={p} disabled={paylasiyor} onClick={()=>paylas(onayKayit,[p])}
                      style={{fontSize:12,background:`${renk}11`,border:`0.5px solid ${renk}44`,color:renk}}>
                      {paylasiyor?<Ic n="loader-2" size={11}/>:null} {l}
                    </button>
                  ))}
                  <button disabled={paylasiyor} onClick={()=>paylas(onayKayit,['facebook','instagram','twitter'])}
                    style={{fontSize:12,background:'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
                    <Ic n="send" size={11}/> Tümüne Paylaş
                  </button>
                </div>
              </div>

              {hata   && <div style={{marginBottom:10,fontSize:12,color:'#ff7b7b',padding:'6px 10px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)'}}>{hata}</div>}
              {pSonuc && <div style={{marginBottom:10,fontSize:12,color:'#00D4AA',padding:'6px 10px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',borderRadius:'var(--radius-sm)'}}>✓ Paylaşım tamamlandı!</div>}

              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button onClick={sifirla} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                  <Ic n="plus" size={11}/> Yeni Giriş
                </button>
                <button onClick={()=>sil(onayKayit.id,false)}
                  style={{fontSize:12,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                  <Ic n="trash" size={11}/> Sil
                </button>
              </div>
            </div>
          )}

          {/* ── DETAY ── */}
          {ekran==='detay' && seciliKayit && (
            <div style={{maxWidth:660}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'}}>
                <div style={{fontSize:14,fontWeight:600,flex:1}}>{seciliKayit.baslik}</div>
                <span style={{fontSize:11,color:seciliKayit.durum==='yayinda'?'#00D4AA':'#FFB700',
                  background:seciliKayit.durum==='yayinda'?'rgba(0,212,170,.1)':'rgba(255,183,0,.1)',
                  padding:'2px 8px',borderRadius:10,border:`0.5px solid ${seciliKayit.durum==='yayinda'?'rgba(0,212,170,.3)':'rgba(255,183,0,.3)'}`}}>
                  {seciliKayit.durum==='yayinda'?'✓ Yayında':'⏳ Bekliyor'}
                </span>
              </div>

              {/* Medyalar */}
              {seciliKayit.medyalar?.length > 0 && (
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  {seciliKayit.medyalar.map((m,i)=>(
                    m.tip==='gorsel'
                      ? <img key={i} src={m.url} alt="" style={{height:80,borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                      : <div key={i} style={{height:80,width:120,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ff7b7b'}}><Ic n="player-play" size={18}/></div>
                  ))}
                </div>
              )}

              {/* Video render durumu */}
              {seciliKayit.creatomate?.length > 0 && (
                <div style={{marginBottom:12,padding:10,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Creatomate Videoları</div>
                  {seciliKayit.creatomate.map(r=>(
                    <div key={r.format} style={{fontSize:12,marginBottom:4,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{color:'var(--muted)',minWidth:50}}>{r.format==='dikey'?'⬆ Dikey':'↔ Yatay'}</span>
                      <span style={{color:r.status==='succeeded'?'#00D4AA':'#FFB700'}}>{r.status==='succeeded'?'✓ Hazır':'⏳ İşleniyor'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Paylaşım durumu */}
              {seciliKayit.paylasimlar && Object.keys(seciliKayit.paylasimlar).length > 0 && (
                <div style={{marginBottom:12,padding:10,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Paylaşım Geçmişi</div>
                  {Object.entries(seciliKayit.paylasimlar).map(([p,v])=>(
                    <div key={p} style={{fontSize:12,color:'#00D4AA',marginBottom:2,display:'flex',alignItems:'center',gap:6}}>
                      <span>✓ {p}</span>
                      <span style={{color:'var(--muted)',fontSize:11}}>{new Date(v.tarih).toLocaleString('tr-TR')}</span>
                      {v.tweet_url&&<a href={v.tweet_url} target="_blank" rel="noreferrer" style={{color:'#1da1f2',fontSize:11}}>→ Tweet</a>}
                    </div>
                  ))}
                </div>
              )}

              {/* Paylaş */}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                {[['facebook','Facebook','#4dabf7'],['instagram','Instagram','#E1306C'],['twitter','Twitter/X','#1da1f2']].map(([p,l,renk])=>(
                  <button key={p} disabled={paylasiyor} onClick={()=>paylas(seciliKayit,[p])}
                    style={{fontSize:12,background:`${renk}11`,border:`0.5px solid ${renk}44`,color:renk}}>{l}</button>
                ))}
                <button disabled={paylasiyor} onClick={()=>paylas(seciliKayit,['facebook','instagram','twitter'])}
                  style={{fontSize:12,background:'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
                  <Ic n="send" size={11}/> Tümüne
                </button>
              </div>

              {pSonuc && <div style={{marginBottom:10,fontSize:12,color:'#00D4AA',padding:'6px 10px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',borderRadius:'var(--radius-sm)'}}>✓ Paylaşım tamamlandı!</div>}
              {hata   && <div style={{marginBottom:10,fontSize:12,color:'#ff7b7b',padding:'6px 10px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)'}}>{hata}</div>}

              <div style={{display:'flex',gap:6,marginTop:'1rem',paddingTop:'1rem',borderTop:'0.5px solid var(--border)'}}>
                <button onClick={()=>sil(seciliKayit.id,false)}
                  style={{fontSize:12,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                  <Ic n="trash" size={11}/> Kaydı Sil
                </button>
                {seciliKayit.durum==='yayinda'&&(
                  <button onClick={()=>sil(seciliKayit.id,true)}
                    style={{fontSize:12,background:'rgba(230,57,70,.15)',border:'0.5px solid rgba(230,57,70,.4)',color:'#ff7b7b'}}>
                    <Ic n="trash" size={11}/> Sosyal Medyadan da Sil
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Başlangıç */}
          {ekran==='liste' && !seciliKayit && !onayKayit && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:'var(--muted)'}}>
              <Ic n="radar" size={40} style={{opacity:0.2}}/>
              <div style={{fontSize:14}}>Soldan bir kayıt seçin veya yeni giriş yapın</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



// ── MANUEL HABER GİRİŞİ MODÜLÜ ───────────────────────────────────────────────
function ManuelHaberModul({ user, onGeri }) {
  const [ekran,      setEkran]    = useState('giris') // 'giris' | 'isleme' | 'sonuc'
  const [baslik,     setBaslik]   = useState('')
  const [metin,      setMetin]    = useState('')
  const [kategori,   setKategori] = useState('Güncel')
  const [medyalar,   setMedyalar] = useState([])
  const [yukleniyorM,setYukM]     = useState(false)
  const [isleniyor,  setIsleniyor]= useState(false)
  const [sonuc,      setSonuc]    = useState(null) // işlenmiş kayit
  const [hata,       setHata]     = useState(null)
  const [videoRenders,setVideoR]  = useState({})
  const fileRef = useRef(null)
  const token   = localStorage.getItem('cms_token') || ''

  const KATEGORILER = ['Güncel','Asayiş','Spor','Ekonomi','Sağlık','Eğitim','Siyaset','Kültür','Turizm','Belediye Haberleri']

  // Dosya yükle
  const dosyaSec = async (files) => {
    setYukM(true); setHata(null)
    const sid = `manuel_${Date.now()}`
    const yeni = []
    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader()
        await new Promise((res,rej) => {
          reader.onload = async (e) => {
            try {
              const b64  = e.target.result.split(',')[1]
              const tip  = file.type.startsWith('video') ? 'video' : 'gorsel'
              const r    = await fetch('/api/gorsel-yukle', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ data:b64, source_id:sid, format:`${tip}_${Date.now()}` }),
              })
              const d = await r.json()
              if (d.url) yeni.push({ url:d.url, tip, adi:file.name, mime:file.type })
              else setHata(`${file.name}: ${d.hata||'Yükleme hatası'}`)
              res()
            } catch(err) { setHata(err.message); res() }
          }
          reader.onerror = () => { setHata('Dosya okunamadı'); res() }
          reader.readAsDataURL(file)
        })
      } catch(e) { setHata(e.message) }
    }
    setMedyalar(p => [...p, ...yeni])
    setYukM(false)
  }

  // İşle
  const isle = async () => {
    if (!metin.trim() && !baslik.trim()) { setHata('Başlık veya metin girin'); return }
    setIsleniyor(true); setHata(null); setEkran('isleme')
    try {
      const ilkGorsel = medyalar.find(m=>m.tip==='gorsel')?.url || ''
      const ilkVideo  = medyalar.find(m=>m.tip==='video')?.url  || ''
      const res  = await fetch('/api/manuel-isle', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ baslik, metin, kategori, gorsel_url:ilkGorsel, video_url:ilkVideo, medyalar }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setSonuc(data.kayit)
      // Video render takibi
      if (data.kayit.creatomate?.length) {
        const rv = {}
        for (const r of data.kayit.creatomate) rv[r.format] = { render_id:r.render_id, status:r.status, url:null }
        setVideoR(rv)
        const interval = setInterval(async () => {
          let tamam = true
          for (const r of data.kayit.creatomate) {
            if (videoRenders[r.format]?.status === 'succeeded') continue
            try {
              const vr = await fetch(`/api/video-durum?render_id=${r.render_id}`).then(x=>x.json())
              if (vr.status === 'succeeded') setVideoR(p=>({...p,[r.format]:{...p[r.format],status:'succeeded',url:vr.url}}))
              else if (vr.status === 'failed') setVideoR(p=>({...p,[r.format]:{...p[r.format],status:'failed'}}))
              else tamam = false
            } catch(e) { tamam = false }
          }
          if (tamam) clearInterval(interval)
        }, 3000)
        setTimeout(()=>clearInterval(interval), 5*60*1000)
      }
      setEkran('sonuc')
    } catch(e) { setHata(e.message); setEkran('giris') }
    setIsleniyor(false)
  }

  const sifirla = () => {
    setBaslik(''); setMetin(''); setMedyalar([]); setSonuc(null)
    setHata(null); setVideoR({}); setEkran('giris')
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:8,background:'var(--surface)',flexShrink:0}}>
        <button onClick={onGeri} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="arrow-left" size={11}/> Menü
        </button>
        <div style={{width:1,height:16,background:'var(--border)'}}/>
        <Ic n="pencil" size={15} style={{color:'#4488FF'}}/>
        <div style={{fontSize:14,fontWeight:600}}>Manuel Haber Girişi</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {ekran!=='giris' && (
            <button onClick={sifirla} style={{fontSize:12,background:'rgba(68,136,255,.12)',border:'0.5px solid rgba(68,136,255,.3)',color:'#4488FF'}}>
              <Ic n="plus" size={12}/> Yeni Haber
            </button>
          )}
        </div>
      </div>

      {hata && (
        <div style={{padding:'8px 1rem',background:'rgba(230,57,70,.08)',borderBottom:'0.5px solid rgba(230,57,70,.2)',fontSize:12,color:'#ff7b7b',display:'flex',justifyContent:'space-between'}}>
          {hata} <span style={{cursor:'pointer'}} onClick={()=>setHata(null)}>×</span>
        </div>
      )}

      <div style={{flex:1,overflow:'hidden',display:'flex'}}>

        {/* ── GİRİŞ EKRANI ── */}
        {(ekran==='giris'||ekran==='isleme') && (
          <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>
            <div style={{maxWidth:700}}>

              {/* Kategori */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Kategori</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {KATEGORILER.map(k=>(
                    <button key={k} onClick={()=>setKategori(k)}
                      style={{fontSize:11,padding:'4px 10px',
                        background:kategori===k?'rgba(68,136,255,.15)':'transparent',
                        border:`0.5px solid ${kategori===k?'rgba(68,136,255,.4)':'var(--border)'}`,
                        color:kategori===k?'#4488FF':'var(--muted)',fontWeight:kategori===k?600:400}}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Başlık */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Başlık</div>
                <input value={baslik} onChange={e=>setBaslik(e.target.value)}
                  placeholder="Haber başlığı..." style={{width:'100%',fontSize:14,boxSizing:'border-box'}}/>
              </div>

              {/* Metin */}
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Haber Metni</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{metin.length} karakter</div>
                </div>
                <textarea value={metin} onChange={e=>setMetin(e.target.value)} rows={10}
                  placeholder="Haber metnini buraya yazın veya yapıştırın..."
                  style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
              </div>

              {/* Medya yükleme */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Görsel / Video</div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:'none'}}
                  onChange={e=>dosyaSec(e.target.files)}/>
                <div onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();dosyaSec(e.dataTransfer.files)}}
                  style={{border:'1px dashed var(--border)',borderRadius:'var(--radius-md)',padding:'1rem',textAlign:'center',cursor:'pointer',background:'var(--surface)',marginBottom:8}}>
                  {yukleniyorM
                    ? <span style={{fontSize:12,color:'var(--muted)'}}>Yükleniyor…</span>
                    : <span style={{fontSize:12,color:'var(--muted)'}}>📎 Görsel veya video seç / sürükle bırak</span>
                  }
                </div>
                {medyalar.length > 0 && (
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {medyalar.map((m,i)=>(
                      <div key={i} style={{position:'relative'}}>
                        {m.tip==='gorsel'
                          ? <img src={m.url} alt="" style={{width:80,height:60,objectFit:'cover',borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                          : <div style={{width:80,height:60,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Ic n="player-play" size={18} style={{color:'#ff7b7b'}}/>
                            </div>
                        }
                        <div style={{fontSize:9,color:'var(--muted)',textAlign:'center',marginTop:2,width:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.adi}</div>
                        <button onClick={()=>setMedyalar(p=>p.filter((_,j)=>j!==i))}
                          style={{position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:'50%',background:'#E63946',border:'none',color:'#fff',fontSize:9,cursor:'pointer',padding:0}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={isle} disabled={isleniyor||(!metin.trim()&&!baslik.trim())}
                style={{fontSize:13,fontWeight:600,background:'rgba(68,136,255,.15)',border:'0.5px solid rgba(68,136,255,.4)',color:'#4488FF'}}>
                <Ic n={isleniyor?'loader-2':'bolt'} size={14}/> {isleniyor?'Claude işliyor…':'Haberi İşle (Claude + Ahrefs)'}
              </button>

              {isleniyor && (
                <div style={{marginTop:10,padding:'10px 14px',background:'rgba(68,136,255,.06)',border:'0.5px solid rgba(68,136,255,.2)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:13,color:'#4488FF',fontWeight:500,marginBottom:3}}>SEO paketi hazırlanıyor…</div>
                  <div style={{fontSize:12,color:'rgba(68,136,255,.7)'}}>Başlık · Meta · Slug · İçerik · Sosyal medya metinleri</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SONUÇ & PAYLAŞIM — kayserim.net Isleme bileşenini kullan ── */}
        {ekran==='sonuc' && sonuc && (
          <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <Isleme
              content={{
                ...sonuc,
                site_basligi:     sonuc.site_basligi     || sonuc.baslik || '',
                h1_basligi:       sonuc.h1_basligi        || sonuc.baslik || '',
                meta_description: sonuc.meta_description  || '',
                url_slug:         sonuc.url_slug           || sonuc.source_id || '',
                optimize_icerik:  sonuc.optimize_icerik   || sonuc.icerik || '',
                ozet:             sonuc.ozet               || '',
                sosyal_baslik:    sonuc.sosyal_baslik      || '',
                instagram:        sonuc.instagram          || '',
                facebook:         sonuc.facebook           || '',
                x_twitter:        sonuc.x_twitter          || '',
                youtube_baslik:   sonuc.youtube_baslik     || '',
                youtube_aciklama: sonuc.youtube_aciklama   || '',
              }}
              processing={false}
              error={null}
              selectedHaber={{
                ...sonuc,
                gorsel:     sonuc.gorsel_url || sonuc.gorsel || '',
                gorsel_url: sonuc.gorsel_url || sonuc.gorsel || '',
                video:      sonuc.video_url  || sonuc.video  || '',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── REKLAM MODÜLÜ ─────────────────────────────────────────────────────────────
function ReklamModul({ user, onGeri }) {
  const [ekran,       setEkran]     = useState('firmalar') // firmalar | firma_detay | kampanya_detay
  const [firmalar,    setFirmalar]  = useState([])
  const [seciliFirma, setFirma]     = useState(null)
  const [seciliKamp,  setKamp]      = useState(null)
  const [hata,        setHata]      = useState(null)
  const [yukleniyor,  setYuk]       = useState(false)

  // Firma formu
  const [firmaForm,   setFirmaForm] = useState({ ad:'', sektor:'', notlar:'', fb_page_ids:[], ig_ids:[] })
  const [firmaModal,  setFirmaModal]= useState(false)
  const [firmaDuzModal, setFirmaDuzModal] = useState(false)
  const [firmaDuzForm,  setFirmaDuzForm]  = useState(null)

  // Kampanya formu
  const [kampForm,    setKampForm]  = useState({ ad:'', baslangic:'', bitis:'', notlar:'' })
  const [kampModal,   setKampModal] = useState(false)
  const [kampDuzModal, setKampDuzModal] = useState(false)
  const [kampDuzForm,  setKampDuzForm]  = useState(null)

  // Gönderi formu
  const [gonForm,     setGonForm]   = useState({ alt_metin:'', etiketler:'', medya_url:'', medya_tip:'gorsel', gonderi_tipi:'gonderi', story_etiket:'', story_link:'' })
  const [gonModal,    setGonModal]  = useState(false)
  const [gonYuk,      setGonYuk]    = useState(false)
  const [hesaplar,    setHesaplar]  = useState({ facebook:[], instagram:[] })
  const [paylasimSonuc, setPaylasimSonuc] = useState(null) // { gonderi_id, ok, mesaj }

  // Paylaşım
  const [paylasiyor,  setPaylasiyor]= useState(false)
  const [uyari,       setUyari]     = useState(null) // { mesaj, tip, payload }
  const gonFileRef = useRef(null)
  const token = localStorage.getItem('cms_token') || ''

  const firmalariYukle = async () => {
    setYuk(true)
    try {
      const res  = await fetch('/api/reklam-firma', { headers:{ 'X-Token':token } })
      const data = await res.json()
      setFirmalar(Array.isArray(data) ? data : [])
    } catch(e) { setHata(e.message) }
    setYuk(false)
  }

  const firmaYukle = async (id) => {
    try {
      const res  = await fetch(`/api/reklam-firma?id=${id}`, { headers:{ 'X-Token':token } })
      const data = await res.json()
      setFirma(data)
      return data
    } catch(e) { setHata(e.message) }
  }

  const hesaplariYukle = async () => {
    try {
      const res  = await fetch('/api/hesaplar')
      const data = await res.json()
      setHesaplar(data)
    } catch(e) {}
  }

  useEffect(() => { firmalariYukle(); hesaplariYukle() }, [])

  // Kampanya süresi doldu mu?
  const kampanyaBitti = (k) => k.bitis && new Date(k.bitis) < new Date()

  // Aktif kampanyalar (bitmemiş)
  const aktifKampanyalar = (firma) => (firma?.kampanyalar||[]).filter(k=>!kampanyaBitti(k))

  // Son paylaşım etiketi
  const sonPaylasimEtiketi = (tarih) => {
    if (!tarih) return null
    const fark = Date.now() - new Date(tarih).getTime()
    const saat = Math.floor(fark/(1000*60*60))
    const dk   = Math.floor(fark/(1000*60))
    if (dk < 60) return `${dk} dk önce yayınlandı`
    return `${saat} saat önce yayınlandı`
  }

  // Firma ekle
  const firmaEkle = async () => {
    if (!firmaForm.ad.trim()) { setHata('Firma adı zorunlu'); return }
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'firma_ekle', ...firmaForm }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setFirmaModal(false); setFirmaForm({ ad:'', sektor:'', notlar:'', fb_page_ids:[], ig_ids:[] })
      firmalariYukle()
    } catch(e) { setHata(e.message) }
  }

  // Firma düzenle
  const firmaDuz = async () => {
    if (!firmaDuzForm?.ad?.trim()) return
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'firma_guncelle', id: firmaDuzForm.id, ad: firmaDuzForm.ad, sektor: firmaDuzForm.sektor, notlar: firmaDuzForm.notlar, fb_page_ids: firmaDuzForm.fb_page_ids, ig_ids: firmaDuzForm.ig_ids }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setFirmaDuzModal(false)
      const f = await firmaYukle(firmaDuzForm.id)
      setFirma(f)
      firmalariYukle()
    } catch(e) { setHata(e.message) }
  }

  // Firma sil
  const firmaSil = async (id) => {
    if (!confirm('Bu firmayı silmek istediğinizden emin misiniz? Tüm kampanya kayıtları silinecek.')) return
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'firma_sil', id }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setEkran('firmalar'); setFirma(null)
      firmalariYukle()
    } catch(e) { setHata(e.message) }
  }

  // Kampanya düzenle
  const kampDuz = async () => {
    if (!kampDuzForm?.ad?.trim()) return
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'kampanya_guncelle', firma_id: seciliFirma.id, kampanya_id: kampDuzForm.id, ad: kampDuzForm.ad, baslangic: kampDuzForm.baslangic, bitis: kampDuzForm.bitis, notlar: kampDuzForm.notlar }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setKampDuzModal(false)
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f)
      setKamp(f.kampanyalar?.find(k=>k.id===kampDuzForm.id))
    } catch(e) { setHata(e.message) }
  }

  // Kampanya sil
  const kampSil = async (kampanya_id) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'kampanya_sil', firma_id: seciliFirma.id, kampanya_id }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setEkran('firma_detay'); setKamp(null)
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f)
    } catch(e) { setHata(e.message) }
  }

  // Kampanya ekle
  const kampanyaEkle = async () => {
    if (!kampForm.ad.trim()) { setHata('Kampanya adı zorunlu'); return }
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'kampanya_ekle', firma_id: seciliFirma.id, ...kampForm }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setKampModal(false); setKampForm({ ad:'', baslangic:'', bitis:'', notlar:'' })
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f)
    } catch(e) { setHata(e.message) }
  }

  // Gönderi görsel yükle
  const gonselYukle = async (file) => {
    setGonYuk(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]
        const tip    = file.type.startsWith('video') ? 'video' : 'gorsel'
        const res    = await fetch('/api/gorsel-yukle', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ data: base64, source_id: `reklam_${Date.now()}`, format: `${tip}_${Date.now()}` }),
        })
        const data = await res.json()
        if (data.url) setGonForm(p=>({ ...p, medya_url: data.url, medya_tip: tip }))
        else setHata(data.hata||'Yükleme hatası')
        setGonYuk(false)
      }
      reader.readAsDataURL(file)
    } catch(e) { setHata(e.message); setGonYuk(false) }
  }

  // Gönderi ekle
  const gonderiEkle = async () => {
    if (!gonForm.medya_url) { setHata('Görsel/video yükleyin'); return }
    try {
      const etiketler = gonForm.etiketler.split(',').map(e=>e.trim()).filter(Boolean)
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({
          islem:'gonderi_ekle', firma_id: seciliFirma.id, kampanya_id: seciliKamp.id,
          medya_url: gonForm.medya_url, medya_tip: gonForm.medya_tip,
          alt_metin: gonForm.alt_metin, etiketler,
          gonderi_tipi: gonForm.gonderi_tipi || 'gonderi',
          story_etiket: gonForm.story_etiket || '',
          story_link:   gonForm.story_link   || '',
          fb_page_ids: seciliFirma.fb_page_ids || [], ig_ids: seciliFirma.ig_ids || [],
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      setGonModal(false); setGonForm({ alt_metin:'', etiketler:'', medya_url:'', medya_tip:'gorsel', gonderi_tipi:'gonderi' })
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f); setKamp(f.kampanyalar?.find(k=>k.id===seciliKamp.id))
    } catch(e) { setHata(e.message) }
  }

  // Gönderi sil (kaydı koru, görsel sil)
  const gonderiSil = async (gonderi_id) => {
    if (!confirm('Gönderi görseli silinecek, paylaşım kayıtları korunacak. Devam?')) return
    try {
      const res  = await fetch('/api/reklam-firma', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({ islem:'gonderi_sil', firma_id: seciliFirma.id, kampanya_id: seciliKamp.id, gonderi_id }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f); setKamp(f.kampanyalar?.find(k=>k.id===seciliKamp.id))
    } catch(e) { setHata(e.message) }
  }

  // Son paylaşımı sil
  const sonPaylasimSil = async (gonderi) => {
    if (!confirm('Son paylaşımı sosyal medyadan silmek istediğinizden emin misiniz?')) return
    const sonP = gonderi.paylasimlar?.[gonderi.paylasimlar.length-1]
    if (!sonP) { setHata('Silinecek paylaşım bulunamadı'); return }
    setPaylasiyor(true)
    const API_KEY = (import.meta.env?.VITE_RSS_API_KEY || 'cmp6vldho000210g6tt26pvc5')
    const sonuclar = []
    try {
      // FB post id'leri — yeni kayıt formatı
      const postIdler = sonP.post_idler || {}
      for (const [key, postId] of Object.entries(postIdler)) {
        if (!postId) continue
        if (key.startsWith('fb_')) {
          const pageId = key.replace('fb_','')
          const res = await fetch('/api/paylas-sil', {
            method:'POST', headers:{'Content-Type':'application/json','X-API-Key':API_KEY},
            body: JSON.stringify({ platform:'facebook', post_id: postId, page_id: pageId }),
          })
          const d = await res.json().catch(()=>({}))
          sonuclar.push({ platform:'FB', ok: d.ok, hata: d.hata })
        } else if (key.startsWith('ig_')) {
          const res = await fetch('/api/paylas-sil', {
            method:'POST', headers:{'Content-Type':'application/json','X-API-Key':API_KEY},
            body: JSON.stringify({ platform:'instagram', post_id: postId }),
          })
          const d = await res.json().catch(()=>({}))
          sonuclar.push({ platform:'IG', ok: d.ok, log_silindi: d.log_silindi, hata: d.hata, post_url: d.post_url })
        }
      }

      // Eski kayıt formatı — meta.facebook/instagram içinden al
      if (Object.keys(postIdler).length === 0) {
        const fbSonuclar = sonP.sonuclar?.meta?.facebook || {}
        for (const [pid, s] of Object.entries(fbSonuclar)) {
          if (s?.post_id) {
            const res = await fetch('/api/paylas-sil', {
              method:'POST', headers:{'Content-Type':'application/json','X-API-Key':API_KEY},
              body: JSON.stringify({ platform:'facebook', post_id: s.post_id, page_id: pid }),
            })
            const d = await res.json().catch(()=>({}))
            sonuclar.push({ platform:'FB', ok: d.ok, hata: d.hata })
          }
        }
        const igSonuclar = sonP.sonuclar?.meta?.instagram || {}
        for (const [, s] of Object.entries(igSonuclar)) {
          if (s?.post_id) {
            const res = await fetch('/api/paylas-sil', {
              method:'POST', headers:{'Content-Type':'application/json','X-API-Key':API_KEY},
              body: JSON.stringify({ platform:'instagram', post_id: s.post_id }),
            })
            const d = await res.json().catch(()=>({}))
            sonuclar.push({ platform:'IG', ok: d.ok, hata: d.hata, post_url: d.post_url })
          }
        }
      }

      // Sonuç mesajı oluştur
      const basarililar = sonuclar.filter(s=>s.ok).map(s=>s.platform)
      const hatalar     = sonuclar.filter(s=>!s.ok)
      const igManuel    = sonuclar.find(s=>s.platform==='IG'&&s.post_url)

      let mesaj = ''
      if (basarililar.length) mesaj += `✓ ${basarililar.join(', ')} silindi. `
      if (igManuel) mesaj += `IG manuel silinmeli → ${igManuel.post_url}`
      if (!sonuclar.length) mesaj = 'Silinecek post ID bulunamadı — eski paylaşım olabilir'

      setPaylasimSonuc({ gonderi_id: gonderi.id, ok: true, mesaj: mesaj || '✓ İşlem tamamlandı' })
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f); setKamp(f.kampanyalar?.find(k=>k.id===seciliKamp.id))
    } catch(e) { setHata(e.message) }
    setPaylasiyor(false)
  }

  // Paylaş
  const paylas = async (gonderi, platformlar, story=false, zorla=false) => {
    setPaylasiyor(true); setHata(null); setUyari(null); setPaylasimSonuc(null)
    try {
      const endpoint = zorla ? 'PUT' : 'POST'
      const res  = await fetch('/api/reklam-paylas', {
        method: endpoint,
        headers: { 'Content-Type':'application/json', 'X-Token':token },
        body: JSON.stringify({
          firma_id: seciliFirma.id, kampanya_id: seciliKamp.id,
          gonderi_id: gonderi.id, platformlar, story,
          fb_page_ids: gonderi.fb_page_ids||seciliFirma.fb_page_ids||[],
          ig_ids: gonderi.ig_ids||seciliFirma.ig_ids||[],
        }),
      })
      const data = await res.json()
      if (data.uyari || data.firma_uyari) {
        setUyari({ mesaj: data.mesaj, payload: { gonderi, platformlar, story } })
        setPaylasiyor(false); return
      }
      if (data.hata) throw new Error(data.hata)
      setPaylasimSonuc({ gonderi_id: gonderi.id, ok: true, mesaj: `✓ ${story?'Story':'Gönderi'} paylaşıldı!` })
      const f = await firmaYukle(seciliFirma.id)
      setFirma(f); setKamp(f.kampanyalar?.find(k=>k.id===seciliKamp.id))
    } catch(e) { setHata(e.message) }
    setPaylasiyor(false)
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:8,background:'var(--surface)',flexShrink:0}}>
        <button onClick={onGeri} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="arrow-left" size={11}/> Menü
        </button>
        <div style={{width:1,height:16,background:'var(--border)'}}/>
        <Ic n="speakerphone" size={15} style={{color:'#FFB700'}}/>
        <div style={{fontSize:14,fontWeight:600}}>Reklam Yönetimi</div>
        {ekran!=='firmalar' && (
          <button onClick={()=>{setEkran('firmalar');setFirma(null);setKamp(null)}}
            style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
            ← Firmalar
          </button>
        )}
        {ekran==='firma_detay' && seciliFirma && (
          <span style={{fontSize:12,color:'var(--muted)'}}>{seciliFirma.ad}</span>
        )}
        {ekran==='kampanya_detay' && seciliKamp && (
          <>
            <button onClick={()=>{setEkran('firma_detay');setKamp(null)}}
              style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
              ← {seciliFirma?.ad}
            </button>
            <span style={{fontSize:12,color:'var(--muted)'}}>{seciliKamp.ad}</span>
          </>
        )}
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {ekran==='firmalar' && (
            <button onClick={()=>setFirmaModal(true)}
              style={{fontSize:12,background:'rgba(255,183,0,.12)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>
              <Ic n="plus" size={12}/> Firma Ekle
            </button>
          )}
          {ekran==='firma_detay' && (
            <button onClick={()=>setKampModal(true)}
              style={{fontSize:12,background:'rgba(255,183,0,.12)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>
              <Ic n="plus" size={12}/> Kampanya Ekle
            </button>
          )}
          {ekran==='kampanya_detay' && (
            <button onClick={()=>setGonModal(true)}
              style={{fontSize:12,background:'rgba(255,183,0,.12)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>
              <Ic n="plus" size={12}/> Gönderi Ekle
            </button>
          )}
        </div>
      </div>

      {/* Hata */}
      {hata && (
        <div style={{padding:'8px 1rem',background:'rgba(230,57,70,.08)',borderBottom:'0.5px solid rgba(230,57,70,.2)',fontSize:12,color:'#ff7b7b',display:'flex',justifyContent:'space-between'}}>
          {hata} <span style={{cursor:'pointer'}} onClick={()=>setHata(null)}>×</span>
        </div>
      )}

      {/* Uyarı modal */}
      {uyari && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',maxWidth:400,width:'90%'}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>⚠ Uyarı</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:'1rem'}}>{uyari.mesaj}</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>paylas(uyari.payload.gonderi,uyari.payload.platformlar,true)}
                style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.4)',color:'#FFB700'}}>
                Evet, Paylaş
              </button>
              <button onClick={()=>setUyari(null)}
                style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

        {/* ── FİRMALAR LİSTESİ ── */}
        {ekran==='firmalar' && (
          <div style={{maxWidth:800}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
              {firmalar.map(f=>(
                <div key={f.id} onClick={async()=>{ const d=await firmaYukle(f.id); setFirma(d); setEkran('firma_detay') }}
                  style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem',cursor:'pointer',transition:'border-color .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,183,0,.4)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:36,height:36,background:'rgba(255,183,0,.1)',border:'0.5px solid rgba(255,183,0,.3)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Ic n="building-store" size={18} style={{color:'#FFB700'}}/>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{f.ad}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{f.sektor||'—'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                    <span style={{fontSize:11,color:'var(--muted)',flex:1}}>{f.aktif_kampanya||0} aktif kampanya</span>
                    <button onClick={e=>{e.stopPropagation();setFirmaDuzForm({...f,fb_page_ids:f.fb_page_ids||[],ig_ids:f.ig_ids||[]});setFirmaDuzModal(true)}}
                      style={{fontSize:10,padding:'2px 7px',background:'transparent',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
                      <Ic n="edit" size={10}/> Düzenle
                    </button>
                    {user?.rol==='admin'&&<button onClick={e=>{e.stopPropagation();firmaSil(f.id)}}
                      style={{fontSize:10,padding:'2px 7px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.2)',color:'#ff7b7b'}}>
                      <Ic n="trash" size={10}/>
                    </button>}
                  </div>
                </div>
              ))}
              {firmalar.length===0 && !yukleniyor && (
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'3rem',color:'var(--muted)',fontSize:13}}>
                  Henüz firma yok — Firma Ekle butonuyla başlayın
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FİRMA DETAY ── */}
        {ekran==='firma_detay' && seciliFirma && (
          <div style={{maxWidth:800}}>
            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>
                {seciliFirma.sektor||''} · Oluşturuldu: {new Date(seciliFirma.olusturuldu).toLocaleDateString('tr-TR')}
              </div>
              {seciliFirma.notlar && <div style={{fontSize:12,color:'var(--muted)',padding:'6px 10px',background:'var(--surface)',borderRadius:'var(--radius-sm)'}}>{seciliFirma.notlar}</div>}
            </div>

            <div style={{fontSize:12,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Kampanyalar</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(seciliFirma.kampanyalar||[]).map(k=>{
                const bitti = kampanyaBitti(k)
                if (bitti) return null // Süresi dolan kampanyaları gizle
                return (
                  <div key={k.id} onClick={()=>{ setKamp(k); setEkran('kampanya_detay') }}
                    style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'12px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{k.ad}</div>
                      <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:10}}>
                        {k.baslangic && <span>Başlangıç: {new Date(k.baslangic).toLocaleDateString('tr-TR')}</span>}
                        {k.bitis     && <span>Bitiş: {new Date(k.bitis).toLocaleDateString('tr-TR')}</span>}
                        <span>{(k.gonderiler||[]).length} gönderi</span>
                      </div>
                    </div>
                    {k.son_paylasim && (
                      <span style={{fontSize:10,color:'#00D4AA'}}>{sonPaylasimEtiketi(k.son_paylasim)}</span>
                    )}
                    <button onClick={e=>{e.stopPropagation();setKampDuzForm({...k});setKampDuzModal(true)}}
                      style={{fontSize:10,padding:'3px 8px',background:'transparent',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
                      <Ic n="edit" size={10}/> Düzenle
                    </button>
                    {user?.rol==='admin'&&<button onClick={e=>{e.stopPropagation();kampSil(k.id)}}
                      style={{fontSize:10,padding:'3px 8px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.2)',color:'#ff7b7b'}}>
                      <Ic n="trash" size={10}/>
                    </button>}
                    <Ic n="chevron-right" size={14} style={{color:'var(--muted)'}}/>
                  </div>
                )
              })}
              {(seciliFirma.kampanyalar||[]).filter(k=>!kampanyaBitti(k)).length===0 && (
                <div style={{textAlign:'center',padding:'2rem',color:'var(--muted)',fontSize:13}}>Aktif kampanya yok</div>
              )}
            </div>
          </div>
        )}

        {/* ── KAMPANYA DETAY ── */}
        {ekran==='kampanya_detay' && seciliKamp && seciliFirma && (
          <div style={{maxWidth:900}}>
            {seciliKamp.notlar && (
              <div style={{fontSize:12,color:'var(--muted)',padding:'6px 10px',background:'var(--surface)',borderRadius:'var(--radius-sm)',marginBottom:'1rem'}}>{seciliKamp.notlar}</div>
            )}

            {/* Paylaşım sonuç bandı */}
            {paylasimSonuc && (
              <div style={{marginBottom:'1rem',padding:'8px 14px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'#00D4AA'}}>{paylasimSonuc.mesaj}</span>
                <button onClick={()=>setPaylasimSonuc(null)} style={{fontSize:11,background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer'}}>×</button>
              </div>
            )}

            {/* Gönderi listesi */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
              {(seciliKamp.gonderiler||[]).map(g=>{
                const aktifSonuc = paylasimSonuc?.gonderi_id === g.id
                const gonTipi = g.gonderi_tipi || 'gonderi'
                return (
                <div key={g.id} style={{background:'var(--surface)',border:`0.5px solid ${aktifSonuc?'rgba(0,212,170,.4)':'var(--border)'}`,borderRadius:'var(--radius-md)',overflow:'hidden'}}>
                  {/* Tip etiketi */}
                  <div style={{padding:'4px 8px',background: gonTipi==='story'?'rgba(225,48,108,.1)':'rgba(77,171,247,.1)',display:'flex',alignItems:'center',gap:5}}>
                    <Ic n={gonTipi==='story'?'circles':'layout-grid'} size={11} style={{color:gonTipi==='story'?'#E1306C':'#4dabf7'}}/>
                    <span style={{fontSize:10,fontWeight:600,color:gonTipi==='story'?'#E1306C':'#4dabf7'}}>{gonTipi==='story'?'STORY':'GÖNDERİ'}</span>
                  </div>

                  {/* Medya */}
                  {g.medya_tip==='gorsel'
                    ? <img src={g.medya_url} alt="" style={{width:'100%',height:120,objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
                    : <div style={{width:'100%',height:120,background:'rgba(230,57,70,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Ic n="player-play" size={24} style={{color:'#ff7b7b'}}/>
                      </div>
                  }

                  <div style={{padding:'8px 10px'}}>
                    {g.alt_metin && <div style={{fontSize:11,color:'var(--muted)',marginBottom:5,lineHeight:1.4}}>{g.alt_metin.slice(0,70)}{g.alt_metin.length>70?'…':''}</div>}

                    {/* Son paylaşım */}
                    {g.son_paylasim && (
                      <div style={{fontSize:10,color:'#00D4AA',marginBottom:5,display:'flex',alignItems:'center',gap:4}}>
                        <Ic n="check" size={10}/> {sonPaylasimEtiketi(g.son_paylasim)}
                      </div>
                    )}

                    {/* Paylaşım butonları */}
                    <div style={{marginBottom:5}}>
                      <div style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>{gonTipi==='story'?'Story Paylaş':'Paylaş'}</div>
                      {gonTipi==='story' ? (
                        <div style={{display:'flex',flexDirection:'column',gap:3}}>
                          {/* Story — FB normal paylaş */}
                          <button disabled={paylasiyor} onClick={()=>paylas(g,['facebook'],true)}
                            style={{fontSize:10,padding:'3px 8px',background:'rgba(77,171,247,.1)',border:'0.5px solid rgba(77,171,247,.3)',color:'#4dabf7'}}>
                            FB Story
                          </button>
                          {/* Story — IG indir+kopyala+aç */}
                          <button disabled={paylasiyor} onClick={async()=>{
                            // 1) Görseli indir
                            try {
                              const a = document.createElement('a')
                              a.href = g.medya_url
                              a.download = 'story.jpg'
                              a.click()
                            } catch(e) {}
                            // 2) Etiket veya link panoya kopyala
                            const kopyaMetin = g.story_etiket || g.story_link || ''
                            if (kopyaMetin) {
                              try { await navigator.clipboard.writeText(kopyaMetin) } catch(e) {}
                            }
                            // 3) Kısa gecikme sonra Instagram aç
                            setTimeout(()=>{
                              window.location.href = 'instagram://'
                            }, 800)
                            setPaylasimSonuc({ gonderi_id: g.id, ok: true, mesaj: `✓ Görsel indirildi${kopyaMetin?' — '+kopyaMetin+' kopyalandı':''}, Instagram açılıyor…` })
                          }}
                            style={{fontSize:10,padding:'3px 8px',background:'rgba(225,48,108,.1)',border:'0.5px solid rgba(225,48,108,.3)',color:'#E1306C'}}>
                            <Ic n="download" size={10}/> IG İndir & Aç
                          </button>
                        </div>
                      ) : (
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          <button disabled={paylasiyor} onClick={()=>paylas(g,['facebook'],false)}
                            style={{fontSize:10,padding:'3px 8px',background:'rgba(77,171,247,.1)',border:'0.5px solid rgba(77,171,247,.3)',color:'#4dabf7'}}>
                            FB
                          </button>
                          <button disabled={paylasiyor} onClick={()=>paylas(g,['instagram'],false)}
                            style={{fontSize:10,padding:'3px 8px',background:'rgba(225,48,108,.1)',border:'0.5px solid rgba(225,48,108,.3)',color:'#E1306C'}}>
                            IG
                          </button>
                          <button disabled={paylasiyor} onClick={()=>paylas(g,['facebook','instagram'],false)}
                            style={{fontSize:10,padding:'3px 8px',background:'rgba(0,212,170,.1)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
                            <Ic n="send" size={10}/> İkisi
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Son paylaşımı sil */}
                    {g.paylasimlar?.length > 0 && (
                      <button disabled={paylasiyor} onClick={()=>sonPaylasimSil(g)}
                        style={{fontSize:10,padding:'3px 8px',background:'rgba(230,57,70,.06)',border:'0.5px solid rgba(230,57,70,.2)',color:'rgba(230,57,70,.7)',width:'100%',marginBottom:4}}>
                        <Ic n="rotate-ccw" size={10}/> Son paylaşımı sil
                      </button>
                    )}

                    {/* Görseli sil */}
                    <button onClick={()=>gonderiSil(g.id)}
                      style={{fontSize:10,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)',width:'100%'}}>
                      <Ic n="trash" size={10}/> Görseli Sil
                    </button>
                  </div>
                </div>
              )})}
              {(seciliKamp.gonderiler||[]).length===0 && (
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'var(--muted)',fontSize:13}}>
                  Gönderi yok — Gönderi Ekle butonuyla ekleyin
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── FİRMA MODAL ── */}
      {firmaModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',width:420,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>Yeni Firma</div>

            {/* Temel bilgiler */}
            {[['ad','Firma Adı *'],['sektor','Sektör'],['notlar','Notlar']].map(([k,l])=>(
              <div key={k} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{l}</div>
                {k==='notlar'
                  ? <textarea value={firmaForm[k]} onChange={e=>setFirmaForm(p=>({...p,[k]:e.target.value}))} rows={2} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  : <input value={firmaForm[k]} onChange={e=>setFirmaForm(p=>({...p,[k]:e.target.value}))} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                }
              </div>
            ))}

            {/* Facebook sayfaları */}
            {hesaplar.facebook?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Facebook Sayfaları</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto',padding:'4px 0'}}>
                  {hesaplar.facebook.map(h=>(
                    <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',
                      padding:'6px 8px',borderRadius:'var(--radius-sm)',
                      background:firmaForm.fb_page_ids.includes(h.page_id)?'rgba(77,171,247,.08)':'transparent',
                      border:`0.5px solid ${firmaForm.fb_page_ids.includes(h.page_id)?'rgba(77,171,247,.3)':'var(--border)'}`}}>
                      <input type="checkbox"
                        checked={firmaForm.fb_page_ids.includes(h.page_id)}
                        onChange={e=>setFirmaForm(p=>({...p,
                          fb_page_ids: e.target.checked
                            ? [...p.fb_page_ids, h.page_id]
                            : p.fb_page_ids.filter(i=>i!==h.page_id)
                        }))}
                        style={{width:14,height:14,cursor:'pointer'}}/>
                      <span style={{color:firmaForm.fb_page_ids.includes(h.page_id)?'#4dabf7':'var(--text)'}}>{h.page_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram hesapları */}
            {hesaplar.instagram?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Instagram Hesapları</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto',padding:'4px 0'}}>
                  {hesaplar.instagram.map(h=>(
                    <label key={h.ig_id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',
                      padding:'6px 8px',borderRadius:'var(--radius-sm)',
                      background:firmaForm.ig_ids.includes(h.ig_id)?'rgba(225,48,108,.08)':'transparent',
                      border:`0.5px solid ${firmaForm.ig_ids.includes(h.ig_id)?'rgba(225,48,108,.3)':'var(--border)'}`}}>
                      <input type="checkbox"
                        checked={firmaForm.ig_ids.includes(h.ig_id)}
                        onChange={e=>setFirmaForm(p=>({...p,
                          ig_ids: e.target.checked
                            ? [...p.ig_ids, h.ig_id]
                            : p.ig_ids.filter(i=>i!==h.ig_id)
                        }))}
                        style={{width:14,height:14,cursor:'pointer'}}/>
                      <span style={{color:firmaForm.ig_ids.includes(h.ig_id)?'#E1306C':'var(--text)'}}>@{h.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:12,paddingTop:12,borderTop:'0.5px solid var(--border)'}}>
              <button onClick={firmaEkle} disabled={!firmaForm.ad.trim()}
                style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700',opacity:firmaForm.ad.trim()?1:0.5}}>
                Firma Ekle
              </button>
              <button onClick={()=>{ setFirmaModal(false); setFirmaForm({ ad:'', sektor:'', notlar:'', fb_page_ids:[], ig_ids:[] }) }}
                style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FİRMA DÜZENLEME MODAL ── */}
      {firmaDuzModal && firmaDuzForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',width:420,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>Firma Düzenle — {firmaDuzForm.ad}</div>
            {[['ad','Firma Adı *'],['sektor','Sektör'],['notlar','Notlar']].map(([k,l])=>(
              <div key={k} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{l}</div>
                {k==='notlar'
                  ? <textarea value={firmaDuzForm[k]||''} onChange={e=>setFirmaDuzForm(p=>({...p,[k]:e.target.value}))} rows={2} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  : <input value={firmaDuzForm[k]||''} onChange={e=>setFirmaDuzForm(p=>({...p,[k]:e.target.value}))} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                }
              </div>
            ))}
            {hesaplar.facebook?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Facebook Sayfaları</div>
                <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:160,overflowY:'auto'}}>
                  {hesaplar.facebook.map(h=>(
                    <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',
                      padding:'6px 8px',borderRadius:'var(--radius-sm)',
                      background:(firmaDuzForm.fb_page_ids||[]).includes(h.page_id)?'rgba(77,171,247,.08)':'transparent',
                      border:`0.5px solid ${(firmaDuzForm.fb_page_ids||[]).includes(h.page_id)?'rgba(77,171,247,.3)':'var(--border)'}`}}>
                      <input type="checkbox" style={{width:14,height:14,cursor:'pointer'}}
                        checked={(firmaDuzForm.fb_page_ids||[]).includes(h.page_id)}
                        onChange={e=>setFirmaDuzForm(p=>({...p, fb_page_ids: e.target.checked ? [...(p.fb_page_ids||[]),h.page_id] : (p.fb_page_ids||[]).filter(i=>i!==h.page_id)}))}/>
                      <span style={{color:(firmaDuzForm.fb_page_ids||[]).includes(h.page_id)?'#4dabf7':'var(--text)'}}>{h.page_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {hesaplar.instagram?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Instagram Hesapları</div>
                <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:160,overflowY:'auto'}}>
                  {hesaplar.instagram.map(h=>(
                    <label key={h.ig_id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',
                      padding:'6px 8px',borderRadius:'var(--radius-sm)',
                      background:(firmaDuzForm.ig_ids||[]).includes(h.ig_id)?'rgba(225,48,108,.08)':'transparent',
                      border:`0.5px solid ${(firmaDuzForm.ig_ids||[]).includes(h.ig_id)?'rgba(225,48,108,.3)':'var(--border)'}`}}>
                      <input type="checkbox" style={{width:14,height:14,cursor:'pointer'}}
                        checked={(firmaDuzForm.ig_ids||[]).includes(h.ig_id)}
                        onChange={e=>setFirmaDuzForm(p=>({...p, ig_ids: e.target.checked ? [...(p.ig_ids||[]),h.ig_id] : (p.ig_ids||[]).filter(i=>i!==h.ig_id)}))}/>
                      <span style={{color:(firmaDuzForm.ig_ids||[]).includes(h.ig_id)?'#E1306C':'var(--text)'}}>@{h.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:12,paddingTop:12,borderTop:'0.5px solid var(--border)'}}>
              <button onClick={firmaDuz} style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>Kaydet</button>
              <button onClick={()=>setFirmaDuzModal(false)} style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── KAMPANYA DÜZENLEME MODAL ── */}
      {kampDuzModal && kampDuzForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',width:380}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>Kampanya Düzenle</div>
            {[['ad','Kampanya Adı *'],['baslangic','Başlangıç Tarihi'],['bitis','Bitiş Tarihi'],['notlar','Notlar']].map(([k,l])=>(
              <div key={k} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{l}</div>
                {k==='notlar'
                  ? <textarea value={kampDuzForm[k]||''} onChange={e=>setKampDuzForm(p=>({...p,[k]:e.target.value}))} rows={2} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  : <input type={k==='baslangic'||k==='bitis'?'date':'text'} value={kampDuzForm[k]||''} onChange={e=>setKampDuzForm(p=>({...p,[k]:e.target.value}))} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                }
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={kampDuz} style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>Kaydet</button>
              <button onClick={()=>setKampDuzModal(false)} style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── KAMPANYA MODAL ── */}
      {kampModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',width:380}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>Yeni Kampanya — {seciliFirma?.ad}</div>
            {[['ad','Kampanya Adı *'],['baslangic','Başlangıç Tarihi'],['bitis','Bitiş Tarihi'],['notlar','Notlar']].map(([k,l])=>(
              <div key={k} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{l}</div>
                {k==='notlar'
                  ? <textarea value={kampForm[k]} onChange={e=>setKampForm(p=>({...p,[k]:e.target.value}))} rows={2} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  : <input type={k.includes('tarih')||k==='baslangic'||k==='bitis'?'date':'text'} value={kampForm[k]} onChange={e=>setKampForm(p=>({...p,[k]:e.target.value}))} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                }
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={kampanyaEkle} style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>Ekle</button>
              <button onClick={()=>setKampModal(false)} style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── GÖNDERİ MODAL ── */}
      {gonModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,overflowY:'auto'}}>
          <div style={{background:'var(--card)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',width:420,margin:'1rem auto'}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:'0.75rem'}}>Gönderi Ekle — {seciliKamp?.ad}</div>

            {/* Story / Gönderi seçimi */}
            <div style={{display:'flex',gap:6,marginBottom:'1rem'}}>
              {[['gonderi','Gönderi','layout-grid','#4dabf7'],['story','Story','circles','#E1306C']].map(([tip,label,ic,renk])=>(
                <button key={tip} onClick={()=>setGonForm(p=>({...p,gonderi_tipi:tip}))}
                  style={{flex:1,fontSize:12,padding:'7px',display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                    background:(gonForm.gonderi_tipi||'gonderi')===tip?`${renk}18`:'transparent',
                    border:`0.5px solid ${(gonForm.gonderi_tipi||'gonderi')===tip?renk:'var(--border)'}`,
                    color:(gonForm.gonderi_tipi||'gonderi')===tip?renk:'var(--muted)',
                    borderRadius:'var(--radius-sm)',fontWeight:(gonForm.gonderi_tipi||'gonderi')===tip?600:400}}>
                  <Ic n={ic} size={13}/> {label}
                </button>
              ))}
            </div>

            {/* Görsel yükle */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Görsel / Video *</div>
              <input ref={gonFileRef} type="file" accept="image/*,video/*" style={{display:'none'}}
                onChange={e=>e.target.files[0]&&gonselYukle(e.target.files[0])}/>
              <div onClick={()=>gonFileRef.current?.click()}
                style={{border:'1px dashed var(--border)',borderRadius:'var(--radius-md)',padding:'0.75rem',textAlign:'center',cursor:'pointer',marginBottom:6}}>
                {gonYuk ? 'Yükleniyor…' : '📎 Dosya seç'}
              </div>
              {gonForm.medya_url && (
                gonForm.medya_tip==='gorsel'
                  ? <img src={gonForm.medya_url} alt="" style={{width:'100%',maxHeight:120,objectFit:'cover',borderRadius:'var(--radius-sm)'}} onError={e=>e.target.style.display='none'}/>
                  : <div style={{padding:'8px',background:'rgba(230,57,70,.08)',borderRadius:'var(--radius-sm)',fontSize:12,color:'#ff7b7b'}}>✓ Video yüklendi</div>
              )}
            </div>

            {/* Alt metin — sadece gönderi tipinde */}
            {(gonForm.gonderi_tipi||'gonderi')==='gonderi' && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Alt Metin / Açıklama</div>
                <textarea value={gonForm.alt_metin} onChange={e=>setGonForm(p=>({...p,alt_metin:e.target.value}))} rows={3}
                  style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="Paylaşım metni..."/>
              </div>
            )}

            {/* Gönderi metni — sadece gönderi tipinde */}
            {(gonForm.gonderi_tipi||'gonderi')==='gonderi' && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Etiketlenecek Hesaplar (virgülle)</div>
                <input value={gonForm.etiketler} onChange={e=>setGonForm(p=>({...p,etiketler:e.target.value}))}
                  style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="@hesap1, @hesap2"/>
              </div>
            )}

            {/* Story — etiket ve link */}
            {(gonForm.gonderi_tipi||'gonderi')==='story' && (
              <div style={{marginBottom:10,padding:'10px 12px',background:'rgba(225,48,108,.05)',border:'0.5px solid rgba(225,48,108,.2)',borderRadius:'var(--radius-md)'}}>
                <div style={{fontSize:11,color:'#E1306C',marginBottom:8,fontWeight:600}}>Story Ayarları</div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Etiket (panoya kopyalanır)</div>
                  <input value={gonForm.story_etiket} onChange={e=>setGonForm(p=>({...p,story_etiket:e.target.value}))}
                    style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="@kayserimnet"/>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Link (panoya kopyalanır)</div>
                  <input value={gonForm.story_link} onChange={e=>setGonForm(p=>({...p,story_link:e.target.value}))}
                    style={{width:'100%',fontSize:12,boxSizing:'border-box'}} placeholder="https://kayserim.net/..."/>
                </div>
                <div style={{fontSize:10,color:'var(--muted)',marginTop:8,lineHeight:1.5}}>
                  Paylaş butonuna basınca görsel indirilir, etiket/link panoya kopyalanır ve Instagram açılır.
                </div>
              </div>
            )}

            {/* Hesaplar firmadan geliyor */}
            {seciliFirma && (
              <div style={{marginBottom:10,padding:'6px 10px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-sm)'}}>
                <div style={{fontSize:11,color:'#FFB700',marginBottom:3}}>Paylaşım Hesapları</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>
                  {seciliFirma.fb_page_ids?.length ? `FB: ${seciliFirma.fb_page_ids.length} sayfa` : ''}
                  {seciliFirma.fb_page_ids?.length && seciliFirma.ig_ids?.length ? ' · ' : ''}
                  {seciliFirma.ig_ids?.length ? `IG: ${seciliFirma.ig_ids.length} hesap` : ''}
                  {!seciliFirma.fb_page_ids?.length && !seciliFirma.ig_ids?.length ? 'Firma için hesap tanımlanmamış' : ''}
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={gonderiEkle} disabled={gonYuk||!gonForm.medya_url}
                style={{fontSize:13,background:'rgba(255,183,0,.15)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700'}}>Ekle</button>
              <button onClick={()=>setGonModal(false)} style={{fontSize:13,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ── YÖNETİM MODÜLÜ ───────────────────────────────────────────────────────────
function YonetimModul({ user, onGeri }) {
  const [sekme,      setSekme]    = useState('log')
  const [log,        setLog]      = useState([])
  const [logYuk,     setLogYuk]   = useState(true)
  const [users,      setUsers]    = useState([])
  const [tumHesaplar,setTumH]     = useState({ facebook:[], instagram:[] })
  const [kayit,      setKayit]    = useState(false)
  const [siliyor,    setSiliyor]  = useState('')
  const [duzenleK,   setDuzenleK] = useState(null)
  const [yeniK,      setYeniK]    = useState({ kullanici:'', sifre:'', ad:'', rol:'editor', sayfalar:[] })
  const [firmalar,   setFirmalar] = useState([])
  const [firmaDetay, setFirmaD]   = useState(null)
  const [logFiltre,  setLogF]     = useState('hepsi')
  const token = localStorage.getItem('cms_token') || ''

  const PLT = { facebook:'#1877F2', instagram:'#E1306C', twitter:'#1DA1F2', youtube:'#FF0000', sistem:'#666', radar:'#E63946', reklam:'#FFB700' }

  useEffect(() => {
    fetch('/api/paylas-log?admin=1', { headers:{'X-Token':token} })
      .then(r=>r.json()).then(d=>{ setLog(Array.isArray(d)?d:[]); setLogYuk(false) }).catch(()=>setLogYuk(false))
    fetch('/api/kullanicilar?token='+token, { headers:{'X-Token':token} })
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setUsers(d) }).catch(()=>{})
    fetch('/api/hesaplar')
      .then(r=>r.json()).then(d=>setTumH(d)).catch(()=>{})
    fetch('/api/reklam-firma', { headers:{'X-Token':token} })
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setFirmalar(d) }).catch(()=>{})
  }, [])

  // Log filtrele
  const logFiltreli = logFiltre === 'hepsi' ? log : log.filter(l=>l.tip===logFiltre||l.platform===logFiltre)

  // Paylaşım sil
  const paylasSil = async (l) => {
    if (!l.post_id) return alert('Post ID yok')
    if (!confirm(`${l.platform} paylaşımı silinsin mi?`)) return
    setSiliyor(l.post_id)
    try {
      const res  = await fetch('/api/paylas-sil', {
        method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
        body: JSON.stringify({ platform:l.platform, post_id:l.post_id, page_id:l.page_id }),
      })
      const data = await res.json()
      if (data.ok || data.log_silindi) {
        setLog(p=>p.filter(x=>x.post_id!==l.post_id))
        if (data.post_url) window.open(data.post_url, '_blank')
      } else { alert('Hata: ' + data.hata) }
    } catch(e) { alert(e.message) }
    setSiliyor('')
  }

  // Kullanıcı ekle/güncelle
  const kullaniciKaydet = async (form) => {
    if (!form.kullanici || !form.sifre) return
    setKayit(true)
    try {
      const res  = await fetch('/api/kullanicilar', {
        method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
        body: JSON.stringify({ islem:'guncelle', ...form, sayfalar: form.sayfalar?.length ? form.sayfalar : null }),
      })
      const data = await res.json()
      if (data.ok) {
        setUsers(p => p.some(u=>u.kullanici===form.kullanici)
          ? p.map(u=>u.kullanici===form.kullanici ? {...u,...form} : u)
          : [...p, form])
        setYeniK({ kullanici:'', sifre:'', ad:'', rol:'editor', sayfalar:[] })
        setDuzenleK(null)
      }
    } catch(e) {}
    setKayit(false)
  }

  const kullaniciSil = async (k) => {
    if (!confirm(`"${k}" silinsin mi?`)) return
    await fetch('/api/kullanicilar', {
      method:'POST', headers:{'Content-Type':'application/json','X-Token':token},
      body: JSON.stringify({ islem:'sil', kullanici:k }),
    })
    setUsers(p=>p.filter(u=>u.kullanici!==k))
  }

  // Firma raporu hesapla
  const firmaRapor = (firma) => {
    const kampanyalar = firma.kampanyalar || []
    const toplamGun   = kampanyalar.reduce((acc, k) => {
      if (!k.baslangic) return acc
      const bas = new Date(k.baslangic)
      const bit = k.bitis ? new Date(k.bitis) : new Date()
      return acc + Math.max(0, Math.ceil((bit-bas)/(1000*60*60*24)))
    }, 0)
    const toplamGonderi  = kampanyalar.reduce((acc,k)=>acc+(k.gonderiler||[]).length, 0)
    const toplamPaylasim = kampanyalar.reduce((acc,k)=>acc+(k.gonderiler||[]).reduce((a,g)=>a+(g.paylasimlar||[]).length,0), 0)
    return { toplamGun, toplamGonderi, toplamPaylasim, kampanyaSayisi: kampanyalar.length }
  }

  // Modül yetki checkboxları
  const ModulYetkiler = ({ form, setForm }) => (
    form.rol !== 'admin' ? (
      <div style={{marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Modül Yetkileri</div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {[
            ['modul_kayserim','kayserim.net Haber Girişi'],
            ['modul_kayseradar','Kayseradar Veri Girişi'],
            ['modul_reklam','Reklam Girişi'],
            ['modul_manuel','Manuel Haber Girişi'],
          ].map(([key,label])=>(
            <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'3px 0'}}>
              <input type="checkbox" checked={form[key]!==false}
                onChange={e=>setForm(p=>({...p,[key]:e.target.checked}))}/>
              {label}
            </label>
          ))}
        </div>
      </div>
    ) : null
  )

  const SayfaSecici = ({ form, setForm }) => (
    tumHesaplar.facebook?.length > 0 ? (
      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>SAYFA YETKİLERİ <span style={{opacity:.6}}>(boş = tümü)</span></div>
        <div style={{maxHeight:110,overflowY:'auto',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'4px 0'}}>
          {tumHesaplar.facebook.map(h=>(
            <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 8px',cursor:'pointer'}}>
              <input type="checkbox"
                checked={(form.sayfalar||[]).includes(h.page_id)}
                onChange={e=>setForm(p=>({...p,sayfalar:e.target.checked?[...(p.sayfalar||[]),h.page_id]:(p.sayfalar||[]).filter(x=>x!==h.page_id)}))}/>
              <span style={{fontSize:11}}>{h.page_name}</span>
            </label>
          ))}
        </div>
      </div>
    ) : null
  )

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:6,background:'var(--surface)',flexShrink:0}}>
        <button onClick={onGeri} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="arrow-left" size={11}/> Menü
        </button>
        <div style={{width:1,height:16,background:'var(--border)'}}/>
        <Ic n="settings" size={15} style={{color:'#8899a6'}}/>
        <div style={{fontSize:14,fontWeight:600}}>Yönetim</div>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {[
            ['log','clipboard-list','Log'],
            ['kullanicilar','users','Kullanıcılar'],
            ['reklam_rapor','chart-bar','Reklam Raporu'],
            ['hesaplar','link','Hesaplar'],
          ].map(([s,ic,l])=>(
            <button key={s} onClick={()=>setSekme(s)}
              style={{fontSize:11,background:sekme===s?'rgba(255,255,255,.08)':'transparent',
                border:sekme===s?'0.5px solid rgba(255,255,255,.2)':'0.5px solid transparent',
                fontWeight:sekme===s?500:400,color:sekme===s?'var(--text)':'var(--muted)'}}>
              <Ic n={ic} size={11}/> {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1rem'}}>

        {/* ── PAYLAŞIM LOGU ── */}
        {sekme==='log' && (
          <div style={{maxWidth:900}}>
            {/* Filtre */}
            <div style={{display:'flex',gap:5,marginBottom:'1rem',flexWrap:'wrap'}}>
              {[['hepsi','Tümü'],['facebook','Facebook'],['instagram','Instagram'],['twitter','Twitter'],['youtube','YouTube'],['radar','Kayseradar'],['reklam','Reklam']].map(([v,l])=>(
                <button key={v} onClick={()=>setLogF(v)}
                  style={{fontSize:11,background:logFiltre===v?'rgba(255,255,255,.08)':'transparent',
                    border:logFiltre===v?'0.5px solid rgba(255,255,255,.2)':'0.5px solid var(--border)',
                    fontWeight:logFiltre===v?500:400}}>
                  {l} {v==='hepsi'?`(${log.length})`:''}
                </button>
              ))}
            </div>

            {logYuk && <div style={{color:'var(--muted)',fontSize:13}}>Yükleniyor…</div>}
            {logFiltreli.map((l,i)=>(
              <div key={i} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 12px',marginBottom:6,display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{fontSize:10,background:`${PLT[l.platform]||'#666'}22`,color:PLT[l.platform]||'#aaa',
                  border:`0.5px solid ${PLT[l.platform]||'#666'}44`,borderRadius:4,padding:'2px 7px',flexShrink:0,textTransform:'capitalize',minWidth:60,textAlign:'center'}}>
                  {l.tip==='radar'?'Radar':l.tip==='reklam'?'Reklam':l.platform}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.baslik||l.source_id}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:3,display:'flex',gap:10,flexWrap:'wrap'}}>
                    <span>👤 {l.kullanici}</span>
                    <span>{l.tip==='video'?'🎬':'📷'} {l.tip||'foto'}</span>
                    <span>🕐 {l.tarih?new Date(l.tarih).toLocaleString('tr-TR'):''}</span>
                    {l.sablon&&<span>📋 {l.sablon}</span>}
                    {l.post_id&&<span style={{fontFamily:'monospace',fontSize:10,color:'var(--muted)'}}>#{l.post_id.slice(0,12)}</span>}
                  </div>
                </div>
                {l.post_id && l.tip!=='radar_sil' && (
                  <button onClick={()=>paylasSil(l)} disabled={siliyor===l.post_id}
                    style={{fontSize:11,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b',flexShrink:0}}>
                    <Ic n={siliyor===l.post_id?'loader-2':'trash'} size={11}/> Sil
                  </button>
                )}
              </div>
            ))}
            {!logYuk&&logFiltreli.length===0&&<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:'2rem'}}>Kayıt yok</div>}
          </div>
        )}

        {/* ── KULLANICILAR ── */}
        {sekme==='kullanicilar' && (
          <div style={{maxWidth:700}}>
            {/* Yeni kullanıcı */}
            <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem',marginBottom:'1rem'}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Yeni Kullanıcı Ekle</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                {[['kullanici','Kullanıcı Adı','text'],['sifre','Şifre','password'],['ad','Ad Soyad','text']].map(([k,l,t])=>(
                  <div key={k} style={{gridColumn:k==='ad'?'1/-1':undefined}}>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{l}</div>
                    <input type={t} value={yeniK[k]||''} onChange={e=>setYeniK(p=>({...p,[k]:e.target.value}))} style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Rol</div>
                  <select value={yeniK.rol} onChange={e=>setYeniK(p=>({...p,rol:e.target.value}))}
                    style={{width:'100%',fontSize:13,background:'var(--surface)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'6px 8px'}}>
                    <option value="editor">Editör</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <ModulYetkiler form={yeniK} setForm={setYeniK}/>
              <SayfaSecici form={yeniK} setForm={setYeniK}/>
              <button onClick={()=>kullaniciKaydet(yeniK)} disabled={kayit||!yeniK.kullanici||!yeniK.sifre}
                style={{fontSize:12,background:'rgba(0,212,170,.15)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
                <Ic n={kayit?'loader-2':'user-plus'} size={12}/> Ekle
              </button>
            </div>

            {/* Mevcut kullanıcılar */}
            {users.map(u=>(
              <div key={u.kullanici} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'10px 14px',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,background:'rgba(68,136,255,.15)',border:'0.5px solid rgba(68,136,255,.3)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#4488FF',flexShrink:0}}>
                    {(u.ad||u.kullanici)[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{u.ad||u.kullanici}</div>
                    <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span>@{u.kullanici}</span>
                      <span>· {u.rol==='admin'?'Admin':'Editör'}</span>
                      {u.rol!=='admin' && [
                        u.modul_kayserim!==false&&'Kayserim',
                        u.modul_kayseradar!==false&&'Radar',
                        u.modul_reklam!==false&&'Reklam',
                        u.modul_manuel!==false&&'Manuel',
                      ].filter(Boolean).map(m=>(
                        <span key={m} style={{background:'rgba(68,136,255,.1)',color:'#4488FF',padding:'0 5px',borderRadius:8,fontSize:10}}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>setDuzenleK(duzenleK===u.kullanici?null:u.kullanici)}
                    style={{fontSize:11,background:'rgba(255,255,255,.06)',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
                    <Ic n="edit" size={11}/> {duzenleK===u.kullanici?'Kapat':'Düzenle'}
                  </button>
                  {u.kullanici!=='admin' && (
                    <button onClick={()=>kullaniciSil(u.kullanici)}
                      style={{fontSize:11,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                      <Ic n="trash" size={11}/>
                    </button>
                  )}
                </div>
                {duzenleK===u.kullanici && (
                  <DuzenleForm u={u} token={token} tumHesaplar={tumHesaplar}
                    onKaydet={guncellenen=>{ setUsers(p=>p.map(x=>x.kullanici===u.kullanici?{...x,...guncellenen}:x)); setDuzenleK(null) }}/>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── REKLAM RAPORU ── */}
        {sekme==='reklam_rapor' && (
          <div style={{maxWidth:900}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'0.75rem',marginBottom:'1.5rem'}}>
              {firmalar.map(f=>{
                const r = firmaRapor(f)
                return (
                  <div key={f.id} onClick={async()=>{
                    const res = await fetch(`/api/reklam-firma?id=${f.id}`,{headers:{'X-Token':token}})
                    setFirmaD(await res.json())
                  }}
                    style={{background:'var(--surface)',border:`0.5px solid ${firmaDetay?.id===f.id?'rgba(255,183,0,.4)':'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'1rem',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <div style={{width:32,height:32,background:'rgba(255,183,0,.1)',border:'0.5px solid rgba(255,183,0,.3)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Ic n="building-store" size={16} style={{color:'#FFB700'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{f.ad}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{f.sektor||'—'}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                      {[
                        ['Kampanya',r.kampanyaSayisi,'briefcase'],
                        ['Toplam Gün',r.toplamGun,'calendar'],
                        ['Gönderi',r.toplamGonderi,'photo'],
                        ['Paylaşım',r.toplamPaylasim,'send'],
                      ].map(([l,v,ic])=>(
                        <div key={l} style={{background:'rgba(255,255,255,.03)',borderRadius:'var(--radius-sm)',padding:'6px 8px'}}>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{l}</div>
                          <div style={{fontSize:18,fontWeight:600,color:'var(--text)'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {firmalar.length===0&&<div style={{color:'var(--muted)',fontSize:13}}>Henüz firma yok</div>}
            </div>

            {/* Firma detay raporu */}
            {firmaDetay && (
              <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem'}}>
                <div style={{fontSize:14,fontWeight:600,marginBottom:'1rem'}}>{firmaDetay.ad} — Kampanya Detayları</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(firmaDetay.kampanyalar||[]).map(k=>{
                    const bas = k.baslangic ? new Date(k.baslangic) : null
                    const bit = k.bitis ? new Date(k.bitis) : new Date()
                    const gun = bas ? Math.max(0,Math.ceil((bit-bas)/(1000*60*60*24))) : 0
                    const paylasimSayisi = (k.gonderiler||[]).reduce((a,g)=>a+(g.paylasimlar||[]).length,0)
                    const bitti = k.bitis && new Date(k.bitis) < new Date()
                    return (
                      <div key={k.id} style={{padding:'10px 12px',background:'rgba(255,255,255,.02)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                            <span style={{fontSize:13,fontWeight:500}}>{k.ad}</span>
                            {bitti && <span style={{fontSize:10,color:'var(--muted)',background:'rgba(255,255,255,.05)',padding:'1px 6px',borderRadius:8}}>Bitti</span>}
                          </div>
                          <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:10}}>
                            {k.baslangic&&<span>📅 {new Date(k.baslangic).toLocaleDateString('tr-TR')}</span>}
                            {k.bitis&&<span>→ {new Date(k.bitis).toLocaleDateString('tr-TR')}</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8,fontSize:12}}>
                          <span style={{color:'#FFB700'}}>{gun} gün</span>
                          <span style={{color:'var(--muted)'}}>·</span>
                          <span style={{color:'var(--text)'}}>{(k.gonderiler||[]).length} gönderi</span>
                          <span style={{color:'var(--muted)'}}>·</span>
                          <span style={{color:'#00D4AA'}}>{paylasimSayisi} paylaşım</span>
                        </div>
                      </div>
                    )
                  })}
                  {(firmaDetay.kampanyalar||[]).length===0&&<div style={{color:'var(--muted)',fontSize:13}}>Kampanya yok</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HESAPLAR ── */}
        {sekme==='hesaplar' && <HesapYonetimi/>}

      </div>
    </div>
  )
}

// ── MODÜL SEÇİCİ ANA EKRAN ───────────────────────────────────────────────────
function ModulSecici({ user, onModul }) {
  const moduller = [
    {
      id: 'kayserim',
      baslik: 'kayserim.net Haber Girişi',
      aciklama: '1ha akışından haber al, SEO işle, sosyal medyaya yayınla',
      ic: 'news',
      renk: '#00D4AA',
      bg: 'rgba(0,212,170,0.08)',
      border: 'rgba(0,212,170,0.2)',
      yetki: 'modul_kayserim',
    },
    {
      id: 'kayseradar',
      baslik: 'Kayseradar Veri Girişi',
      aciklama: 'Kaza, yangın, son dakika — şablon ile hızlı paylaşım',
      ic: 'radar',
      renk: '#E63946',
      bg: 'rgba(230,57,70,0.08)',
      border: 'rgba(230,57,70,0.2)',
      yetki: 'modul_kayseradar',
    },
    {
      id: 'reklam',
      baslik: 'Reklam Girişi',
      aciklama: 'Firma ve kampanya yönetimi, sosyal medya reklam paylaşımı',
      ic: 'speakerphone',
      renk: '#FFB700',
      bg: 'rgba(255,183,0,0.08)',
      border: 'rgba(255,183,0,0.2)',
      yetki: 'modul_reklam',
    },
    {
      id: 'manuel',
      baslik: 'Manuel Haber Girişi',
      aciklama: 'Haber metni ve görselini gir, işle ve yayınla',
      ic: 'pencil',
      renk: '#4488FF',
      bg: 'rgba(68,136,255,0.08)',
      border: 'rgba(68,136,255,0.2)',
      yetki: 'modul_manuel',
    },
    {
      id: 'yonetim',
      baslik: 'Yönetim',
      aciklama: 'Log kayıtları, kullanıcı yönetimi, reklam raporları',
      ic: 'settings',
      renk: '#8899a6',
      bg: 'rgba(136,153,166,0.08)',
      border: 'rgba(136,153,166,0.2)',
      yetki: 'admin',
    },
  ]

  // Kullanıcının erişebildiği modüller
  const erisim = (m) => {
    if (user?.rol === 'admin') return true
    if (m.yetki === 'admin') return false
    return user?.[m.yetki] !== false
  }

  return (
    <div style={{minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'1.25rem 1.5rem', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface)'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:32, height:32, background:'rgba(230,57,70,0.15)', border:'0.5px solid rgba(230,57,70,0.3)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Ic n="radar" size={17} style={{color:'#E63946'}}/>
          </div>
          <div>
            <div style={{fontSize:15, fontWeight:600, color:'var(--text)'}}>kayserim.net</div>
            <div style={{fontSize:11, color:'var(--muted)'}}>İçerik Yönetim Sistemi</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:12, color:'var(--muted)'}}>{user?.ad || user?.kullanici}</span>
          <button onClick={()=>{ localStorage.removeItem('cms_token'); window.location.reload() }}
            style={{fontSize:11, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)'}}>
            <Ic n="logout" size={11}/> Çıkış
          </button>
        </div>
      </div>

      {/* Modül kartları */}
      <div style={{flex:1, padding:'2rem 1.5rem', maxWidth:900, margin:'0 auto', width:'100%'}}>
        <div style={{fontSize:13, color:'var(--muted)', marginBottom:'1.5rem'}}>
          Hoş geldin, <strong style={{color:'var(--text)'}}>{user?.ad || user?.kullanici}</strong>. Hangi modüle gitmek istiyorsun?
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1rem'}}>
          {moduller.map(m => {
            const aktif = erisim(m)
            return (
              <div key={m.id}
                onClick={() => aktif && onModul(m.id)}
                style={{
                  background: aktif ? m.bg : 'rgba(255,255,255,0.02)',
                  border: `0.5px solid ${aktif ? m.border : 'var(--border)'}`,
                  borderRadius:'var(--radius-lg)',
                  padding:'1.25rem',
                  cursor: aktif ? 'pointer' : 'not-allowed',
                  opacity: aktif ? 1 : 0.4,
                  transition:'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => { if(aktif) e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
              >
                <div style={{width:40, height:40, background:`${m.bg}`, border:`0.5px solid ${m.border}`, borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.875rem'}}>
                  <Ic n={m.ic} size={20} style={{color:m.renk}}/>
                </div>
                <div style={{fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:6}}>{m.baslik}</div>
                <div style={{fontSize:12, color:'var(--muted)', lineHeight:1.5}}>{m.aciklama}</div>
                {!aktif && <div style={{fontSize:11, color:'var(--muted)', marginTop:8}}>🔒 Yetki gerekli</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, girisYap, cikisYap } = useAuth()
  const [aktifModul, setAktifModul] = useState(null)
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
  if (!aktifModul) return <ModulSecici user={user} onModul={setAktifModul}/>
  if (aktifModul === 'kayseradar') return <KayseradarModul user={user} onGeri={()=>setAktifModul(null)}/>
  if (aktifModul === 'reklam') return <ReklamModul user={user} onGeri={()=>setAktifModul(null)}/>
  if (aktifModul === 'manuel') return <ManuelHaberModul user={user} onGeri={()=>setAktifModul(null)}/>
  if (aktifModul === 'yonetim') return <YonetimModul user={user} onGeri={()=>setAktifModul(null)}/>
  // Reklam, Manuel, Yönetim modülleri yakında
  if (aktifModul !== 'kayserim') return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,background:'var(--bg)'}}>
      <div style={{fontSize:32}}>🚧</div>
      <div style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>Yapım aşamasında</div>
      <div style={{fontSize:13,color:'var(--muted)'}}>Bu modül yakında aktif olacak</div>
      <button onClick={()=>setAktifModul(null)} style={{fontSize:13,marginTop:8}}>← Ana Menü</button>
    </div>
  )

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
          <button onClick={()=>setAktifModul(null)} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)',marginLeft:4}}>
            <Ic n="layout-grid" size={11}/> Menü
          </button>
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
                      {h.paylasildi_tw&&<span style={{fontSize:10,background:'rgba(29,161,242,.08)',color:'#1da1f2',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(29,161,242,.2)'}}>𝕏</span>}
                      {h.paylasildi_yt&&<span style={{fontSize:10,background:'rgba(255,0,0,.08)',color:'#ff4444',padding:'1px 6px',borderRadius:10,border:'0.5px solid rgba(255,0,0,.2)'}}>YT</span>}
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
