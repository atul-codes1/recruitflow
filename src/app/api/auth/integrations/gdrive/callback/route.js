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

    const clientId = process.env.GCP_OAUTH_CLIENT_ID || process.env.GCP_CLIENT_ID;
    const clientSecret = process.env.GCP_OAUTH_CLIENT_SECRET || process.env.GCP_CLIENT_SECRET;

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = request.headers.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/integrations/gdrive/callback`;

    // Exchange Code for Refresh Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
      console.error('[Google Auth] Token exchange failed:', errText);
      throw new Error('Failed to exchange authorization code for tokens.');
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    // Google only sends the refresh_token on the FIRST authorization (when prompt=consent).
    // If it's missing, the user might have already authorized the app previously.
    if (!refreshToken) {
        console.warn('[Google Auth] No refresh_token returned. The user may need to revoke app access in their Google Account and try again.');
    }

    // Since Google Drive also requires a Folder ID for the integration, we initialize it as null.
    // The Admin will need to specify which folder ID to drop resumes into later on the dashboard.
    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from('companies')
      .update({
        storage_provider: 'gdrive',
        storage_config: { 
            refreshToken: refreshToken || null, // Might be null if re-authenticating without revoking
            folderId: null // We don't know the root folder yet
        }
      })
      .eq('id', companyId);

    if (dbError) {
      console.error('[Google Auth] Database Update Error:', dbError);
      throw new Error('Failed to save the integration credentials to the database.');
    }

    return NextResponse.redirect(`${protocol}://${host}/${domain}/dashboard/settings`);

  } catch (err) {
    console.error('[Google Auth] Callback error:', err);
    return NextResponse.json({ error: 'Internal Server Error during OAuth callback' }, { status: 500 });
  }
}
