const BH_BASE = 'https://bizimhesap.com/api/b2b';
const FIRM_ID = 'BCA7835EDB784CA085729C2BD385A41A';
const ZIRVE_KEY = 'B6EB6FB130394703A7E12D5894802F09';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  const debug = url.searchParams.get('debug') === '1';
  const tokenOverride = url.searchParams.get('token');
  const warehouseId = url.searchParams.get('warehouseId');
  const customerId = url.searchParams.get('customerId');

  if (!endpoint) return json({ error: 'endpoint gerekli' }, 400);

  // Test: tüm kombinasyonları dene
  if (debug) {
    const results = {};
    const combos = [
      { name: 'firmId_as_token',        headers: { 'token': FIRM_ID } },
      { name: 'zirve_as_token',         headers: { 'token': ZIRVE_KEY } },
      { name: 'firmId_bearer',          headers: { 'Authorization': `Bearer ${FIRM_ID}` } },
      { name: 'zirve_bearer',           headers: { 'Authorization': `Bearer ${ZIRVE_KEY}` } },
      { name: 'firmId_basic',           headers: { 'Authorization': `Basic ${btoa(FIRM_ID + ':')}` } },
      { name: 'query_token_firmId',     url_suffix: `?token=${FIRM_ID}` },
      { name: 'query_token_zirve',      url_suffix: `?token=${ZIRVE_KEY}` },
      { name: 'query_apikey_firmId',    url_suffix: `?apiKey=${FIRM_ID}` },
      { name: 'query_apikey_zirve',     url_suffix: `?apiKey=${ZIRVE_KEY}` },
      { name: 'header_apikey_firmId',   headers: { 'ApiKey': FIRM_ID } },
      { name: 'header_apikey_zirve',    headers: { 'ApiKey': ZIRVE_KEY } },
    ];

    for (const combo of combos) {
      try {
        const fetchUrl = `${BH_BASE}/${endpoint}${combo.url_suffix || ''}`;
        const res = await fetch(fetchUrl, { headers: combo.headers || {} });
        const text = await res.text();
        results[combo.name] = { status: res.status, body: text.substring(0, 100) };
      } catch(e) {
        results[combo.name] = { error: e.message };
      }
    }
    return json(results);
  }

  // Normal istek
  try {
    const activeToken = tokenOverride || ZIRVE_KEY;
    let response;
    const GET_EP = ['customers', 'products', 'warehouses'];

    if (GET_EP.includes(endpoint)) {
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        headers: { 'token': activeToken }
      });
    } else if (endpoint === 'inventory') {
      response = await fetch(`${BH_BASE}/inventory/${warehouseId}`, {
        headers: { 'token': activeToken }
      });
    } else if (endpoint === 'abstract') {
      response = await fetch(`${BH_BASE}/abstract/${customerId}`, {
        headers: { 'token': activeToken }
      });
    } else if (['addinvoice','addcustomer','cancelinvoice','addproduct'].includes(endpoint)) {
      const body = await request.json();
      if (!body.firmId) body.firmId = FIRM_ID;
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      return json({ error: `Bilinmeyen endpoint: ${endpoint}` }, 400);
    }

    const text = await response.text();
    if (text.trim().startsWith('<')) {
      return json({ ok: true, items: parseXml(text) });
    }
    try { return json(JSON.parse(text)); }
    catch { return json({ raw: text.substring(0, 500) }); }

  } catch(err) {
    return json({ error: err.message }, 500);
  }
}

function parseXml(xml) {
  const items = [];
  const tags = ['Customer','Product','Warehouse','Item','B2BCustomer'];
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const obj = {};
      const fr = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let f;
      while ((f = fr.exec(m[1])) !== null) obj[f[1]] = f[2].trim();
      items.push(obj);
    }
    if (items.length) break;
  }
  return items.length ? items : [{ _raw: xml.substring(0,300) }];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
