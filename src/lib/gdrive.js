import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * [LEGACY] Google Drive Service Account Integration
 * 
 * This was the original storage mechanism before we shifted to the 
 * "Bring Your Own Storage" (BYOS) multi-tenant architecture. 
 * It relies on a single GCP Service Account JSON key to upload files to a central drive.
 * 
 * It is currently maintained strictly as a fallback in the Storage Factory (`src/lib/storage/index.js`) 
 * for local development or for companies that haven't connected their own OneDrive/Zoho accounts.
 * 
 * Features:
 * 1. Uploads buffer directly to Google Drive.
 * 2. Auto-creates 'RecruitFlow Resumes' folder if missing.
 * 3. Gracefully falls back to Local FS (`saveLocally()`) if .env variables are missing.
 */

/**
 * Upload a file to Google Drive.
 */
export async function uploadToGoogleDrive(fileBuffer, fileName, jobSlug, config = {}) {
  const clientId = process.env.GCP_OAUTH_CLIENT_ID || process.env.GCP_CLIENT_ID;
  const clientSecret = process.env.GCP_OAUTH_CLIENT_SECRET || process.env.GCP_CLIENT_SECRET;
  
  // Prioritize the company's specific OAuth token and folder, fallback to legacy global env
  const refreshToken = config.refreshToken || process.env.GCP_REFRESH_TOKEN;
  const folderId = config.folderId || process.env.GCP_DRIVE_FOLDER_ID;

  // Throw error if credentials are not fully configured
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('[Google Drive] Credentials not found. ClientID:', !!clientId, 'Secret:', !!clientSecret, 'Token:', !!refreshToken);
    throw new Error('Google Drive integration is incomplete. Please check your Vercel Environment Variables.');
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

    let targetFolderId = folderId;
    let newFolderId = null;

    if (!targetFolderId) {
      console.log(`[Google Drive] No folder ID specified. Searching for 'RecruitFlow Resumes' in root...`);
      const searchRes = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and name='RecruitFlow Resumes' and 'root' in parents and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        targetFolderId = searchRes.data.files[0].id;
        console.log(`[Google Drive] Found existing folder! ID: ${targetFolderId}`);
      } else {
        console.log(`[Google Drive] Folder not found. Creating 'RecruitFlow Resumes'...`);
        const folderMetadata = {
          name: 'RecruitFlow Resumes',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']
        };
        const folderRes = await drive.files.create({
          resource: folderMetadata,
          fields: 'id'
        });
        targetFolderId = folderRes.data.id;
        console.log(`[Google Drive] Successfully created new folder! ID: ${targetFolderId}`);
      }
      newFolderId = targetFolderId; // Signal the factory to save this in the DB
    }

    // 1. Upload the file to the specific folder
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };
    
    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    console.log(`[Google Drive] Uploading ${fileName} to Drive...`);
    
    let file;
    try {
      file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });
    } catch (createErr) {
      if (createErr.message && createErr.message.includes('File not found:')) {
        console.warn(`[Google Drive] The saved folder ID (${targetFolderId}) is invalid or was deleted by the user. Auto-recovering...`);
        
        // Remove the invalid parent and upload to root for now
        // We also trigger a new folder creation to replace the broken one
        const folderMetadata = { name: 'RecruitFlow Resumes (Recovered)', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] };
        const folderRes = await drive.files.create({ resource: folderMetadata, fields: 'id' });
        
        newFolderId = folderRes.data.id;
        fileMetadata.parents = [newFolderId];
        
        console.log(`[Google Drive] Created recovery folder! New ID: ${newFolderId}. Retrying upload...`);
        file = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, webViewLink, webContentLink',
        });
      } else {
        throw createErr;
      }
    }

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
      local_path: '', // No local path since it's in the cloud
      new_folder_id: newFolderId // Pass this back so the Ingestion layer can save it to Supabase!
    };

  } catch (error) {
    console.error('[Google Drive] Upload failed:', error);
    throw new Error(`Google Drive API Error: ${error.message}. Please reconnect your account if necessary.`);
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


