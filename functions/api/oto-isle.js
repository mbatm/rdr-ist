/**
 * GET /api/oto-isle
 * 1ha RSS → Claude (Ahrefs keyword stratejisi ile) → KV → rdr.ist/api/feed
 * Hedef: kayserim.net günlük 60.000 ziyaretçi
 */

// ── AHREFS VERİ MODELİ ────────────────────────────────────────────────────
// Ahrefs'ten gelen veriler KV'de saklanır. Her keyword için:
//   { keyword, volume, difficulty, traffic_potential }
// Strateji: volume yüksek + difficulty düşük = fırsat
//           volume yüksek + difficulty yüksek = uzun kuyruk hedefle
//           Her kategorinin kendi fırsat penceresi var

// STRATEJI_FALLBACK — Ahrefs gerçek verisi (06.2026)
// Format: [keyword, volume, difficulty, traffic_potential]
// traffic_potential = o keyword'den alınabilecek max trafik tahmini
const STRATEJI_FALLBACK = {
  kategori: {
    'Asayiş':  [
      ['kayseri olay',            17000, 11,  62000],
      ['kayseri kaza',             1600,  0,   2000],
      ['kayseri trafik kazası',    1200,  0,   2000],
      ['kayseri yangın',            900,  0,    700],
      ['kayseri polis',              60,  0,   2200],
      ['kayseri asayiş',            200,  0,    500],
    ],
    'Trafik':  [
      ['kayseri kaza',             1600,  0,   2000],
      ['kayseri trafik kazası',    1200,  0,   2000],
      ['kayseri olay',            17000, 11,  62000],
    ],
    'Yangın':  [
      ['kayseri yangın',            900,  0,    700],
      ['kayseri olay',            17000, 11,  62000],
      ['kayseri kaza',             1600,  0,   2000],
    ],
    'Ekonomi': [
      ['kayseri iş ilanları',    26000,  5, 126000],
      ['kayseri altın fiyatları',24000, 57,  35000],
      ['kayseri emlak',            400,  0,  54000],
    ],
    'Güncel':  [
      ['kayseri olay',            17000, 11,  62000],
      ['kayseri son dakika',      19000, 51,  17000],
      ['kayseri haber',           17000, 47,  35000],
      ['kayseri gündem',            800, 29,   5100],
    ],
    'Kayseri': [
      ['kayseri olay',            17000, 11,  62000],
      ['kayseri haber',           17000, 47,  35000],
      ['kayseri son dakika',      19000, 51,  17000],
      ['kayseri radar',           13000,  0,  15000],
    ],
    'Spor':    [
      ['kayserispor',            476000, 25,  30000],
      ['kayserispor haberleri',    3400,  7,   1700],
      ['kayserispor son dakika',   1200,  8,   1500],
      ['kayseri spor',              600, 33,   7700],
    ],
    'Siyaset': [
      ['kayseri büyükşehir',        100, 10,  16000],
      ['kayseri belediye',           40,  3,  15000],
    ],
    'default': [
      ['kayseri olay',            17000, 11,  62000],
      ['kayseri haber',           17000, 47,  35000],
      ['kayseri son dakika',      19000, 51,  17000],
    ],
  },
  ozelTipler: {
    'kaza':    [['kayseri kaza', 1600, 0, 2000], ['kayseri trafik kazası', 1200, 0, 2000], ['kayseri olay', 17000, 11, 62000]],
    'yangin':  [['kayseri yangın', 900, 0, 700], ['kayseri olay', 17000, 11, 62000]],
    'asayis':  [['kayseri olay', 17000, 11, 62000], ['kayseri kaza', 1600, 0, 2000]],
    'ekonomi': [['kayseri iş ilanları', 26000, 5, 126000], ['kayseri altın fiyatları', 24000, 57, 35000]],
    'spor':    [['kayserispor haberleri', 3400, 7, 1700], ['kayserispor', 476000, 25, 30000]],
    'siyaset': [['kayseri büyükşehir', 100, 10, 16000], ['kayseri belediye', 40, 3, 15000]],
    'istihdam':[['kayseri iş ilanları', 26000, 5, 126000]],
    'genel':   [['kayseri olay', 17000, 11, 62000], ['kayseri haber', 17000, 47, 35000]],
  }
}


