import fs from 'fs';
import path from 'path';

/**
 * Google Drive Integration via googleapis (Stub)
 * 
 * Setup instructions:
 * 1. Go to Google Cloud Console
 * 2. Create a Service Account and download the JSON key
 * 3. Add Project ID, Client Email, and Private Key to settings
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Upload a file to Google Drive.
 */
export async function uploadToGoogleDrive(fileBuffer, fileName, jobSlug) {
  const clientId = process.env.GCP_CLIENT_ID;
  const clientSecret = process.env.GCP_CLIENT_SECRET;
  const refreshToken = process.env.GCP_REFRESH_TOKEN;
  const folderId = process.env.GCP_DRIVE_FOLDER_ID;

  // Gracefully fallback to local storage if credentials are not configured
  if (!clientId || !clientSecret || !refreshToken || !folderId) {
    console.log('[Google Drive] Credentials not found. Falling back to local storage.');
    return await saveLocally(fileBuffer, fileName, jobSlug);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Convert Buffer to Readable Stream
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    let mimeType = 'application/pdf';
    if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
    if (fileName.toLowerCase().endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // 1. Upload the file to the specific folder
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    console.log(`[Google Drive] Uploading ${fileName} to Drive...`);
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // 2. Make the file publicly readable so anyone with the link can view it
    // (Required to view the resume directly in the Recruiter Dashboard without logging into Google)
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log(`[Google Drive] Success! File ID: ${file.data.id}`);

    return {
      success: true,
      storage: 'google_drive',
      drive_file_id: file.data.id,
      drive_web_url: file.data.webViewLink,
      local_path: '' // No local path since it's in the cloud
    };

  } catch (error) {
    console.error('[Google Drive] Upload failed:', error);
    console.log('[Google Drive] Falling back to local storage due to error.');
    return await saveLocally(fileBuffer, fileName, jobSlug);
  }
}

/**
 * Download a file from Google Drive.
 */
export async function downloadFromGoogleDrive(fileId) {
  const clientId = process.env.GCP_CLIENT_ID;
  const clientSecret = process.env.GCP_CLIENT_SECRET;
  const refreshToken = process.env.GCP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

/**
 * Fallback: save file locally when Google Drive is not configured.
 */
export async function saveLocally(fileBuffer, fileName, jobSlug) {
  const uploadDir = path.join(process.cwd(), 'data', 'uploads', jobSlug);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${safeFileName}`;
  const filePath = path.join(uploadDir, uniqueFileName);

  fs.writeFileSync(filePath, fileBuffer);
  
  return {
    success: true,
    storage: 'local',
    local_path: `/data/uploads/${jobSlug}/${uniqueFileName}`
  };
}
