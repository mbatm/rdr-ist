/**
 * /api/ozel-gunler — Özel Gün Stratejisi (TAM DİNAMİK)
 * ─────────────────────────────────────────────────────────────────────────────
 * Önemli günleri (dini/milli/resmi bayram, tatil, astronomi olayları,
 * farkındalık/ticari günler, sezonlar ve Kayseri'ye özel günler) tarihe göre
 * DİNAMİK çözen motor. Sabit kurallar (her yıl tekrar eden) koda gömülü; yıllık
 * kayan olaylar (bayram/kandil/tutulma/meteor) çok yıllı araştırılmış tarih
 * tablolarıyla beslenir → "stale tarih" derdi olmaz.
 *
 * Her özel günün, gün gelmeden ÖNCE oluşturulabilecek HABER ALTERNATİFLERİ var.
 * Kullanıcı panelden hangisini gireceğini onaylar; onaylananlar taslak üretip
 * editörde açılır. Onay/seçim durumu KV'de saklanır (ozelgun:onaylar).
 *
 * GET  ?action=liste&ufuk=120  → ufuk içindeki gelen özel günler (+onay durumu)
 * GET  ?action=aktif           → bugün aktif olan sezon/dönemler (badge için)
 * GET  ?action=durum           → onay/seçim kayıtları
 * GET  ?action=ayarlar         → ayarlar (ufuk vb.)
 * POST {action:'uret', gun_id, alt_id}        → o açı için taslak üret (Anthropic)
 * POST {action:'onayla', gun_id, alt_id}      → onay durumu kaydet
 * POST {action:'reddet', gun_id}              → günü gizle
 * POST {action:'ekle', ...}                   → kullanıcı özel günü ekle (ozelgun:ekstra)
 * POST {action:'ekstra_sil', id}             → eklenen özel günü sil
 * POST {action:'ayarlar', ufuk}              → ayar kaydet
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key,x-token',
  'Content-Type': 'application/json; charset=utf-8',
}
const TZ = 'Europe/Istanbul'
const GUN_MS = 86400000

// ── KATEGORİLER (renk/emoji/etiket) ──────────────────────────────────────────
const KAT = {
  dini:        { ad:'Dini Gün',      emoji:'🕌', renk:'#1D9E75' },
  resmi:       { ad:'Resmi/Milli',   emoji:'🇹🇷', renk:'#E63946' },
  astronomi:   { ad:'Gökyüzü',       emoji:'🔭', renk:'#6366F1' },
  kayseri:     { ad:'Kayseri',       emoji:'🏔️', renk:'#A855F7' },
  farkindalik: { ad:'Farkındalık',   emoji:'💟', renk:'#EC4899' },
  ticari:      { ad:'Ticari/Hediye', emoji:'🛍️', renk:'#EF9F27' },
  sezon:       { ad:'Sezon',         emoji:'🗓️', renk:'#0EA5E9' },
}

// ── GÜN ADLARI (kural tabanlı: ayın N. pazarı vb.) ───────────────────────────
const GUN_AD = { pazar:0, pazartesi:1, sali:2, carsamba:3, persembe:4, cuma:5, cumartesi:6 }

/**
 * VERİ SETİ — her özel gün ÜÇ yoldan tarihlenebilir:
 *  sabit:   {ay, gun}                    → her yıl aynı tarih
 *  kural:   {ay, gun:'pazar', n:2}       → ayın 2. pazarı (n<0 → sondan)
 *  tarihler:['2026-08-12', ...]          → araştırılmış kesin tarihler (çok yıllı)
 *  aralik:  {bas:{ay,gun}, son:{ay,gun}} → sezon penceresi (yıl atlayabilir)
 *
 * alternatifler: gün gelmeden oluşturulabilecek haber açıları (başlık + kısa brief)
 */