// Radar FB haberleri için SEO not bloğu — haberin orijinaline dokunmaz
function seoNotOlustur(baslik, icerik) {
  const metin = (baslik + ' ' + icerik).toLowerCase()

  // Trafik / Kaza
  if (/kaza|çarpış|trafık|zincirleme|takla|devrildi|çarptı/.test(metin)) {
    return `\n\n---\n📍 **Bölge Uyarısı:** Değerli okuyucularımız; bu haber Kayseri'de meydana gelen bir trafik kazasına ilişkindir. Söz konusu bölgeden geçmeniz ya da yakın çevrede bulunmanız durumunda dikkatli olmanızı tavsiye ederiz. Kayseri'de yaşanan trafik olaylarını ve son dakika haberlerini anlık olarak takip etmek için sayfamızı takipte kalın. Trafik kazası haberleri, yol durumu ve güzergah uyarıları için kayserim.net'i ziyaret edebilirsiniz.`
  }

  // Yangın
  if (/yangın|alev|duman|itfaiye|yandı|tutuştu/.test(metin)) {
    return `\n\n---\n🔥 **Önemli Uyarı:** Bu haber Kayseri'de çıkan bir yangına ilişkindir. Yangın bölgesine yaklaşmaktan kaçınmanızı, görevlilerin uyarılarına uymanızı ve bölgede trafik yoğunluğu olabileceğini göz önünde bulundurmanızı tavsiye ederiz. Kayseri yangın haberleri ve acil durum bildirimleri için kayserim.net'i takip edin.`
  }

  // Kayıp kişi
  if (/kayıp|kaybolan|aranıyor|bulunama|haber alınam/.test(metin)) {
    return `\n\n---\n🆘 **Acil Duyuru:** Bu haber kayıp bir kişiye ilişkin önemli bir duyurudur. Söz konusu kişi hakkında bilgisi olanların en yakın emniyet müdürlüğüne veya 155 polis imdat hattına başvurması rica olunur. Kayseri'de kayıp ihbarları ve arama çalışmalarına ilişkin güncel bilgilere kayserim.net üzerinden ulaşabilirsiniz.`
  }

  // Hırsızlık / Gasp / Dolandırıcılık
  if (/hırsız|gasp|dolandır|çaldı|soygun|kapkaç/.test(metin)) {
    return `\n\n---\n⚠️ **Güvenlik Uyarısı:** Bu haber bölgede yaşanan bir güvenlik olayına ilişkindir. Çevrenizde şüpheli bir durum fark ettiğinizde emniyet güçlerine 155 numaralı hattı arayarak bilgi verebilirsiniz. Kayseri asayiş haberleri ve güvenlik uyarıları için kayserim.net'i takip edin.`
  }

  // Doğal afet / Sel / Dolu
  if (/sel|su baskın|dolu|fırtına|heyelan|deprem/.test(metin)) {
    return `\n\n---\n🌊 **Doğal Afet Uyarısı:** Bu haber Kayseri'de yaşanan bir doğal afet olayına ilişkindir. AFAD ve yetkili kurumlara 122 numaralı hat üzerinden ulaşabilirsiniz. Güvenli bir alanda kalmanızı ve resmi açıklamaları takip etmenizi tavsiye ederiz. Kayseri'deki doğal afet haberleri için kayserim.net'i ziyaret edin.`
  }

  // Kan / Organ ihtiyacı
  if (/kan ihtiyac|kan arıyor|donör|organ bağış/.test(metin)) {
    return `\n\n---\n🩸 **Acil Çağrı:** Bu haber acil kan veya organ ihtiyacına ilişkindir. Yardımcı olmak isteyenler en yakın kan merkezine ya da 182 numaralı Kızılay hattına başvurabilir. Kayseri'deki acil ihtiyaç duyurularını takip etmek için kayserim.net'i ziyaret edin.`
  }

  // Bulunmuş eşya / Kayıp hayvan
  if (/bulundu|kayıp köpek|kayıp kedi|kayıp hayvan|sahipsiz/.test(metin)) {
    return `\n\n---\n🐾 **Duyuru:** Bu haber bulunan veya kaybolan bir varlığa ilişkin bir duyurudur. Bilgisi olanlar Radar Kayseri sosyal medya hesapları üzerinden veya yetkili birimler aracılığıyla iletişime geçebilir. Kayseri gündem haberleri ve duyuruları için kayserim.net'i takip edin.`
  }

  // Tıbbi / Sağlık acil
  if (/ambulans|hastane|yaralı|hayatını kaybetti|vefat|cenaze|sağlık/.test(metin)) {
    return `\n\n---\n🏥 **Bilgilendirme:** Bu haber tıbbi bir olay ya da sağlıkla ilgili bir gelişmeye ilişkindir. Acil sağlık yardımı için 112 numaralı hattı arayabilirsiniz. Kayseri sağlık haberleri ve acil durum bildirimleri için kayserim.net'i takip edin.`
  }

  // Ekonomi / Fiyat
  if (/fiyat|zam|indirim|kampanya|ekonomi|dolar|euro|altın/.test(metin)) {
    return `\n\n---\n💰 **Ekonomi Notu:** Kayseri'deki güncel fiyat değişimleri, ekonomik gelişmeler ve piyasa haberleri için kayserim.net'i ziyaret edin. Kayserim.net olarak şehrin ekonomik nabzını sürekli takip ediyor, doğru ve güncel bilgileri sizlerle paylaşıyoruz.`
  }

  // Genel haber — varsayılan
  return `\n\n---\n📰 **Editör Notu:** Kayseri'den son dakika haberleri, gelişmeler ve duyurular için kayserim.net'i takip etmeye devam edin. Radar Kayseri iş birliğiyle derlenen bu ve benzeri haberler anlık olarak güncellenmektedir.`
}

