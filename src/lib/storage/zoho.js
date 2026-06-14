/**
 * Zoho WorkDrive Native Integration
 * 
 * Handles uploading parsed resumes to a company's Zoho WorkDrive account.
 * 
 * Requires:
 * - A registered Zoho API Console Client.
 * - `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in `.env.local`.
 * - The user must provide a `folderId` during configuration (Zoho requires exact IDs, not paths).
 */

export async function uploadToZoho(fileBuffer, fileName, jobSlug, config) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = config.refreshToken;
  const parentFolderId = config.folderId; // Zoho requires a specific folder ID

  if (!clientId || !clientSecret) {
    throw new Error('Global ZOHO_CLIENT_ID or SECRET is missing in .env.local');
  }

  if (!parentFolderId) {
    throw new Error('Zoho integration requires a destination folder ID in the configuration.');
  }

  try {
    console.log(`[Zoho] Fetching fresh access token for ${fileName}...`);
    
    // 1. Exchange Refresh Token for Access Token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
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
      console.error('[Zoho] Token Error:', err);
      throw new Error('Failed to refresh Zoho token. The company may need to reconnect.');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Upload the file to Zoho WorkDrive
    // Zoho uses multipart/form-data for file uploads
    const { FormData } = require('form-data');
    const form = new FormData();
    form.append('filename', fileName);
    form.append('parent_id', parentFolderId);
    form.append('override-name-exist', 'true'); // Overwrite if duplicate
    form.append('content', fileBuffer, { filename: fileName });

    console.log(`[Zoho] Uploading file to folder ${parentFolderId}...`);

    const uploadResponse = await fetch('https://workdrive.zoho.com/api/v1/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      console.error('[Zoho] Upload Error:', err);
      throw new Error('Failed to upload file to Zoho WorkDrive.');
    }

    const uploadData = await uploadResponse.json();
    const fileRecord = uploadData.data[0];

    console.log(`[Zoho] Success! File ID: ${fileRecord.attributes.resource_id}`);

    // Return the storage result
    return {
      success: true,
      storage: 'zoho',
      drive_file_id: fileRecord.attributes.resource_id,
      drive_web_url: fileRecord.attributes.permalink,
      local_path: ''
    };

  } catch (error) {
    console.error('[Zoho] Integration failed:', error);
    throw error;
  }
}
