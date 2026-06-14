import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    return NextResponse.json({ error: `OAuth Error: ${error}` }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
  }

  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    const { companyId, domain } = decodedState;

    if (!companyId || !domain) {
      throw new Error('Invalid state object.');
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = request.headers.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/integrations/zoho/callback`;

    // Exchange Code for Refresh Token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Zoho Auth] Token exchange failed:', errText);
      throw new Error('Failed to exchange authorization code for tokens.');
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.warn('[Zoho Auth] No refresh_token returned. The user may need to revoke app access and try again.');
    }

    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from('companies')
      .update({
        storage_provider: 'zoho',
        storage_config: { 
            refreshToken: refreshToken || null,
            folderId: null // Zoho requires a folder ID later
        }
      })
      .eq('id', companyId);

    if (dbError) {
      console.error('[Zoho Auth] Database Update Error:', dbError);
      throw new Error('Failed to save the integration credentials to the database.');
    }

    return NextResponse.redirect(`${protocol}://${host}/${domain}/dashboard/settings`);

  } catch (err) {
    console.error('[Zoho Auth] Callback error:', err);
    return NextResponse.json({ error: 'Internal Server Error during OAuth callback' }, { status: 500 });
  }
}