// Fırsat keyword seç
// Format: [keyword, volume, difficulty, traffic_potential?]
// traffic_potential öncelikli, difficulty 0 ise büyük avantaj
function firsat_keyword_sec(keywordler, limit = 3) {
  return [...keywordler]
    .sort((a, b) => {
      const tpA = (a[3] || a[1] || 0) / ((a[2] || 0) / 10 + 1)
      const tpB = (b[3] || b[1] || 0) / ((b[2] || 0) / 10 + 1)
      return tpB - tpA
    })
    .slice(0, limit)
    .map(k => ({
      keyword:    k[0],
      volume:     k[1] || 0,
      difficulty: k[2] || 0,
      traffic_potential: k[3] || k[1] || 0,
    }))
}

// Haber içeriğinden anahtar kavramları tespit et
function haberTipiBelirle(baslik, icerik) {
  const metin = (baslik + ' ' + icerik).toLowerCase()
  if (/kaza|çarpış|trafik|zincirleme/.test(metin)) return 'kaza'
  if (/yangın|itfaiye|alev/.test(metin))             return 'yangin'
  if (/gözaltı|tutuklama|kaçak|hırsız/.test(metin))  return 'asayis'
  if (/altın|dolar|euro|akaryakıt|fiyat|ekonomi/.test(metin)) return 'ekonomi'
  if (/kayserispor|futbol|maç|lig|transfer/.test(metin))      return 'spor'
  if (/belediye|vali|milletvekili|seçim/.test(metin)) return 'siyaset'
  if (/iş ilan|istihdam|işsiz/.test(metin))           return 'istihdam'
  return 'genel'
}

