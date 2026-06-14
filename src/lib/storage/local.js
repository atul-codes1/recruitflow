import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Local File System Storage Fallback
 * 
 * Saves the file to the local disk inside the `public/uploads` directory.
 * Used exclusively for local development or as a fallback when a tenant 
 * has not yet connected a BYOS cloud provider.
 * 
 * Note: This will not persist data in Serverless environments like Vercel.
 */
export async function uploadToLocal(fileBuffer, fileName, jobSlug) {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', jobSlug || 'general');
    
    // Ensure the directory exists
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, fileBuffer);
    
    console.log(`[Local Storage] Successfully saved to ${filePath}`);
    
    return {
      success: true,
      storage: 'local',
      drive_file_id: '', // No ID for local files
      drive_web_url: `/uploads/${jobSlug || 'general'}/${fileName}`, // Public URL
      local_path: filePath // Absolute path for the worker to read
    };
  } catch (error) {
    console.error('[Local Storage] Failed to write file to disk:', error);
    throw new Error('Local storage write failed.');
  }
}