const VERI = [
  // ═══════════════ DİNİ GÜNLER (yıllık kayan — araştırılmış tarihler) ═══════════════
  { id:'mevlid', ad:'Mevlid Kandili', kategori:'dini', onem:80, lead:3,
    tarihler:['2026-08-24','2027-08-14'],
    aciklama:'Hz. Muhammed\'in doğumunun anıldığı gece.',
    alternatifler:[
      { baslik:'Mevlid Kandili bu gece: anlamı, kılınacak namaz ve okunacak dualar', aci:'Kandilin dini önemi, ibadet rehberi, idrak edilen dualar' },
      { baslik:'Kayseri\'de Mevlid Kandili programları ve cami etkinlikleri', aci:'Kayseri camilerindeki kandil programı, mevlid okutma' },
      { baslik:'Mevlid Kandili mesajları: sevdiklerinize gönderebileceğiniz dualar', aci:'Kısa-uzun kandil tebrik mesajları derlemesi (SEO)' },
    ]},
  { id:'regaip', ad:'Regaip Kandili / Üç Aylar Başlangıcı', kategori:'dini', onem:78, lead:3,
    tarihler:['2026-12-10','2027-11-30'],
    aciklama:'Recep ayının ilk Cuma gecesi; üç ayların başlangıcı.',
    alternatifler:[
      { baslik:'Üç aylar başlıyor: Regaip Kandili\'nin anlamı ve fazileti', aci:'Recep-Şaban-Ramazan üç ayları, Regaip\'in önemi' },
      { baslik:'Regaip Kandili duaları ve bu gece yapılacak ibadetler', aci:'Kandil gecesi ibadet rehberi, dualar' },
      { baslik:'Kayseri\'de üç aylar: cami programları ve kandil simidi geleneği', aci:'Yerel kandil gelenekleri, program' },
    ]},
  { id:'ramazan-basi', ad:'Ramazan Ayı Başlangıcı (İlk Oruç)', kategori:'dini', onem:90, lead:5,
    tarihler:['2027-02-08'],
    aciklama:'İlk orucun tutulduğu gün. Kayseri imsakiye trafiği zirve yapar.',
    alternatifler:[
      { baslik:'Kayseri imsakiye {YIL}: ilk sahur ve iftar saatleri', aci:'Kayseri\'ye özel imsak/iftar vakitleri tablosu — yüksek aramalı' },
      { baslik:'Kayseri\'de iftar mekanları: aileyle gidilecek 10 adres', aci:'Yerel iftar restoranları, fiyat aralığı' },
      { baslik:'Ramazan\'da Kayseri sofraları: yöresel iftar lezzetleri', aci:'Pastırmalı yumurta, Kayseri mantısı, yağlama — ramazan teması' },
    ]},
  { id:'ramazan-bayrami', ad:'Ramazan Bayramı', kategori:'dini', onem:96, lead:7,
    tarihler:['2027-03-09'], teyit:true,
    aciklama:'Dini bayram. Bayram namazı saati / nöbetçi eczane / ziyaret trafiği yüksek.',
    alternatifler:[
      { baslik:'Kayseri bayram namazı saati {YIL}: ilçe ilçe vakitler', aci:'Kayseri ve ilçeleri bayram namazı saatleri — dev trafik' },
      { baslik:'Bayramda Kayseri\'de açık nöbetçi eczaneler ve marketler', aci:'Tatilde açık eczane/market/benzinlik listesi' },
      { baslik:'Kayseri\'de bayram tatilinde gezilecek 7 yer', aci:'Erciyes, Kapuzbaşı, tarihi merkez — bayram gezi rehberi' },
    ]},
  { id:'kurban-bayrami', ad:'Kurban Bayramı', kategori:'dini', onem:96, lead:10,
    tarihler:['2027-05-16'], teyit:true,
    aciklama:'Dini bayram. Kurbanlık fiyatları / kesim yerleri / bayram namazı trafiği yüksek.',
    alternatifler:[
      { baslik:'Kayseri\'de kurbanlık fiyatları {YIL}: küçük-büyükbaş güncel rakamlar', aci:'Kayseri hayvan pazarı fiyatları, hisse ücretleri' },
      { baslik:'Kayseri bayram namazı saati ve kurban kesim noktaları', aci:'Namaz vakti + belediye kesim yerleri' },
      { baslik:'Kurban eti nasıl saklanır, ne zaman pişirilir? Uzman önerileri', aci:'Pratik bilgi içeriği — geniş kitle' },
    ]},

  // ═══════════════ RESMİ / MİLLİ GÜNLER (sabit — her yıl otomatik) ═══════════════
  { id:'yilbasi', ad:'Yılbaşı', kategori:'resmi', onem:82, lead:5, sabit:{ay:1,gun:1},
    aciklama:'Yeni yıl. Etkinlik/konser ve "yeni yıl" temalı içerik trafiği.',
    alternatifler:[
      { baslik:'Kayseri\'de yılbaşı: konser, etkinlik ve eğlence programı', aci:'Yeni yıl etkinlikleri, mekan önerileri' },
      { baslik:'Yılbaşında Kayseri\'de açık nöbetçi eczaneler', aci:'1 Ocak tatilinde açık eczane listesi' },
    ]},
  { id:'23nisan', ad:'23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', kategori:'resmi', onem:88, lead:5, sabit:{ay:4,gun:23},
    aciklama:'Milli bayram. Tören + çocuk etkinlikleri.',
    alternatifler:[
      { baslik:'Kayseri\'de 23 Nisan kutlama programı: tören nerede, saat kaçta?', aci:'Resmi tören yeri/saati + belediye çocuk etkinlikleri' },
      { baslik:'23 Nisan şiirleri ve mesajları: en güzel kutlama sözleri', aci:'Şiir/mesaj derlemesi — yüksek arama' },
    ]},
  { id:'1mayis', ad:'1 Mayıs Emek ve Dayanışma Günü', kategori:'resmi', onem:72, lead:3, sabit:{ay:5,gun:1},
    aciklama:'Resmi tatil.',
    alternatifler:[
      { baslik:'1 Mayıs\'ta Kayseri\'de hangi yerler açık, hangi etkinlikler var?', aci:'Tatil günü açık yerler + kutlamalar' },
    ]},
  { id:'19mayis', ad:'19 Mayıs Atatürk\'ü Anma Gençlik ve Spor Bayramı', kategori:'resmi', onem:85, lead:5, sabit:{ay:5,gun:19},
    aciklama:'Milli bayram.',
    alternatifler:[
      { baslik:'Kayseri\'de 19 Mayıs kutlamaları: program ve tören detayları', aci:'Stadyum/meydan tören programı' },
      { baslik:'19 Mayıs mesajları ve Atatürk\'ün Gençliğe Hitabesi', aci:'Mesaj + hitabe metni — SEO' },
    ]},
  { id:'15temmuz', ad:'15 Temmuz Demokrasi ve Milli Birlik Günü', kategori:'resmi', onem:80, lead:4, sabit:{ay:7,gun:15},
    aciklama:'Resmi anma günü.',
    alternatifler:[
      { baslik:'Kayseri\'de 15 Temmuz anma programı ve etkinlikler', aci:'Demokrasi nöbeti/anma töreni programı' },
    ]},
  { id:'30agustos', ad:'30 Ağustos Zafer Bayramı', kategori:'resmi', onem:85, lead:5, sabit:{ay:8,gun:30},
    aciklama:'Milli bayram.',
    alternatifler:[
      { baslik:'Kayseri\'de 30 Ağustos Zafer Bayramı kutlama programı', aci:'Tören yeri/saati + kutlama' },
      { baslik:'30 Ağustos mesajları: Zafer Bayramı için anlamlı sözler', aci:'Mesaj derlemesi' },
    ]},
  { id:'29ekim', ad:'29 Ekim Cumhuriyet Bayramı', kategori:'resmi', onem:90, lead:6, sabit:{ay:10,gun:29},
    aciklama:'En büyük milli bayram. Fener alayı, konser, tören.',
    alternatifler:[
      { baslik:'Kayseri\'de 29 Ekim programı: fener alayı, konser ve tören saatleri', aci:'Cumhuriyet Bayramı tam program' },
      { baslik:'29 Ekim Cumhuriyet Bayramı mesajları ve şiirleri', aci:'Mesaj/şiir derlemesi' },
    ]},
  { id:'10kasim', ad:'10 Kasım Atatürk\'ü Anma Günü', kategori:'resmi', onem:84, lead:4, sabit:{ay:11,gun:10},
    aciklama:'Anma günü (resmi tatil değil). 09:05 saygı duruşu.',
    alternatifler:[
      { baslik:'Kayseri\'de 10 Kasım anma törenleri ve saygı duruşu', aci:'Anıt/meydan tören programı, 09:05' },
      { baslik:'10 Kasım mesajları ve Atatürk\'ün özlü sözleri', aci:'Mesaj/söz derlemesi' },
    ]},

  // ═══════════════ KAYSERİ'YE ÖZEL GÜNLER ═══════════════
  { id:'ataturk-kayseri', ad:'Atatürk\'ün Kayseri\'ye Gelişi', kategori:'kayseri', onem:80, lead:4, sabit:{ay:12,gun:19},
    aciklama:'19 Aralık — Atatürk\'ün Kayseri\'ye gelişinin yıldönümü.',
    alternatifler:[
      { baslik:'Atatürk\'ün Kayseri\'ye gelişinin yıldönümü: o gün ne yaşandı?', aci:'Tarihsel anlatı, ziyaretin önemi, fotoğraflar' },
      { baslik:'Kayseri\'de Atatürk\'ün gelişi anma programı', aci:'Resmi anma etkinlikleri' },
    ]},
  { id:'mimar-sinan', ad:'Mimar Sinan\'ı Anma (Ağırnas)', kategori:'kayseri', onem:78, lead:5, sabit:{ay:4,gun:9},
    aciklama:'9 Nisan — Kayseri Ağırnaslı Mimar Sinan anılır. Mimar Sinan Haftası.',
    alternatifler:[
      { baslik:'Kayseri\'nin dehası Mimar Sinan anılıyor: Ağırnas\'taki evi ve eserleri', aci:'Mimar Sinan kimdir, Kayseri bağı, Ağırnas evi, anma programı' },
      { baslik:'Mimar Sinan\'ın Kayseri\'deki izleri: Kurşunlu Camii ve miras', aci:'Yerel eser turu, kültür içeriği' },
    ]},
  { id:'seyyid-burhaneddin', ad:'Seyyid Burhaneddin\'i Anma', kategori:'kayseri', onem:70, lead:4, sabit:{ay:3,gun:24},
    aciklama:'24 Mart — Mevlana\'nın hocası Seyyid Burhaneddin Kayseri\'de anılır.',
    alternatifler:[
      { baslik:'Seyyid Burhaneddin kimdir? Türbesi ve Kayseri\'deki anma programı', aci:'Tarihsel kişilik, türbe ziyareti, program' },
    ]},
  { id:'pastirma-festivali', ad:'Kayseri Pastırma-Sucuk-Mantı Festivali', kategori:'kayseri', onem:85, lead:7, sabit:{ay:9,gun:6},
    aciklama:'Eylül — Kültür Yolu Festivali / Pastırma Festivali. Kayseri mutfağı zirvede.',
    alternatifler:[
      { baslik:'Kayseri Pastırma-Sucuk-Mantı Festivali başlıyor: program ve konserler', aci:'Festival tam program, sahne, etkinlikler' },
      { baslik:'Kayseri pastırması nasıl yapılır? Çemenin sırrı ve pastırma mevsimi', aci:'Yöresel üretim anlatısı, "pastırma yazı"' },
      { baslik:'Festival için Kayseri rehberi: nerede yenir, ne alınır?', aci:'Mutfak + alışveriş rehberi, ziyaretçi odaklı' },
    ]},
  { id:'erciyes-kayak', ad:'Erciyes Kayak Sezonu Açılışı', kategori:'kayseri', onem:88, lead:7,
    aralik:{ bas:{ay:12,gun:6}, son:{ay:4,gun:20} },
    aciklama:'Erciyes Kayak Merkezi sezonu (Ara-Nis). Skipass/kar/konaklama aramaları zirve.',
    alternatifler:[
      { baslik:'Erciyes\'te kayak sezonu açıldı: {YIL} skipass ve telesiyej fiyatları', aci:'Güncel bilet/skipass fiyatları, pist durumu — yüksek trafik' },
      { baslik:'Erciyes kar kalınlığı ve hava durumu: pistler açık mı?', aci:'Anlık kar/pist/hava — tekrar eden trafik' },
      { baslik:'Erciyes\'e nasıl gidilir, nerede konaklanır? Kayak rehberi', aci:'Ulaşım + otel + kiralama rehberi' },
    ]},
  { id:'erciyes-kar-senligi', ad:'Erciyes Kar Şenliği', kategori:'kayseri', onem:75, lead:5, sabit:{ay:4,gun:1},
    aciklama:'Nisan başı — meşaleli kayak ve havai fişek gösterileri.',
    alternatifler:[
      { baslik:'Erciyes Kar Şenliği: meşaleli iniş ve havai fişek gösterisi ne zaman?', aci:'Şenlik programı, gösteri saatleri' },
    ]},

  // ═══════════════ ASTRONOMİ (araştırılmış kesin tarihler) ═══════════════
  { id:'gunes-tutulmasi-2026', ad:'Parçalı Güneş Tutulması (Kayseri\'den görünür)', kategori:'astronomi', onem:95, lead:5,
    tarihler:['2026-08-12'],
    aciklama:'12 Ağustos 2026: Türkiye\'den parçalı güneş tutulması. Aynı gece Perseid zirvesi! Dev ilgi.',
    alternatifler:[
      { baslik:'Kayseri\'den güneş tutulması saat kaçta? Nasıl izlenir, gözlük şart mı?', aci:'Kayseri\'ye özel başlangıç/zirve saati, güvenli izleme — kritik bilgi' },
      { baslik:'Erciyes\'ten güneş tutulması fotoğrafçılığı: en iyi gözlem noktaları', aci:'Fotoğraf/gözlem rehberi, Erciyes konumu' },
      { baslik:'Aynı gece çifte gökyüzü şöleni: tutulma ve Perseid meteor yağmuru', aci:'Tutulma + meteor birleşik haber, izleme planı' },
    ]},
  { id:'perseid', ad:'Perseid Meteor Yağmuru', kategori:'astronomi', onem:85, lead:4,
    tarihler:['2026-08-12','2027-08-13'],
    aciklama:'Yılın en popüler meteor yağmuru (Ağu). 2026\'da Ay yok → ideal gözlem.',
    alternatifler:[
      { baslik:'Perseid meteor yağmuru bu gece zirvede: Kayseri\'de nereden, saat kaçta izlenir?', aci:'Saat, yön, Erciyes etekleri/karanlık alan önerisi' },
      { baslik:'Kayseri\'de yıldız kayması: meteor izleme için en iyi 5 nokta', aci:'Işık kirliliğinden uzak gözlem noktaları' },
    ]},
  { id:'ay-tutulmasi-2026-08', ad:'Parçalı Ay Tutulması', kategori:'astronomi', onem:80, lead:4,
    tarihler:['2026-08-28'],
    aciklama:'27-28 Ağustos 2026 parçalı ay tutulması; Türkiye\'den kısmen görülebilir.',
    alternatifler:[
      { baslik:'Ay tutulması Kayseri\'den görünecek mi? Saat kaçta, nasıl izlenir?', aci:'Görünürlük, saat, çıplak gözle izleme' },
    ]},
  { id:'geminid', ad:'Geminid Meteor Yağmuru', kategori:'astronomi', onem:85, lead:4,
    tarihler:['2026-12-13','2027-12-14'],
    aciklama:'Yılın EN güçlü meteor yağmuru (Ara, saatte ~120). Erciyes kış gözlemi.',
    alternatifler:[
      { baslik:'Yılın en güçlü meteor yağmuru Geminidler bu gece: Kayseri\'de izleme rehberi', aci:'Saat, yön, kış gözlem önerileri' },
      { baslik:'Erciyes\'te kış gökyüzü: meteor yağmuru için gözlem noktaları', aci:'Kar + gökyüzü gözlemi, kıyafet/saat önerisi' },
    ]},
  { id:'gunes-tutulmasi-2027', ad:'Güneş Tutulması (2 Ağu 2027)', kategori:'astronomi', onem:88, lead:7,
    tarihler:['2027-08-02'], teyit:true,
    aciklama:'2 Ağustos 2027 büyük güneş tutulması; Türkiye\'nin güneyine yakın, parçalı görünür.',
    alternatifler:[
      { baslik:'2027 güneş tutulması: Kayseri\'den ne kadar görünecek?', aci:'Görünürlük oranı, saat, izleme bilgisi' },
    ]},

  // ═══════════════ FARKINDALIK GÜNLERİ ═══════════════
  { id:'sevgililer', ad:'Sevgililer Günü', kategori:'ticari', onem:82, lead:7, sabit:{ay:2,gun:14},
    aciklama:'14 Şubat. Hediye/mekan/restoran aramaları zirve.',
    alternatifler:[
      { baslik:'Kayseri\'de Sevgililer Günü için 10 romantik mekan', aci:'Restoran/kafe önerileri, fiyat aralığı' },
      { baslik:'Sevgililer Günü hediye rehberi: bütçeye göre öneriler', aci:'Hediye fikirleri, yerel alışveriş' },
    ]},
  { id:'kadinlar-gunu', ad:'8 Mart Dünya Kadınlar Günü', kategori:'farkindalik', onem:80, lead:5, sabit:{ay:3,gun:8},
    aciklama:'8 Mart. Kayseri\'nin "Kadınlar Çarşısı" hikayesiyle güçlü yerel bağ.',
    alternatifler:[
      { baslik:'Kayseri\'de 8 Mart Dünya Kadınlar Günü etkinlikleri', aci:'Program, panel, yürüyüş, belediye etkinlikleri' },
      { baslik:'Kayseri\'nin Kadınlar Çarşısı: Milli Mücadele\'de cephane taşıyan kadınların hikayesi', aci:'Güçlü yerel tarih anlatısı — özgün içerik' },
    ]},
  { id:'anneler-gunu', ad:'Anneler Günü', kategori:'ticari', onem:85, lead:7, kural:{ay:5,gun:'pazar',n:2},
    aciklama:'Mayıs\'ın 2. Pazarı. Hediye/çiçek/brunch aramaları zirve.',
    alternatifler:[
      { baslik:'Kayseri\'de Anneler Günü hediye rehberi: anlamlı 12 fikir', aci:'Hediye fikirleri + yerel mağaza/çiçekçi' },
      { baslik:'Anneler Günü için Kayseri\'de brunch ve kahvaltı mekanları', aci:'Mekan listesi, rezervasyon ipuçları' },
      { baslik:'Anneler Günü mesajları: en duygusal ve kısa sözler', aci:'Mesaj derlemesi — yüksek arama' },
    ]},
  { id:'babalar-gunu', ad:'Babalar Günü', kategori:'ticari', onem:78, lead:7, kural:{ay:6,gun:'pazar',n:3},
    aciklama:'Haziran\'ın 3. Pazarı. Hediye aramaları yükselir.',
    alternatifler:[
      { baslik:'Babalar Günü hediye rehberi: Kayseri\'de nereden alınır?', aci:'Hediye fikirleri + yerel alışveriş' },
      { baslik:'Babalar Günü mesajları ve anlamlı sözler', aci:'Mesaj derlemesi' },
    ]},
  { id:'ogretmenler-gunu', ad:'24 Kasım Öğretmenler Günü', kategori:'farkindalik', onem:82, lead:5, sabit:{ay:11,gun:24},
    aciklama:'Hediye/mesaj/etkinlik aramaları yükselir.',
    alternatifler:[
      { baslik:'Öğretmenler Günü mesajları: en güzel ve anlamlı sözler', aci:'Mesaj derlemesi — yüksek arama' },
      { baslik:'Kayseri\'de Öğretmenler Günü etkinlikleri ve öğretmene özel indirimler', aci:'Yerel etkinlik + kampanyalar' },
    ]},

  // ═══════════════ TİCARİ / ALIŞVERİŞ DÖNEMLERİ ═══════════════
  { id:'okula-donus', ad:'Okula Dönüş Alışverişi', kategori:'ticari', onem:80, lead:10,
    aralik:{ bas:{ay:8,gun:15}, son:{ay:9,gun:15} },
    aciklama:'Ağu ortası-Eylül. Kırtasiye/forma/servis aramaları zirve. Okul açılışı 8 Eylül.',
    alternatifler:[
      { baslik:'Kayseri\'de okul alışverişi: kırtasiye ve forma nereden, ne kadar?', aci:'Fiyat karşılaştırma, mağaza önerileri — sezon trafiği' },
      { baslik:'Kayseri\'de okul servis ücretleri {YIL}: ilçe ilçe rakamlar', aci:'Servis ücretleri — yüksek aramalı yerel içerik' },
      { baslik:'Okula dönüş rehberi: çantadan beslenmeye veliye 10 ipucu', aci:'Pratik rehber, geniş kitle' },
    ]},
  { id:'black-friday', ad:'Black Friday / Efsane Cuma', kategori:'ticari', onem:78, lead:5, kural:{ay:11,gun:'cuma',n:4},
    aciklama:'Kasım\'ın 4. Cuması. İndirim aramaları zirve.',
    alternatifler:[
      { baslik:'Black Friday {YIL}: Kayseri\'de hangi mağazalarda indirim var?', aci:'Yerel + zincir indirim listesi' },
      { baslik:'Efsane Cuma\'da kapana düşmeyin: gerçek indirim nasıl anlaşılır?', aci:'Tüketici rehberi, fiyat takibi' },
    ]},

  // ═══════════════ SEZONLAR ═══════════════
  { id:'dugun-sezonu', ad:'Düğün Sezonu', kategori:'sezon', onem:70, lead:14,
    aralik:{ bas:{ay:6,gun:1}, son:{ay:9,gun:15} },
    aciklama:'Haz-Eylül. Salon/organizasyon/davetiye aramaları yükselir.',
    alternatifler:[
      { baslik:'Kayseri\'de düğün sezonu: salon fiyatları ve organizasyon rehberi {YIL}', aci:'Salon/organizasyon fiyat aralığı, öneriler' },
      { baslik:'Kayseri\'de düğün için kına, nişan ve davet mekanları', aci:'Mekan + hizmet rehberi' },
    ]},
  { id:'kamp-doga-sezonu', ad:'Kamp & Doğa Sezonu', kategori:'sezon', onem:68, lead:14,
    aralik:{ bas:{ay:5,gun:1}, son:{ay:10,gun:15} },
    aciklama:'May-Ekim. Kamp/yürüyüş/yayla aramaları yükselir.',
    alternatifler:[
      { baslik:'Kayseri çevresinde kamp alanları: doğayla iç içe 8 rota', aci:'Aladağlar, Kapuzbaşı, yaylalar — kamp rehberi' },
      { baslik:'Kayseri\'de doğa yürüyüşü rotaları: zorluk ve ulaşım rehberi', aci:'Trekking rotaları, başlangıç noktaları' },
    ]},
  { id:'erken-rezervasyon', ad:'Yaz Tatili Erken Rezervasyon', kategori:'sezon', onem:62, lead:10,
    aralik:{ bas:{ay:1,gun:15}, son:{ay:3,gun:31} },
    aciklama:'Oca-Mart. Otel erken rezervasyon ve tatil planı aramaları.',
    alternatifler:[
      { baslik:'Yaz tatili erken rezervasyon: {YIL} fırsatları ne zaman biter?', aci:'Erken rezervasyon avantajları, tarih takvimi' },
    ]},
]