function buildPrompt(haber, strateji) {
  const kat       = haber.kategori || 'Güncel'
  const isVideo   = !!haber.video

  // Haber tipini tespit et — daha spesifik keyword eşleştirme için
  const haberTipi = haberTipiBelirle(haber.baslik, haber.icerik)

  // Önce özel tip keyword listesine bak, yoksa kategori listesi
  const ozelTipList = strateji.ozelTipler?.[haberTipi]
  const katKwList   = strateji.kategori?.[kat] || strateji.kategori?.['default'] || STRATEJI_FALLBACK.kategori['default']
  const kwList      = ozelTipList?.length > 0 ? [...ozelTipList, ...katKwList] : katKwList

  // En iyi fırsat keyword'leri seç (traffic_potential / difficulty oranına göre)
  const firsatKwler = firsat_keyword_sec(kwList, 3)
  const kw1 = firsatKwler[0] || { keyword: 'kayseri haber', volume: 17000, difficulty: 47, traffic_potential: 35000 }
  const kw2 = firsatKwler[1] || { keyword: 'kayseri son dakika', volume: 19000, difficulty: 51, traffic_potential: 17000 }
  const kw3 = firsatKwler[2] || null

  // Kayseri kuralı: haber zaten Kayseri'deyse organik, değilse local angle
  const haberKayseriIlgili = /kayseri|kayserim|kayserispor/i.test(haber.baslik + haber.icerik)
  const kayseriKurali = haberKayseriIlgili
    ? `Bu haber zaten Kayseri ile ilgili — "Kayseri" kelimesini başlıkta organik kullan, zorla tekrar etme.`
    : `Bu haber doğrudan Kayseri ile ilgili değil — başlığa "Kayseri" ekleme. Yerel bağlantı varsa 1-2 kez doğal kullan.`

  // Keyword bilgilerini prompt için formatla
  const kw1Bilgi = `"${kw1.keyword}" (aylık ${kw1.volume?.toLocaleString()} arama, zorluk: ${kw1.difficulty}/100, trafik potansiyeli: ${kw1.traffic_potential?.toLocaleString()})`
  const kw2Bilgi = kw2 ? `"${kw2.keyword}" (aylık ${kw2.volume?.toLocaleString()} arama, zorluk: ${kw2.difficulty}/100)` : ''
  const kw3Bilgi = kw3 ? `"${kw3.keyword}" (zorluk: ${kw3.difficulty}/100)` : ''

  return `Sen kayserim.net için kıdemli bir haber editörü ve SEO uzmanısın.

## TEMEL GÖREV
Verilen haberi; bağlamından ASLA koparmadan, gerçekleri değiştirmeden, SEO uyumlu ve okuyucu odaklı şekilde düzenle. Haber kısa ise mantıklı bağlamsal bilgilerle genişlet.

## HABER BİLGİSİ
Başlık: ${haber.baslik.slice(0,200)}
İçerik: ${haber.icerik.slice(0,500)}
Kategori: ${kat}
Haber Tipi: ${haberTipi}
${isVideo ? 'Format: VİDEO HABER — sosyal metinlere "izle", "videolu haber" ekle' : ''}

## AHREFS SEO STRATEJİSİ (Gerçek veri)
Bu haber için en yüksek trafik potansiyelli keyword'ler:

🥇 BİRİNCİL HEDEF: ${kw1Bilgi}
→ Bu keyword'ü başlıkta organik kullan. Zorla ekleme değil, haber buna uygunsa.

${kw2Bilgi ? `🥈 İKİNCİL: ${kw2Bilgi}
→ Meta description veya içerikte geçir.` : ''}

${kw3Bilgi ? `🥉 DESTEKLEYİCİ: ${kw3Bilgi}` : ''}

${kayseriKurali}

## BAŞLIK KURALLARI
- 55-65 karakter
- Birincil hedef keyword başlıkta organik geçmeli
- Rakam, soru, sonuç odaklı başlıklar tıklanma artırır
- ✅ İyi: "Kayseri'de 5 araç birbirine girdi: 3 yaralı"
- ✅ İyi: "Altın fiyatları bugün ne kadar? Kayseri piyasası"
- ❌ Kötü: "Kayseri haber: Kayseri'de Kayseri olay..."

## İÇERİK KURALLARI
- Türk haber ajansı dili (AA/DHA): "gözaltına alındı", "kaldırıldı", "açıkladı"
- İlk cümle: Kim, ne, nerede, ne zaman
- Spekülasyon YASAK: "olmuş olabilir", "muhtemelen"
- Editöryal yorum YASAK: "önlem alınmalıdır"
- Sayıları kullan: "35 kişi" > "çok sayıda kişi"
- Unvan/özel isim ASLA değiştirme: "Kocasinan Kaymakamı" → olduğu gibi
- HEDEF: 400-600 kelime
  * Kısa haberler için: bölge bağlamı, geçmiş benzer olaylar, yetkili açıklamaları genişlet
  * Uydurma değil — haberin doğal uzantısı olan gerçek bilgiler ekle

## ÖNCELIK KARAR KURALI
- Birincil keyword zorluk 0-10 → "yuksek" öncelik (direkt sıralanabilir)
- Birincil keyword zorluk 11-35 → "orta" öncelik
- Birincil keyword zorluk 35+ → "dusuk" öncelik

## ÇIKTI FORMATI (SADECE JSON — başka hiçbir şey yazma)
{
  "site_basligi": "55-65 karakter, ${kw1.keyword} organik içersin, haberin özünü yansıtsın",
  "h1_basligi": "site_basligi ile aynı veya çok yakın",
  "sosyal_baslik": "5-8 kelime, merak uyandırıcı — Kayseri zorunlu değil",
  "meta_description": "max 155 karakter, ${kw1.keyword} ve haberin özü, tıklatıcı",
  "url_slug": "kısa-tire-ile-benzersiz-slug-kw1-iceren",
  "optimize_icerik": "400-600 kelime, AA/DHA haber dili, bağlam korunmuş, mantıklı genişletilmiş",
  "ozet": "1 cümle, haberin özü",
  "instagram": "Sürükleyici ilk cümle. Merak uyandır. Kayseri zorunlu değil. Emoji. 1200-2000 karakter. 'Detaylar kayserim.net\'te 🔗' sonda. 6-10 hashtag (#kayseri #kayserihaber + konuya özel).",
  "facebook": "Dikkat çekici + özet. Max 300 karakter. 2-3 hashtag. Link ayrıca eklenir.",
  "x_twitter": "Çarpıcı. Max 230 karakter. 1-2 emoji. 2-3 hashtag. Link ayrıca.",
  "youtube_baslik": "max 80 karakter, ${kw1.keyword} içersin",
  "youtube_aciklama": "250-300 karakter. Sonuna 'Detaylar için: [LINK]'",
  "hedef_kelimeler": ["${kw1.keyword}", "${kw2?.keyword || ''}", "${kw3?.keyword || ''}"],
  "kategori": "${kat}",
  "oncelik": "yuksek veya orta veya dusuk — zorluk ${kw1.difficulty}/100 baz alınarak",
  "gorsel_prompt": "realistic Turkish news photo, specific scene, max 12 words",
  "alternatif_basliklar": [
    "Merak/soru: rakam veya sürpriz detay içeren 5-8 kelime",
    "Sonuç odaklı: ne oldu, kim etkilendi — 5-8 kelime",
    "Bağlam: geçmiş veya gelecek bağlantı içeren 5-8 kelime"
  ],
  "optimize_icerik_kwh": "${kw1.keyword} doğal yerleştirilmiş, unvanlar/rakamlar korunmuş, 400-600 kelime AA/DHA dili"
}`
}

