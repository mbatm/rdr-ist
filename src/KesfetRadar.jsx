import { useState, useEffect, useCallback } from 'react'

/**
 * Keşfet Radar paneli — İZOLE component.
 * Rakip yerel haber fırsatlarını Discover skoruna göre listeler,
 * "Bu konuyu yaz" ile Claude'dan ÖZGÜN + Discover-optimize taslak üretir
 * ve mevcut Manuel Haber editörüne aktarır (onManuelAc).
 *
 * Props: { user, onGeri, onManuelAc }
 */

const RENK = {
  acil:   { bg: 'rgba(230,57,70,0.10)',  bd: 'rgba(230,57,70,0.35)',  c: '#ff7b7b', et: 'ACİL YAZ' },
  firsat: { bg: 'rgba(255,183,0,0.10)',  bd: 'rgba(255,183,0,0.30)',  c: '#FFB700', et: 'FIRSAT' },
  izle:   { bg: 'rgba(255,255,255,0.03)',bd: 'var(--border)',          c: 'var(--muted)', et: 'İZLE' },
}
const TUR_ET = {
  olay:'Olay', hava:'Hava', vefat:'Vefat', spor:'Spor', ekonomi:'Ekonomi',
  egitim:'Eğitim', gundem:'Gündem', kisi:'Kişi', diger:'Diğer',
}

function yas(pubDate) {
  const t = Date.parse(pubDate)
  if (!t || isNaN(t)) return ''
  const dk = Math.max(0, (Date.now() - t) / 6e4)
  if (dk < 60) return `${Math.round(dk)} dk önce`
  const s = dk / 60
  if (s < 24) return `${Math.round(s)} saat önce`
  return `${Math.round(s / 24)} gün önce`
}

const KQ_DURUM = {
  inceleme:        { c: '#FFB700', et: 'İNCELEMEDE', yanar: true },
  duzenle_bekliyor:{ c: '#4dabf7', et: 'GÜNCELLENECEK', yanar: true },
  yayinlandi:      { c: '#00D4AA', et: 'RSS\'DE YAYINDA', yanar: false },
  reddedildi:      { c: 'var(--muted)', et: 'REDDEDİLDİ', yanar: false },
  hata:            { c: '#E63946', et: 'HATA', yanar: false },
  gorsel_bekliyor: { c: '#FFB700', et: 'GÖRSEL BEKLİYOR', yanar: true },
}
const KQ_TIP = { yaz: 'Yeni üretildi', isle: '1ha işlendi', guncelle: 'Mevcudu güncelle' }

function kalanSure(yayin_zamani) {
  const t = Date.parse(yayin_zamani)
  if (!t || isNaN(t)) return ''
  const dk = (t - Date.now()) / 6e4
  if (dk <= 0) return 'inceleme süresi doldu'
  return `${Math.ceil(dk)} dk sonra (oto modda) yayınlanır`
}

function kqTemizle(m) { return (m || '').replace(/\n*[-*\s]*\[?\s*DOĞRULANACAKLAR\s*\]?[\s\S]*$/i, '').replace(/\[DOĞRULA:[^\]]*\]/gi, '').replace(/\n{3,}/g, '\n\n').trim() }
function kqNotlar(m) { const mm = (m || '').match(/\[?\s*DOĞRULANACAKLAR\s*\]?\s*([\s\S]*)$/i); let n = mm ? mm[1].trim() : ''; const inl = [...(m || '').matchAll(/\[DOĞRULA:\s*([^\]]*)\]/gi)].map(x => '- ' + x[1].trim()); if (inl.length) n = (n ? n + '\n' : '') + inl.join('\n'); return n.trim() }

