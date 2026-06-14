import { NextResponse } from 'next/server';

/**
 * Zoho WorkDrive OAuth 2.0 Initialization (Connect)
 * 
 * Route: `/api/auth/integrations/zoho/connect`
 * 
 * Initiates the BYOS (Bring Your Own Storage) OAuth flow for Zoho WorkDrive.
 * Requests `WorkDrive.files.ALL` and `WorkDrive.workspace.ALL` scopes.
 * Note: Assumes Zoho US data center (`.com`).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const domain = searchParams.get('domain');

  if (!companyId || !domain) {
    return NextResponse.json({ error: 'Missing company_id or domain' }, { status: 400 });
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Global ZOHO_CLIENT_ID is not configured in .env.local' }, { status: 500 });
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = request.headers.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/integrations/zoho/callback`;

  // Encode the state to pass back to the callback route
  const state = Buffer.from(JSON.stringify({ companyId, domain })).toString('base64');

  // Zoho OAuth 2.0 Authorization Endpoint
  // Note: Zoho has different Data Centers (.com, .eu, .in, .au). Defaulting to .com
  const authUrl = new URL('https://accounts.zoho.com/oauth/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'WorkDrive.files.ALL,WorkDrive.workspace.ALL');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
