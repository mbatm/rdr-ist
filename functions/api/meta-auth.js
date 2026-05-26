/**
 * GET /api/meta-auth
 * Facebook + Instagram OAuth akışını başlatır
 * Scope: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish
 */
export async function onRequestGet({ env }) {
  const appId = env.META_APP_ID
  if (!appId) return new Response('META_APP_ID eksik', { status: 400 })

  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  'https://rdr.ist/api/meta-callback',
    scope:         'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management',
    response_type: 'code',
    state:         'kayserim_cms',
  })

  return Response.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`, 302)
}
