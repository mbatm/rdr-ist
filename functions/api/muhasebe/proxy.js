const BH_BASE = 'https://bizimhesap.com/api/b2b';
const TOKEN = 'B6EB6FB130394703A7E12D5894802F09';
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

  if (!endpoint) {
    return json({ error: 'endpoint parametresi gerekli', ornek: '?endpoint=customers' }, 400);
  }

  try {
    let response;
    const GET_ENDPOINTS = ['customers', 'products', 'warehouses'];

    if (GET_ENDPOINTS.includes(endpoint)) {
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        headers: { 'token': TOKEN },
      });
    } else if (endpoint === 'inventory') {
      if (!warehouseId) return json({ error: 'warehouseId gerekli' }, 400);
      response = await fetch(`${BH_BASE}/inventory/${warehouseId}`, {
        headers: { 'token': TOKEN },
      });
    } else if (endpoint === 'abstract') {
      if (!customerId) return json({ error: 'customerId gerekli' }, 400);
      response = await fetch(`${BH_BASE}/abstract/${customerId}`, {
        headers: { 'token': TOKEN },
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
    
    // XML mi JSON mu kontrol et
    if (text.trim().startsWith('<')) {
      // XML → JSON parse
      const parsed = xmlToJson(text);
      return json({ _format: 'xml', data: parsed, _raw: text.substring(0, 500) });
    }

    try {
      return json(JSON.parse(text));
    } catch {
      return json({ _format: 'unknown', _raw: text.substring(0, 1000) });
    }

  } catch (err) {
    return json({ error: err.message, stack: err.stack?.substring(0, 300) }, 500);
  }
}

// Basit XML parser
function xmlToJson(xml) {
  try {
    // Tekrarlayan tag'leri bul ve array yap
    const items = [];
    const regex = /<(?:Customer|Product|Warehouse|Item)>([\s\S]*?)<\/(?:Customer|Product|Warehouse|Item)>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const item = {};
      const inner = match[1];
      const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let field;
      while ((field = fieldRegex.exec(inner)) !== null) {
        item[field[1]] = field[2].trim();
      }
      items.push(item);
    }
    return items.length > 0 ? items : xml;
  } catch {
    return xml;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
