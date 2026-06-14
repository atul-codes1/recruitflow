/**
 * ============================================================================
 * CLOUD STORAGE FACTORY (lib/storage/index.js)
 * ============================================================================
 * 
 * This is the central router for the "Bring Your Own Storage" (BYOS) architecture.
 * Instead of storing candidate resumes in an expensive AWS S3 bucket that we pay for,
 * we upload the PDFs directly into the Recruiter's own Google Drive, OneDrive, or Zoho account.
 * 
 * This ensures:
 * 1. Zero storage costs for us.
 * 2. Complete data privacy for the B2B clients (they own the files).
 * 3. Infinite scalability.
 */

import { uploadToOneDrive } from './onedrive';
import { uploadToZoho } from './zoho';
import { uploadToGoogleDrive } from '../gdrive'; // The legacy GDrive script

export const StorageFactory = {
  /**
   * Uploads a file buffer to the specified provider using the company's config.
   * @param {string} provider - 'onedrive', 'gdrive', or 'zoho'
   * @param {Object} config - The decrypted storage_config JSON from the database
   * @param {Buffer} fileBuffer - The raw file buffer
   * @param {string} fileName - The name of the file
   * @param {string} jobSlug - The job category (used as a folder name)
   */
  async upload(provider, config, fileBuffer, fileName, jobSlug) {
    console.log(`[StorageFactory] Routing upload to: ${provider}`);
    
    switch (provider) {
      case 'onedrive':
        if (!config.refreshToken) {
          throw new Error('OneDrive configuration is missing a refresh token. The company must re-authenticate via OAuth.');
        }
        return await uploadToOneDrive(fileBuffer, fileName, jobSlug, config);
        
      case 'zoho':
        if (!config.clientId || !config.clientSecret || !config.refreshToken) {
          throw new Error('Zoho WorkDrive configuration is missing required fields.');
        }
        return await uploadToZoho(fileBuffer, fileName, jobSlug, config);
        
      case 'gdrive':
        return await uploadToGoogleDrive(fileBuffer, fileName, jobSlug, config);
        
      default:
        console.error('[StorageFactory] No cloud integration found. BYOS is required.');
        throw new Error('BYOS_MISSING');
    }
  }
};
