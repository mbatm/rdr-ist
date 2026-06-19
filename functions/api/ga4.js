// GA4 Data API - Cloudflare Pages Function
// GA4_PRIVATE_KEY: saf base64 (header/footer olmadan)

function b64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

async function getAccessToken(env) {
  const email = env.GA4_CLIENT_EMAIL;
  // GA4_PRIVATE_KEY = saf base64 DER, header/footer yok
  const der = Uint8Array.from(atob(env.GA4_PRIVATE_KEY), c => c.charCodeAt(0));
  const now = Math.floor(Date.now()/1000);
  const hdr = { alg:'RS256', typ:'JWT' };
  const pay = { iss:email, scope:'https://www.googleapis.com/auth/analytics.readonly', aud:'https://oauth2.googleapis.com/token', iat:now, exp:now+3600 };
  const si = `${b64url(hdr)}.${b64url(pay)}`;
  const key = await crypto.subtle.importKey('pkcs8', der, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']);
  const sb = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(si));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sb))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${si}.${sig}` });
  const td = await res.json();
  if (!td.access_token) throw new Error('Token hatas\u0131: ' + JSON.stringify(td));
  return td.access_token;
}

async function report(token, pid, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`, { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(body) });
  if (!res.ok) throw new Error('GA4 ' + res.status + ': ' + await res.text());
  return res.json();
}

function rows(r) {
  if (!r?.rows) return [];
  const dh=(r.dimensionHeaders||[]).map(h=>h.name), mh=(r.metricHeaders||[]).map(h=>h.name);
  return r.rows.map(row=>{ const o={}; (row.dimensionValues||[]).forEach((v,i)=>o[dh[i]]=v.value); (row.metricValues||[]).forEach((v,i)=>o[mh[i]]=parseFloat(v.value)); return o; });
}

export async function onRequestGet({ env }) {
  const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,OPTIONS', 'Content-Type':'application/json' };
  try {
    const token = await getAccessToken(env);
    const pid = env.GA4_PROPERTY_ID || '307514768';
    const [sum, yes, ch, tr, tp] = await Promise.all([
      report(token, pid, { dateRanges:[{startDate:'30daysAgo',endDate:'today'}], metrics:[{name:'activeUsers'},{name:'sessions'},{name:'screenPageViews'},{name:'averageSessionDuration'},{name:'bounceRate'},{name:'newUsers'}] }),
      report(token, pid, { dateRanges:[{startDate:'yesterday',endDate:'yesterday'}], metrics:[{name:'activeUsers'},{name:'sessions'},{name:'screenPageViews'},{name:'averageSessionDuration'}] }),
      report(token, pid, { dateRanges:[{startDate:'30daysAgo',endDate:'today'}], dimensions:[{name:'sessionDefaultChannelGrouping'}], metrics:[{name:'activeUsers'},{name:'sessions'}], orderBys:[{metric:{metricName:'sessions'},desc:true}] }),
      report(token, pid, { dateRanges:[{startDate:'30daysAgo',endDate:'today'}], dimensions:[{name:'date'}], metrics:[{name:'activeUsers'},{name:'screenPageViews'}], orderBys:[{dimension:{dimensionName:'date'}}] }),
      report(token, pid, { dateRanges:[{startDate:'7daysAgo',endDate:'today'}], dimensions:[{name:'pageTitle'},{name:'pagePath'}], metrics:[{name:'screenPageViews'},{name:'activeUsers'},{name:'averageSessionDuration'}], orderBys:[{metric:{metricName:'screenPageViews'},desc:true}], limit:10 })
    ]);
    const s=rows(sum)[0]||{}, y=rows(yes)[0]||{};
    return new Response(JSON.stringify({
      ok:true, generatedAt:new Date().toISOString(),
      summary:{ activeUsers:s.activeUsers||0, sessions:s.sessions||0, pageViews:s.screenPageViews||0, avgSessionDuration:s.averageSessionDuration||0, bounceRate:s.bounceRate||0, newUsers:s.newUsers||0, dailyAvgUsers:Math.round((s.activeUsers||0)/30), dailyAvgPageViews:Math.round((s.screenPageViews||0)/30) },
      yesterday:{ activeUsers:y.activeUsers||0, sessions:y.sessions||0, pageViews:y.screenPageViews||0, avgSessionDuration:y.averageSessionDuration||0 },
      channels:rows(ch),
      trend:rows(tr).map(r=>({date:r.date,users:r.activeUsers,pageViews:r.screenPageViews})),
      topPages:rows(tp).map(r=>({title:r.pageTitle,path:r.pagePath,views:r.screenPageViews,users:r.activeUsers,duration:r.averageSessionDuration}))
    }), { headers:cors });
  } catch(e) {
    return new Response(JSON.stringify({ok:false,error:e.message}),{status:500,headers:cors});
  }
}

export async function onRequestOptions(){
  return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
}
