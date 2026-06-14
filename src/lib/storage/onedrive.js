/**
 * Microsoft OneDrive Native Integration
 * 
 * Handles uploading parsed resumes to a company's Microsoft 365 / OneDrive account
 * using the Microsoft Graph API.
 * 
 * Requires:
 * - A registered Azure AD App with `Files.ReadWrite.All` offline access.
 * - `ONEDRIVE_CLIENT_ID` and `ONEDRIVE_CLIENT_SECRET` in `.env.local`.
 */

export async function uploadToOneDrive(fileBuffer, fileName, jobSlug, config) {
  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
  const refreshToken = config.refreshToken;

  if (!clientId || !clientSecret) {
    throw new Error('Global ONEDRIVE_CLIENT_ID or SECRET is missing in .env.local');
  }

  try {
    console.log(`[OneDrive] Fetching fresh access token for ${fileName}...`);
    
    // 1. Exchange Refresh Token for a short-lived Access Token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('[OneDrive] Token Error:', err);
      throw new Error('Failed to refresh Microsoft token. The company may need to reconnect their account.');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Upload the file to OneDrive using Microsoft Graph API
    // We place it in a dynamic folder based on the jobSlug
    const safeSlug = jobSlug ? jobSlug.replace(/[^a-zA-Z0-9_-]/g, '') : 'General_Pool';
    const folderPath = `RecruitFlow/${safeSlug}`;
    
    // Graph API URL for uploading files (overwrites if exists)
    // Format: /me/drive/root:/{folder}/{filename}:/content
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/${fileName}:/content`;

    console.log(`[OneDrive] Uploading file to ${folderPath}...`);
    
    let mimeType = 'application/pdf';
    if (fileName.toLowerCase().endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      console.error('[OneDrive] Upload Error:', err);
      throw new Error('Failed to upload file to Microsoft OneDrive.');
    }

    const uploadData = await uploadResponse.json();

    console.log(`[OneDrive] Success! File ID: ${uploadData.id}`);

    // Return the storage result
    return {
      success: true,
      storage: 'onedrive',
      drive_file_id: uploadData.id,
      drive_web_url: uploadData.webUrl,
      local_path: ''
    };

  } catch (error) {
    console.error('[OneDrive] Integration failed:', error);
    throw error;
  }
}
