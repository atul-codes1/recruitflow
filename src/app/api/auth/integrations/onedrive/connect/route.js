import { NextResponse } from 'next/server';

/**
 * OneDrive OAuth 2.0 Initialization (Connect)
 * 
 * Route: `/api/auth/integrations/onedrive/connect`
 * 
 * Initiates the BYOS (Bring Your Own Storage) OAuth flow for Microsoft OneDrive.
 * Generates an authorization URL requesting `offline_access` and `Files.ReadWrite.All`.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const domain = searchParams.get('domain');

  if (!companyId || !domain) {
    return NextResponse.json({ error: 'Missing company_id or domain' }, { status: 400 });
  }

  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Global ONEDRIVE_CLIENT_ID is not configured in .env.local' }, { status: 500 });
  }

  // Determine the callback URL based on the environment
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = request.headers.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/integrations/onedrive/callback`;

  // We pass the companyId and domain through the state parameter so we know who they are when they return
  const state = Buffer.from(JSON.stringify({ companyId, domain })).toString('base64');

  // Microsoft OAuth 2.0 Authorization Endpoint
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_mode', 'query');
  authUrl.searchParams.append('scope', 'offline_access Files.ReadWrite.All User.Read');
  authUrl.searchParams.append('state', state);

  // Redirect the user to the Microsoft login screen
  return NextResponse.redirect(authUrl.toString());
}
