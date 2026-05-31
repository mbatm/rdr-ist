// functions/api/youtube-auth.js
// YouTube OAuth 2.0 yetkilendirme başlatır

export async function onRequestGet({ request, env }) {
  const params = new URLSearchParams({
    client_id:     env.YOUTUBE_CLIENT_ID,
    redirect_uri:  'https://rdr.ist/api/youtube-callback',
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
    access_type:   'offline',
    prompt:        'consent',
  })

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    302
  )
}
