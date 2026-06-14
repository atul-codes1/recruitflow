import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * OneDrive OAuth 2.0 Callback
 * 
 * Route: `/api/auth/integrations/onedrive/callback`
 * 
 * Handles the redirect from Microsoft Azure AD. 
 * Exchanges the `code` for a `refresh_token` and saves it to Supabase 
 * for the tenant's Bring Your Own Storage (BYOS) configuration.
 */
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
    // 1. Decode the state to find out which company this belongs to
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    const { companyId, domain } = decodedState;

    if (!companyId || !domain) {
      throw new Error('Invalid state object.');
    }

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = request.headers.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/integrations/onedrive/callback`;

    // 2. Exchange the Authorization Code for the elusive Refresh Token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
      console.error('[OneDrive Auth] Token exchange failed:', errText);
      throw new Error('Failed to exchange authorization code for tokens.');
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      throw new Error('Microsoft did not return a refresh token. Make sure offline_access scope was requested.');
    }

    // 3. Save the Refresh Token into the Supabase database
    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from('companies')
      .update({
        storage_provider: 'onedrive',
        storage_config: { refreshToken: refreshToken }
      })
      .eq('id', companyId);

    if (dbError) {
      console.error('[OneDrive Auth] Database Update Error:', dbError);
      throw new Error('Failed to save the integration credentials to the database.');
    }

    // 4. Redirect the Admin back to the Dashboard Settings
    return NextResponse.redirect(`${protocol}://${host}/${domain}/dashboard/settings`);

  } catch (err) {
    console.error('[OneDrive Auth] Callback error:', err);
    return NextResponse.json({ error: 'Internal Server Error during OAuth callback' }, { status: 500 });
  }
}