// ── TARİH ÇÖZÜCÜLER ──────────────────────────────────────────────────────────
function bugunTR() {
  // Türkiye saatiyle bugünün 00:00'ı (UTC tabanlı Date)
  const s = new Date().toLocaleString('en-US', { timeZone: TZ })
  const d = new Date(s)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}
function isoD(y, m, d) { return new Date(Date.UTC(y, m - 1, d)) }
function fmtISO(dt) { return dt.toISOString().slice(0, 10) }

// ayın N. <weekday>'i (n<0 → sondan). 0-indexli ay parametresi beklemez; ay 1-12.
function nthWeekday(year, ay, wd, n) {
  if (n > 0) {
    const ilk = new Date(Date.UTC(year, ay - 1, 1)).getUTCDay()
    const off = (wd - ilk + 7) % 7
    return isoD(year, ay, 1 + off + (n - 1) * 7)
  } else {
    const sonGun = new Date(Date.UTC(year, ay, 0)).getUTCDate()
    const son = new Date(Date.UTC(year, ay - 1, sonGun)).getUTCDay()
    const off = (son - wd + 7) % 7
    return isoD(year, ay, sonGun - off - (Math.abs(n) - 1) * 7)
  }
}

// Bir etkinliğin [bugün, ufukSonu] aralığındaki ilk geçerli tarihini döndürür.
// Sezon (aralik) için: aktifse bugünü, değilse sonraki başlangıcı döndürür + aktiflik bilgisi.
function cozTarih(ev, bugun, ufukSon) {
  const yilBu = bugun.getUTCFullYear()

  if (ev.sabit) {
    for (const y of [yilBu, yilBu + 1]) {
      const t = isoD(y, ev.sabit.ay, ev.sabit.gun)
      if (t >= bugun && t <= ufukSon) return { tarih: t }
    }
    return null
  }
  if (ev.kural) {
    const wd = GUN_AD[ev.kural.gun]
    for (const y of [yilBu, yilBu + 1]) {
      const t = nthWeekday(y, ev.kural.ay, wd, ev.kural.n)
      if (t >= bugun && t <= ufukSon) return { tarih: t }
    }
    return null
  }
  if (ev.tarihler) {
    let en = null
    for (const s of ev.tarihler) {
      const t = new Date(s + 'T00:00:00Z')
      if (t >= bugun && t <= ufukSon && (!en || t < en)) en = t
    }
    return en ? { tarih: en } : null
  }
  if (ev.aralik) {
    // Bu yıl ve gelecek yıl için başlangıç/bitiş çiftleri (yıl atlamayı destekle)
    const yilSpan = (y) => {
      const bas = isoD(y, ev.aralik.bas.ay, ev.aralik.bas.gun)
      let son = isoD(y, ev.aralik.son.ay, ev.aralik.son.gun)
      if (son < bas) son = isoD(y + 1, ev.aralik.son.ay, ev.aralik.son.gun) // Ara→Nis gibi
      return { bas, son }
    }
    for (const y of [yilBu - 1, yilBu, yilBu + 1]) {
      const { bas, son } = yilSpan(y)
      if (bugun >= bas && bugun <= son) return { tarih: bas, aktif: true, son } // şu an aktif
    }
    // aktif değil → ufuktaki sonraki başlangıç
    for (const y of [yilBu, yilBu + 1]) {
      const { bas, son } = yilSpan(y)
      if (bas >= bugun && bas <= ufukSon) return { tarih: bas, aktif: false, son }
    }
    return null
  }
  return null
}

