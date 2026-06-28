const ALLOW = ['kayseriolay.com', 'kayserianadoluhaber.com.tr', 'news.google.com']
export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u') || ''
  let host = ''
  try { host = new URL(u).hostname.replace(/^www[.]/, '') } catch (_) {}
  if (!ALLOW.includes(host)) return new Response('not allowed', { status: 403 })
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }, redirect: 'follow' })
    const t = await r.text()
    const itemCount = (t.match(/<item>/g) || []).length
    return Response.json({ status: r.status, ct: r.headers.get('content-type'), len: t.length, items: itemCount, head: t.slice(0, 120), cf_mit: r.headers.get('cf-mitigated') })
  } catch (e) { return Response.json({ error: String(e) }) }
}
