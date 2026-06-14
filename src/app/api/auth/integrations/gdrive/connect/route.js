import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Google Drive OAuth 2.0 Initialization (Connect)
 * 
 * Route: `/api/auth/integrations/gdrive/connect`
 * 
 * Initiates the BYOS (Bring Your Own Storage) OAuth flow for Google Drive.
 * Generates an authorization URL requesting offline access to Google Drive 
 * and redirects the user to the Google Consent Screen. State is passed 
 * to ensure we know which tenant (companyId/domain) is connecting.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const domain = searchParams.get('domain');

  if (!companyId || !domain) {
    return NextResponse.json({ error: 'Missing company_id or domain' }, { status: 400 });
  }

  const clientId = process.env.GCP_OAUTH_CLIENT_ID || process.env.GCP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Global GCP_OAUTH_CLIENT_ID is not configured in .env.local' }, { status: 500 });
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = request.headers.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/integrations/gdrive/callback`;

  // Encode the state to pass back to the callback route
  const state = Buffer.from(JSON.stringify({ companyId, domain })).toString('base64');

  // Google OAuth 2.0 Authorization Endpoint
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.file');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline'); // CRITICAL: Required to get the refresh token
  authUrl.searchParams.append('prompt', 'consent'); // CRITICAL: Force consent screen to guarantee refresh token

  return NextResponse.redirect(authUrl.toString());
}