async function kvGet(env, key, def) {
  try { const v = await env.HABERLER.get(key); return v ? JSON.parse(v) : def } catch { return def }
}
async function kvPut(env, key, val) {
  try { await env.HABERLER.put(key, JSON.stringify(val)); return true } catch { return false }
}

function yilDoldur(s, tarih) {
  return (s || '').replace(/\{YIL\}/g, String(tarih.getUTCFullYear()))
}

// Tüm veri setini (kullanıcı ekstraları dahil) çözüp listeler
async function listele(env, ufukGun, kullanici) {
  const bugun = bugunTR()
  const ufukSon = new Date(bugun.getTime() + ufukGun * GUN_MS)
  const onaylar = await kvGet(env, 'ozelgun:onaylar', {})
  const reddedilen = await kvGet(env, 'ozelgun:reddedilen', {})
  const ekstra = await kvGet(env, 'ozelgun:ekstra', [])
  const tumVeri = [...VERI, ...ekstra]

  const out = []
  for (const ev of tumVeri) {
    const r = reddedilen[ev.id]
    // Eski format (sayı = herkes için gizli, geriye uyumluluk) veya yeni format (obje = kullanıcı bazlı)
    if (typeof r === 'number') continue
    if (r && typeof r === 'object' && kullanici && r[kullanici]) continue
    const c = cozTarih(ev, bugun, ufukSon)
    if (!c) continue
    const gunKala = Math.round((c.tarih - bugun) / GUN_MS)
    const kat = KAT[ev.kategori] || KAT.farkindalik
    const onay = onaylar[ev.id] || {}
    out.push({
      id: ev.id,
      ad: ev.ad,
      kategori: ev.kategori,
      kat_ad: kat.ad, kat_emoji: kat.emoji, kat_renk: kat.renk,
      tarih: fmtISO(c.tarih),
      gun_kala: gunKala,
      aktif: !!c.aktif,
      sezon_son: c.son ? fmtISO(c.son) : null,
      onem: ev.onem || 60,
      lead: ev.lead || 5,
      yaklasiyor: gunKala <= (ev.lead || 5),   // içerik üretim zamanı geldi mi
      teyit: !!ev.teyit,                        // tarih tahmini/teyit gerektiriyor mu
      aciklama: ev.aciklama || '',
      alternatifler: (ev.alternatifler || []).map((a, i) => ({
        alt_id: i,
        baslik: yilDoldur(a.baslik, c.tarih),
        aci: a.aci || '',
        durum: (onay.secilen || []).includes(i) ? (onay.uretilen?.includes(i) ? 'uretildi' : 'onayli') : 'bekliyor',
      })),
    })
  }
  // Tarihe göre sırala (yaklaşan önce); eşitse öneme göre
  out.sort((a, b) => a.gun_kala - b.gun_kala || b.onem - a.onem)
  return { ok: true, bugun: fmtISO(bugun), ufuk: ufukGun, sayi: out.length, gunler: out }
}

