export async function onRequestGet({ env }) {
  const key = env.CREATOMATE_API_KEY
  if (!key) return Response.json({ hata: 'API key bulunamadı' }, { status: 500 })
  return Response.json({ key })
}
