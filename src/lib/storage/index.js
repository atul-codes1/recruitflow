/**
 * Storage Adapter Factory
 * Dynamically routes uploads to the company's preferred cloud provider.
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
        // Compulsory Integration Enforcement: No fallback allowed
        throw new Error('No storage integration configured. Please connect Google Drive, OneDrive, or Zoho in your dashboard settings.');
    }
  }
};
