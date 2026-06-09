const BH_BASE = 'https://bizimhesap.com/api/b2b';
const FIRM_ID = 'BCA7835EDB784CA085729C2BD385A41A';

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
  const warehouseId = url.searchParams.get('warehouseId');
  const customerId = url.searchParams.get('customerId');

  if (!endpoint) return json({ error: 'endpoint gerekli' }, 400);

  try {
    let response;
    const GET_EP = ['customers', 'products', 'warehouses'];

    if (GET_EP.includes(endpoint)) {
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        headers: { 'token': FIRM_ID }
      });
    } else if (endpoint === 'inventory') {
      if (!warehouseId) return json({ error: 'warehouseId gerekli' }, 400);
      response = await fetch(`${BH_BASE}/inventory/${warehouseId}`, {
        headers: { 'token': FIRM_ID }
      });
    } else if (endpoint === 'abstract') {
      if (!customerId) return json({ error: 'customerId gerekli' }, 400);
      response = await fetch(`${BH_BASE}/abstract/${customerId}`, {
        headers: { 'token': FIRM_ID }
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

    // JSON parse
    try {
      const data = JSON.parse(text);
      // BizimHesap standart yanıt: { resultCode, errorText, data: { customers/products/... } }
      if (data.resultCode === 1 && data.data) {
        // İlk anahtarı al (customers, products vs.)
        const key = Object.keys(data.data)[0];
        return json({ ok: true, items: data.data[key] || [] });
      }
      return json(data);
    } catch {
      // XML fallback
      if (text.trim().startsWith('<')) {
        return json({ ok: true, items: parseXml(text) });
      }
      return json({ raw: text.substring(0, 500) });
    }

  } catch(err) {
    return json({ error: err.message }, 500);
  }
}

function parseXml(xml) {
  const items = [];
  const tags = ['Customer','Product','Warehouse','Item'];
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
