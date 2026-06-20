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

  // Kaynağın orientasyonunu belirle — video yatay mı dikey mi?
  const kaynakOrientation = (() => {
    const medya = haber?.medyalar?.find(m => m.tip === (haber?.video ? 'video' : 'gorsel')) || haber?.medyalar?.[0]
    if (!medya?.genislik || !medya?.yukseklik) return null  // bilinmiyor
    return medya.genislik >= medya.yukseklik ? 'yatay' : 'dikey'
  })()

  // KV'den kayıtlı videoları yükle
  useEffect(() => {
    if (!haber?.source_id) return
    const kayitli = {}

    // 1. Haber objesinden direkt kontrol
    ;['dikey','yatay'].forEach(fmt => {
      const url  = haber[`video_${fmt}`]
      const snap = haber[`video_${fmt}_snapshot`]
      if (url) { kayitli[fmt] = { url, snapshot: snap }; onVideoHazir?.({ format: fmt, url, snapshot: snap }) }
    })

    // 2. video-url API'den KV'yi sorgula
    fetch(`/api/video-url?source_id=${encodeURIComponent(haber.source_id)}`)
      .then(r => r.json())
      .then(data => {
        const yeni = {}
        ;['dikey','yatay'].forEach(fmt => {
          // video-url POST: data.dikey = url string, data.dikey_snapshot = snap string
          const url  = data[fmt]
          const snap = data[fmt + '_snapshot'] || ''
          if (url) {
            yeni[fmt] = { url, snapshot: snap }
            onVideoHazir?.({ format: fmt, url, snapshot: snap })
          }
        })
        if (Object.keys(yeni).length) setRenders(p => ({ ...p, ...yeni }))
      })
      .catch(() => {})

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
function MetaPaylas({ content, selectedHaber, gorselUrls, kayserimLink='', videoRenders={}, galeriGorseller=[], galeriRenderler=[] }) {
  const isVideo = !!(selectedHaber?.video)
  const [fbTip,    setFbTip]   = useState(isVideo ? 'video' : 'foto')
  const [igTip,    setIgTip]   = useState(isVideo ? 'video' : 'foto')
  // Galeri görselleri 2+ olunca carousel'a geç
  useEffect(() => {
    if (!isVideo && galeriGorseller.length > 1) setIgTip('carousel')
    else if (!isVideo && galeriGorseller.length <= 1) setIgTip('foto')
  }, [galeriGorseller.length])
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
    const videoUrl = typeof selectedHaber?.video === 'string' ? selectedHaber.video : ''
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
    const s = v => (v && typeof v === 'string') ? v : ''

    // Facebook: başlık + spot + link
    const fbHam = s(content?.facebook) || s(content?.sosyal_baslik) || s(content?.site_basligi)
    setFbMetin(fbHam + linkKisa)

    // Instagram: Claude'un ürettiği optimize instagram metni öncelikli
    const temizle = (t='') => (typeof t === 'string' ? t : '')
      .replace(/^[A-ZÇĞİÖŞÜa-zçğışöüı\s]+\s*\([^)]+\)\s*[-–—:]\s*/,'') // KAYSERİ (1HA)- vs kaldır
      .replace(/\n{3,}/g, '\n\n') // 3+ satır boşluğu → tek satır boşluk
      .replace(/[ \t]+\n/g, '\n') // satır sonu boşlukları temizle
      .replace(/^\s+/,'').trim()
    const toStr = v => (v && typeof v === 'string') ? v : ''
    const igHam = content?.instagram ? temizle(toStr(content.instagram))
                : temizle(toStr(content?.optimize_icerik) || toStr(content?.ozet) || toStr(content?.site_basligi))
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
      // kvVideo.dikey obje olabilir — URL'yi çıkar
      // video_url her zaman string olmalı — obje gelirse URL'sini çıkar
      const _rawVideo = kvVideo?.dikey || videoRenders?.dikey?.url ||
                        selectedHaber?.video_dikey || selectedHaber?.video || ''
      const videoUrl = typeof _rawVideo === 'string' ? _rawVideo :
                       typeof _rawVideo === 'object' ? (_rawVideo?.url || '') : ''
      console.log('Paylaş debug:', { kvVideo, videoRenders_dikey: videoRenders?.dikey?.url, video_dikey: selectedHaber?.video_dikey, kullanilan: videoUrl })

      const token = localStorage.getItem('cms_token') || ''
      const kullanici = token
        ? (await fetch('/api/auth?token='+token).then(r=>r.json()).catch(()=>({}))).kullanici || 'editor'
        : 'editor'
      const metin = platform === 'instagram' ? igMetin : fbMetin
      // Carousel: tüm görseller — render varsa render URL'si, yoksa orijinal
      // Kapak render'ı ilk sırada — diğerleri arkasında
      const galeriUrls = galeriGorseller.map(g => {
        const render = galeriRenderler.find(r => r.kaynak_url === g.url)
        return render?.url || g.url
      })
      // Carousel: igTip'e değil galeriGorseller sayısına bak — state gecikmesi olabilir
      const isCarousel = platform === 'instagram' && galeriUrls.length > 0
      // GaleriModul'dan gelince galeriUrls zaten kapağı içeriyor — tekrar ekleme
      // gorselUrl boşsa (GaleriModul) direkt galeriUrls kullan
      const carouselUrls = (!gorselUrl || galeriUrls[0] === gorselUrl)
        ? galeriUrls
        : [gorselUrl, ...galeriUrls]

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
          is_carousel:  isCarousel,
          galeri_urls:  isCarousel ? carouselUrls : undefined,
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
      {[['foto','Fotoğraf'],['video','Video'],['carousel','Galeri']].map(([v,l])=>(
        <button key={v} onClick={()=>onChange(v)}
          disabled={(v==='video'&&!isVideo)||(v==='carousel'&&galeriGorseller.length<2)}
          style={{fontSize:11,background:val===v?'rgba(24,119,242,.2)':'transparent',
            border:`0.5px solid ${val===v?'rgba(24,119,242,.4)':'var(--border)'}`,
            color:val===v?'#4dabf7':'var(--muted)',
            opacity:((v==='video'&&!isVideo)||(v==='carousel'&&galeriGorseller.length<2))?0.4:1}}>
          {l}{v==='carousel'&&galeriGorseller.length>1?` (${galeriGorseller.length})`:''}
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
          ℹ️ Davet Instagram DM olarak gelir · Çalışması için karşı hesabın Instagram → Ayarlar → Gizlilik → Etiketler → <b>Kolaboratör davetleri: Herkese izin ver</b> seçili olmalı
        </div>}
      </div>

      {/* Kullanılacak video URL'si */}
      {isVideo && (() => {
        const _vRaw = kvVideo?.dikey || videoRenders?.dikey?.url || selectedHaber?.video_dikey || selectedHaber?.video || ''
        const vUrl = typeof _vRaw === 'string' ? _vRaw : ''
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

      {/* Render bekleniyorsa uyarı */}
      {!gorselUrls?.instagram && !gorselUrls?.facebook && (
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,padding:'6px 10px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)'}}>
          ⏳ Sosyal medya görseli hazırlanıyor — hazır olunca paylaşabilirsiniz
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
        {[['facebook','Facebook','#1877F2'],['instagram','Instagram','#E1306C'],['her_ikisi','FB + IG','#4dabf7']].map(([p,l,c])=>(
          <button key={p} onClick={()=>paylas(p)}
            disabled={gonderiyor || (!gorselUrls?.instagram && !gorselUrls?.facebook)}
            style={{fontSize:12,background:`rgba(${p==='facebook'?'24,119,242':p==='instagram'?'225,48,108':'24,119,242'},.15)`,
              border:`0.5px solid ${c}44`,color:c,
              opacity:(gonderiyor||(!gorselUrls?.instagram&&!gorselUrls?.facebook))?0.4:1}}>
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
            {s.ok ? ' ✓' : s.bekliyor ? ' ⏳ '+(s.mesaj||'İşleniyor…') : s.kota_doldu ? ` ⚠️ Günlük limit (${s.kullanim}/${s.limit}) — yarın sıfırlanır` : ' ✗ '+(s.hata||'Hata')}
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
    const str = v => (v && typeof v === 'string') ? v : ''
    const b = str(content?.site_basligi) || str(selectedHaber?.baslik)
    const kat = str(content?.kategori) || str(selectedHaber?.kategori)
    const link = kayserimLink ? `\n\n🔗 ${kayserimLink}` : ''
    const a = (str(content?.optimize_icerik) || str(content?.meta_description)).replace(/<[^>]*>/g,'').slice(0,4000)
    setBaslik(b.slice(0,100))
    setAciklama((a + link).slice(0,5000))
    setEtiketler(['Kayseri', 'KayseriHaber', kat||'Haber', 'kayserimnet'].filter(Boolean).join(', '))
  }, [content?.url_slug, kayserimLink])

  const _rawVideo = videoRenders?.yatay?.url || selectedHaber?.video_yatay || selectedHaber?.video || ''
  const videoUrl = typeof _rawVideo === 'string' ? _rawVideo : ''

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
        headers: { 'Content-Type': 'application/json', 'X-API-Key': (import.meta.env?.VITE_RSS_API_KEY || 'de8a5c6b22ee4b60adc0ec449d3c50a6bce94ea899e7cff30b83590ecb316133402db1876b489c7ba3447eccd5a6a379'), 'X-Kullanici': kullanici },
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
  const _rawVideoUrl = videoRenders?.yatay?.url || selectedHaber?.video_yatay || selectedHaber?.video || ''
  const videoUrl   = typeof _rawVideoUrl === 'string' ? _rawVideoUrl : ''

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
        headers: { 'Content-Type': 'application/json', 'X-API-Key': (import.meta.env?.VITE_RSS_API_KEY || 'de8a5c6b22ee4b60adc0ec449d3c50a6bce94ea899e7cff30b83590ecb316133402db1876b489c7ba3447eccd5a6a379'), 'X-Kullanici': kullanici },
        body: JSON.stringify(payload),
      })
      if (!res.ok && res.status === 524) throw new Error("Twitter video yüklemesi zaman aşımına uğradı (524). Video 5MB'dan büyük olabilir — sadece metin atılabilir.")
      const rawText = await res.text()
      let data
      try { data = JSON.parse(rawText) }
      catch(e) { throw new Error(`Twitter yanıtı işlenemedi (${res.status}): ${rawText.slice(0,100)}`) }
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


function GorselOnizleme({ editedHaber, onGorsellerHazir, onSetRefresh }) {
  const [gorselKey,     setGorselKey]     = useState(0)
  const [forceRefresh,  setForceRefresh]  = useState(false)
  const haberRef = useRef(editedHaber)
  haberRef.current = editedHaber

  useEffect(() => { onSetRefresh?.(() => { setForceRefresh(true); setGorselKey(k=>k+1) }) }, [])

  return (
    <>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:6}}>
        <button onClick={()=>{ setForceRefresh(true); setGorselKey(k=>k+1) }}
          style={{fontSize:11,color:'#FFB700',background:'rgba(255,183,0,.08)',border:'0.5px solid rgba(255,183,0,.3)',padding:'3px 10px',cursor:'pointer'}}>
          <Ic n="refresh" size={11}/> Görseli Yeniden Üret
        </button>
      </div>
      <OtoGorselUret key={`${editedHaber?.source_id}_${gorselKey}`} haber={haberRef.current} onGorsellerHazir={onGorsellerHazir}
        forceRefresh={forceRefresh}/>
    </>
  )
}



// ── ÇOKLU GÖRSEL YÜKLEYİCİ ────────────────────────────────────────────────────
function CokluGorselEkle({ sourceId, gorseller = [], onGuncel, maxGorsel = 10, orijinalGorsel = null }) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata]             = useState(null)
  const fileRef = useRef(null)

  const yukle = async (files) => {
    setYukleniyor(true); setHata(null)
    const yeniGorseller = []

    for (const file of Array.from(files)) {
      if (gorseller.length + yeniGorseller.length >= maxGorsel) break
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('source_id', sourceId || `upload_${Date.now()}`)
        form.append('tip', 'gorsel')
        const res  = await fetch('/api/medya-yukle', { method: 'POST', body: form })
        const data = await res.json()
        if (data.url) yeniGorseller.push({ url: data.url, adi: file.name })
        else setHata(data.hata || 'Yükleme hatası')
      } catch(e) { setHata(e.message) }
    }

    setYukleniyor(false)
    if (yeniGorseller.length === 0) return

    // Kadraj yok — direkt listeye ekle
    const yeni = [...gorseller]
    for (const g of yeniGorseller) {
      yeni.push({ ...g, kapak: yeni.length === 0 })
    }
    if (yeni.length > 0 && !yeni.some(x=>x.kapak)) yeni[0].kapak = true
    onGuncel?.(yeni)
  }

  const kapakYap = (idx) => {
    const yeni = gorseller.map((g, i) => ({ ...g, kapak: i === idx }))
    onGuncel?.(yeni)
  }

  const sil = (idx) => {
    const yeni = gorseller.filter((_, i) => i !== idx)
    if (yeni.length > 0) yeni[0].kapak = true
    onGuncel?.(yeni)
  }

  return (
    <div style={{marginBottom:'0.75rem'}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Görseller {gorseller.length > 0 && `(${gorseller.length})`}</span>
        <div style={{display:'flex',gap:4}}>
          {orijinalGorsel && gorseller.length > 0 && (
            <button onClick={()=>onGuncel([{url:orijinalGorsel,kapak:true,adi:'orijinal'}])}
              style={{fontSize:10,background:'rgba(255,183,0,.08)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700',padding:'2px 8px',cursor:'pointer'}}>
              <Ic n="refresh" size={10}/> Orijinale Dön
            </button>
          )}
          {gorseller.length > 0 && (
            <button onClick={()=>onGuncel([])}
              style={{fontSize:10,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b',padding:'2px 8px',cursor:'pointer'}}>
              <Ic n="trash" size={10}/> Tümünü Sil
            </button>
          )}
          <button onClick={()=>fileRef.current?.click()} disabled={yukleniyor||gorseller.length>=maxGorsel}
            style={{fontSize:10,background:'rgba(255,255,255,.06)',border:'0.5px solid var(--border)',color:'var(--muted)',padding:'2px 8px',cursor:'pointer'}}>
            <Ic n={yukleniyor?'loader-2':'plus'} size={10}/> {yukleniyor?'Yükleniyor…':'Görsel Ekle'}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:'none'}}
        onChange={e=>e.target.files.length&&yukle(e.target.files)}/>

      {gorseller.length === 0 ? (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {orijinalGorsel && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)'}}>
              <img src={orijinalGorsel} alt="" style={{width:48,height:36,objectFit:'cover',borderRadius:'var(--radius-sm)',flexShrink:0}}
                onError={e=>e.target.style.display='none'}/>
              <div style={{flex:1,fontSize:11,color:'var(--muted)'}}>RSS orijinal görsel</div>
              <button onClick={()=>onGuncel([{url:orijinalGorsel,kapak:true,adi:'orijinal'}])}
                style={{fontSize:10,color:'#FFB700',background:'rgba(255,183,0,.1)',border:'0.5px solid rgba(255,183,0,.3)',padding:'3px 8px',cursor:'pointer',borderRadius:3}}>
                ↩ Geri Getir
              </button>
            </div>
          )}
          <div onClick={()=>fileRef.current?.click()}
            style={{border:'1px dashed var(--border)',borderRadius:'var(--radius-md)',padding:'16px',textAlign:'center',cursor:'pointer',color:'var(--muted)',fontSize:12}}>
            <Ic n="photo-plus" size={20}/><div style={{marginTop:4}}>Görsel yükle veya tıkla</div>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {gorseller.map((g, i) => (
            <div key={i} style={{display:'flex',flexDirection:'column',gap:2,width:80}}>
              <div style={{position:'relative',width:80,height:60,borderRadius:'var(--radius-sm)',overflow:'hidden',
                border:`1.5px solid ${g.kapak?'rgba(0,212,170,.6)':'var(--border)'}`}}>
                <img src={g.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}
                  onError={e=>e.target.style.display='none'}/>
                {g.kapak && (
                  <div style={{position:'absolute',top:2,left:2,fontSize:7,background:'rgba(0,212,170,.85)',color:'#000',padding:'1px 3px',borderRadius:2,fontWeight:700}}>
                    KAPAK
                  </div>
                )}
              </div>
              {/* Butonlar — görsel altında */}
              <div style={{display:'flex',gap:2}}>
                {!g.kapak && (
                  <button onClick={()=>kapakYap(i)} title="Kapak yap"
                    style={{flex:1,fontSize:9,border:'0.5px solid rgba(0,212,170,.3)',background:'rgba(0,212,170,.08)',color:'#00D4AA',cursor:'pointer',padding:'2px 0',borderRadius:2}}>
                    ★
                  </button>
                )}

                <button onClick={()=>sil(i)} title="Sil"
                  style={{flex:1,fontSize:9,border:'0.5px solid rgba(255,123,123,.3)',background:'rgba(255,123,123,.08)',color:'#ff7b7b',cursor:'pointer',padding:'2px 0',borderRadius:2}}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          {gorseller.length < maxGorsel && (
            <div onClick={()=>fileRef.current?.click()}
              style={{width:72,height:72,border:'1px dashed var(--border)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--muted)'}}>
              <Ic n="plus" size={18}/>
            </div>
          )}
        </div>
      )}
      {hata && <div style={{fontSize:10,color:'#ff7b7b',marginTop:4}}>{hata}</div>}
      {gorseller.length > 1 && (
        <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>
          ★ = Kapak (şablonlu), diğerleri galeri olarak paylaşılır
        </div>
      )}


    </div>
  )
}

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
      // R2'ye multipart upload
      const form = new FormData()
      form.append('file', file)
      form.append('source_id', selectedHaber?.source_id || `gorsel_${Date.now()}`)
      form.append('tip', 'gorsel')
      const res = await fetch('/api/medya-yukle', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setGorselUrl(data.url)
        onGorselEklendi?.(data.url)
        if (selectedHaber) {
          selectedHaber.gorsel_url = data.url
          selectedHaber.gorsel     = data.url
        }
      } else { setHata(data.hata || 'Yükleme hatası') }
      setYukleniyor(false)
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

const EField = ({label,field,ec,set,multi=false,rows=3,maxLength=null}) => {
  const val = ec[field]||''
  const len = val.length
  const asim = maxLength && len > maxLength
  return (
    <div style={{marginBottom:'0.75rem'}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',justifyContent:'space-between'}}>
        <span>{label}</span>
        {maxLength && <span style={{color: asim ? '#ff6b6b' : len > maxLength*0.85 ? '#FFB700' : 'var(--muted)'}}>{len}/{maxLength}</span>}
      </div>
      {multi
        ? <textarea value={val} onChange={e=>set(field,e.target.value)} rows={rows}
            style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box',lineHeight:1.6,borderColor:asim?'#ff6b6b':undefined}}/>
        : <input value={val} onChange={e=>set(field,e.target.value)}
            style={{width:'100%',fontSize:13,borderColor:asim?'#ff6b6b':undefined}}/>}
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
    if (content) {
      // String olması gereken alanları normalize et — Claude bazen array/obje döndürebiliyor
      const normStr = (obj) => {
        const strAlanlari = ['site_basligi','h1_basligi','sosyal_baslik','meta_description',
          'url_slug','ozet','optimize_icerik','instagram','facebook','x_twitter',
          'youtube_baslik','youtube_aciklama','gorsel_prompt','optimize_icerik_kwh','kategori']
        const kopya = {...obj}
        for (const alan of strAlanlari) {
          if (kopya[alan] !== undefined && kopya[alan] !== null && typeof kopya[alan] !== 'string') {
            kopya[alan] = Array.isArray(kopya[alan]) ? kopya[alan].join(' ') : String(kopya[alan])
          }
        }
        return kopya
      }
      setEc(normStr(content))
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
    ozet:          ecAyniHaber ? (ec.ozet||selectedHaber.ozet||(typeof selectedHaber.icerik==='string'?selectedHaber.icerik?.slice(0,120):'')) : (selectedHaber.ozet||(typeof selectedHaber.icerik==='string'?selectedHaber.icerik?.slice(0,120):'')),
    kategori:      ecAyniHaber ? (ec.kategori||selectedHaber.kategori) : selectedHaber.kategori,
    tarih:         selectedHaber.tarih,
    kayserim_link: link || selectedHaber.kayserim_link || '',
  } : null

  const refreshGorselRef = useRef(null)
  const setGorselYeniKey = (fn) => refreshGorselRef.current?.()

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
        {/* Orijinale Dön — 1ha RSS haberleri için */}
        {selectedHaber?.source_url && selectedHaber?.kaynak!=='manuel' && (
          <button onClick={async ()=>{
            if (!confirm('Tüm düzenlemeler silinecek, orijinal 1ha içeriğine dönülecek. Emin misiniz?')) return
            setKyd(true)
            try {
              const _oiToken = localStorage.getItem('cms_token') || ''
              const res  = await fetch('/api/oto-isle?source_id='+encodeURIComponent(selectedHaber.source_id)+'&secret='+_oiToken)
              const data = await res.json()
              if (data.hata) throw new Error(data.hata)
              setEc({...data})
              setLink(data.kayserim_link||'')
            } catch(e) { console.error(e) }
            setKyd(false)
          }} disabled={kaydediliyor}
            style={{fontSize:11,color:'#FFB700',background:'rgba(255,183,0,.08)',border:'0.5px solid rgba(255,183,0,.3)',whiteSpace:'nowrap',flexShrink:0}}>
            <Ic n="refresh" size={11}/> Orijinale Dön
          </button>
        )}
      </div>

      <Divider label="SEO & web içeriği" ic="world"/>
      <EField ec={ec} set={set} label="Site başlığı (SEO)" field="site_basligi"/>
      <EField ec={ec} set={set} label="H1 başlığı" field="h1_basligi"/>
      <EField ec={ec} set={set} label="Sosyal medya başlığı" field="sosyal_baslik"/>

      {/* Alternatif başlık önerileri */}
      {ec.alternatif_basliklar?.length > 0 && (
        <div style={{marginBottom:'0.75rem',padding:'8px 10px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)'}}>
          <div style={{fontSize:10,color:'#FFB700',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>
            💡 Alternatif Başlık Önerileri
          </div>
          {ec.alternatif_basliklar.map((alt,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <div style={{flex:1,fontSize:11,color:'var(--text)',lineHeight:1.4}}>{alt}</div>
              <button onClick={()=>set('sosyal_baslik', alt)}
                style={{fontSize:9,padding:'2px 6px',background:'rgba(255,183,0,.12)',border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700',cursor:'pointer',borderRadius:3,whiteSpace:'nowrap'}}>
                Sosyal'e Koy
              </button>
              <button onClick={()=>{ set('site_basligi', alt); set('h1_basligi', alt) }}
                style={{fontSize:9,padding:'2px 6px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.2)',color:'#00D4AA',cursor:'pointer',borderRadius:3,whiteSpace:'nowrap'}}>
                Site'ye Koy
              </button>
            </div>
          ))}
        </div>
      )}

      <EField ec={ec} set={set} label="Meta description (spot başlık)" field="meta_description" maxLength={100}/>
      <EField ec={ec} set={set} label="URL slug" field="url_slug"/>
      <EField ec={ec} set={set} label="Özet" field="ozet"/>

      {/* SEO optimize içerik */}
      {ec.optimize_icerik_kwh && ec.optimize_icerik_kwh !== ec.optimize_icerik && (
        <div style={{marginBottom:'0.75rem'}}>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Optimize İçerik</span>
            <button onClick={()=>set('optimize_icerik', ec.optimize_icerik_kwh)}
              style={{fontSize:9,padding:'2px 8px',background:'rgba(68,136,255,.12)',border:'0.5px solid rgba(68,136,255,.3)',color:'#4488FF',cursor:'pointer',borderRadius:3}}>
              🔑 SEO Versiyonunu Kullan
            </button>
          </div>
          <textarea value={ec.optimize_icerik} onChange={e=>set('optimize_icerik',e.target.value)}
            rows={6} style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box'}}/>
        </div>
      ) || <EField ec={ec} set={set} label="Optimize içerik" field="optimize_icerik" multi rows={6}/>}

      <div style={{marginBottom:'0.75rem'}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>kayserim.net linki</span>
          <button onClick={async () => {
            const slug = ec?.url_slug || selectedHaber?.url_slug
            if (!slug) { alert('Önce haberi kaydedin — URL slug gerekli'); return }
            try {
              const res  = await fetch(`/api/kayserim-api?endpoint=link-bul&slug=${encodeURIComponent(slug)}`)
              const data = await res.json()
              if (data.ok && data.url) {
                setLink(data.url)
              } else {
                // Bulunamadı — slug'dan tahmin
                setLink(`https://www.kayserim.net/haber/${slug}`)
              }
            } catch(e) {
              setLink(`https://www.kayserim.net/haber/${ec?.url_slug || ''}`)
            }
          }}
            style={{fontSize:9,padding:'2px 8px',background:'rgba(0,212,170,.1)',
              border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA',cursor:'pointer',borderRadius:3}}>
            🔗 Otomatik Al
          </button>
        </div>
        <input type="url" value={link} onChange={e=>setLink(e.target.value)}
          placeholder="https://www.kayserim.net/haber/28040684/..."
          style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
        {!link && ec?.url_slug && (
          <div style={{fontSize:9,color:'var(--muted)',marginTop:3}}>
            Slug: {ec.url_slug} — "Otomatik Al" ile linki çek
          </div>
        )}
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
      <GorselOnizleme editedHaber={editedHaber} onGorsellerHazir={g=>setGUrls(g.urls)}
        onSetRefresh={fn=>{ refreshGorselRef.current = fn }}/>

      {/* Kapak Fotoğrafı Değiştir */}
      <KapakGorselDegistir
        selectedHaber={selectedHaber}
        onDegistir={yeniUrl => {
          if (selectedHaber) {
            selectedHaber.gorsel_url  = yeniUrl
            selectedHaber.gorsel      = yeniUrl
          }
          set('gorsel_url', yeniUrl)
          set('gorsel',     yeniUrl)
          refreshGorselRef.current?.()
        }}
      />
    </div>
  )
}


// ── KAPAK GÖRSEL DEĞİŞTİR ────────────────────────────────────────────────────
function KapakGorselDegistir({ selectedHaber, onDegistir }) {
  const [yukleniyor, setYuk] = useState(false)
  const [hata,       setHata] = useState(null)
  const [yeniUrl,    setYeni] = useState(null)
  const fileRef = useRef(null)

  const yukle = async (file) => {
    if (!file) return
    setYuk(true); setHata(null); setYeni(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('source_id', selectedHaber?.source_id || `kapak_${Date.now()}`)
      form.append('tip', 'gorsel')
      const res  = await fetch('/api/medya-yukle', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setYeni(data.url)
        onDegistir?.(data.url)
      } else {
        setHata(data.hata || 'Yükleme başarısız')
      }
    } catch(e) { setHata(e.message) }
    setYuk(false)
  }

  const mevcutGorsel = yeniUrl || selectedHaber?.gorsel_url || selectedHaber?.gorsel

  return (
    <div style={{marginBottom:'0.75rem',padding:'10px 12px',
      background:'rgba(255,255,255,.03)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
        <Ic n="photo" size={12}/> Kapak Fotoğrafı
        {yeniUrl && <span style={{color:'#00D4AA',fontSize:10}}>✓ Değiştirildi</span>}
      </div>

      <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
        {/* Mevcut görsel önizleme */}
        {mevcutGorsel && (
          <img src={mevcutGorsel} alt="kapak" style={{
            width:80, height:54, objectFit:'cover',
            borderRadius:4, border:'1px solid var(--border)', flexShrink:0
          }} onError={e=>e.target.style.display='none'}/>
        )}

        {/* Yükleme alanı */}
        <div style={{flex:1}}>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e=>{ yukle(e.target.files[0]); e.target.value='' }}/>
          <button onClick={()=>fileRef.current?.click()} disabled={yukleniyor}
            style={{fontSize:11,padding:'5px 12px',width:'100%',
              background:'rgba(255,255,255,.05)',border:'0.5px solid var(--border)',
              color:'var(--text)',cursor: yukleniyor ? 'not-allowed' : 'pointer',
              borderRadius:4,textAlign:'left'}}>
            {yukleniyor ? '⏳ Yükleniyor…' : '📎 Fotoğraf Değiştir'}
          </button>
          {hata && <div style={{fontSize:10,color:'#ff7b7b',marginTop:4}}>⚠ {hata}</div>}
          <div style={{fontSize:9,color:'var(--muted)',marginTop:4}}>
            JPG, PNG — ajans görseli yetersizse değiştir
          </div>
        </div>
      </div>
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
  { id:'son_dakika_buyuk', label:'Son Dakika Büyük', ic:'bolt',      renk:'#E63946', sadece_metin:true },
  { id:'son_dakika_metin', label:'Son Dakika',   ic:'bolt',           renk:'#FF4500', metin_sablon:true },
  { id:'ekonomi_metin',    label:'Ekonomi',      ic:'currency-lira',  renk:'#FFB700', metin_sablon:true },
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
  const tip    = file.type.startsWith('video') ? 'video' : 'gorsel'
  const dataUrl = await new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload  = e => res(e.target.result)
    reader.onerror = () => rej(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })

  // Boyut bilgisi
  const boyut = await medyaBoyutOku(file, dataUrl)

  // R2'ye multipart upload — boyut sınırı yok
  const form = new FormData()
  form.append('file', file)
  form.append('source_id', sourceId || `upload_${Date.now()}`)
  form.append('tip', tip)

  const res  = await fetch('/api/medya-yukle', { method: 'POST', body: form })
  const data = await res.json()

  if (!data.url) throw new Error(data.hata || 'Yükleme hatası')

  return {
    url:       data.url,
    tip,
    adi:       file.name,
    mime:      file.type,
    dikey:     boyut.dikey,
    genislik:  boyut.genislik,
    yukseklik: boyut.yukseklik,
    boyutMB:   data.boyutMB,
  }
}

function KayseradarModul({ user, onGeri }) {
  const [ekran,        setEkran]      = useState('liste')
  const [seciliSablon, setSablon]     = useState(null)
  const [baslik,       setBaslik]     = useState('')
  const [metin,        setMetin]      = useState('')
  const [medyalar,     setMedyalar]   = useState([]) // { url, tip, adi, mime }
  const [yukleniyorM,  setYukleniyorM]= useState(false)
  const [yukProgress,  setYukProgress] = useState(0)
  const [isleniyor,    setIsleniyor]  = useState(false)
  const [onayKayit,    setOnayKayit]  = useState(null)
  const [liste,        setListe]      = useState([])
  const [seciliKayit,  setSecili]     = useState(null)
  const [paylasiyor,   setPaylasiyor] = useState(false)
  const [hata,         setHata]       = useState(null)
  const [pSonuc,       setPSonuc]     = useState(null)
  const [radarKolabor, setRadarKolabor] = useState('')
  const [videoRenders,    setVideoRenders]    = useState({})
  const [hesaplar,        setHesaplar]        = useState({ facebook:[], instagram:[] })
  const [secilenFb,    setSecilenFb]    = useState([])
  const [secilenIg,    setSecilenIg]    = useState([])
  const fileRef = useRef(null)
  const token   = localStorage.getItem('cms_token') || ''

  const listeYukle = async () => {
    try {
      const res  = await fetch('/api/kayseradar-isle', { headers: { 'X-Token': token } })
      const data = await res.json()
      setListe(Array.isArray(data) ? data : [])
    } catch(e) { console.error(e) }
  }

  useEffect(() => {
    listeYukle()
    fetch('/api/hesaplar').then(r=>r.json()).then(d=>setHesaplar(d)).catch(()=>{})
  }, [])

  // Dosya seç ve yükle
  // Büyük dosya multipart upload (>50MB)
  const chunkUploadRadar = async (file) => {
    const CHUNK = 5 * 1024 * 1024
    const startRes = await fetch('/api/r2-upload-chunk?action=start', {
      method: 'POST', headers: {'Content-Type':'application/json','X-Token':token},
      body: JSON.stringify({ filename: file.name, type: file.type }),
    })
    const startData = await startRes.json()
    if (startData.hata) throw new Error(startData.hata)
    const { uploadId, key, final_url } = startData
    const total = Math.ceil(file.size / CHUNK)
    const parts = []
    for (let i = 0; i < total; i++) {
      const buf  = await file.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer()
      const res  = await fetch(
        `/api/r2-upload-chunk?action=part&uploadId=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&part=${i+1}`,
        { method: 'POST', headers: {'X-Token':token}, body: buf }
      )
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)
      parts.push({ partNumber: i + 1, etag: data.etag })
      setYukProgress(Math.round((i + 1) / total * 100))
    }
    const finishRes = await fetch('/api/r2-upload-chunk?action=finish', {
      method: 'POST', headers: {'Content-Type':'application/json','X-Token':token},
      body: JSON.stringify({ uploadId, key, parts }),
    })
    const finishData = await finishRes.json()
    if (finishData.hata) throw new Error(finishData.hata)
    return finishData.url
  }

  const dosyaSec = async (files) => {
    setYukleniyorM(true); setHata(null); setYukProgress(0)
    const sourceId = `radar_${Date.now()}`
    const yeniMedyalar = []
    for (const file of Array.from(files)) {
      try {
        let m
        if (file.size > 50 * 1024 * 1024) {
          // 50MB üzeri — chunk upload
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel'
          const url = await chunkUploadRadar(file)
          m = { url, tip, adi: file.name, mime: file.type }
        } else {
          m = await dosyaYukle(file, sourceId)
        }
        yeniMedyalar.push(m)
      } catch(e) { setHata(`${file.name}: ${e.message}`) }
    }
    setMedyalar(p => {
      const mevcut = p
      const yeni = yeniMedyalar.map((m, i) => ({
        ...m,
        kapak: mevcut.length === 0 && i === 0 // sadece ilk eklenen ilk görsel kapak
      }))
      // Kapak yoksa ilk görseli kapak yap
      const tumu = [...mevcut, ...yeni]
      if (!tumu.some(x=>x.kapak) && tumu.length > 0) tumu[0].kapak = true
      return tumu
    })
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
            status:    r.status === 'succeeded' ? 'succeeded' : 'planned',
            url:       r.status === 'succeeded' ? (r.url || null) : null, // status succeeded değilse URL'yi kullanma
            tip:       r.tip || 'video',
          }
        }
        setVideoRenders(rv)
        // Henüz succeeded olmayan hepsini takip et
        const bekleyenler = data.kayit.creatomate.filter(r => r.status !== 'succeeded')
        if (bekleyenler.length) takipBaslat(bekleyenler, data.kayit.id)
      }
      setEkran('onay')
    } catch(e) { setHata(e.message) }
    setIsleniyor(false)
  }

  // Creatomate render takibi
  const takipBaslat = (renders, kadasId) => {
    const bekleyenler = renders.filter(r => r.status !== 'succeeded' && r.render_id && r.render_id !== 'null')
    if (!bekleyenler.length) return
    const interval = setInterval(async () => {
      let tumTamam = true
      for (const r of bekleyenler) {
        try {
          const res  = await fetch(`/api/video-durum?render_id=${r.render_id}`)
          const data = await res.json()
          const renderUrl = data.url || data.render_url || null
          if (data.status === 'succeeded' && renderUrl) {
            setVideoRenders(p => ({ ...p, [r.format]: { ...p[r.format], status: 'succeeded', url: renderUrl } }))
            // Listedeki kaydı da güncelle
            setListe(prev => prev.map(li => li.render_id === r.render_id ? { ...li, render_url: renderUrl } : li))
            // Detay ekranındaki kaydı güncelle
            setSecili(prev => prev ? { ...prev, creatomate: (prev.creatomate||[]).map(cr => cr.render_id===r.render_id ? {...cr, url:renderUrl, status:'succeeded'} : cr) } : prev)
            // onayKayit güncelle
            setOnayKayit(p => p ? { ...p, creatomate: (p.creatomate||[]).map(cr => cr.render_id===r.render_id ? {...cr, url:renderUrl, status:'succeeded'} : cr) } : p)
            // KV'ye render URL yaz — paylaşımda kullanılacak
            if (kadasId) {
              fetch('/api/kayseradar-isle', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Token': token },
                body: JSON.stringify({ id: kadasId, render_id: r.render_id, render_url: renderUrl })
              }).catch(e => console.warn('KV güncelleme:', e.message))
            }
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
        body:    JSON.stringify({
          id: kayit.id, platformlar, fb_page_ids: fbIds, ig_ids: igIds, tw: platformlar.includes('twitter'),
          ig_kolabor: radarKolabor ? radarKolabor.split(',').map(s=>s.trim().replace('@','')).filter(Boolean) : undefined,

        }),
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
                // Henüz hazır olmayan render'ları takip et
                const bekleyenler = (d.creatomate||[]).filter(r => !r.url && r.render_id && r.status !== 'failed')
                if (bekleyenler.length) takipBaslat(bekleyenler, d.id)
              }}
                style={{background:on?'rgba(230,57,70,.06)':'var(--surface)',border:`0.5px solid ${on?'rgba(230,57,70,.3)':'var(--border)'}`,borderRadius:'var(--radius-md)',marginBottom:6,cursor:'pointer',overflow:'hidden'}}>
                {/* Render önizleme — görsel veya video */}
                {item.render_url ? (
                  item.render_url.match(/\.mp4/i) ? (
                    <video src={item.render_url} muted playsInline
                      style={{width:'100%',height:120,objectFit:'cover',display:'block'}}/>
                  ) : (
                    <img src={item.render_url} alt="" style={{width:'100%',height:120,objectFit:'cover',display:'block'}}
                      onError={e=>e.target.style.display='none'}/>
                  )
                ) : item.gorsel_url ? (
                  <img src={item.gorsel_url} alt="" style={{width:'100%',height:100,objectFit:'cover',display:'block',opacity:0.5}}
                    onError={e=>e.target.style.display='none'}/>
                ) : null}
                <div style={{padding:'8px 10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:600,color:sbl.renk,background:`${sbl.renk}18`,padding:'2px 7px',borderRadius:10,border:`0.5px solid ${sbl.renk}33`}}>{sbl.label}</span>
                    {item.medya_sayisi > 0 && <span style={{fontSize:10,color:'var(--muted)'}}>📎 {item.medya_sayisi}</span>}
                    <span style={{fontSize:10,color:item.durum==='yayinda'?'#00D4AA':'#FFB700',marginLeft:'auto'}}>{item.durum==='yayinda'?'✓ Yayında':'⏳ Bekliyor'}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:500,lineHeight:1.4,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.baslik}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:4}}>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{new Date(item.tarih).toLocaleString('tr-TR')}</div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:9,color:'rgba(255,255,255,0.25)',fontFamily:'monospace'}}>{item.id?.slice(-8)}</span>
                      {item.render_url && (
                        <a href={item.render_url} target="_blank" rel="noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{fontSize:9,color:'#4488FF',border:'0.5px solid rgba(68,136,255,.3)',padding:'1px 5px',borderRadius:3,textDecoration:'none'}}>
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
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

              {/* Metin şablonları — son_dakika_metin, ekonomi_metin */}
              {seciliSablon?.sadece_metin ? (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Başlık Metni</div>
                  <textarea value={baslik} onChange={e=>setBaslik(e.target.value)} rows={4}
                    placeholder="Son dakika başlığı..."
                    style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
                </div>
              ) : seciliSablon?.metin_sablon ? (
                <>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>İfade Eden <span style={{opacity:.6}}>(opsiyonel — örn: Cumhurbaşkanı Erdoğan)</span></div>
                    <input value={baslik} onChange={e=>setBaslik(e.target.value)}
                      placeholder="Cumhurbaşkanı Erdoğan, Bakan Şimşek..."
                      style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Açıklama / Metin</div>
                    <textarea value={metin} onChange={e=>setMetin(e.target.value)} rows={5}
                      placeholder="Açıklama metni..."
                      style={{width:'100%',fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              {/* Medya yükleme — kan, metin şablonları ve sadece_metin'de gizle */}
              {seciliSablon?.id !== 'kan' && !seciliSablon?.metin_sablon && !seciliSablon?.sadece_metin && <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Görsel / Video Ekle</div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:'none'}}
                  onChange={e=>dosyaSec(e.target.files)}/>
                <div onClick={()=>fileRef.current?.click()}
                  style={{border:'1px dashed var(--border)',borderRadius:'var(--radius-md)',padding:'1rem',textAlign:'center',cursor:'pointer',background:'var(--surface)',marginBottom:8}}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();dosyaSec(e.dataTransfer.files)}}>
                  {yukleniyorM
                    ? <span style={{fontSize:12,color:'var(--muted)'}}>
                        ⏳ Yükleniyor… {yukProgress > 0 && yukProgress < 100 ? `${yukProgress}%` : ''}
                        {yukProgress > 0 && <div style={{height:2,background:'var(--border)',borderRadius:1,marginTop:2,width:100}}><div style={{height:'100%',width:`${yukProgress}%`,background:'#00D4AA',borderRadius:1,transition:'width .3s'}}/></div>}
                      </span>
                    : <span style={{fontSize:12,color:'var(--muted)'}}>📎 Dosya seç veya sürükle bırak (görsel ve video)</span>
                  }
                </div>
                {/* Medya önizleme */}
                {medyalar.length > 0 && (
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {medyalar.map((m,i)=>(
                      <div key={i} style={{position:'relative',width:80,flexShrink:0}}>
                        {m.tip==='gorsel'
                          ? <img src={m.url} alt={m.adi} style={{width:80,height:60,objectFit:'cover',borderRadius:'var(--radius-sm)',
                              border:`1.5px solid ${m.kapak?'rgba(0,212,170,.6)':'var(--border)'}`}} onError={e=>e.target.style.display='none'}/>
                          : <div style={{width:80,height:60,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Ic n="player-play" size={20} style={{color:'#ff7b7b'}}/>
                            </div>
                        }
                        {m.kapak && <div style={{position:'absolute',top:2,left:2,fontSize:7,background:'rgba(0,212,170,.85)',color:'#000',padding:'1px 3px',borderRadius:2,fontWeight:700}}>KAPAK</div>}
                        <div style={{display:'flex',gap:1,marginTop:2}}>
                          {!m.kapak && m.tip==='gorsel' && (
                            <button onClick={()=>setMedyalar(p=>p.map((x,j)=>({...x,kapak:j===i})))} title="Kapak yap"
                              style={{flex:1,fontSize:8,border:'none',background:'rgba(0,212,170,.15)',color:'#00D4AA',cursor:'pointer',borderRadius:2,padding:'1px 0'}}>★</button>
                          )}
                          <button onClick={()=>medyaSil(i)}
                            style={{flex:1,fontSize:8,border:'none',background:'rgba(230,57,70,.15)',color:'#ff7b7b',cursor:'pointer',borderRadius:2,padding:'1px 0'}}>✕</button>
                        </div>
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

          {/* ── ONAY — Render bekle ── */}
          {ekran==='onay' && onayKayit && (
            <div style={{maxWidth:600}}>
              {/* Başlık */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Başlık</div>
                <input value={onayKayit.baslik} onChange={e=>onayGuncelle('baslik',e.target.value)}
                  style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
              </div>

              {/* Render durumu */}
              <div style={{marginBottom:16}}>
                {Object.entries(videoRenders).map(([fmt,r])=>(
                  <div key={fmt} style={{marginBottom:8}}>
                    {r.url && r.url.length > 10 ? (
                      <>
                        {/\.mp4/i.test(r.url)
                          ? <video src={r.url} controls preload="metadata" style={{width:'100%',maxHeight:340,borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}}/>
                          : <img src={r.url} alt="render" style={{width:'100%',maxHeight:340,objectFit:'contain',borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}} onError={e=>e.target.style.display='none'}/>
                        }
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                          <span style={{fontSize:11,color:'#00D4AA'}}>✓ Hazır</span>
                          <div style={{display:'flex',gap:4}}>
                            <a href={r.url} target="_blank" rel="noreferrer" style={{fontSize:10,color:'#4488FF',border:'0.5px solid rgba(68,136,255,.3)',padding:'2px 8px',borderRadius:4}}>Aç →</a>
                            <a href={r.url} download={/\.mp4/i.test(r.url)?'radar.mp4':'radar.jpg'} target="_blank" style={{fontSize:10,color:'#00D4AA',border:'0.5px solid rgba(0,212,170,.3)',padding:'2px 8px',borderRadius:4}}>↓ İndir</a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{padding:'14px 16px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',gap:10}}>
                        <Ic n="loader-2" size={18} style={{color:'#FFB700'}}/>
                        <div>
                          <div style={{fontSize:13,color:'#FFB700',fontWeight:500}}>İşleniyor…</div>
                          <div style={{fontSize:11,color:'rgba(255,183,0,.6)',marginTop:2}}>Hazır olunca "Yayınla" butonu aktif olacak</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Medya yoksa orijinal göster — kapak + galeri */}
                {Object.keys(videoRenders).length === 0 && onayKayit.medyalar?.length > 0 && (
                  <div>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>
                      Yüklenen medyalar ({onayKayit.medyalar.length})
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {onayKayit.medyalar.map((m,i)=>(
                        m.tip==='gorsel'
                          ? <div key={i} style={{position:'relative'}}>
                              <img src={m.url} alt="" style={{height:100,borderRadius:'var(--radius-sm)',border:`0.5px solid ${i===0?'rgba(0,212,170,.5)':'var(--border)'}`}} onError={e=>e.target.style.display='none'}/>
                              {i===0 && <div style={{position:'absolute',top:2,left:2,fontSize:8,background:'rgba(0,212,170,.85)',color:'#000',padding:'1px 4px',borderRadius:2,fontWeight:700}}>KAPAK</div>}
                            </div>
                          : <video key={i} src={m.url} controls style={{height:120,borderRadius:'var(--radius-sm)'}}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>



              {/* Yayınla butonu — render hazırsa aktif */}
              {(() => {
                const renderHazir = Object.keys(videoRenders).length === 0 ||
                  Object.values(videoRenders).every(r => r.status === 'succeeded' && r.url)
                return (
                  <button
                    onClick={()=>setEkran('yayinla')}
                    disabled={!renderHazir}
                    style={{
                      fontSize:14, fontWeight:600, padding:'10px 20px',
                      background: renderHazir ? 'rgba(0,212,170,.15)' : 'rgba(255,255,255,.05)',
                      border: `0.5px solid ${renderHazir ? 'rgba(0,212,170,.4)' : 'var(--border)'}`,
                      color: renderHazir ? '#00D4AA' : 'var(--muted)',
                      cursor: renderHazir ? 'pointer' : 'not-allowed',
                      display:'flex', alignItems:'center', gap:8, marginBottom:12,
                    }}>
                    <Ic n={renderHazir ? 'send' : 'loader-2'} size={14}/>
                    {renderHazir ? 'Yayınla & Paylaş →' : 'Render bekleniyor…'}
                  </button>
                )
              })()}

              <div style={{display:'flex',gap:8}}>
                <button onClick={sifirla} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                  <Ic n="plus" size={11}/> Yeni Giriş
                </button>
                <button onClick={()=>sil(onayKayit.id,false)} style={{fontSize:12,background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',color:'#ff7b7b'}}>
                  <Ic n="trash" size={11}/> Sil
                </button>
              </div>
            </div>
          )}

          {/* ── YAYINLA ── */}
          {ekran==='yayinla' && onayKayit && (
            <div style={{maxWidth:700,display:'flex',gap:'1.5rem',flexWrap:'wrap'}}>

              {/* Sol — önizleme */}
              <div style={{flex:'0 0 280px'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Önizleme</div>
                {Object.values(videoRenders).find(r=>r.url) ? (() => {
                  const r = Object.values(videoRenders).find(r=>r.url)
                  return /\.mp4/i.test(r.url)
                    ? <video src={r.url} controls style={{width:'100%',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border)'}}/>
                    : <img src={r.url} alt="" style={{width:'100%',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                })() : onayKayit.medyalar?.[0] && (
                  onayKayit.medyalar[0].tip==='gorsel'
                    ? <img src={onayKayit.medyalar[0].url} alt="" style={{width:'100%',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                    : <video src={onayKayit.medyalar[0].url} controls style={{width:'100%',borderRadius:'var(--radius-md)'}}/>
                )}
                <div style={{marginTop:10,fontSize:13,fontWeight:500,lineHeight:1.4}}>{onayKayit.baslik}</div>
                {/* Galeri görselleri */}
                {onayKayit.medyalar?.filter(m=>m.tip==='gorsel').length > 1 && (
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>Galeri ({onayKayit.medyalar.filter(m=>m.tip==='gorsel').length} görsel)</div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {onayKayit.medyalar.filter(m=>m.tip==='gorsel').map((m,i)=>(
                        <img key={i} src={m.url} alt="" style={{width:48,height:48,objectFit:'cover',borderRadius:'var(--radius-sm)',
                          border:`1.5px solid ${i===0?'rgba(0,212,170,.6)':'var(--border)'}`}}
                          onError={e=>e.target.style.display='none'}/>
                      ))}
                    </div>
                    <div style={{fontSize:9,color:'var(--muted)',marginTop:3}}>★ = Kapak (Creatomate şablonlu)</div>
                  </div>
                )}
              </div>

              {/* Sağ — hesap seçimi + metinler + paylaş */}
              <div style={{flex:1,minWidth:280}}>

                {/* Hesap seçimi */}
                {hesaplar.facebook?.length > 0 && (
                  <div style={{marginBottom:12,padding:'10px 12px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                    <div style={{fontSize:11,color:'#4dabf7',marginBottom:6,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      Facebook
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setSecilenFb(hesaplar.facebook.map(h=>h.page_id))} style={{fontSize:9,background:'transparent',border:'none',color:'#4dabf7',cursor:'pointer'}}>Tümü</button>
                        <button onClick={()=>setSecilenFb([])} style={{fontSize:9,background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer'}}>Temizle</button>
                      </div>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {hesaplar.facebook.map(h=>(
                        <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer',
                          padding:'4px 8px',borderRadius:4,
                          background:secilenFb.includes(h.page_id)?'rgba(77,171,247,.15)':'transparent',
                          border:`0.5px solid ${secilenFb.includes(h.page_id)?'rgba(77,171,247,.5)':'var(--border)'}`}}>
                          <input type="checkbox" style={{width:11,height:11}}
                            checked={secilenFb.includes(h.page_id)}
                            onChange={e=>setSecilenFb(p=>e.target.checked?[...p,h.page_id]:p.filter(x=>x!==h.page_id))}/>
                          <span style={{color:secilenFb.includes(h.page_id)?'#4dabf7':'var(--text)'}}>{h.page_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {hesaplar.instagram?.length > 0 && (
                  <div style={{marginBottom:12,padding:'10px 12px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                    <div style={{fontSize:11,color:'#E1306C',marginBottom:6,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      Instagram
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setSecilenIg(hesaplar.instagram.map(h=>h.ig_id))} style={{fontSize:9,background:'transparent',border:'none',color:'#E1306C',cursor:'pointer'}}>Tümü</button>
                        <button onClick={()=>setSecilenIg([])} style={{fontSize:9,background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer'}}>Temizle</button>
                      </div>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {hesaplar.instagram.map(h=>(
                        <label key={h.ig_id} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer',
                          padding:'4px 8px',borderRadius:4,
                          background:secilenIg.includes(h.ig_id)?'rgba(225,48,108,.15)':'transparent',
                          border:`0.5px solid ${secilenIg.includes(h.ig_id)?'rgba(225,48,108,.5)':'var(--border)'}`}}>
                          <input type="checkbox" style={{width:11,height:11}}
                            checked={secilenIg.includes(h.ig_id)}
                            onChange={e=>setSecilenIg(p=>e.target.checked?[...p,h.ig_id]:p.filter(x=>x!==h.ig_id))}/>
                          <span style={{color:secilenIg.includes(h.ig_id)?'#E1306C':'var(--text)'}}>@{h.username}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metinler */}
                {[
                  ['ig_metni','Instagram Metni','#E1306C'],
                  ['fb_metni','Facebook Metni','#4dabf7'],
                  ['tw_metni','Twitter/X Metni','#1da1f2'],
                ].map(([alan,label,renk])=>(
                  <div key={alan} style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:renk,marginBottom:3,fontWeight:500}}>{label}</div>
                    <textarea value={onayKayit[alan]||''} onChange={e=>onayGuncelle(alan,e.target.value)}
                      rows={alan==='ig_metni'?4:2}
                      style={{width:'100%',fontSize:12,resize:'vertical',boxSizing:'border-box'}}/>
                    {alan==='tw_metni' && <div style={{fontSize:10,color:(onayKayit[alan]||'').length>260?'#ff7b7b':'var(--muted)',textAlign:'right'}}>{(onayKayit[alan]||'').length}/280</div>}
                  </div>
                ))}

                {/* Instagram Kolaboratör */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:'#E1306C',marginBottom:3}}>
                    Instagram Kolaboratör <span style={{opacity:.6,color:'var(--muted)'}}>(virgülle ayır, @ olmadan)</span>
                  </div>
                  <input value={radarKolabor} onChange={e=>setRadarKolabor(e.target.value)}
                    placeholder="ornek_hesap, diger_hesap"
                    style={{width:'100%',fontSize:12,boxSizing:'border-box'}}/>
                  {radarKolabor && <div style={{fontSize:10,color:'#4dabf7',marginTop:3}}>
                    ℹ️ Davet Instagram DM olarak gelir · Çalışması için karşı hesabın Instagram → Ayarlar → Gizlilik → Etiketler → <b>Kolaboratör davetleri: Herkese izin ver</b> seçili olmalı
                  </div>}
                </div>

                {/* Paylaş butonları */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap',paddingTop:10,borderTop:'0.5px solid var(--border)',marginTop:4}}>
                  {[['facebook','FB','#4dabf7'],['instagram','IG','#E1306C'],['twitter','𝕏','#1da1f2']].map(([p,l,renk])=>(
                    <button key={p} disabled={paylasiyor} onClick={()=>paylas(onayKayit,[p],secilenFb,secilenIg)}
                      style={{fontSize:12,padding:'6px 14px',background:`${renk}18`,border:`0.5px solid ${renk}55`,color:renk,fontWeight:500}}>
                      {paylasiyor?<Ic n="loader-2" size={11}/>:null} {l}
                    </button>
                  ))}
                  <button disabled={paylasiyor} onClick={()=>paylas(onayKayit,['facebook','instagram'],secilenFb,secilenIg)}
                    style={{fontSize:12,padding:'6px 14px',background:'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.35)',color:'#00D4AA',fontWeight:500}}>
                    <Ic n="send" size={11}/> FB + IG
                  </button>
                  <button disabled={paylasiyor} onClick={()=>paylas(onayKayit,['facebook','instagram','twitter'],secilenFb,secilenIg)}
                    style={{fontSize:12,padding:'6px 14px',background:'rgba(255,255,255,.05)',border:'0.5px solid var(--border)',color:'var(--muted)'}}>
                    Tümü
                  </button>
                </div>

                {/* Paylaşım sonucu */}
                {hata && <div style={{marginTop:8,fontSize:12,color:'#ff7b7b',padding:'6px 10px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)'}}>{hata}</div>}
                {pSonuc && (
                  <div style={{marginTop:8,padding:'8px 12px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',borderRadius:'var(--radius-sm)'}}>
                    <div style={{fontSize:12,color:'#00D4AA',fontWeight:600,marginBottom:4}}>✓ Paylaşım tamamlandı!</div>
                    {pSonuc.meta?.facebook && Object.entries(pSonuc.meta.facebook).map(([pid,s])=>(
                      <div key={pid} style={{fontSize:11,color:'var(--muted)'}}>FB: {s.post_id?`✓ ${s.page_name||pid}`:`✗ ${s.hata||'hata'}`}</div>
                    ))}
                    {pSonuc.meta?.instagram && Object.entries(pSonuc.meta.instagram).map(([igid,s])=>(
                      <div key={igid} style={{fontSize:11,color:'var(--muted)'}}>IG: {s.post_id?`✓ @${s.username||igid}`:`✗ ${s.hata||'hata'}`}</div>
                    ))}
                    {pSonuc.twitter?.basarili && <div style={{fontSize:11,color:'var(--muted)'}}>𝕏: ✓ Tweet atıldı</div>}
                  </div>
                )}

                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button onClick={()=>setEkran('onay')} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                    ← Geri
                  </button>
                  <button onClick={sifirla} style={{fontSize:12,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
                    <Ic n="plus" size={11}/> Yeni Giriş
                  </button>
                </div>
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

              {/* Render önizleme — creatomate çıktısı */}
              {seciliKayit.creatomate?.length > 0 && (
                <div style={{marginBottom:12}}>
                  {seciliKayit.creatomate.map(r=>(
                    <div key={r.format||r.render_id} style={{marginBottom:8}}>
                      {r.url && r.url.length > 10 ? (
                        // Render hazır — göster
                        <>
                          {/\.mp4/i.test(r.url) ? (
                            <video src={r.url} controls preload="metadata"
                              style={{width:'100%',maxHeight:400,borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}}/>
                          ) : (
                            <img src={r.url} alt="render"
                              style={{width:'100%',maxHeight:400,objectFit:'contain',borderRadius:'var(--radius-md)',border:'0.5px solid rgba(0,212,170,.3)',background:'#000'}}
                              onError={e=>e.target.style.display='none'}/>
                          )}
                          <div style={{display:'flex',gap:6,marginTop:4}}>
                            <a href={r.url} target="_blank" rel="noreferrer"
                              style={{fontSize:10,color:'#4488FF',border:'0.5px solid rgba(68,136,255,.3)',padding:'2px 8px',borderRadius:4}}>Aç →</a>
                            <a href={r.url} download={/\.mp4/i.test(r.url)?'radar.mp4':'radar.jpg'} target="_blank"
                              style={{fontSize:10,color:'#00D4AA',border:'0.5px solid rgba(0,212,170,.3)',padding:'2px 8px',borderRadius:4}}>↓ İndir</a>
                          </div>
                        </>
                      ) : r.status==='failed' ? (
                        <div style={{padding:'8px 12px',background:'rgba(230,57,70,.06)',border:'0.5px solid rgba(230,57,70,.2)',borderRadius:'var(--radius-md)',fontSize:12,color:'#ff7b7b'}}>
                          ✗ Render başarısız
                        </div>
                      ) : (
                        // Henüz hazır değil — bekle
                        <div style={{padding:'10px 14px',background:'rgba(255,183,0,.06)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',gap:8}}>
                          <Ic n="loader-2" size={14} style={{color:'#FFB700'}}/>
                          <div>
                            <div style={{fontSize:12,color:'#FFB700',fontWeight:500}}>İşleniyor…</div>
                            <div style={{fontSize:10,color:'rgba(255,183,0,.6)',marginTop:2}}>Hazır olunca otomatik görünecek</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Orijinal medyalar — render yoksa göster */}
              {(!seciliKayit.creatomate?.length) && seciliKayit.medyalar?.length > 0 && (
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  {seciliKayit.medyalar.map((m,i)=>(
                    m.tip==='gorsel'
                      ? <img key={i} src={m.url} alt="" style={{height:80,borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                      : <video key={i} src={m.url} controls style={{height:120,borderRadius:'var(--radius-sm)',border:'0.5px solid var(--border)'}}/>
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

              {/* Hesap seçimi */}
              {hesaplar.facebook?.length > 0 && (
                <div style={{marginBottom:8,padding:'8px 10px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:10,color:'#4dabf7',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                    Facebook
                    <span style={{display:'flex',gap:6}}>
                      <button onClick={()=>setSecilenFb(hesaplar.facebook.map(h=>h.page_id))} style={{fontSize:9,background:'transparent',border:'none',color:'#4dabf7',cursor:'pointer'}}>Tümü</button>
                      <button onClick={()=>setSecilenFb([])} style={{fontSize:9,background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer'}}>Temizle</button>
                    </span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {hesaplar.facebook.map(h=>(
                      <label key={h.page_id} style={{display:'flex',alignItems:'center',gap:3,fontSize:11,cursor:'pointer',
                        padding:'2px 6px',borderRadius:3,
                        background:secilenFb.includes(h.page_id)?'rgba(77,171,247,.12)':'transparent',
                        border:`0.5px solid ${secilenFb.includes(h.page_id)?'rgba(77,171,247,.4)':'var(--border)'}`}}>
                        <input type="checkbox" style={{width:10,height:10}}
                          checked={secilenFb.includes(h.page_id)}
                          onChange={e=>setSecilenFb(p=>e.target.checked?[...p,h.page_id]:p.filter(x=>x!==h.page_id))}/>
                        <span style={{color:secilenFb.includes(h.page_id)?'#4dabf7':'var(--text)'}}>{h.page_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {hesaplar.instagram?.length > 0 && (
                <div style={{marginBottom:8,padding:'8px 10px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:10,color:'#E1306C',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                    Instagram
                    <span style={{display:'flex',gap:6}}>
                      <button onClick={()=>setSecilenIg(hesaplar.instagram.map(h=>h.ig_id))} style={{fontSize:9,background:'transparent',border:'none',color:'#E1306C',cursor:'pointer'}}>Tümü</button>
                      <button onClick={()=>setSecilenIg([])} style={{fontSize:9,background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer'}}>Temizle</button>
                    </span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {hesaplar.instagram.map(h=>(
                      <label key={h.ig_id} style={{display:'flex',alignItems:'center',gap:3,fontSize:11,cursor:'pointer',
                        padding:'2px 6px',borderRadius:3,
                        background:secilenIg.includes(h.ig_id)?'rgba(225,48,108,.12)':'transparent',
                        border:`0.5px solid ${secilenIg.includes(h.ig_id)?'rgba(225,48,108,.4)':'var(--border)'}`}}>
                        <input type="checkbox" style={{width:10,height:10}}
                          checked={secilenIg.includes(h.ig_id)}
                          onChange={e=>setSecilenIg(p=>e.target.checked?[...p,h.ig_id]:p.filter(x=>x!==h.ig_id))}/>
                        <span style={{color:secilenIg.includes(h.ig_id)?'#E1306C':'var(--text)'}}>@{h.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Paylaş */}
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12,paddingTop:8,borderTop:'0.5px solid var(--border)'}}>
                {[['facebook','FB','#4dabf7'],['instagram','IG','#E1306C'],['twitter','𝕏','#1da1f2']].map(([p,l,renk])=>(
                  <button key={p} disabled={paylasiyor} onClick={()=>paylas(seciliKayit,[p],secilenFb,secilenIg)}
                    style={{fontSize:12,padding:'5px 12px',background:`${renk}11`,border:`0.5px solid ${renk}44`,color:renk}}>{paylasiyor?'...':l}</button>
                ))}
                <button disabled={paylasiyor} onClick={()=>paylas(seciliKayit,['facebook','instagram'],secilenFb,secilenIg)}
                  style={{fontSize:12,padding:'5px 12px',background:'rgba(0,212,170,.12)',border:'0.5px solid rgba(0,212,170,.3)',color:'#00D4AA'}}>
                  <Ic n="send" size={11}/> FB + IG
                </button>
              </div>

              {pSonuc && (
                <div style={{marginBottom:10,padding:'8px 12px',background:'rgba(0,212,170,.08)',border:'0.5px solid rgba(0,212,170,.3)',borderRadius:'var(--radius-sm)'}}>
                  <div style={{fontSize:12,color:'#00D4AA',fontWeight:600,marginBottom:4}}>✓ Paylaşım tamamlandı!</div>
                  {pSonuc.meta?.facebook && Object.entries(pSonuc.meta.facebook).map(([pid,s])=>(
                    <div key={pid} style={{fontSize:11,color:'var(--muted)'}}>
                      FB: {s.post_id ? `✓ ${s.page_name||pid}` : `✗ ${s.hata||'hata'}`}
                    </div>
                  ))}
                  {pSonuc.meta?.instagram && Object.entries(pSonuc.meta.instagram).map(([igid,s])=>(
                    <div key={igid} style={{fontSize:11,color:'var(--muted)'}}>
                      IG: {s.post_id ? `✓ @${s.username||igid}` : `✗ ${s.hata||'hata'}`}
                    </div>
                  ))}
                  {pSonuc.twitter?.basarili && <div style={{fontSize:11,color:'var(--muted)'}}>𝕏: ✓ Tweet atıldı</div>}
                </div>
              )}
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
function ManuelHaberModul({ user, onGeri, prefill }) {
  const [ekran,      setEkran]    = useState('giris') // 'giris' | 'isleme' | 'sonuc'
  const [baslik,     setBaslik]   = useState('')
  const [metin,      setMetin]    = useState('')
  const [kategori,   setKategori] = useState('Güncel')

  // Zeka modülünden gelen pre-fill
  useEffect(() => {
    if (!prefill) return
    if (prefill.baslik)    setBaslik(prefill.baslik)
    if (prefill.metin)     setMetin(prefill.metin)
    if (prefill.kategori)  setKategori(prefill.kategori)
    // Kaynak gorsel varsa medyalar listesine ekle
    if (prefill.gorsel_url) {
      setMedyalar([{ url: prefill.gorsel_url, tip: 'gorsel', adi: 'kaynak_gorsel.jpg', kapak: true }])
    }
  }, [prefill])
  const [medyalar,   setMedyalar] = useState([])
  const [yukleniyorM,setYukM]     = useState(false)
  const [yukProgress, setYukProgress] = useState(0)
  const [isleniyor,  setIsleniyor]= useState(false)
  const [sonuc,      setSonuc]    = useState(null) // işlenmiş kayit
  const [hata,       setHata]     = useState(null)
  const [videoRenders,setVideoR]  = useState({})
  const fileRef = useRef(null)
  const token   = localStorage.getItem('cms_token') || ''

  const KATEGORILER = ['Güncel','Asayiş','Spor','Ekonomi','Sağlık','Eğitim','Siyaset','Kültür','Turizm','Belediye Haberleri']

  // Büyük dosya multipart upload (>50MB) — R2 Native Multipart API
  const chunkUpload = async (file) => {
    const token  = localStorage.getItem('cms_token') || ''
    const CHUNK  = 5 * 1024 * 1024  // 5MB minimum (R2 şartı)

    // 1. Upload başlat
    const startRes = await fetch('/api/r2-upload-chunk?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': token },
      body: JSON.stringify({ filename: file.name, type: file.type }),
    })
    const startData = await startRes.json()
    if (startData.hata) throw new Error(startData.hata)
    const { uploadId, key, final_url } = startData

    // 2. Parçaları yükle
    const total = Math.ceil(file.size / CHUNK)
    const parts = []
    for (let i = 0; i < total; i++) {
      const buf  = await file.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer()
      const res  = await fetch(
        `/api/r2-upload-chunk?action=part&uploadId=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&part=${i + 1}`,
        { method: 'POST', headers: { 'X-Token': token }, body: buf }
      )
      const data = await res.json()
      if (data.hata) { 
        // Abort
        fetch('/api/r2-upload-chunk?action=abort', { method:'POST', headers:{'Content-Type':'application/json','X-Token':token}, body: JSON.stringify({uploadId, key}) })
        throw new Error(data.hata) 
      }
      parts.push({ partNumber: i + 1, etag: data.etag })
      setYukProgress(Math.round((i + 1) / total * 100))
    }

    // 3. Tamamla
    const finishRes = await fetch('/api/r2-upload-chunk?action=finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': token },
      body: JSON.stringify({ uploadId, key, parts }),
    })
    const finishData = await finishRes.json()
    if (finishData.hata) throw new Error(finishData.hata)
    return finishData.url
  }

  // Dosya yükle — R2'ye multipart upload
  const dosyaSec = async (files) => {
    setYukM(true); setHata(null); setYukProgress(0)
    const sid = `manuel_${Date.now()}`
    const yeni = []
    for (const file of Array.from(files)) {
      try {
        const tip = file.type.startsWith('video') ? 'video' : 'gorsel'
        let url   = null

        if (file.size > 50 * 1024 * 1024) {
          // 50MB üzeri — chunk upload
          url = await chunkUpload(file)
        } else {
          // Normal yükleme
          const form = new FormData()
          form.append('file', file)
          form.append('source_id', sid)
          form.append('tip', tip)
          const r = await fetch('/api/medya-yukle', { method:'POST', body:form })
          const d = await r.json()
          url = d.url
          if (!url) { setHata(`${file.name}: ${d.hata||'Yükleme hatası'}`); continue }
        }

        if (url) yeni.push({ url, tip, adi:file.name, mime:file.type })
      } catch(e) { setHata(e.message) }
    }
    setMedyalar(p => {
      const tumu = [...p, ...yeni.map((m,i) => ({ ...m, kapak: p.length===0 && i===0 }))]
      if (!tumu.some(x=>x.kapak) && tumu.length > 0) tumu[0].kapak = true
      return tumu
    })
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
      // Medyaları kayite ekle — galeri paylaşımı için
      const kayitWithMedia = {
        ...data.kayit,
        gorsel_url: medyalar.find(m=>m.kapak&&m.tip==='gorsel')?.url || medyalar.find(m=>m.tip==='gorsel')?.url || data.kayit.gorsel_url,
        galeriMedyalar: medyalar,
      }
      setSonuc(kayitWithMedia)
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
                      <div key={i} style={{position:'relative',width:80}}>
                        {m.tip==='gorsel'
                          ? <img src={m.url} alt="" style={{width:80,height:60,objectFit:'cover',borderRadius:'var(--radius-sm)',
                              border:`1.5px solid ${m.kapak?'rgba(0,212,170,.6)':'var(--border)'}`}} onError={e=>e.target.style.display='none'}/>
                          : <div style={{width:80,height:60,background:'rgba(230,57,70,.1)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <Ic n="player-play" size={18} style={{color:'#ff7b7b'}}/>
                            </div>
                        }
                        {m.kapak && <div style={{position:'absolute',top:2,left:2,fontSize:7,background:'rgba(0,212,170,.85)',color:'#000',padding:'1px 3px',borderRadius:2,fontWeight:700}}>KAPAK</div>}
                        <div style={{display:'flex',gap:1,marginTop:2}}>
                          {!m.kapak && m.tip==='gorsel' && (
                            <button onClick={()=>setMedyalar(p=>p.map((x,j)=>({...x,kapak:j===i})))} title="Kapak yap"
                              style={{flex:1,fontSize:8,border:'none',background:'rgba(0,212,170,.15)',color:'#00D4AA',cursor:'pointer',borderRadius:2,padding:'1px 0'}}>★</button>
                          )}
                          <button onClick={()=>setMedyalar(p=>{const f=p.filter((_,j)=>j!==i);if(f.length&&!f.some(x=>x.kapak))f[0].kapak=true;return f})}
                            style={{flex:1,fontSize:8,border:'none',background:'rgba(230,57,70,.15)',color:'#ff7b7b',cursor:'pointer',borderRadius:2,padding:'1px 0'}}>✕</button>
                        </div>
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
    const API_KEY = (import.meta.env?.VITE_RSS_API_KEY || 'de8a5c6b22ee4b60adc0ec449d3c50a6bce94ea899e7cff30b83590ecb316133402db1876b489c7ba3447eccd5a6a379')
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
// ── GALERİ OLUŞTUR MODÜLÜ ────────────────────────────────────────────────────
function GaleriModul({ user, onGeri }) {
  const token = localStorage.getItem('cms_token') || ''

  // Sekme: 'kayserim' | 'radar'
  const [sekme,      setSekme]    = useState('kayserim')
  const [medyaTipi,  setMedyaTipi] = useState('foto')  // 'foto' | 'video'

  // Form alanları
  const [baslik,     setBaslik]   = useState('')
  const [spotBaslik, setSpot]     = useState('')
  const [kategori,   setKategori] = useState('GÜNCEL')

  // 1ha akışı
  const [akisHaberler, setAkisHaberler] = useState([])
  const [akisYukleniyor, setAkisYuk]   = useState(false)
  const [secilenAkis,   setSecilenAkis] = useState(null)

  const akisYukle = async () => {
    setAkisYuk(true)
    try {
      const _oiToken2 = localStorage.getItem('cms_token') || ''
      const res  = await fetch('/api/oto-isle?liste=1&adet=20&secret='+_oiToken2)
      const data = await res.json()
      if (data.haberler) setAkisHaberler(data.haberler)
      else if (Array.isArray(data)) setAkisHaberler(data)
    } catch(e) {}
    setAkisYuk(false)
  }

  const akisSecHaber = (haber) => {
    if (!haber) {
      setSecilenAkis(null)
      setMedyaSync([])
      return
    }
    setSecilenAkis(haber)
    setBaslik(haber.baslik || '')
    setSpot(haber.icerik?.substring(0, 120) || '')
    setKategori(haber.kategori || 'GÜNCEL')

    // Görselleri otomatik yükle — ilki kapak
    const gorseller = haber.gorseller?.length > 0
      ? haber.gorseller
      : haber.gorsel ? [haber.gorsel] : []
    const video = haber.video || ''

    const medyaListesi = []
    // Görseller
    gorseller.forEach((url, i) => {
      medyaListesi.push({ url, tip: 'gorsel', adi: `haber_gorsel_${i+1}.jpg`, kapak: i === 0 && !video })
    })
    // Video varsa ekle
    if (video) {
      medyaListesi.unshift({ url: video, tip: 'video', adi: 'haber_video.mp4', kapak: true })
    }

    setMedyaSync(medyaListesi)
    setSonuc(null)
    setHata(null)
  }

  // Medyalar: [{ url, tip: 'gorsel'|'video', kapak: bool }]
  const [medyalar,   setMedyalar] = useState([])
  const medyaRef = useRef([])
  const setMedyaSync = (v) => { medyaRef.current = typeof v === 'function' ? v(medyaRef.current) : v; setMedyalar(v) }

  // Render durumu
  const [isliyor,    setIsliyor]  = useState(false)
  const [sonuc,      setSonuc]    = useState(null)   // { kapak, diger[] }
  const [hata,       setHata]     = useState(null)

  // Paylaşım
  const [paylasSayfa, setPaylas]  = useState(false)

  const fileRef = useRef(null)

  // Görsel/video yükle
  const yukle = async (files) => {
    setHata(null)
    for (const file of Array.from(files)) {
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('source_id', `galeri_${Date.now()}`)
        form.append('tip', file.type.startsWith('video') ? 'video' : 'gorsel')
        const res  = await fetch('/api/medya-yukle', { method: 'POST', body: form })
        const data = await res.json()
        if (data.url) {
          const tip = file.type.startsWith('video') ? 'video' : 'gorsel'
          setMedyaSync(prev => {
            const yeni = [...prev, { url: data.url, tip, kapak: prev.length === 0 }]
            return yeni
          })
        }
      } catch(e) { setHata(e.message) }
    }
  }

  const kapakSec = (i) => {
    setMedyaSync(prev => prev.map((m, j) => ({ ...m, kapak: j === i })))
  }

  const sil = (i) => {
    setMedyaSync(prev => {
      const yeni = prev.filter((_, j) => j !== i)
      if (yeni.length > 0 && !yeni.some(m => m.kapak)) yeni[0].kapak = true
      return yeni
    })
  }

  const renderAl = async () => {
    const snap = medyaRef.current.length > 0 ? medyaRef.current : medyalar
    const kapak = snap.find(m => m.kapak)
    if (!kapak) { setHata('Kapak seçin'); return }
    if (!baslik.trim()) { setHata('Başlık girin'); return }

    setIsliyor(true); setHata(null); setSonuc(null)
    try {
      const diger = snap.filter(m => !m.kapak)
      const sid = `galeri_${Date.now()}`
      const res = await fetch('/api/galeri-olustur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify({
          kaynak:      sekme,
          medya_tipi:  kapak.tip === 'video' ? 'video' : 'foto',
          kapak:       { url: kapak.url, tip: kapak.tip },
          diger:       diger.map(m => ({ url: m.url, tip: m.tip })),
          baslik, spot_baslik: spotBaslik, kategori, source_id: sid,
        }),
      })
      const data = await res.json()
      if (data.hata) throw new Error(data.hata)

      // Render başlatıldı — poll et
      if (data.bekliyor && data.renderlar?.length > 0) {
        const renderIds = data.renderlar.map(r => r.render_id)
        const kapakUrl  = data.kaynak_kapak
        const digerUrls = data.kaynak_diger || []

        // Poll — 3 saniyede bir max 40 deneme (2 dakika)
        let deneme = 0
        const poll = async () => {
          deneme++
          const pRes  = await fetch(`/api/galeri-olustur?render_ids=${renderIds.join(',')}&source_id=${sid}`)
          const pData = await pRes.json()
          if (pData.tamam) {
            // Render tamamlandı
            const kapakRender = pData.renderlar[0]
            const digerRender = pData.renderlar.slice(1)
            setSonuc({
              kapak: { kaynak_url: kapakUrl, render_url: kapakRender.url, tip: data.kapak_tip },
              diger: digerUrls.map((url, i) => ({ kaynak_url: url, render_url: digerRender[i]?.url || url })),
            })
            setIsliyor(false)
          } else if (pData.hata || deneme >= 40) {
            setHata(pData.hata ? 'Render başarısız' : 'Render zaman aşımı — tekrar dene')
            setIsliyor(false)
          } else {
            setTimeout(poll, 3000)
          }
        }
        setTimeout(poll, 4000)
      } else {
        setHata('Render başlatılamadı')
        setIsliyor(false)
      }
    } catch(e) { setHata(e.message); setIsliyor(false) }
  }

  // Paylaşım sayfasına geç
  if (paylasSayfa && sonuc) {
    const kapakUrl  = sonuc.kapak.render_url || sonuc.kapak.kaynak_url
    const isVideoKapak = sonuc.kapak.tip === 'video'
    const tumUrller = [
      kapakUrl,
      ...sonuc.diger.map(d => d.render_url || d.kaynak_url),
    ].filter(Boolean)

    // Video kapak için videoRenders — MetaPaylas bunu video olarak gönderir
    const galeriVideoRenders = isVideoKapak ? { dikey: { url: kapakUrl } } : {}

    return (
      <div style={{padding:'1.25rem'}}>
        <button onClick={()=>setPaylas(false)}
          style={{background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',marginBottom:12,fontSize:13}}>
          ← Geri
        </button>
        <div style={{fontWeight:600,marginBottom:12}}>Galeri Paylaş — {tumUrller.length} {isVideoKapak ? 'video/görsel' : 'görsel'}</div>
        <MetaPaylas
          content={{ baslik, site_basligi: baslik }}
          gorselUrls={{
            instagram: '',
            facebook:  '',
            twitter:   '',
          }}
          videoRenders={galeriVideoRenders}
          selectedHaber={isVideoKapak
            ? { video: kapakUrl, video_dikey: kapakUrl, gorsel_url: '', gorsel: '' }
            : { gorsel_url: '', gorsel: '', video: null }}
          galeriGorseller={tumUrller.map((url,i) => ({ url, kapak: i===0 }))}
          galeriRenderler={tumUrller.map(url => ({ kaynak_url: url, url }))}
          kayserimLink=""
        />
      </div>
    )
  }

  return (
    <div style={{padding:'1.25rem',maxWidth:640,margin:'0 auto'}}>
      {/* Başlık */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem'}}>
        <button onClick={onGeri}
          style={{background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:13}}>
          ← Menü
        </button>
        <div style={{fontWeight:600,fontSize:16}}>🖼 Galeri Oluştur</div>
      </div>

      {/* Sekme */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[['kayserim','Kayserim.net','#00D4AA'],['radar','Kayseradar','#E63946']].map(([id,lbl,renk])=>(
          <button key={id} onClick={()=>{
              setSekme(id)
              setSonuc(null)
              setHata(null)
              // Radar sekmesine geçince 1ha verilerini temizle
              if (id === 'radar') {
                setBaslik('')
                setSpot('')
                setKategori('GÜNCEL')
                setMedyaSync([])
                setSecilenAkis(null)
              }
              // Kayserim sekmesine geçince radar verilerini temizle
              if (id === 'kayserim') {
                setBaslik('')
                setSpot('')
                setKategori('GÜNCEL')
                setMedyaSync([])
              }
            }}
            style={{flex:1,padding:'8px 0',fontSize:13,fontWeight:600,
              background: sekme===id ? `rgba(${id==='kayserim'?'0,212,170':'230,57,70'},.15)` : 'transparent',
              border: `1.5px solid ${sekme===id ? renk : 'var(--border)'}`,
              color: sekme===id ? renk : 'var(--muted)', cursor:'pointer', borderRadius:6}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* 1ha Akışından Haber Seç — sadece kayserim */}
      {sekme === 'kayserim' && (
        <div style={{marginBottom:12,background:'rgba(255,183,0,.05)',border:'0.5px solid rgba(255,183,0,.2)',borderRadius:6,padding:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{fontSize:11,color:'#FFB700',fontWeight:500}}>📡 1ha Akışından Seç</div>
            <button onClick={akisYukle} disabled={akisYukleniyor}
              style={{fontSize:10,padding:'2px 8px',background:'rgba(255,183,0,.1)',
                border:'0.5px solid rgba(255,183,0,.3)',color:'#FFB700',cursor:'pointer',borderRadius:4}}>
              {akisYukleniyor ? '⏳' : '🔄 Yükle'}
            </button>
            {secilenAkis && (
              <button onClick={()=>akisSecHaber(null)}
                style={{fontSize:10,padding:'2px 8px',background:'transparent',
                  border:'0.5px solid var(--border)',color:'var(--muted)',cursor:'pointer',borderRadius:4}}>
                ✕ Temizle
              </button>
            )}
          </div>
          {akisHaberler.length > 0 && (
            <select onChange={e=>{
                const h = akisHaberler.find((_,i)=>String(i)===e.target.value)
                akisSecHaber(h || null)
              }}
              style={{width:'100%',fontSize:12,padding:'5px',background:'var(--bg)',
                border:'0.5px solid var(--border)',color:'var(--text)',borderRadius:4}}>
              <option value="">— Haber seç —</option>
              {akisHaberler.map((h,i)=>(
                <option key={i} value={String(i)}>
                  {h.baslik?.substring(0,70)}
                </option>
              ))}
            </select>
          )}
          {secilenAkis?.gorsel && (
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
              <img src={secilenAkis.gorsel} alt="" style={{width:48,height:36,objectFit:'cover',borderRadius:3}}/>
              <div style={{fontSize:10,color:'var(--muted)'}}>{secilenAkis.baslik?.substring(0,60)}</div>
            </div>
          )}
        </div>
      )}

      {/* Form alanları */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Başlık *</div>
        <input value={baslik} onChange={e=>setBaslik(e.target.value)} placeholder="Haber başlığı..."
          style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
      </div>

      {sekme === 'kayserim' && (<>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Spot Başlık</div>
          <input value={spotBaslik} onChange={e=>setSpot(e.target.value)} placeholder="Spot açıklama..."
            style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>Kategori</div>
          <input value={kategori} onChange={e=>setKategori(e.target.value)} placeholder="GÜNCEL"
            style={{width:'100%',fontSize:13,boxSizing:'border-box'}}/>
        </div>
      </>)}

      {/* Medya yükleme */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>
          Görsel / Video Ekle
          <span style={{opacity:.6,marginLeft:6}}>(ilk eklenen veya ⭐ seçtiğin kapak olur)</span>
        </div>
        <div onClick={()=>fileRef.current?.click()}
          style={{border:'1.5px dashed var(--border)',borderRadius:6,padding:'14px',
            textAlign:'center',cursor:'pointer',color:'var(--muted)',fontSize:12,marginBottom:10,
            background:'rgba(255,255,255,.02)'}}>
          📎 Dosya seç veya sürükle bırak
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{display:'none'}}
          onChange={e=>{ yukle(e.target.files); e.target.value='' }}/>

        {/* Medya listesi */}
        {medyalar.length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {medyalar.map((m,i)=>(
              <div key={i} style={{position:'relative',width:90,borderRadius:6,overflow:'hidden',
                border:`2px solid ${m.kapak?'rgba(0,212,170,.8)':'rgba(255,255,255,.15)'}`,cursor:'pointer'}}
                onClick={()=>kapakSec(i)}>
                {m.tip==='video'
                  ? <video src={m.url} style={{width:'100%',height:70,objectFit:'cover'}}/>
                  : <img src={m.url} alt="" style={{width:'100%',height:70,objectFit:'cover'}}/>
                }
                <div style={{position:'absolute',bottom:0,left:0,right:0,
                  background:'rgba(0,0,0,.65)',fontSize:9,padding:'2px 5px',
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>{m.kapak ? '⭐ Kapak' : `${i+1}.`}</span>
                  <span onClick={e=>{e.stopPropagation();sil(i)}}
                    style={{color:'#ff7b7b',cursor:'pointer',fontWeight:700}}>✕</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hata && <div style={{color:'#ff7b7b',fontSize:12,marginBottom:10}}>⚠ {hata}</div>}

      {/* Render butonu */}
      <button onClick={renderAl} disabled={isliyor || medyalar.length===0}
        style={{width:'100%',padding:'10px',fontSize:13,fontWeight:600,
          background: isliyor||medyalar.length===0 ? 'rgba(0,212,170,.1)' : 'rgba(0,212,170,.2)',
          border:'1px solid rgba(0,212,170,.5)',color:'#00D4AA',
          cursor: isliyor||medyalar.length===0 ? 'not-allowed':'pointer',borderRadius:6,marginBottom:14}}>
        {isliyor ? '⏳ Render hazırlanıyor…' : '🎬 Render Al'}
      </button>

      {/* Önizleme */}
      {sonuc && !isliyor && (
        <div style={{background:'rgba(0,212,170,.05)',border:'1px solid rgba(0,212,170,.2)',
          borderRadius:8,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:'#00D4AA',marginBottom:10}}>
            ✓ Render Tamamlandı — {1+sonuc.diger.length} görsel
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
            {/* Kapak */}
            <div style={{position:'relative',width:120,borderRadius:6,overflow:'hidden',
              border:'2px solid rgba(0,212,170,.7)'}}>
              {sonuc.kapak.tip==='video'
                ? <video src={sonuc.kapak.render_url} controls style={{width:'100%',height:90,objectFit:'cover'}}/>
                : <img src={sonuc.kapak.render_url} alt="" style={{width:'100%',height:90,objectFit:'cover'}}
                    onError={e=>e.target.src=sonuc.kapak.kaynak_url}/>
              }
              <div style={{position:'absolute',bottom:0,left:0,right:0,
                background:'rgba(0,0,0,.7)',color:'#00D4AA',fontSize:9,padding:'2px 5px'}}>
                ⭐ Kapak
              </div>
            </div>
            {/* Diğerleri */}
            {sonuc.diger.map((d,i)=>(
              <div key={i} style={{position:'relative',width:90,borderRadius:6,overflow:'hidden',
                border:'1.5px solid rgba(255,255,255,.2)'}}>
                <img src={d.render_url||d.kaynak_url} alt=""
                  style={{width:'100%',height:90,objectFit:'cover'}}
                  onError={e=>e.target.src=d.kaynak_url}/>
                <div style={{position:'absolute',bottom:0,left:0,right:0,
                  background:'rgba(0,0,0,.7)',color:d.render_url?'#00D4AA':'#888',fontSize:9,padding:'2px 5px'}}>
                  {d.render_url?'✓ Render':`${i+2}.`}
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>setPaylas(true)}
            style={{width:'100%',padding:'10px',fontSize:13,fontWeight:600,
              background:'rgba(0,212,170,.2)',border:'1px solid rgba(0,212,170,.5)',
              color:'#00D4AA',cursor:'pointer',borderRadius:6}}>
            ✓ Paylaşıma Geç →
          </button>
        </div>
      )}
    </div>
  )
}


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


// ── ZEKA MODÜLÜ — İçerik Zekası ──────────────────────────────────────────────
function ZekaModul({ user, onGeri, onManuelAc }) {
  const [tarama,      setTarama]    = useState(null)
  const [sezonsal,    setSezonsal]  = useState([])
  const [yukT,        setYukT]      = useState(true)
  const [olusturan,   setOlusturan] = useState(null) // link string
  const [reklamYapan, setReklamY]   = useState(null)
  const [hata,        setHata]      = useState(null)
  const [reklamSonuc, setRS]        = useState(null)
  const timerRef = useRef(null)

  const tara = async () => {
    setYukT(true); setHata(null)
    try {
      const [sRes, seRes] = await Promise.all([
        fetch('/api/zeka-motor?action=scan'),
        fetch('/api/zeka-motor?action=seasonal'),
      ])
      setTarama(await sRes.json())
      const sd = await seRes.json()
      setSezonsal(sd.seasonal_active || [])
    } catch(e) { setHata(e.message) }
    setYukT(false)
  }

  useEffect(() => {
    tara()
    timerRef.current = setInterval(tara, 5 * 60 * 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Claude ile haber taslağı — baslik+metin üret, Manuel modülüne ilet
  const olustur = async (haber) => {
    setOlusturan(haber.link)
    try {
      const match    = haber.keyword_matches?.[0]
      const keyword  = match?.matched_keyword || ''
      const volume   = match?.volume || 0
      const desc     = haber.description?.replace(/<[^>]*>/g,'').slice(0,500) || ''

      const prompt = `Sen kayserim.net yerel haber editörüsün. Aşağıdaki haber kaynağını kullanarak SEO uyumlu, Kayseri merkezli bir haber yaz.

KAYNAK: ${haber.title}
ÖZET: ${desc}

HEDEF ANAHTAR KELİME: "${keyword}" (aylık ${volume} arama, KD=${match?.kd || 0})

KURALLAR:
- Başlıkta anahtar kelime geçmeli
- 250-400 kelime
- Kayseri bağlantısı kur
- Sadece JSON döndür, başka hiçbir şey yazma

{"baslik":"...","metin":"...","kategori":"Güncel"}`

      const res  = await fetch('/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          messages: [{ role:'user', content: prompt }]
        })
      })
      const data = await res.json()
      // Hata kontrolü
      if (data.error) throw new Error(data.error?.message || JSON.stringify(data.error))
      const raw  = data.content?.[0]?.text || ''
      const jm   = raw.match(/\{[\s\S]*\}/)
      if (!jm) throw new Error('JSON parse hatası')
      const parsed = JSON.parse(jm[0])

      // Manuel modülüne pre-fill ile geç — gorsel URL varsa taşı
      onManuelAc({
        baslik:      parsed.baslik   || haber.title,
        metin:       parsed.metin    || desc,
        kategori:    parsed.kategori || 'Güncel',
        kaynak_url:  haber.link,
        gorsel_url:  haber.gorsel_url || '',
        keyword,
      })
    } catch(e) { setHata('Oluşturma hatası: ' + e.message) }
    setOlusturan(null)
  }

  // Meta kampanyası tetikle
  const reklamTetikle = async (haber) => {
    setReklamY(haber.link)
    try {
      const match = haber.keyword_matches?.[0]
      const res   = await fetch('/api/zeka-motor', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          action:'trigger_campaign',
          reason: match?.matched_keyword || haber.title.slice(0,30),
          budget_tl: match?.budget || 50,
          duration_hours: 48,
        })
      })
      const d = await res.json()
      setRS(d.ok ? '✅ ' + (d.message || '48 saatlik kampanya başlatıldı') : '❌ ' + d.error)
    } catch(e) { setRS('❌ ' + e.message) }
    setReklamY(null)
  }

  const skRenk = (s) => s >= 75 ? '#1D9E75' : s >= 60 ? '#EF9F27' : '#8891a5'
  const skBg   = (s) => s >= 75 ? 'rgba(29,158,117,.12)' : s >= 60 ? 'rgba(239,159,39,.12)' : 'rgba(136,145,165,.06)'

  const SEZON_LABEL = { bayram:'🕌 Bayram', okul:'📚 Okul', sinav:'📝 Sınav' }

  const firsat = tarama?.results?.filter(r => r.top_score > 0) || []
  const diger  = tarama?.results?.filter(r => r.top_score === 0) || []

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'0 1rem',height:48,borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:8,background:'var(--surface)',flexShrink:0}}>
        <button onClick={onGeri} style={{fontSize:11,color:'var(--muted)',background:'transparent',border:'0.5px solid var(--border)'}}>
          <Ic n="arrow-left" size={11}/> Menü
        </button>
        <div style={{width:1,height:16,background:'var(--border)'}}/>
        <Ic n="brain" size={15} style={{color:'#A855F7'}}/>
        <div style={{fontSize:14,fontWeight:600}}>İçerik Zekası</div>
        {tarama && (
          <span style={{fontSize:11,color:'var(--muted)',marginLeft:4}}>
            — {tarama.scanned} haber · {firsat.length} fırsat
          </span>
        )}
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button onClick={tara} disabled={yukT}
            style={{fontSize:11,background:'rgba(168,85,247,.1)',border:'0.5px solid rgba(168,85,247,.3)',color:'#A855F7'}}>
            <Ic n={yukT?'loader-2':'refresh'} size={12}/> {yukT?'Taranıyor…':'Yenile'}
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'1rem'}}>

        {/* Sezonsal banner */}
        {sezonsal.length > 0 && (
          <div style={{marginBottom:12,padding:'8px 14px',background:'rgba(168,85,247,.1)',border:'0.5px solid rgba(168,85,247,.3)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',gap:8}}>
            <Ic n="calendar-event" size={14} style={{color:'#A855F7'}}/>
            <span style={{fontSize:13,color:'#A855F7',fontWeight:500}}>
              Aktif Sezon: {sezonsal.map(s=>SEZON_LABEL[s]||s).join(' · ')}
            </span>
            <span style={{fontSize:11,color:'rgba(168,85,247,.6)',marginLeft:'auto'}}>Sezonsal kampanyalar devrede</span>
          </div>
        )}

        {/* Hata / Reklam sonucu */}
        {hata && (
          <div style={{marginBottom:8,padding:'7px 12px',background:'rgba(230,57,70,.08)',border:'0.5px solid rgba(230,57,70,.3)',borderRadius:'var(--radius-md)',fontSize:12,color:'#ff7b7b',display:'flex',justifyContent:'space-between'}}>
            {hata}<span style={{cursor:'pointer'}} onClick={()=>setHata(null)}>×</span>
          </div>
        )}
        {reklamSonuc && (
          <div style={{marginBottom:8,padding:'7px 12px',background:'rgba(29,158,117,.08)',border:'0.5px solid rgba(29,158,117,.3)',borderRadius:'var(--radius-md)',fontSize:12,color:'#1D9E75',display:'flex',justifyContent:'space-between'}}>
            {reklamSonuc}<span style={{cursor:'pointer'}} onClick={()=>setRS(null)}>×</span>
          </div>
        )}

        {/* Loading */}
        {yukT && (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--muted)'}}>
            <Ic n="loader-2" size={24} style={{display:'block',margin:'0 auto 10px'}}/>
            <div style={{fontSize:13}}>RSS taranıyor, fırsat skoru hesaplanıyor…</div>
          </div>
        )}

        {/* Fırsat haberleri */}
        {!yukT && firsat.length > 0 && (
          <div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>
              🎯 Fırsat haberleri
            </div>
            {firsat.map((haber, idx) => {
              const match  = haber.keyword_matches?.[0]
              const isOl   = olusturan === haber.link
              const isRek  = reklamYapan === haber.link
              return (
                <div key={idx} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-md)',padding:'12px 14px',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>

                    {/* Skor kutusu */}
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:700,color:skRenk(haber.top_score),
                        background:skBg(haber.top_score),width:46,height:46,borderRadius:'var(--radius-md)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        border:`0.5px solid ${skRenk(haber.top_score)}44`}}>
                        {haber.top_score}
                      </div>
                      <div style={{fontSize:9,color:'var(--muted)',marginTop:2}}>skor</div>
                    </div>

                    {/* İçerik */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,lineHeight:1.4,marginBottom:6}}
                        dangerouslySetInnerHTML={{__html: haber.title}}/>

                      {/* Badge'ler */}
                      {match && (
                        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                          <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                            background:'rgba(168,85,247,.12)',color:'#A855F7',border:'0.5px solid rgba(168,85,247,.3)',fontWeight:500}}>
                            🔑 {match.matched_keyword}
                          </span>
                          <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                            background:'rgba(59,130,212,.1)',color:'#3B8BD4',border:'0.5px solid rgba(59,130,212,.3)'}}>
                            {(match.volume||0).toLocaleString('tr-TR')} hacim
                          </span>
                          <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                            background:match.kd<30?'rgba(29,158,117,.1)':'rgba(239,159,39,.1)',
                            color:match.kd<30?'#1D9E75':'#EF9F27',
                            border:`0.5px solid ${match.kd<30?'rgba(29,158,117,.3)':'rgba(239,159,39,.3)'}`}}>
                            KD: {match.kd}
                          </span>
                          <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                            background:'rgba(255,255,255,.04)',color:'var(--muted)',border:'0.5px solid var(--border)'}}>
                            {match.cat==='sezonsal'?'📅 Sezonsal':match.cat==='olay'?'⚡ Olay':'📌 Sürekli'}
                          </span>
                        </div>
                      )}

                      {/* Aksiyon butonları */}
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>olustur(haber)} disabled={!!olusturan}
                          style={{fontSize:12,fontWeight:600,background:'rgba(168,85,247,.15)',
                            border:'0.5px solid rgba(168,85,247,.4)',color:'#A855F7'}}>
                          <Ic n={isOl?'loader-2':'sparkles'} size={12}/>
                          {isOl?'Oluşturuluyor…':'✨ Oluştur & Yayınla'}
                        </button>
                        {/* Görsel durumu */}
                        {haber.gorsel_url
                          ? <span style={{fontSize:10,color:'#00D4AA',display:'flex',alignItems:'center',gap:3}}>
                              <Ic n="photo" size={10}/> Görsel var
                            </span>
                          : <span style={{fontSize:10,color:'#EF9F27',display:'flex',alignItems:'center',gap:3}}>
                              <Ic n="photo-ai" size={10}/> AI görsel üretilecek
                            </span>
                        }

                        {haber.top_score >= 70 && (
                          <button onClick={()=>reklamTetikle(haber)} disabled={!!reklamYapan}
                            style={{fontSize:11,background:'rgba(29,158,117,.1)',
                              border:'0.5px solid rgba(29,158,117,.3)',color:'#1D9E75'}}>
                            <Ic n={isRek?'loader-2':'speakerphone'} size={11}/>
                            {isRek?'Tetikleniyor…':'📢 Reklam Tetikle'}
                          </button>
                        )}

                        <a href={haber.link} target="_blank" rel="noreferrer"
                          style={{fontSize:11,color:'var(--muted)',textDecoration:'none',
                            border:'0.5px solid var(--border)',padding:'4px 8px',
                            borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',gap:3}}>
                          <Ic n="external-link" size={10}/> Kaynak
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Fırsatsız haberler — collapsed */}
        {!yukT && diger.length > 0 && (
          <details style={{marginTop:12}}>
            <summary style={{fontSize:11,color:'var(--muted)',cursor:'pointer',padding:'6px 0'}}>
              Fırsat bulunamayan haberler ({diger.length})
            </summary>
            <div style={{marginTop:6}}>
              {diger.map((h,i)=>(
                <div key={i} style={{padding:'7px 10px',background:'rgba(255,255,255,.02)',
                  border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',marginBottom:4,
                  fontSize:12,color:'var(--muted)'}}
                  dangerouslySetInnerHTML={{__html:h.title}}/>
              ))}
            </div>
          </details>
        )}

        {!yukT && !tarama && (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--muted)',fontSize:13}}>
            RSS verisi yüklenemedi. Yenile butonuna bas.
          </div>
        )}
      </div>
    </div>
  )
}



// ── META ADS YONETIM MODULU ───────────────────────────────────────────────────
function MetaAdsModul({ user, onGeri }) {
  const [tab,      setTab]     = useState("meta")
  const [durum,    setDurum]   = useState(null)
  const [insights, setInsights]= useState([])
  const [yukleniyor, setYuk]   = useState(true)
  const [islem,    setIslem]   = useState(null)
  const [sonuc,    setSonuc]   = useState(null)

  const yukle = async () => {
    setYuk(true)
    try {
      const [s, ins] = await Promise.all([
        fetch("/api/meta-ads?action=status").then(r => r.json()),
        fetch("/api/meta-ads?action=insights&date=last_7d").then(r => r.json()),
      ])
      if (s.ok)   setDurum(s)
      if (ins.ok) setInsights(ins.insights || [])
    } catch(e) { console.error(e) }
    setYuk(false)
  }

  useEffect(() => { yukle() }, [])

  const post = async (body) => {
    setIslem(body.campaign_id || body.action)
    setSonuc(null)
    try {
      const r = await fetch("/api/meta-ads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      setSonuc({ ok: true, msg: body.action === "pause" ? "Durduruldu" : body.action === "resume" ? "Baslatildi" : "Butce guncellendi" })
      await yukle()
    } catch(e) { setSonuc({ ok: false, msg: e.message }) }
    setIslem(null)
  }

  const insMap = {}
  for (const ins of insights) insMap[ins.campaign_id] = ins

  const aktifCamps = durum?.campaigns?.filter(c => c.status !== "ARCHIVED" && c.status !== "DELETED") || []
  const toplamButce   = aktifCamps.filter(c => c.status === "ACTIVE" && c.daily_budget).reduce((s, c) => s + parseInt(c.daily_budget), 0)
  const toplamHarcama = insights.reduce((s, i) => s + parseFloat(i.spend || 0), 0)
  const toplamTiklama = insights.reduce((s, i) => s + parseInt(i.clicks || 0), 0)
  const ortCPC        = toplamTiklama > 0 ? (toplamHarcama / toplamTiklama).toFixed(2) : "-"

  const stRenk = (s) =>
    s === "ACTIVE"  ? { bg: "rgba(29,158,117,.1)",  c: "#1D9E75", b: "rgba(29,158,117,.3)"  } :
    s === "PAUSED"  ? { bg: "rgba(239,159,39,.1)",  c: "#EF9F27", b: "rgba(239,159,39,.3)"  } :
                      { bg: "rgba(136,145,165,.1)", c: "#8891a5", b: "rgba(136,145,165,.3)" }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{ padding: "0 1rem", height: 48, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={onGeri} style={{ fontSize: 11, color: "var(--muted)", background: "transparent", border: "0.5px solid var(--border)" }}>
          <Ic n="arrow-left" size={11}/> Menu
        </button>
        <div style={{ width: 1, height: 16, background: "var(--border)" }}/>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "meta",   ic: "brand-meta",   label: "Meta Ads",    renk: "#1877F2" },
            { id: "google", ic: "brand-google",  label: "Google Ads",  renk: "#EA4335" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontSize: 12, padding: "3px 12px", display: "flex", alignItems: "center", gap: 5,
              background: tab === t.id ? (t.id === "meta" ? "rgba(24,119,242,.1)" : "rgba(234,67,53,.1)") : "transparent",
              border: "0.5px solid " + (tab === t.id ? (t.id === "meta" ? "rgba(24,119,242,.4)" : "rgba(234,67,53,.4)") : "var(--border)"),
              color: tab === t.id ? t.renk : "var(--muted)", borderRadius: "var(--radius-md)"
            }}>
              <Ic n={t.ic} size={12}/> {t.label}
            </button>
          ))}
        </div>
        {tab === "meta" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={yukle} disabled={yukleniyor} style={{ fontSize: 11, background: "rgba(24,119,242,.1)", border: "0.5px solid rgba(24,119,242,.3)", color: "#4dabf7" }}>
              <Ic n={yukleniyor ? "loader-2" : "refresh"} size={11}/> {yukleniyor ? "..." : "Yenile"}
            </button>
            <button onClick={() => post({ action: "pause_all" })} style={{ fontSize: 11, background: "rgba(226,75,74,.1)", border: "0.5px solid rgba(226,75,74,.3)", color: "#ff7b7b" }}>
              <Ic n="player-pause" size={11}/> Hepsini Durdur
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>

        {/* ── GOOGLE ADS TAB ── */}
        {tab === "google" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem", gap: 16, textAlign: "center" }}>
            <Ic n="brand-google" size={44} style={{ color: "#EA4335", opacity: 0.5 }}/>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Google Ads baglantisi gerekiyor</div>
            <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 400, lineHeight: 1.7 }}>
              Supermetrics uzerinden Google Ads hesabini bagla. Baglanti kurulunca kampanya, butce ve tiklama verileri burada gorunecek.
            </div>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", width: "100%", maxWidth: 360, textAlign: "left" }}>
              {[
                "rdr.ist ayarlarinda Supermetrics panelini ac",
                "Data Sources seciminde Google Ads sec",
                "Connect tiklayip atmmedya@gmail.com ile giris yap",
                "Musteri numarasi: 773-177-8727",
                "Bu sayfaya don ve Yenile butonuna bas",
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: i < 4 ? "0.5px solid var(--border)" : "none" }}>
                  <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "rgba(234,67,53,.12)", color: "#EA4335", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i+1}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, background: "rgba(234,67,53,.06)", border: "0.5px solid rgba(234,67,53,.2)", borderRadius: "var(--radius-md)", padding: "8px 16px", color: "var(--muted)" }}>
              Musteri ID: <strong style={{ color: "#EA4335" }}>773-177-8727</strong>
            </div>
          </div>
        )}

        {/* ── META ADS TAB ── */}
        {tab === "meta" && (<>

          {/* Hesap ozeti kartlari */}
          {/* Bakiye uyarisi */}
          {durum?.account && durum.account.balance <= 0 && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(226,75,74,.08)", border: "0.5px solid rgba(226,75,74,.35)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ic n="alert-triangle" size={16} style={{ color: "#ff7b7b", flexShrink: 0 }}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#ff7b7b" }}>Hesap bakiyesi 0 TL</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    Kampanyalar aktif ama harcama yapamıyor.
                    {durum.account.kart && <span> Kart: {durum.account.kart}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => window.open(durum.account.bakiye_url, "_blank")}
                  style={{ fontSize: 11, padding: "5px 12px", background: "rgba(226,75,74,.15)", border: "0.5px solid rgba(226,75,74,.4)", color: "#ff7b7b", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Ic n="credit-card" size={11}/> Bakiye Yukle
                </button>
                <button onClick={() => window.open(durum.account.odeme_url, "_blank")}
                  style={{ fontSize: 11, padding: "5px 12px", background: "rgba(24,119,242,.08)", border: "0.5px solid rgba(24,119,242,.3)", color: "#4dabf7", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Ic n="credit-card" size={11}/> Kart Yonet
                </button>
              </div>
            </div>
          )}

          {/* Hesap ozet kartlari */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { l: "Hesap Bakiyesi", v: durum?.account?.balance != null ? durum.account.balance.toFixed(2)+" TL" : "-",
                sub: durum?.account?.status_label || "-",
                warn: durum?.account?.balance <= 0 },
              { l: "Gunluk Butce (Toplam)", v: (toplamButce / 100).toFixed(0) + " TL",
                sub: aktifCamps.filter(c=>c.status==="ACTIVE").length + " aktif kampanya" },
              { l: "Son 7 Gun Harcama", v: toplamHarcama.toFixed(2) + " TL",
                sub: toplamTiklama + " tiklama" },
              { l: "Ort. CPC", v: ortCPC !== "-" ? ortCPC + " TL" : "-",
                sub: "son 7 gun" },
              { l: "Odeme Yontemi", v: durum?.account?.kart || "Tanimi yok",
                sub: durum?.account?.kart_tip || "", link: durum?.account?.odeme_url },
            ].map(s => (
              <div key={s.l} style={{ background: "var(--surface)", border: "0.5px solid " + (s.warn ? "rgba(226,75,74,.3)" : "var(--border)"), borderRadius: "var(--radius-md)", padding: "0.875rem", position: "relative" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: s.link ? 13 : 19, fontWeight: 600, color: s.warn ? "#ff7b7b" : "inherit", wordBreak: "break-word" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.sub}</div>
                {s.link && (
                  <button onClick={() => window.open(s.link, "_blank")}
                    style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer" }}>
                    <Ic n="external-link" size={11}/>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Sonuc bildirimi */}
          {sonuc && (
            <div style={{ marginBottom: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between",
              background: sonuc.ok ? "rgba(29,158,117,.08)" : "rgba(226,75,74,.08)",
              border: "0.5px solid " + (sonuc.ok ? "rgba(29,158,117,.3)" : "rgba(226,75,74,.3)"),
              borderRadius: "var(--radius-md)", fontSize: 12, color: sonuc.ok ? "#1D9E75" : "#ff7b7b" }}>
              {sonuc.ok ? "Guncellendi" : "Hata: " + sonuc.msg}
              <span style={{ cursor: "pointer" }} onClick={() => setSonuc(null)}>x</span>
            </div>
          )}

          {/* Kampanya tablosu */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Kampanyalar <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>— arsivsiz, aktif + durdurulmus</span></span>
              {yukleniyor && <Ic n="loader-2" size={14} style={{ color: "var(--muted)" }}/>}
            </div>

            {aktifCamps.length === 0 && !yukleniyor && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Kampanya bulunamadi</div>
            )}

            {aktifCamps.map(camp => {
              const ins      = insMap[camp.id] || {}
              const budgetTL = camp.daily_budget ? parseInt(camp.daily_budget) / 100 : 0
              const isActive = camp.status === "ACTIVE"
              const isBusy   = islem === camp.id
              const st       = stRenk(camp.status)

              return (
                <div key={camp.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: st.bg, color: st.c, border: "0.5px solid " + st.b, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {isActive ? "Aktif" : "Durduruldu"}
                  </span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{camp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>...{camp.id.slice(-8)}</div>
                  </div>

                  {/* Butce kontrolu */}
                  <div style={{ textAlign: "center", minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Gunluk Butce</div>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>{budgetTL > 0 ? budgetTL + " TL" : "-"}</div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
                      <button onClick={() => post({ action: "set_budget", campaign_id: camp.id, budget_tl: Math.max(5, budgetTL - 10) })}
                        disabled={isBusy || budgetTL <= 5}
                        style={{ fontSize: 11, padding: "2px 7px", background: "rgba(226,75,74,.1)", border: "0.5px solid rgba(226,75,74,.3)", color: "#ff7b7b" }}>-10</button>
                      <button onClick={() => post({ action: "set_budget", campaign_id: camp.id, budget_tl: budgetTL + 10 })}
                        disabled={isBusy}
                        style={{ fontSize: 11, padding: "2px 7px", background: "rgba(29,158,117,.1)", border: "0.5px solid rgba(29,158,117,.3)", color: "#1D9E75" }}>+10</button>
                    </div>
                  </div>

                  {/* Performans metrikleri */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, minWidth: 240 }}>
                    {[
                      { l: "Harcama",   v: ins.spend ? parseFloat(ins.spend).toFixed(2) + " TL" : "0 TL" },
                      { l: "Tiklama",   v: ins.clicks || "0" },
                      { l: "CTR",       v: ins.ctr ? parseFloat(ins.ctr).toFixed(2) + "%" : "-" },
                      { l: "CPC",       v: ins.cpc ? parseFloat(ins.cpc).toFixed(2) + " TL" : "-" },
                    ].map(m => (
                      <div key={m.l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>{m.l}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Durdur / Baslat */}
                  <button onClick={() => post({ action: isActive ? "pause" : "resume", campaign_id: camp.id })}
                    disabled={isBusy}
                    style={{ fontSize: 11, padding: "5px 12px", flexShrink: 0,
                      background: isActive ? "rgba(226,75,74,.1)" : "rgba(29,158,117,.1)",
                      border: "0.5px solid " + (isActive ? "rgba(226,75,74,.3)" : "rgba(29,158,117,.3)"),
                      color: isActive ? "#ff7b7b" : "#1D9E75" }}>
                    <Ic n={isBusy ? "loader-2" : isActive ? "player-pause" : "player-play"} size={11}/>
                    {isBusy ? "..." : isActive ? "Durdur" : "Baslat"}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 7 gun ozet */}
          {insights.length > 0 && (
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Son 7 gun — toplam performans</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { l: "Toplam Harcama", v: toplamHarcama.toFixed(2) + " TL" },
                  { l: "Toplam Tiklama", v: toplamTiklama.toLocaleString("tr-TR") },
                  { l: "Toplam Imp.",    v: insights.reduce((s,i) => s + parseInt(i.impressions||0), 0).toLocaleString("tr-TR") },
                  { l: "Ort. CPC",       v: ortCPC !== "-" ? ortCPC + " TL" : "-" },
                ].map(m => (
                  <div key={m.l} style={{ background: "var(--bg)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{m.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>)}

      </div>
    </div>
  )
}



// Google Ads alt bileşeni
function GoogleAdsBolum() {
  const [gData,   setGData]   = useState(null)
  const [gYuk,    setGYuk]    = useState(true)
  const [gHata,   setGHata]   = useState(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    fetch("/api/google-ads?action=campaigns&date=last_7d")
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setGData(d); setGHata(null) }
        else if (d.needs_auth) { setNeedsAuth(true) }
        else { setGHata(d.error) }
        setGYuk(false)
      })
      .catch(e => { setGHata(e.message); setGYuk(false) })
  }, [])

  const statusRenk = (s) => ({
    ENABLED: { c: "#1D9E75", bg: "rgba(29,158,117,.1)" },
    PAUSED:  { c: "#EF9F27", bg: "rgba(239,159,39,.1)" },
    REMOVED: { c: "#E24B4A", bg: "rgba(226,75,74,.1)"  },
  }[s] || { c: "#8891a5", bg: "rgba(136,145,165,.1)" })

  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: 16 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Ic n="brand-google" size={15} style={{ color: "#EA4335" }}/>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Google Ads</span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Musteri: 773-177-8727</span>
      </div>

      {gYuk && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          <Ic n="loader-2" size={18}/> Yukleniyor...
        </div>
      )}

      {needsAuth && (
        <div style={{ padding: 16 }}>
          <div style={{ padding: "12px 14px", background: "rgba(234,67,53,.06)", border: "0.5px solid rgba(234,67,53,.25)", borderRadius: "var(--radius-md)", fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: "#EA4335", marginBottom: 6 }}>Google Ads baglantisi gerekli</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              Supermetrics uzerinden Google Ads hesabini baglayarak kampanya verilerini buradan yonetebilirsin.
            </div>
            <a href="https://gcp1-api-default.supermetrics.com/v2/datasource/login/renew/NI1qFPopDC8M01QRBHMLmBrwYSN5h3s5f9m5lbBAUadGlmb_d7"
              target="_blank" rel="noreferrer">
              <button style={{ fontSize: 12, background: "rgba(234,67,53,.15)", border: "0.5px solid rgba(234,67,53,.4)", color: "#EA4335" }}>
                <Ic n="plug" size={12}/> Google Ads Bagla
              </button>
            </a>
          </div>
        </div>
      )}

      {gHata && !needsAuth && (
        <div style={{ padding: "10px 14px", fontSize: 12, color: "#ff7b7b" }}>
          Hata: {gHata}
        </div>
      )}

      {gData?.campaigns && gData.campaigns.length > 0 && (
        <div>
          {gData.campaigns.map((row, i) => {
            const [name, status, id, impressions, clicks, cost, ctr, cpc, budget] = row
            const st = statusRenk(status)
            return (
              <div key={i} style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: st.bg, color: st.c, flexShrink: 0 }}>
                  {status === "ENABLED" ? "Aktif" : status === "PAUSED" ? "Durduruldu" : status}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                </div>
                {[
                  ["Butce", budget ? parseFloat(budget).toFixed(0) + " TL" : "-"],
                  ["Tiklama", clicks || "0"],
                  ["Harcama", cost ? parseFloat(cost).toFixed(2) + " TL" : "0 TL"],
                  ["CTR", ctr ? parseFloat(ctr).toFixed(2) + "%" : "-"],
                  ["CPC", cpc ? parseFloat(cpc).toFixed(2) + " TL" : "-"],
                ].map(([l, v]) => (
                  <div key={l} style={{ textAlign: "center", minWidth: 54 }}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {!gYuk && !needsAuth && !gHata && gData?.campaigns?.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Aktif Google Ads kampanyasi bulunamadi.
        </div>
      )}
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
      id: 'galeri',
      baslik: 'Galeri Oluştur',
      aciklama: 'Çoklu görsel/video ile Kayserim veya Radar galerileri oluştur ve paylaş',
      ic: 'photo',
      renk: '#B04EFF',
      bg: 'rgba(176,78,255,0.08)',
      border: 'rgba(176,78,255,0.2)',
      yetki: 'modul_kayserim',
    },
    {
      id: 'zeka',
      baslik: 'İçerik Zekası',
      aciklama: 'Trend haberleri tespit et, AI ile oluştur, siteye ekle ve sosyal medyaya yayınla',
      ic: 'brain',
      renk: '#A855F7',
      bg: 'rgba(168,85,247,0.08)',
      border: 'rgba(168,85,247,0.2)',
      yetki: 'modul_kayserim',
    },
    {
      id: 'metaads',
      baslik: 'Meta Ads Yonetimi',
      aciklama: 'Kampanya durumu, butce yonetimi, performans ve harcama takibi',
      ic: 'brand-meta',
      renk: '#1877F2',
      bg: 'rgba(24,119,242,0.08)',
      border: 'rgba(24,119,242,0.2)',
      yetki: 'admin',
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
  const [zekaPreFill,  setZekaPreFill]  = useState(null) // ZekaModul -> ManuelHaberModul

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
      const _oiToken3 = localStorage.getItem('cms_token') || ''
      const res = await fetch('/api/oto-isle?source_id='+encodeURIComponent(h.source_id||h.baslik)+'&secret='+_oiToken3)
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
  if (aktifModul === 'manuel') return <ManuelHaberModul user={user} onGeri={()=>{setZekaPreFill(null);setAktifModul(null)}} prefill={zekaPreFill}/>
  if (aktifModul === 'galeri')  return <GaleriModul   user={user} onGeri={()=>setAktifModul(null)}/>
  if (aktifModul === 'zeka')   return <ZekaModul user={user} onGeri={()=>setAktifModul(null)} onManuelAc={pf=>{setZekaPreFill(pf);setAktifModul('manuel')}}/>
  if (aktifModul === 'metaads') return <MetaAdsModul user={user} onGeri={()=>setAktifModul(null)}/>
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
