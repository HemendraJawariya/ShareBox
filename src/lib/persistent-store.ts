/**
 * Persistent File Store for Vercel
 * Stores file metadata and encrypted data in a simple way that works across requests
 * 
 * Note: This is in-memory and will reset when the server restarts.
 * For production, use a proper database like Supabase or Firebase.
 */

export interface StoredFile {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  encryptedData: string;
  accessToken: string;
  expiresAt: Date;
  maxDownloads: number;
  downloadCount: number;
  uploadedAt: Date;
}

// Global store - persists for the lifetime of the server instance
const fileStore = new Map<string, StoredFile>();

/**
 * Store encrypted file
 */
export function storeFile(file: StoredFile): void {
  fileStore.set(file.fileId, file);
  console.log(`[FileStore] Stored file: ${file.fileId} (${file.fileName})`);
  console.log(`[FileStore] Total files in store: ${fileStore.size}`);
  console.log(`[FileStore] Store keys: ${Array.from(fileStore.keys()).join(', ')}`);
}

/**
 * Retrieve file by ID
 */
export function retrieveFile(fileId: string): StoredFile | null {
  const file = fileStore.get(fileId);
  
  if (!file) {
    console.log(`[FileStore] File not found: ${fileId}. Available files: ${Array.from(fileStore.keys()).join(', ') || 'none'}`);
    return null;
  }

  // Check if expired
  if (new Date() > file.expiresAt) {
    console.log(`[FileStore] File expired: ${fileId}`);
    fileStore.delete(fileId);
    return null;
  }

  return file;
}

/**
 * Retrieve file by access token
 */
export function retrieveFileByToken(token: string): StoredFile | null {
  for (const file of fileStore.values()) {
    if (file.accessToken === token) {
      // Check if expired
      if (new Date() > file.expiresAt) {
        fileStore.delete(file.fileId);
        return null;
      }
      return file;
    }
  }
  return null;
}

/**
 * Increment download count
 */
export function incrementDownloadCount(fileId: string): boolean {
  const file = fileStore.get(fileId);
  if (!file) return false;

  file.downloadCount += 1;
  return true;
}

/**
 * Check if can download
 */
export function canDownload(fileId: string): boolean {
  const file = fileStore.get(fileId);
  if (!file) return false;

  // Check expiry
  if (new Date() > file.expiresAt) {
    fileStore.delete(fileId);
    return false;
  }

  // Check download limit
  if (file.downloadCount >= file.maxDownloads) {
    return false;
  }

  return true;
}

/**
 * Delete file
 */
export function deleteFile(fileId: string): boolean {
  return fileStore.delete(fileId);
}

/**
 * Get all files
 */
export function getAllFiles(): StoredFile[] {
  const now = new Date();
  const allFiles = Array.from(fileStore.values());
  
  // Remove expired files
  for (const file of allFiles) {
    if (now > file.expiresAt) {
      fileStore.delete(file.fileId);
    }
  }

  // Return only non-expired files
  return Array.from(fileStore.values());
}

/**
 * Clear all files (for testing)
 */
export function clearAll(): void {
  fileStore.clear();
  console.log('[FileStore] Cleared all files');
}