// ── RSS PARSE ──────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const node = m[1]
    const link = node.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || ''
    const id   = link.split('/').pop() || link
    const basRaw = node.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    // 1HA prefix temizle: "KAYSERİ (1HA) -", "ANKARA (1HA) -", "(1HA) -" vb.
    const bas = basRaw
      .replace(/^[A-ZÇĞİÖŞÜa-zçğışöşü\s]+\(1HA\)\s*[-–—]\s*/i, '')
      .replace(/^\(1HA\)\s*[-–—]\s*/i, '')
      .replace(/^1HA\s*[-–—]\s*/i, '')
      .trim()
    const icerikRaw = node.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    // İçerikten de 1HA prefix temizle
    const icerik = icerikRaw
      .replace(/^[A-ZÇĞİÖŞÜa-zçğışöşü\s]+\(1HA\)\s*[-–—]\s*/i, '')
      .replace(/^\(1HA\)\s*[-–—]\s*/i, '')
      .replace(/^1HA\s*[-–—]\s*/i, '')
      .trim()
    const kat  = node.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/)?.[1]?.trim() || 'Genel'
    const dt   = node.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || ''

    // Tüm enclosure ve media:content görsellerini topla
    let gorsel = '', video = ''
    const gorseller = []  // tüm görseller listesi

    for (const enc of node.matchAll(/<enclosure[^>]*/g)) {
      const eUrl  = enc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const eType = enc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      if (!eUrl) continue
      if (eType.startsWith('video/') || /\.mp4|\.mov|\.webm/i.test(eUrl)) {
        if (!video) video = eUrl
      } else {
        if (!gorsel) gorsel = eUrl
        if (!gorseller.includes(eUrl)) gorseller.push(eUrl)
      }
    }

    for (const mc of node.matchAll(/<media:content[^>]*/g)) {
      const mcUrl    = mc[0].match(/\burl="([^"]*)"/)?.[1] || ''
      const mcType   = mc[0].match(/\btype="([^"]*)"/)?.[1] || ''
      const mcMedium = mc[0].match(/\bmedium="([^"]*)"/)?.[1] || ''
      if (!mcUrl) continue
      const isVid = mcType.startsWith('video/') || mcMedium === 'video' || /\.mp4|\.mov|\.webm/i.test(mcUrl)
      if (isVid && !video) video = mcUrl
      else if (!isVid) {
        if (!gorsel) gorsel = mcUrl
        if (!gorseller.includes(mcUrl)) gorseller.push(mcUrl)
      }
    }

    // description içindeki tüm img'leri de topla
    if (!gorsel && !video) gorsel = node.match(/<img[^>]*src="([^"]*)"/)?.[ 1] || ''
    for (const imgMatch of node.matchAll(/<img[^>]*src="([^"]*)"/g)) {
      const iUrl = imgMatch[1]
      if (iUrl && !gorseller.includes(iUrl)) gorseller.push(iUrl)
    }

    if (bas.length > 5) items.push({ source_id:id, source_url:link, baslik:bas, icerik, gorsel, gorseller, video, kategori:kat, tarih_iso: new Date(dt||Date.now()).toISOString() })
  }
  return items
}