// Aktif sezon/dönemler (badge için) — bugünü kapsayan aralık + ±3 gün içindeki sabit günler
async function aktifler(env) {
  const liste = await listele(env, 21)
  const aktif = liste.gunler.filter(g => g.aktif || g.gun_kala <= 3)
    .map(g => ({ id: g.id, ad: g.ad, emoji: g.kat_emoji, gun_kala: g.gun_kala, aktif: g.aktif }))
  return { ok: true, aktif }
}

// Seçilen açı için Anthropic ile taslak üret
async function uretTaslak(env, gun_id, alt_id) {
  const ekstra = await kvGet(env, 'ozelgun:ekstra', [])
  const ev = [...VERI, ...ekstra].find(e => e.id === gun_id)
  if (!ev) return { ok: false, error: 'Gün bulunamadı: ' + gun_id }
  const bugun = bugunTR()
  const c = cozTarih(ev, bugun, new Date(bugun.getTime() + 400 * GUN_MS))
  const alt = (ev.alternatifler || [])[alt_id]
  if (!alt) return { ok: false, error: 'Alternatif bulunamadı' }
  const baslik = yilDoldur(alt.baslik, c ? c.tarih : bugun)
  const tarihStr = c ? new Date(c.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const sistem = `Sen kayserim.net'in yerel haber editörüsün. Kayseri merkezli, SEO uyumlu, doğru ve özgün haber yazarsın. Uydurma rakam/isim KULLANMA. Tarih, saat, fiyat gibi DEĞİŞKEN ve henüz teyit edilmemiş bilgileri metnin SONUNA "[DOĞRULANACAKLAR]" başlığı altında madde madde yaz (yayında editör doldurur). Sadece JSON döndür.`
  const kullanici = `ÖZEL GÜN: ${ev.ad} (${tarihStr})
HABER AÇISI: ${baslik}
BRIEF: ${alt.aci}
BAĞLAM: ${ev.aciklama}

KURALLAR:
- Başlık verilen açıya uygun, anahtar kelime içersin
- 280-450 kelime, Kayseri'ye bağla
- Bu gün HENÜZ GELMEDİ; "yaklaşıyor / yapılması planlanıyor" üslubuyla, hazırlık/rehber içeriği yaz
- Kesinleşmemiş saat/yer/fiyatları [DOĞRULANACAKLAR] bloğuna koy
- Sadece JSON döndür:
{"baslik":"...","metin":"...","kategori":"Güncel"}`

  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 45000)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: sistem, messages: [{ role: 'user', content: kullanici }] }),
      signal: ctrl.signal,
    })
    clearTimeout(to)
    const data = await r.json()
    if (data.error) return { ok: false, error: data.error?.message || 'Anthropic hatası' }
    const raw = data.content?.[0]?.text || ''
    const jm = raw.match(/\{[\s\S]*\}/)
    if (!jm) return { ok: false, error: 'JSON parse hatası' }
    const parsed = JSON.parse(jm[0])

    // Onay/üretim durumunu kaydet
    const onaylar = await kvGet(env, 'ozelgun:onaylar', {})
    const o = onaylar[gun_id] || { secilen: [], uretilen: [] }
    if (!o.secilen.includes(alt_id)) o.secilen.push(alt_id)
    if (!o.uretilen) o.uretilen = []
    if (!o.uretilen.includes(alt_id)) o.uretilen.push(alt_id)
    onaylar[gun_id] = o
    await kvPut(env, 'ozelgun:onaylar', onaylar)

    return {
      ok: true,
      baslik: parsed.baslik || baslik,
      metin: parsed.metin || '',
      kategori: parsed.kategori || 'Güncel',
      ozel_gun: ev.ad,
      tarih: c ? fmtISO(c.tarih) : null,
    }
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Zaman aşımı (45s)' : e.message }
  }
}

