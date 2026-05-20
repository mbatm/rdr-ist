export async function onRequestGet({ env }) {
  return Response.json({
    haberler_kv: !!env.HABERLER,
    anthropic_key: !!env.ANTHROPIC_API_KEY,
    rss_key: !!env.RSS_API_KEY,
    test: 'calisiyor'
  })
}