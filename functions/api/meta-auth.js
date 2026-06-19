/**
 * GET /api/meta-auth
 * Facebook + Instagram + Ads OAuth akışını başlatır
 */
export async function onRequestGet({ env, request }) {
  const url   = new URL(request.url)
  const mode  = url.searchParams.get('mode') || 'cms'   // cms | ads

  const appId = env.META_APP_ID
  if (!appId) return new Response('META_APP_ID eksik', { status: 400 })

  // Ads modu: ads_management + ads_read ekle
  const baseScope = 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management'
  const adsScope  = baseScope + ',ads_management,ads_read'

  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  'https://rdr.ist/api/meta-callback',
    scope:         mode === 'ads' ? adsScope : baseScope,
    response_type: 'code',
    state:         mode === 'ads' ? 'kayserim_ads' : 'kayserim_cms',
  })

  return Response.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`, 302)
}
