// GA4 Data API — Cloudflare Pages Function
// GA4_PRIVATE_KEY: saf base64 (header/footer olmadan)
// GA4_CLIENT_EMAIL: servis hesabı e-postası
// GA4_PROPERTY_ID: 307514768

function b64url(obj) {
  const s = JSON.stringify(obj);
  return btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

async function getAccessToken(env) {
  const email = (env.GA4_CLIENT_EMAIL || '').trim();
  if (!email) throw new Error('GA4_CLIENT_EMAIL eksik');

  // GA4_PRIVATE_KEY = saf PKCS8 base64 (BEGIN/END satırları olmadan)
  const keyB64 = (env.GA4_PRIVATE_KEY || '').trim()
    .replace(/^\"|\"$/g, '')
    .replace(/[\r\n\s]/g, '');
  if (!keyB64) throw new Error('GA4_PRIVATE_KEY eksik');

  const der = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));

  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url({alg:'RS256',typ:'JWT'})}.${b64url({
    iss: email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const raw = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(si));

  // Uint8Array → base64url (spread yerine loop — Cloudflare Workers güvenli)
  const arr = new Uint8Array(raw);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  const sig = btoa(str).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${si}.${sig}`
  });
  const td = await res.json();
  if (!td.access_token) {
    throw new Error(`Token hatası: ${JSON.stringify(td)} | iss=${email} | keyLen=${keyB64.length}`);
  }
  return td.access_token;
}

async function ga4Report(token, pid, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseRows(r) {
  if (!r?.rows) return [];
  const dh = (r.dimensionHeaders || []).map(h => h.name);
  const mh = (r.metricHeaders   || []).map(h => h.name);
  return r.rows.map(row => {
    const o = {};
    (row.dimensionValues || []).forEach((v, i) => { o[dh[i]] = v.value; });
    (row.metricValues   || []).forEach((v, i) => { o[mh[i]] = parseFloat(v.value); });
    return o;
  });
}

export async function onRequestGet({ env, request }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Debug modu: /api/ga4?debug=1
  const url = new URL(request.url);
  if (url.searchParams.get('debug') === '1') {
    const email = (env.GA4_CLIENT_EMAIL || '').trim();
    const key   = (env.GA4_PRIVATE_KEY  || '').trim().replace(/[\r\n\s]/g,'');
    return new Response(JSON.stringify({
      emailLen:  email.length,
      emailHead: email.slice(0, 30),
      keyLen:    key.length,
      keyHead:   key.slice(0, 20),
      propId:    env.GA4_PROPERTY_ID
    }), { headers: cors });
  }

  try {
    const token = await getAccessToken(env);
    const pid   = (env.GA4_PROPERTY_ID || '307514768').trim();

    const [sum, yes, ch, tr, tp] = await Promise.all([
      ga4Report(token, pid, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' }, { name: 'sessions' },
          { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
          { name: 'bounceRate' }, { name: 'newUsers' }
        ]
      }),
      ga4Report(token, pid, {
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        metrics: [
          { name: 'activeUsers' }, { name: 'sessions' },
          { name: 'screenPageViews' }, { name: 'averageSessionDuration' }
        ]
      }),
      ga4Report(token, pid, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      }),
      ga4Report(token, pid, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      }),
      ga4Report(token, pid, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' }, { name: 'activeUsers' },
          { name: 'averageSessionDuration' }
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10
      })
    ]);

    const s = parseRows(sum)[0] || {};
    const y = parseRows(yes)[0] || {};

    return new Response(JSON.stringify({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: {
        activeUsers:        s.activeUsers        || 0,
        sessions:           s.sessions           || 0,
        pageViews:          s.screenPageViews    || 0,
        avgSessionDuration: s.averageSessionDuration || 0,
        bounceRate:         s.bounceRate         || 0,
        newUsers:           s.newUsers           || 0,
        dailyAvgUsers:      Math.round((s.activeUsers    || 0) / 30),
        dailyAvgPageViews:  Math.round((s.screenPageViews || 0) / 30)
      },
      yesterday: {
        activeUsers:        y.activeUsers        || 0,
        sessions:           y.sessions           || 0,
        pageViews:          y.screenPageViews    || 0,
        avgSessionDuration: y.averageSessionDuration || 0
      },
      channels: parseRows(ch),
      trend: parseRows(tr).map(r => ({
        date:      r.date,
        users:     r.activeUsers,
        pageViews: r.screenPageViews
      })),
      topPages: parseRows(tp).map(r => ({
        title:    r.pageTitle,
        path:     r.pagePath,
        views:    r.screenPageViews,
        users:    r.activeUsers,
        duration: r.averageSessionDuration
      }))
    }), { headers: cors });

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: cors }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