export async function onRequestOptions() { return new Response(null, { headers: cors }) }

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'liste'
  try {
    if (action === 'liste') {
      const ayar = await kvGet(env, 'ozelgun:ayarlar', { ufuk: 120 })
      const ufuk = parseInt(url.searchParams.get('ufuk') || ayar.ufuk || 120, 10)
      const kullanici = url.searchParams.get('kullanici') || null
      return Response.json(await listele(env, ufuk, kullanici), { headers: cors })
    }
    if (action === 'aktif') return Response.json(await aktifler(env), { headers: cors })
    if (action === 'durum') {
      return Response.json({
        ok: true,
        onaylar: await kvGet(env, 'ozelgun:onaylar', {}),
        reddedilen: await kvGet(env, 'ozelgun:reddedilen', {}),
        ekstra: await kvGet(env, 'ozelgun:ekstra', []),
      }, { headers: cors })
    }
    if (action === 'ayarlar') return Response.json({ ok: true, ayarlar: await kvGet(env, 'ozelgun:ayarlar', { ufuk: 120 }) }, { headers: cors })
    return Response.json({ ok: false, error: 'Bilinmeyen action: ' + action }, { status: 400, headers: cors })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}

export async function onRequestPost({ request, env }) {
  let body = {}
  try { body = await request.json() } catch {}
  const action = body.action
  try {
    if (action === 'uret') {
      return Response.json(await uretTaslak(env, body.gun_id, body.alt_id ?? 0), { headers: cors })
    }
    if (action === 'onayla') {
      const onaylar = await kvGet(env, 'ozelgun:onaylar', {})
      const o = onaylar[body.gun_id] || { secilen: [], uretilen: [] }
      if (body.alt_id != null && !o.secilen.includes(body.alt_id)) o.secilen.push(body.alt_id)
      onaylar[body.gun_id] = o
      await kvPut(env, 'ozelgun:onaylar', onaylar)
      return Response.json({ ok: true }, { headers: cors })
    }
    if (action === 'reddet') {
      const kullanici = body.kullanici || 'bilinmeyen'
      const red = await kvGet(env, 'ozelgun:reddedilen', {})
      if (!red[body.gun_id] || typeof red[body.gun_id] === 'number') red[body.gun_id] = {}
      red[body.gun_id][kullanici] = Date.now()
      await kvPut(env, 'ozelgun:reddedilen', red)
      return Response.json({ ok: true }, { headers: cors })
    }
    if (action === 'geri_al') {
      const kullanici = body.kullanici || 'bilinmeyen'
      const red = await kvGet(env, 'ozelgun:reddedilen', {})
      if (red[body.gun_id] && typeof red[body.gun_id] === 'object') delete red[body.gun_id][kullanici]
      await kvPut(env, 'ozelgun:reddedilen', red)
      return Response.json({ ok: true }, { headers: cors })
    }
    if (action === 'ekle') {
      // Kullanıcı özel günü: {ad, kategori, tarih:'YYYY-MM-DD', onem, lead, aciklama, alternatifler:[{baslik,aci}]}
      const ekstra = await kvGet(env, 'ozelgun:ekstra', [])
      const id = 'ekstra-' + Date.now()
      ekstra.push({
        id, ad: body.ad || 'Özel Gün', kategori: body.kategori || 'kayseri',
        onem: body.onem || 65, lead: body.lead || 5, aciklama: body.aciklama || '',
        tarihler: body.tarih ? [body.tarih] : (body.tarihler || []),
        alternatifler: body.alternatifler || [],
      })
      await kvPut(env, 'ozelgun:ekstra', ekstra)
      return Response.json({ ok: true, id }, { headers: cors })
    }
    if (action === 'ekstra_sil') {
      const ekstra = await kvGet(env, 'ozelgun:ekstra', [])
      await kvPut(env, 'ozelgun:ekstra', ekstra.filter(e => e.id !== body.id))
      return Response.json({ ok: true }, { headers: cors })
    }
    if (action === 'ayarlar') {
      const ay = await kvGet(env, 'ozelgun:ayarlar', { ufuk: 120 })
      if (body.ufuk) ay.ufuk = parseInt(body.ufuk, 10)
      await kvPut(env, 'ozelgun:ayarlar', ay)
      return Response.json({ ok: true, ayarlar: ay }, { headers: cors })
    }
    return Response.json({ ok: false, error: 'Bilinmeyen action: ' + action }, { status: 400, headers: cors })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors })
  }
}
