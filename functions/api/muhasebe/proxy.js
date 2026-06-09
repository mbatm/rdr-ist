const BH_BASE = 'https://bizimhesap.com/api/b2b';
const BH_TOKEN = 'B6EB6FB130394703A7E12D5894802F09';
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
  const debug = url.searchParams.get('debug') === '1';

  if (!endpoint) {
    return json({ error: 'endpoint parametresi gerekli' }, 400);
  }

  try {
    let response;
    const GET_ENDPOINTS = ['customers', 'products', 'warehouses'];

    if (GET_ENDPOINTS.includes(endpoint)) {
      // Farklı auth yöntemlerini dene
      // 1. Authorization: Bearer
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        headers: {
          'token': BH_TOKEN,
          'Authorization': `Bearer ${BH_TOKEN}`,
          'Accept': 'application/json',
        },
      });
    } else if (endpoint === 'inventory') {
      response = await fetch(`${BH_BASE}/inventory/${warehouseId}`, {
        headers: { 'token': BH_TOKEN, 'Authorization': `Bearer ${BH_TOKEN}` },
      });
    } else if (endpoint === 'abstract') {
      response = await fetch(`${BH_BASE}/abstract/${customerId}`, {
        headers: { 'token': BH_TOKEN, 'Authorization': `Bearer ${BH_TOKEN}` },
      });
    } else if (['addinvoice', 'addcustomer', 'cancelinvoice', 'addproduct'].includes(endpoint)) {
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
    const status = response.status;

    if (debug) {
      return json({ status, headers: Object.fromEntries(response.headers), raw: text.substring(0, 2000) });
    }

    if (text.trim().startsWith('<')) {
      const items = parseXml(text);
      return json({ ok: true, count: items.length, items });
    }

    try { return json(JSON.parse(text)); }
    catch { return json({ ok: false, raw: text.substring(0, 500) }); }

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function parseXml(xml) {
  const items = [];
  // Farklı tag isimlerini dene
  const tags = ['Customer', 'Product', 'Warehouse', 'Item', 'B2BCustomer', 'B2BProduct'];
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const item = {};
      const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let field;
      while ((field = fieldRegex.exec(match[1])) !== null) {
        item[field[1]] = field[2].trim();
      }
      items.push(item);
    }
    if (items.length > 0) break;
  }
  return items.length > 0 ? items : [{ _raw: xml.substring(0, 500) }];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