function KuyrukKarti({ k, onManuelAc, onAksiyon }) {
  const d = KQ_DURUM[k.durum] || KQ_DURUM.inceleme
  const govde = kqTemizle(k.metin)
  const ozet = govde.replace(/[#*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const notlar = kqNotlar(k.metin)
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${d.c}44`, borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: d.c, border: `0.5px solid ${d.c}55`, padding: '1px 7px', borderRadius: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.c, animation: d.yanar ? 'kpulse 1.2s ease-in-out infinite' : 'none' }} />
          {d.et}
        </span>
        {k.tip && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{KQ_TIP[k.tip] || k.tip}</span>}
        {typeof k.skor === 'number' && <span style={{ fontSize: 10, fontWeight: 700, color: '#9b6bff' }}>{k.skor}</span>}
        {k.dogrula && <span style={{ fontSize: 10, color: '#E63946' }}>⚠ [DOĞRULA] — oto yayınlanmaz</span>}
        {k.durum === 'inceleme' && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{kalanSure(k.yayin_zamani)}</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3 }}>{k.site_baslik}</div>
      {k.og_baslik && k.og_baslik !== k.site_baslik && <div style={{ fontSize: 11, color: '#9b6bff', marginTop: 2 }}>Discover: {k.og_baslik}</div>}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{ozet}…</div>
      {notlar && (
        <div style={{ marginTop: 6, padding: '6px 9px', background: 'rgba(230,57,70,.08)', border: '0.5px solid rgba(230,57,70,.3)', borderRadius: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#ff7b7b', marginBottom: 2 }}>⚠ DOĞRULANACAK (yayında gösterilmez)</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{notlar}</div>
        </div>
      )}
      {k.hata && <div style={{ fontSize: 11, color: '#ff7b7b', marginTop: 4 }}>Hata: {k.hata}</div>}

      {(k.durum === 'inceleme' || k.durum === 'duzenle_bekliyor') && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => onManuelAc({ baslik: k.site_baslik, metin: govde, kategori: k.kategori, gorsel_url: k.kaynak_gorsel || '', kaynak_url: k.mevcut_link || k.kaynak_link || '', keyword: k.og_baslik || '' })}
            style={{ fontSize: 11, color: '#fff', background: 'rgba(155,107,255,.85)', border: 'none', borderRadius: 5, padding: '4px 10px' }}>
            {k.durum === 'duzenle_bekliyor' ? '✎ Mevcudu güncelle (editörde aç)' : '✎ Editörde aç (görsel + yayın)'}
          </button>
          {k.durum === 'inceleme' && (
            <button onClick={() => onAksiyon(k.id, 'onayla')}
              style={{ fontSize: 11, color: '#00D4AA', background: 'rgba(0,212,170,.1)', border: '0.5px solid rgba(0,212,170,.3)', borderRadius: 5, padding: '4px 10px' }}>
              ⚡ RSS'ye ekle
            </button>
          )}
          {k.durum === 'duzenle_bekliyor' && k.mevcut_link && (
            <a href={k.mevcut_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#4dabf7', textDecoration: 'none', border: '0.5px solid rgba(77,171,247,.3)', borderRadius: 5, padding: '4px 10px' }}>Mevcut haber ↗</a>
          )}
          <button onClick={() => onAksiyon(k.id, 'reddet')}
            style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
            Reddet
          </button>
        </div>
      )}
      {k.durum === 'yayinlandi' && k.url_slug && (
        <div style={{ fontSize: 11, color: '#00D4AA', marginTop: 6 }}>✓ RSS'de: /{k.url_slug}</div>
      )}
    </div>
  )
}

export default function KesfetRadar({ user, onGeri, onManuelAc }) {
  const token = localStorage.getItem('cms_token') || ''
  const [firsatlar, setFirsatlar] = useState([])
  const [sonTarama, setSonTarama] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [tariyor, setTariyor] = useState(false)
  const [uretilen, setUretilen] = useState(null) // o an taslak üretilen fırsat id
  const [teyitler, setTeyitler] = useState({})    // id -> teyit sonucu
  const [teyitId, setTeyitId] = useState(null)     // o an teyit edilen id
  const [filtre, setFiltre] = useState('aktif')   // aktif | hepsi | acil
  const [hata, setHata] = useState(null)
  const [ayar, setAyar] = useState(null)
  const [ayarAcik, setAyarAcik] = useState(false)
  const [gorunum, setGorunum] = useState('firsatlar') // firsatlar | kuyruk
  const [kuyruk, setKuyruk] = useState([])
  const [calisiyor, setCalisiyor] = useState(false)
  const [kaydet, setKaydet] = useState(false)
  const [otoMsg, setOtoMsg] = useState(null)
  const [kaynaklar, setKaynaklar] = useState([])
  const [kaynakAcik, setKaynakAcik] = useState(false)
  const [yeniKaynak, setYeniKaynak] = useState('')

  const kaynakGetir = useCallback(async () => {
    try {
      const r = await fetch(`/api/kesfet-radar?action=sources`)
      const d = await r.json()
      if (d.ok) setKaynaklar(d.kaynaklar || [])
    } catch (_) {}
  }, [])

  const kaynakIslem = async (islem, govde) => {
    try {
      const r = await fetch(`/api/kesfet-radar?action=${islem}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...govde, action: islem, secret: token }),
      })
      const d = await r.json()
      if (d.hata) { setHata(d.hata); return false }
      kaynakGetir()
      return true
    } catch (e) { setHata(e.message); return false }
  }

  const getir = useCallback(async () => {
    setYukleniyor(true); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-radar?action=list&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      setFirsatlar(d.firsatlar || [])
      setSonTarama(d.son_tarama || null)
    } catch (e) { setHata(e.message) }
    setYukleniyor(false)
  }, [token])

  useEffect(() => { getir() }, [getir])

  // Panel açıkken 5 dk'da bir kendini yeniler; backend de 60+ dk bayatlıkta
  // arka planda tarama başlattığı için veri en geç saatte bir tazelenir.
  useEffect(() => {
    const t = setInterval(getir, 300000)
    return () => clearInterval(t)
  }, [getir])

  // ── Oto pipeline: ayar + kuyruk ──
  const otoGetir = useCallback(async () => {
    try {
      const r = await fetch(`/api/kesfet-oto?action=kuyruk&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (!d.hata) { setKuyruk(d.kuyruk || []); setAyar(d.ayar || null) }
    } catch (_) {}
  }, [token])
  useEffect(() => { otoGetir() }, [otoGetir])

  const ayarKaydet = async () => {
    setKaydet(true); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-oto?action=ayarlar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ayarlar', secret: token, ayar }),
      })
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      setAyar(d.ayar)
      setOtoMsg(d.ayar.aktif
        ? 'Ayarlar kaydedildi. Üretim için "▶ Şimdi çalıştır"a basın (ya da 5 dk\'lık cron\'u bekleyin).'
        : 'Ayarlar kaydedildi ama "Otomatik üretim" PASİF — kutuyu işaretleyip tekrar Uygula deyin.')
    } catch (e) { setHata('Ayar kaydedilemedi: ' + e.message) }
    setKaydet(false)
  }

  const otoCalistir = async () => {
    setCalisiyor(true); setHata(null); setOtoMsg(null)
    const ctl = new AbortController()
    const to = setTimeout(() => ctl.abort(), 90000)
    try {
      const r = await fetch(`/api/kesfet-oto?action=process&secret=${encodeURIComponent(token)}`, { signal: ctl.signal })
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      await otoGetir(); await getir()
      let msg
      if (d.skip === 'pasif') msg = 'Pasif — "Otomatik üretim AÇIK" kutusunu işaretleyip Uygula deyin.'
      else if (d.yeni_taslak > 0) { msg = `${d.yeni_taslak} taslak üretildi → Kuyruk sekmesine bak.${d.oto_yayin ? ' ' + d.oto_yayin + ' otomatik yayınlandı.' : ''}`; setGorunum('kuyruk') }
      else {
        const tb = d.teyit ? ` — teyit: ${d.teyit.yaz || 0} yeni, ${d.teyit.isle || 0} 1ha'da, ${d.teyit.guncelle || 0} kayserim'de` : ''
        msg = `Üretilecek yeni fırsat yok${tb}. Ayarda açık durumlar: ${(ayar?.durumlar || []).join('/') || '—'}. Eşiği düşür, durum ekle ya da "⟳ Şimdi tara".`
      }
      setOtoMsg(msg)
    } catch (e) {
      setHata(e.name === 'AbortError'
        ? 'Üretim 90 sn\'yi aştı — muhtemelen arkada tamamlandı, "Kuyruk" sekmesini kontrol et.'
        : 'Çalıştırma hatası: ' + e.message)
    } finally { clearTimeout(to); setCalisiyor(false) }
  }

  const kuyrukAksiyon = async (id, action) => {
    try {
      const r = await fetch(`/api/kesfet-oto?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, secret: token }),
      })
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      await otoGetir()
    } catch (e) { setHata((action === 'onayla' ? 'Yayın' : 'İşlem') + ' hatası: ' + e.message) }
  }

  const bekleyenKuyruk = kuyruk.filter(k => k.durum === 'inceleme').length

  const tara = async () => {
    setTariyor(true); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-radar?action=scan&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      await getir()
    } catch (e) { setHata('Tarama hatası: ' + e.message) }
    setTariyor(false)
  }

  const isaretle = async (id, alan) => {
    setFirsatlar(fs => fs.map(f => f.id === id ? { ...f, [alan]: true } : f))
    try {
      await fetch(`/api/kesfet-radar?action=mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark', id, alan, secret: token }),
      })
    } catch (_) {}
  }

  // "Teyit et" → kayserim.net + 1ha kontrolü → tavsiye
  const teyitEt = async (f) => {
    setTeyitId(f.id); setHata(null)
    try {
      const r = await fetch(`/api/kesfet-radar?action=verify&id=${encodeURIComponent(f.id)}&secret=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.hata) throw new Error(d.hata)
      setTeyitler(t => ({ ...t, [f.id]: d }))
    } catch (e) { setHata('Teyit hatası: ' + e.message) }
    setTeyitId(null)
  }

  // "Bu konuyu yaz" → Claude'dan ÖZGÜN + Discover taslak → Manuel editöre aktar
  const yaz = async (f) => {
    setUretilen(f.id); setHata(null)

    // ÜSTLENME: başkası yazıyorsa mükerrer çalışmayı engelle, değilse üstümüze al
    const benKim = user?.kullanici || 'editor'
    try {
      const u = await fetch(`/api/kesfet-radar?action=ustlen`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ustlen', id: f.id, kullanici: benKim, secret: token }),
      }).then(r => r.json())
      if (u && u.dolu) {
        setHata(`⚠️ Bu haberi ${u.ustlenen} üstlenmiş (${u.ustlenme ? new Date(u.ustlenme).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}) — mükerrer çalışma olmasın.`)
        setUretilen(null)
        getir()
        return
      }
      // Yerel state'i anında güncelle — diğer sekme/kullanıcılar 5dk poll'da görür
      setFirsatlar(prev => prev.map(x => x.id === f.id ? { ...x, ustlenen: benKim, ustlenme: new Date().toISOString() } : x))
    } catch (_) {}

    const sistem = `Sen kayserim.net için çalışan kıdemli bir yerel haber editörüsün. Görevin, bir KONU sinyalinden Google Discover'a düşecek ÖZGÜN bir haber taslağı yazmak.

KURALLAR (Şubat 2026 Discover core update sonrası):
- Verilen rakip başlığı SADECE konu sinyalidir. ASLA kopyalama, yeniden yazma değil; konuyu kendi orijinal kelimelerinle, sıfırdan, daha derin ve Kayseri-yerel açıdan ele al.
- og_baslik: merak uyandıran ama temel bilgiyi saklamayan, dürüst başlık. Tıklama tuzağı (clickbait) yok — vaadini metin karşılamalı. Mümkünse somut sayı/yer/yerellik içersin.
- site_baslik: SEO uyumlu, max 70 karakter, "Kayseri" doğal geçsin.
- metin: en az 350 kelime, H2 alt başlıklarıyla (## ile), "ne oldu" + "neden / Kayseri için ne anlama geliyor" bağlamı. İlk paragrafta ana bilgi.
- Bilgi uydurma. metin gövdesi tek başına yayınlanabilir olmalı; doğrulanmamış spesifik iddiaları (rakam, isim, tarih, yer) gövdeye yazma, en sonda ayrı "[DOĞRULANACAKLAR]" bloğunda "- ..." maddeleri olarak listele. Gövdede [DOĞRULA] kullanma.
- Sadece JSON döndür, başka hiçbir şey yazma.`

    const kullanici = `KONU SİNYALİ (rakip başlığı, sadece referans): "${f.baslik}"
Kaynak alan(lar): ${f.kaynaklar.join(', ')}
Tür: ${TUR_ET[f.tur] || f.tur}
Yerel: ${f.yerel ? 'evet' : 'belirsiz'}

Şu JSON'u üret:
{
  "og_baslik": "...",
  "site_baslik": "...",
  "kategori": "Güncel | Asayiş | Spor | Ekonomi | Eğitim | Yaşam",
  "metin": "## ...\\n\\n..."
}`

    try {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: sistem,
          messages: [{ role: 'user', content: kullanici }],
        }),
      })
      const d = await r.json()
      if (!d.content) throw new Error(d.error?.message || d.detail || ('API yanıtı boş: ' + JSON.stringify(d).slice(0, 200)))
      const text = d.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('JSON bulunamadı: ' + text.slice(0, 150))
      const json = JSON.parse(m[0])

      // Fırsatı "yazıldı" işaretle (hatırlatma listesinden düşsün)
      isaretle(f.id, 'yazildi')

      // Mevcut Manuel Haber editörüne aktar — kanıtlanmış prefill akışı
      onManuelAc({
        baslik:     json.site_baslik || f.baslik,
        metin:      json.metin || '',
        kategori:   json.kategori || 'Güncel',
        gorsel_url: f.gorsel_url || '',
        keyword:    json.og_baslik || '',  // og başlığı manuel tarafında kullanılabilir
        kaynak_url: f.link || '',
      })
    } catch (e) {
      setHata('Taslak üretilemedi: ' + e.message)
      setUretilen(null)
    }
  }

  const gorunen = firsatlar.filter(f => {
    if (filtre === 'acil')  return f.durum === 'acil' && !f.yazildi && !f.gizli
    if (filtre === 'aktif') return !f.yazildi && !f.gizli
    return true
  })
  const acilSayisi   = firsatlar.filter(f => f.durum === 'acil' && !f.yazildi && !f.gizli).length
  const firsatSayisi = firsatlar.filter(f => f.durum === 'firsat' && !f.yazildi && !f.gizli).length

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      <style>{`@keyframes kpulse{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 1rem', height: 48, borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#9b6bff' }}>Keşfet Radar</div>
        <button onClick={onGeri} style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)' }}>← Menü</button>
        <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
          {[['firsatlar', 'Fırsatlar'], ['kuyruk', `Kuyruk${bekleyenKuyruk ? ' (' + bekleyenKuyruk + ')' : ''}`]].map(([id, l]) => (
            <button key={id} onClick={() => setGorunum(id)}
              style={{ fontSize: 12, fontWeight: gorunum === id ? 600 : 400, background: gorunum === id ? 'rgba(155,107,255,.12)' : 'transparent', border: gorunum === id ? '0.5px solid rgba(155,107,255,.3)' : '0.5px solid transparent', color: gorunum === id ? '#9b6bff' : 'var(--muted)', borderRadius: 5, padding: '3px 10px' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { setKaynakAcik(a => !a); if (!kaynaklar.length) kaynakGetir() }} title="İzlenen rakip kaynaklar"
            style={{ fontSize: 12, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)' }}>
            ⚙ Kaynaklar
          </button>
          <button onClick={() => setAyarAcik(a => !a)} title="Oto ayarlar"
            style={{ fontSize: 12, color: ayar?.aktif ? '#00D4AA' : 'var(--muted)', background: ayar?.aktif ? 'rgba(0,212,170,.1)' : 'transparent', border: '0.5px solid var(--border)' }}>
            ⚙ Oto {ayar ? (ayar.aktif ? `· ${ayar.mod === 'oto' ? 'TAM' : 'YARI'}` : '· pasif') : ''}
          </button>
          {sonTarama?.zaman && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Tarama: {yas(sonTarama.zaman)}</span>}
          <button onClick={tara} disabled={tariyor}
            style={{ fontSize: 12, color: '#9b6bff', background: 'rgba(155,107,255,0.10)', border: '0.5px solid rgba(155,107,255,0.30)' }}>
            {tariyor ? 'Taranıyor…' : '⟳ Şimdi tara'}
          </button>
        </div>
      </div>

      {kaynakAcik && (
        <div style={{ padding: '10px 1rem', borderBottom: '0.5px solid var(--border)', background: 'rgba(77,171,247,.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>İzlenen rakip kaynaklar — deploy gerekmeden ekle/çıkar</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {kaynaklar.map(k => (
              <span key={k.domain} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, background: 'rgba(255,255,255,.04)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '3px 6px 3px 10px', opacity: k.aktif === false ? 0.45 : 1 }}>
                <span style={{ color: 'var(--text)' }}>{k.domain}</span>
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>ö{k.oncelik}</span>
                <button onClick={() => kaynakIslem('kaynak-guncelle', { domain: k.domain, aktif: k.aktif === false })}
                  title={k.aktif === false ? 'Aktifleştir' : 'Duraklat'}
                  style={{ fontSize: 10, background: 'transparent', border: 'none', color: k.aktif === false ? '#00D4AA' : '#FFB700', cursor: 'pointer', padding: '0 2px' }}>
                  {k.aktif === false ? '▶' : '⏸'}
                </button>
                <button onClick={() => window.confirm(k.domain + ' listeden çıkarılsın mı?') && kaynakIslem('kaynak-sil', { domain: k.domain })}
                  style={{ fontSize: 11, background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '0 2px' }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={yeniKaynak} onChange={e => setYeniKaynak(e.target.value)}
              onKeyDown={async e => { if (e.key === 'Enter' && yeniKaynak.trim()) { if (await kaynakIslem('kaynak-ekle', { domain: yeniKaynak })) setYeniKaynak('') } }}
              placeholder="yenisite.com.tr"
              style={{ fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px', width: 200 }} />
            <button onClick={async () => { if (yeniKaynak.trim() && await kaynakIslem('kaynak-ekle', { domain: yeniKaynak })) setYeniKaynak('') }}
              style={{ fontSize: 12, color: '#4dabf7', background: 'rgba(77,171,247,0.10)', border: '0.5px solid rgba(77,171,247,0.30)', borderRadius: 5, padding: '4px 12px' }}>
              + Ekle
            </button>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>Feed'i yoksa Apify GNews yedeği otomatik devreye girer · değişiklik sonraki taramada geçerli</span>
          </div>
        </div>
      )}

      {ayarAcik && ayar && (
        <div style={{ padding: '10px 1rem', borderBottom: '0.5px solid var(--border)', background: 'rgba(155,107,255,.04)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 600 }}>
              <input type="checkbox" checked={ayar.aktif} onChange={e => setAyar({ ...ayar, aktif: e.target.checked })} />
              Otomatik üretim {ayar.aktif ? 'AÇIK' : 'PASİF'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
              Mod:
              <select value={ayar.mod} onChange={e => setAyar({ ...ayar, mod: e.target.value })} style={{ fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>
                <option value="yari">Yarı (onayla yayınla)</option>
                <option value="oto">Tam (süre dolunca yayınla)</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
              Min skor:
              <input type="number" min="0" max="100" value={ayar.min_skor} onChange={e => setAyar({ ...ayar, min_skor: +e.target.value })} style={{ width: 54, fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 6px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
              İnceleme (dk):
              <input type="number" min="0" value={ayar.inceleme_dk} onChange={e => setAyar({ ...ayar, inceleme_dk: +e.target.value })} style={{ width: 54, fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 6px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }} title="Bir çalıştırma turunda kaç haber üretilsin (yüksek = yavaş)">
              Tur başına:
              <input type="number" min="1" max="5" value={ayar.max_yeni} onChange={e => setAyar({ ...ayar, max_yeni: Math.min(5, Math.max(1, +e.target.value || 1)) })} style={{ width: 48, fontSize: 12, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 6px' }} />
            </label>
            <div style={{ display: 'flex', gap: 10, color: 'var(--muted)' }}>
              {[['yaz', 'Yeni yaz'], ['isle', '1ha işle'], ['guncelle', 'Güncelle']].map(([d, l]) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={ayar.durumlar?.includes(d)} onChange={e => { const s = new Set(ayar.durumlar || []); e.target.checked ? s.add(d) : s.delete(d); setAyar({ ...ayar, durumlar: [...s] }) }} />
                  {l}
                </label>
              ))}
            </div>
            <button onClick={ayarKaydet} disabled={kaydet} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(155,107,255,.85)', border: 'none', borderRadius: 5, padding: '5px 14px' }}>
              {kaydet ? 'Kaydediliyor…' : 'Uygula'}
            </button>
            <button onClick={otoCalistir} disabled={calisiyor || !ayar.aktif} title={ayar.aktif ? '' : 'Önce aktif et + Uygula'} style={{ fontSize: 12, color: '#00D4AA', background: 'rgba(0,212,170,.1)', border: '0.5px solid rgba(0,212,170,.3)', borderRadius: 5, padding: '5px 12px' }}>
              {calisiyor ? 'Çalışıyor…' : '▶ Şimdi çalıştır'}
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>
            {ayar.aktif
              ? (ayar.mod === 'oto'
                ? `Tam otomatik: skor ≥ ${ayar.min_skor} fırsatlar taslak+görselle üretilir, ${ayar.inceleme_dk} dk sonra [DOĞRULA] yoksa otomatik yayınlanır.`
                : `Yarı otomatik: skor ≥ ${ayar.min_skor} fırsatlar taslak olarak Kuyruğa düşer; sen "Yayınla" deyince yayınlanır.`)
              : 'Pasif — hiçbir şey üretilmez/yayınlanmaz. Aktif edip "Uygula"ya bas. Otomatik üretim her 5 dk\'lık cron\'da çalışır.'}
          </div>
          {otoMsg && (
            <div style={{ fontSize: 11.5, color: '#9b6bff', marginTop: 8, padding: '6px 10px', background: 'rgba(155,107,255,.08)', border: '0.5px solid rgba(155,107,255,.25)', borderRadius: 5 }}>
              {otoMsg}
            </div>
          )}
        </div>
      )}

      {/* Özet / hatırlatma şeridi */}
      {gorunum === 'firsatlar' && (
      <div style={{ display: 'flex', gap: 10, padding: '10px 1rem', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: acilSayisi ? '#ff7b7b' : 'var(--muted)' }}>
          {acilSayisi > 0 ? `🔴 ${acilSayisi} konu acil — rakipte var, sende yok` : 'Acil fırsat yok'}
        </div>
        {firsatSayisi > 0 && <div style={{ fontSize: 13, color: '#FFB700' }}>🟡 {firsatSayisi} fırsat</div>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[['aktif', 'Aktif'], ['acil', 'Acil'], ['hepsi', 'Hepsi']].map(([id, l]) => (
            <button key={id} onClick={() => setFiltre(id)}
              style={{ fontSize: 11, background: filtre === id ? 'rgba(255,255,255,.08)' : 'transparent', border: filtre === id ? '0.5px solid rgba(255,255,255,.2)' : '0.5px solid transparent', color: filtre === id ? 'var(--text)' : 'var(--muted)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Kaynak durumu */}
      {gorunum === 'firsatlar' && sonTarama?.kaynak_durum && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 1rem', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
          {sonTarama.kaynak_durum.map(k => (
            <span key={k.domain} style={{ fontSize: 10, color: k.ok ? '#00D4AA' : '#E63946', background: 'rgba(255,255,255,.03)', border: '0.5px solid var(--border)', padding: '2px 7px', borderRadius: 10 }}>
              {k.ok ? '●' : '○'} {k.domain} {k.ok ? `(${k.adet})` : '— feed yok'}
            </span>
          ))}
        </div>
      )}

      {hata && <div style={{ padding: '8px 1rem', color: '#ff7b7b', fontSize: 12 }}>{hata}</div>}

      {/* Liste / Kuyruk */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {gorunum === 'kuyruk' ? (
          kuyruk.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              Kuyruk boş. Oto üretim aktifse skor eşiğini geçen fırsatlar buraya taslak olarak düşer.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kuyruk.map(k => <KuyrukKarti key={k.id} k={k} onManuelAc={onManuelAc} onAksiyon={kuyrukAksiyon} />)}
            </div>
          )
        ) : yukleniyor ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20 }}>Yükleniyor…</div>
        ) : gorunen.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
            Fırsat yok. "Şimdi tara" ile rakip feed'lerini tarayın.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gorunen.map(f => {
              const r = RENK[f.durum] || RENK.izle
              return (
                <div key={f.id} style={{ background: r.bg, border: `0.5px solid ${r.bd}`, borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', opacity: f.yazildi || f.gizli ? 0.55 : 1 }}>
                  {f.gorsel_url
                    ? <img src={f.gorsel_url} alt="" onError={e => (e.target.style.display = 'none')} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 6, flexShrink: 0, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📰</div>}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: r.c, background: r.bg, border: `0.5px solid ${r.bd}`, padding: '1px 6px', borderRadius: 4 }}>{r.et}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9b6bff' }}>{f.skor}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>· {TUR_ET[f.tur] || f.tur}</span>
                      {f.yerel && <span style={{ fontSize: 10, color: '#00D4AA' }}>· yerel</span>}
                      {f.kaynak_sayisi >= 2 && <span style={{ fontSize: 10, color: '#FFB700' }}>· {f.kaynak_sayisi} kaynak (trend)</span>}
                      {f.ustlenen && !f.yazildi && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(155,107,255,0.6)', padding: '1px 8px', borderRadius: 10 }}>
                          ✍️ {f.ustlenen} yazıyor
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{yas(f.pubDate)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.35 }}>{f.baslik}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {f.bizde_var ? 'sende benzeri var' : 'sende yok'} · {f.kaynaklar.join(', ')}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => teyitEt(f)} disabled={teyitId === f.id}
                        style={{ fontSize: 11, fontWeight: 500, color: '#4dabf7', background: 'rgba(77,171,247,0.10)', border: '0.5px solid rgba(77,171,247,0.30)', borderRadius: 5, padding: '4px 10px' }}>
                        {teyitId === f.id ? 'Teyit ediliyor…' : '🔍 Teyit et'}
                      </button>
                      <button onClick={() => yaz(f)} disabled={uretilen === f.id || f.yazildi || (f.ustlenen && f.ustlenen !== (user?.kullanici || 'editor'))}
                        style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: f.yazildi || (f.ustlenen && f.ustlenen !== (user?.kullanici || 'editor')) ? 'rgba(255,255,255,.1)' : 'rgba(155,107,255,0.85)', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: f.yazildi ? 'default' : 'pointer' }}>
                        {uretilen === f.id ? 'Taslak üretiliyor…' : f.yazildi ? '✓ Yazıldı' : (f.ustlenen && f.ustlenen !== (user?.kullanici || 'editor')) ? `${f.ustlenen} yazıyor` : '✍ Bu konuyu yaz'}
                      </button>
                      {f.ustlenen === (user?.kullanici || 'editor') && !f.yazildi && (
                        <button onClick={async () => {
                          await fetch(`/api/kesfet-radar?action=birak`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'birak', id: f.id, kullanici: user?.kullanici || 'editor', secret: token }) }).catch(() => {})
                          setFirsatlar(prev => prev.map(x => x.id === f.id ? { ...x, ustlenen: null, ustlenme: null } : x))
                        }}
                          style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
                          ↩ Bırak
                        </button>
                      )}
                      {f.link && <a href={f.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>Kaynak ↗</a>}
                      {!f.gizli && !f.yazildi && (
                        <button onClick={() => isaretle(f.id, 'gizli')}
                          style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 5, padding: '4px 10px' }}>
                          Gizle
                        </button>
                      )}
                    </div>

                    {teyitler[f.id] && (() => {
                      const t = teyitler[f.id]
                      const renk = t.durum_kodu === 'guncelle' ? '#00D4AA' : t.durum_kodu === 'isle' ? '#FFB700' : '#9b6bff'
                      return (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,.03)', border: `0.5px solid ${renk}55`, borderRadius: 6 }}>
                          <div style={{ fontSize: 11, color: renk, fontWeight: 600, marginBottom: 4 }}>
                            {t.durum_kodu === 'guncelle' ? '✓ kayserim.net\'te VAR — güncelle' : t.durum_kodu === 'isle' ? '◐ 1ha\'da var, yayınlanmamış — işle' : '✗ Hiçbirinde yok — özgün yaz'}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{t.tavsiye}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {t.var_kayserim && t.kayserim?.link && (
                              <a href={t.kayserim.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#00D4AA', textDecoration: 'none', border: '0.5px solid rgba(0,212,170,.3)', borderRadius: 5, padding: '3px 9px' }}>
                                Mevcut haberi aç ↗
                              </a>
                            )}
                            {t.var_kayserim && (
                              <button onClick={() => onManuelAc({ baslik: t.kayserim.baslik, metin: '', kategori: 'Güncel', gorsel_url: f.gorsel_url || '', kaynak_url: t.kayserim.link || '', keyword: f.baslik })}
                                style={{ fontSize: 11, color: '#00D4AA', background: 'rgba(0,212,170,.1)', border: '0.5px solid rgba(0,212,170,.3)', borderRadius: 5, padding: '3px 9px' }}>
                                ✎ Güncellemek için editöre al
                              </button>
                            )}
                            {!t.var_kayserim && t.var_1ha && t.ha1?.link && (
                              <a href={t.ha1.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#FFB700', textDecoration: 'none', border: '0.5px solid rgba(255,183,0,.3)', borderRadius: 5, padding: '3px 9px' }}>
                                1ha kaynağını aç ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