// ── CLAUDE ÇAĞRISI ─────────────────────────────────────────────────────────
// Haber icin anlik Ahrefs keyword verisi cek (her haber islendiginde)
async function anlikKwCek(haber, ahrefsKey) {
  if (!ahrefsKey) return null
  try {
    const stopwords = new Set(['bir','bu','ve','ile','de','da','ki','icin','ama','ya','ne','en','cok','az','hem','veya'])
    const kelimeler = haber.baslik.toLowerCase()
      .replace(/[^a-z0-9\sÀ-ɏ]/g, '')
      .split(/\s+/)
      .filter(k => k.length > 3 && !stopwords.has(k))
      .slice(0, 2)
    if (kelimeler.length === 0) return null
    const sorgular = kelimeler.map(k => `kayseri ${k}`).join(',')
    const res = await fetch(
      `https://apiv3.ahrefs.com/v3/keywords-explorer/overview?country=tr&keywords=${encodeURIComponent(sorgular)}&select=keyword,volume,difficulty,traffic_potential`,
      { headers: { 'Authorization': `Bearer ${ahrefsKey}` } }
    )
    const data = await res.json()
    if (!data.keywords?.length) return null
    return data.keywords
      .filter(k => k.volume > 0)
      .map(k => [k.keyword, k.volume, k.difficulty ?? 0, k.traffic_potential || k.volume])
      .sort((a, b) => (b[3] / ((b[2] || 0) / 10 + 1)) - (a[3] / ((a[2] || 0) / 10 + 1)))
  } catch(e) { return null }
}

async function isleHaber(haber, apiKey, strateji, ahrefsKey) {
  // Anlik Ahrefs verisi — haber konusuyla eslesen keyword'leri cek
  const anlikKwler = await anlikKwCek(haber, ahrefsKey)
  if (anlikKwler?.length > 0) {
    const kat = haber.kategori || 'Guncel'
    strateji = {
      ...strateji,
      kategori: {
        ...strateji.kategori,
        [kat]: [...anlikKwler, ...(strateji.kategori?.[kat] || [])],
      }
    }
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: 'Sadece geçerli JSON döndür. Başka hiçbir şey yazma.',
      messages:[{ role:'user', content: buildPrompt(haber, strateji) }]
    })
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const data = await res.json()
  let raw = data.content?.[0]?.text || ''
  raw = raw.replace(/^```json\s*/,'').replace(/\s*```\s*$/,'').trim()
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
  if (s === -1 || e <= s) throw new Error('JSON bulunamadi')
  return JSON.parse(raw.slice(s, e+1))
}

