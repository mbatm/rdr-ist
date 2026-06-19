/**
 * rdr.ist — GA4 Data API
 * Cloudflare Pages Function: /functions/api/ga4.js
 *
 * Env değişkenleri (Cloudflare Dashboard > Settings > Variables):
 *   GA4_CLIENT_EMAIL  → kayserim-analytics@kayserimsite.iam.gserviceaccount.com
 *   GA4_PRIVATE_KEY   → -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----
 *   GA4_PROPERTY_ID   → 307514768
 */

function b64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(env) {
  const email = env.GA4_CLIENT_EMAIL;
  const pem = (env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${sig}`;
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token hatası: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function runReport(token, propertyId, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`GA4 API hatası ${res.status}: ${err}`); }
  return res.json();
}

function parseRows(report) {
  if (!report?.rows) return [];
  const dimHeaders = (report.dimensionHeaders || []).map(h => h.name);
  const metHeaders = (report.metricHeaders   || []).map(h => h.name);
  return report.rows.map(row => {
    const obj = {};
    (row.dimensionValues || []).forEach((v, i) => { obj[dimHeaders[i]] = v.value; });
    (row.metricValues   || []).forEach((v, i) => { obj[metHeaders[i]] = parseFloat(v.value); });
    return obj;
  });
}

export async function onRequestGet({ env, request }) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json' };
  try {
    const token = await getAccessToken(env);
    const propertyId = env.GA4_PROPERTY_ID || '307514768';
    const [summary, yesterday, channels, trend, topPages] = await Promise.all([
      runReport(token, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }, { name: 'newUsers' }] }),
      runReport(token, propertyId, { dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }] }),
      runReport(token, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionDefaultChannelGrouping' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
      runReport(token, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
      runReport(token, propertyId, { dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 })
    ]);
    const s = parseRows(summary)[0] || {};
    const y = parseRows(yesterday)[0] || {};
    return new Response(JSON.stringify({ ok: true, generatedAt: new Date().toISOString(), summary: { activeUsers: s.activeUsers||0, sessions: s.sessions||0, pageViews: s.screenPageViews||0, avgSessionDuration: s.averageSessionDuration||0, bounceRate: s.bounceRate||0, newUsers: s.newUsers||0, dailyAvgUsers: Math.round((s.activeUsers||0)/30), dailyAvgPageViews: Math.round((s.screenPageViews||0)/30) }, yesterday: { activeUsers: y.activeUsers||0, sessions: y.sessions||0, pageViews: y.screenPageViews||0, avgSessionDuration: y.averageSessionDuration||0 }, channels: parseRows(channels), trend: parseRows(trend).map(r=>({ date: r.date, users: r.activeUsers, pageViews: r.screenPageViews })), topPages: parseRows(topPages).map(r=>({ title: r.pageTitle, path: r.pagePath, views: r.screenPageViews, users: r.activeUsers, duration: r.averageSessionDuration })) }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
