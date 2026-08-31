// Vercel Edge Function — exchanges a Google OAuth authorization code for
// tokens server-side. GOOGLE_CLIENT_SECRET must be set as a server-only env
// var (no VITE_ prefix) in the Vercel project settings — any VITE_* var
// ships in the client bundle, which is exactly the bug this endpoint fixes
// (see src/lib/sheetsExport.ts's handleOAuthCallback).
export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Server not configured for Google OAuth' }), { status: 500 })
  }

  let body: { code?: string; redirectUri?: string }
  try {
    body = await req.json() as { code?: string; redirectUri?: string }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }
  if (!body.code || !body.redirectUri) {
    return new Response(JSON.stringify({ error: 'Missing code or redirectUri' }), { status: 400 })
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: body.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: body.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: 'Token exchange failed' }), { status: 502 })
  }

  const json = await tokenRes.json() as { access_token: string; refresh_token?: string }
  return new Response(JSON.stringify({ access_token: json.access_token, refresh_token: json.refresh_token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