// ── ANA HANDLER ─────────────────────────────────────────────────────────────
export async function onRequestGet({ env, request }) {
  try {
    const url      = new URL(request.url)

    // Auth — RSS_API_KEY veya geçerli cms_token ile erişim
    const reqKey = url.searchParams.get('secret') || request.headers.get('x-api-key') || ''
    const isRssKey = reqKey === env.RSS_API_KEY
    // cms_token kontrolü — KV'de token varsa geçerli
    let isCmsToken = false
    if (!isRssKey && reqKey) {
      try {
        const kullanici = await env.HABERLER.get(`token:${reqKey}`, 'json')
        if (kullanici) isCmsToken = true
      } catch {}
    }
    if (!isRssKey && !isCmsToken)
      return Response.json({ hata: 'Yetkisiz' }, { status: 401 })

    const sourceId = url.searchParams.get('source_id')
    const adet     = Math.min(parseInt(url.searchParams.get('adet')||'5'), 50)
    const liste    = url.searchParams.get('liste') === '1'

    // Sadece liste istendi — RSS'ten son haberleri döndür
    if (liste) {
      const listeAdet = Math.min(parseInt(url.searchParams.get('adet')||'20'), 50)
      const rssRes2 = await fetch(`https://1ha.com.tr/api/rss/${env.OHA_RSS_TOKEN || env.RSS_API_KEY}`,
        { headers:{ 'User-Agent':'rdr.ist/1.0' } })
      if (!rssRes2.ok) return Response.json({ hata:`RSS ${rssRes2.status}` })
      const xml2  = await rssRes2.text()
      const items2 = parseRSS(xml2).slice(0, listeAdet)
      return Response.json({ haberler: items2.map(h=>({
        source_id: h.source_id,
        baslik:    h.baslik,
        icerik:    h.icerik?.substring(0, 200),
        gorsel:    h.gorsel,
        gorseller: h.gorseller || (h.gorsel ? [h.gorsel] : []),
        video:     h.video || '',
        kategori:  h.kategori,
        tarih:     h.tarih_iso,
      })) })
    }

    // Ahrefs cache'i KV'den oku (varsa), yoksa fallback
    let strateji = STRATEJI_FALLBACK
    try {
      const cache = await env.HABERLER.get('ahrefs_strateji', 'json')
      if (cache) strateji = cache
    } catch {}

    // 1ha RSS + Radar Facebook RSS — paralel çek
    const [rssRes, radarRssRes] = await Promise.all([
      fetch(`https://1ha.com.tr/api/rss/${env.OHA_RSS_TOKEN || env.RSS_API_KEY}`, { headers:{ 'User-Agent':'rdr.ist/1.0' } }),
      fetch('https://rdr.ist/api/radar-rss').catch(() => null),
    ])
    if (!rssRes.ok) return Response.json({ hata:`RSS ${rssRes.status}` })

    const xml    = await rssRes.text()
    const items1ha = parseRSS(xml)

    // Radar FB haberlerini de ekle
    let radarItems = []
    if (radarRssRes?.ok) {
      const radarXml = await radarRssRes.text()
      radarItems = parseRSS(radarXml).map(h => ({
        ...h,
        kategori: 'Kayseri',
        kaynak:   'radar_fb',
      }))
    }

    const items = [...items1ha, ...radarItems]
    let mevcut      = (await env.HABERLER.get('liste','json')) || []
    let radarMevcut = (await env.HABERLER.get('radar_liste','json')) || []
    // Her iki listeden mevcut ID'leri topla
    const mevcutIds = new Set([
      ...mevcut.map(h=>h.source_id),
      ...radarMevcut.map(h=>h.source_id),
    ])

    // Tekil haber işleme (source_id ile)
    if (sourceId) {
      const hedefHaber = items.find(i=>i.source_id===sourceId)
        || mevcut.find(h=>h.source_id===sourceId)
      if (!hedefHaber) return Response.json({ hata:'Haber bulunamadı' }, { status:404 })
      const seo = await isleHaber(hedefHaber, env.ANTHROPIC_API_KEY, strateji, env.AHREFS_API_KEY)
      const kayit = {
        ...seo,
        source_id:hedefHaber.source_id, source_url:hedefHaber.source_url,
        baslik:hedefHaber.baslik, icerik:hedefHaber.icerik,
        gorsel:hedefHaber.gorsel, gorsel_url:hedefHaber.gorsel, video:hedefHaber.video||'',
        tarih_iso:hedefHaber.tarih_iso, kaydedildi:new Date().toISOString(),
        kayserim_link:hedefHaber.kayserim_link||'', durum:'islendi'
      }
      mevcut = [kayit, ...mevcut.filter(h=>h.source_id!==sourceId)].slice(0,200)
      await env.HABERLER.put('liste', JSON.stringify(mevcut))
      return Response.json(kayit)
    }

    const yeniHaberler = items.filter(i=>!mevcutIds.has(i.source_id)).slice(0, adet)
    if (!yeniHaberler.length) return Response.json({ islendi:0, mesaj:'Yeni haber yok', kv_toplam:mevcut.length })

    const basarili=[], hatali=[]
    for (const haber of yeniHaberler) {
      try {
        // Radar FB haberleri — Claude çağrılmaz, orijinal içerik korunur
        if (haber.kaynak === 'radar_fb') {
          const seoNot = seoNotOlustur(haber.baslik, haber.icerik)
          const kayit = {
            source_id:     haber.source_id,
            source_url:    haber.source_url,
            baslik:        haber.baslik,
            site_basligi:  haber.baslik,
            h1_basligi:    haber.baslik,
            icerik:        haber.icerik,
            optimize_icerik: (haber.icerik || '') + seoNot,
            gorsel:        haber.gorsel,
            gorsel_url:    haber.gorsel,
            video:         haber.video || '',
            tarih_iso:     haber.tarih_iso,
            kaydedildi:    new Date().toISOString(),
            fb_link:       haber.fb_link || '',
            kaynak:        'radar_fb',
            kategori:      'KAYSERADAR',
            durum:         'islendi',
          }
          let radarListe = (await env.HABERLER.get('radar_liste','json')) || []
          radarListe = [kayit, ...radarListe.filter(h=>h.source_id!==haber.source_id)].slice(0,200)
          await env.HABERLER.put('radar_liste', JSON.stringify(radarListe), { expirationTtl: 60*60*24*10 })
          basarili.push(haber.source_id)
          continue
        }

        // 1ha haberleri — Claude ile SEO işleme
        const seo = await isleHaber(haber, env.ANTHROPIC_API_KEY, strateji, env.AHREFS_API_KEY)
        const kayit = {
          ...seo,
          source_id:   haber.source_id,
          source_url:  haber.source_url,
          baslik:      haber.baslik,
          icerik:      haber.icerik,
          gorsel:      haber.gorsel,
          gorsel_url:  haber.gorsel,
          gorsel_url_orijinal: haber.gorsel,
          video:       haber.video || '',
          tarih_iso:   haber.tarih_iso,
          kaydedildi:  new Date().toISOString(),
          kayserim_link: haber.kayserim_link || '',
          durum:       'islendi',
        }
        if (false) {  // placeholder — aşağıdaki else bloğu için
          void 0
        } else {
          mevcut = [kayit,...mevcut.filter(h=>h.source_id!==haber.source_id)].slice(0,200)
          await env.HABERLER.put('liste', JSON.stringify(mevcut))
        }
        basarili.push(kayit.url_slug||haber.source_id)
      } catch(e) { hatali.push({ id:haber.source_id, hata:e.message }) }
    }
    return Response.json({ islendi:basarili.length, sluglar:basarili, hatali, kv_toplam:mevcut.length })
  } catch(e) {
    return Response.json({ hata:e.message }, { status:500 })
  }
}
