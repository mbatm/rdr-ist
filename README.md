# rdr.ist — kayserim.net CMS

## Deploy Adımları

### 1. GitHub'a yükle
```bash
git init
git add .
git commit -m "ilk commit"
git remote add origin https://github.com/KULLANICI/rdr-ist.git
git push -u origin main
```

### 2. Cloudflare Pages
1. Cloudflare dashboard → **Pages** → **Create a project**
2. **Connect to Git** → GitHub repo'yu seç
3. Build ayarları:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Save and Deploy**

### 3. Custom domain (rdr.ist)
Cloudflare Pages → Settings → Custom domains → **Add custom domain**
- `rdr.ist` ekle (zaten Cloudflare'de olduğu için otomatik SSL)

### 4. Environment Variables (ÖNEMLİ)
Cloudflare Pages → Settings → **Environment variables**

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `RSS_API_KEY` | cmp6vldho000210g6tt26pvc5 |

> Bu değerler sunucuda kalır, tarayıcıya hiç çıkmaz.

### 5. Kullanıcı yönetimi (geçici)
Şu an `src/App.jsx` içinde hardcoded:
- admin / radar2024
- editor / editor123

Üretim için Cloudflare Access (ücretsiz, e-posta OTP) önerilir.

---

## Yerel geliştirme

```bash
npm install
npm run dev
```

> Not: `/api/claude` ve `/api/rss` sadece Cloudflare Pages'de çalışır.
> Yerel test için `.dev.vars` dosyası oluşturun:
> ```
> ANTHROPIC_API_KEY=sk-ant-...
> RSS_API_KEY=cmp6vldho000210g6tt26pvc5
> ```
> Sonra: `npx wrangler pages dev dist --compatibility-date=2024-01-01`
 
updated 
