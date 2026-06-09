// BizimHesap API Proxy - rdr.ist/api/muhasebe/proxy
// Tamamen bağımsız, diğer sistemlere dokunmaz

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

  // OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint'); // customers, products, warehouses, addinvoice, addcustomer, cancelinvoice
  const warehouseId = url.searchParams.get('warehouseId');

  if (!endpoint) {
    return json({ error: 'endpoint parametresi gerekli' }, 400);
  }

  try {
    let response;

    // GET endpoint'leri
    if (['customers', 'products', 'warehouses'].includes(endpoint)) {
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        headers: { token: TOKEN },
      });
    } else if (endpoint === 'inventory' && warehouseId) {
      response = await fetch(`${BH_BASE}/inventory/${warehouseId}`, {
        headers: { token: TOKEN },
      });
    } else if (['addinvoice', 'addcustomer', 'cancelinvoice', 'addproduct'].includes(endpoint)) {
      // POST endpoint'leri
      const body = await request.json();
      // firmId yoksa varsayılanı ekle
      if (!body.firmId) body.firmId = FIRM_ID;
      response = await fetch(`${BH_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      return json({ error: 'Geçersiz endpoint' }, 400);
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return json(data);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
